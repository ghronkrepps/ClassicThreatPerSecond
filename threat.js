var gAPIKey, gCharName;
var gEvents = [];
var gThreat = [];

var hitTypes = {
    1:  'Hit',
    2:  'Crit',
    4:  'Blocked',
    6:  'Glancing',
    7:  'Dodge',
    8:  'Parry',
    10: 'Immune',
}




function handler_castCanMiss(threatValue) {
    return (event) => {
        switch (event['type']) {
            case 'cast':
                return threatValue;
            case 'damage':
                return -threatValue;
        }
        return 0;
    }
}

function handler_threatOnHit(threatValue) {
    return (event) => {
        if (event['type'] == 'damage' && event['hitType']<=4) {
            return event['amount'] + threatValue;
        }
        return 0;
    }
}

function handler_threatOnDebuff(threatValue) {
    return (event) => {
        switch (event['type']) {
            case 'applydebuff':
            case 'refreshdebuff':
                return threatValue;
        }
        return 0;
    }
}

function handler_threatOnBuff(threatValue) {
    return (event) => {
        switch (event['type']) {
            case 'applybuff':
            case 'refreshbuff':
                return threatValue;
        }
        return 0;
    }
}

var gHandlers = {
    /* Physical */
        1: handler_threatOnHit(0), //Melee
     7919: handler_threatOnHit(0), //Shoot Crossbow
     9910: handler_threatOnHit(0), //Thorns
    16624: handler_threatOnHit(0), //Thorium Shield Spike

    //Heroic Strike
       78: handler_threatOnHit(20),
      284: handler_threatOnHit(39),
      285: handler_threatOnHit(59),
     1608: handler_threatOnHit(78),
    11564: handler_threatOnHit(98),
    11565: handler_threatOnHit(118),
    11566: handler_threatOnHit(137),
    11567: handler_threatOnHit(145), //Rank 8
    25286: handler_threatOnHit(175), //Rank 9 (AQ)

    //Shield Slam
    23925: handler_threatOnHit(250), //Rank 4

    //Revenge
    11601: handler_threatOnHit(315), //Rank 5
    25288: handler_threatOnHit(355), //Rank 6 (AQ)
    12798: ()=>{return 0},   //Revenge Stun

    //Cleave
      845: handler_threatOnHit(10),  //Rank 1
     7369: handler_threatOnHit(40),  //Rank 2
    11608: handler_threatOnHit(60),  //Rank 3
    11609: handler_threatOnHit(70),  //Rank 4
    20569: handler_threatOnHit(100), //Rank 5

    //Hamstring
    7373: handler_threatOnHit(145),



    /* Abilities */
    //Sunder Armor
    11597: handler_castCanMiss(261), //Rank 5

    //Battleshout
    11551: handler_threatOnBuff(60), //Rank 5

    //Demo Shout
    11556: handler_threatOnDebuff(43),


    /* Consumables */
    //Gift of Arthas
    11374: handler_threatOnDebuff(70),



    /* Zero Threat Abilities */
      355: ()=>{return 0}, //Taunt
    10610: ()=>{return 0}, //Windfury Totem
    20007: ()=>{return 0}, //Heroic Strength (Crusader)
    17528: ()=>{return 0}, //Mighty Rage
     2687: ()=>{return 0}, //Bloodrage (cast)
    29131: ()=>{return 0}, //Bloodrage (buff)
    29478: ()=>{return 0}, //Battlegear of Might
    23602: ()=>{return 0}, //Shield Specialization
    12964: ()=>{return 0}, //Unbridled Wrath
}


function fetch_events(reportCode, encounterID, callback, events=[], startTimestamp=0) {
    $.get(`https://classic.warcraftlogs.com/v1/report/events/summary/${reportCode}?`+$.param({
        view: 'summary',
        start: startTimestamp,
        end: 9999999999999,
        encounter: encounterID,
        filter: `source.name='${gCharName}'`, //or target.name='${gCharName}'
        translate: true,
        api_key: gAPIKey,
    }), (data) => {
        // TODO: Verify data before concat (check last and first events?)
        events.push(...data['events']);
        let nextPageTimestamp = data['nextPageTimestamp'];
        if (nextPageTimestamp) {
            fetch_events(reportCode, encounterID, callback, events, nextPageTimestamp);
        } else {
            callback(events);
        }
    });
}


function identify_start_stance(events) {
    for (let event of events) {
        if (event['type'] == 'cast') {
            switch (event['ability']['name']) {
                case 'Revenge':
                case 'Shield Slam':
                case 'Disarm':
                case 'Shield Wall':
                case 'Shield Block':
                case 'Taunt':
                    return 'Defensive Stance';
                case 'Berserker Rage':
                case 'Intercept':
                case 'Recklessnes':
                case 'Whirlwind':
                    return 'Berserker Stance';
                case 'Charge':
                case 'Mocking Blow':
                case 'Overpower':
                case 'Retaliation':
                case 'Thunder Clap':
                    return 'Battle Stance';
                case 'Defensive Stance':
                case 'Battle Stance':
                case 'Beserker Stance':
                    return 'Unknown'
            }
        } else if (event['type'] == 'removebuff') {
            if (event['ability']['name'].includes(' Stance')) {
                return event['ability']['name'];
            }
        }
    }
}


function newParse(reportCode, callback) {
    $.get(`https://classic.warcraftlogs.com:443/v1/report/fights/${reportCode}?translate=true&api_key=${gAPIKey}`, function(data) {
        if (data['status']) {
            throw data['error'];
        }
        callback(new Parse(reportCode, data));
    });
}
class Parse {
    constructor(reportCode, report) {
        this.reportCode = reportCode;

        this._report = report;
        this.fights = report['fights'];
        this.title = report['title'];
        this.friendlies = report['friendlies'];
        this.enemies = report['enemies'];

        this.encounters = report['fights'].filter(function(fight) {
            return (fight['boss'] && fight['kill']);
        });
    }

    calc_fight(fight, callback) {
        let e = new Encounter(this.reportCode, fight);
        e.parse(callback);
    }
}


class Encounter {
    constructor(reportCode, fight) {
        this.reportCode = reportCode;

        this._fight = fight;
        this.encounterID = fight['boss'];
        this.start = fight['start_time'];
        this.stop = fight['end_time'];
        this.time = (this.stop - this.start) / 1000;
    }

    // Adding a method to the constructor
    parse(callback) {
        fetch_events(this.reportCode, this.encounterID, (events) => {
            this.events = events;
            this.calculate();
            callback(this);
        });
    }

    calculate() {
        // console.log(this.events, this.events.length);
        console.log("--------------------------------------------")
        console.log(`Beginning calculation of ${this._fight.name}`);

        let startStance = identify_start_stance(this.events);
        switch (startStance) {
            case 'Defensive Stance':
                this.threatModifier = 1.495;
                break;
            case 'Berserker Stance':
            case 'Battle Stance':
                this.threatModifier = 0.8;
                break;
            default: //FIXME
                this.threatModifier = 0;
                break;
        }
        console.log(`Identified starting stance as '${startStance}' using modifier ${this.threatModifier}`);
        
        this.threat = 0.0;
        for (let event of this.events) {
            // console.log(this.threat, event);

            let t = 0;
            switch (event['type']) {
                case 'extraattacks':
                    break;
                case 'heal':
                    t = event.amount / 2;
                    break;
                case 'energize':
                    t = event.resourceChange * 5;
                    break;
                default:
                    let f = gHandlers[event.ability.guid];
                    if (f == undefined) {
                        console.log(`Unhandled ability ${event.ability.name} (${event.ability.guid})`)
                        continue;
                    }
                    t = f(event);
            }
            console.log(this.threat, t, event);
            this.threat += (t * this.threatModifier);
    
            // let t;
            // switch (event['type']) {
            //     case 'cast':
            //         if (event['ability']['name'].includes(' Stance')) {
            //             switch (event['ability']['name']) {
            //                 case 'Beserker Stance':
            //                 case 'Battle Stance':
            //                     threatModifier = 0.8;
            //                     break;
            //                 case 'Defensive Stance':
            //                     threatModifier = 1.495;
            //                     break;
            //             }
            //         } else {
            //             t = gCastTable[event['ability']['guid']] || 0;
            //             this.threat += (t)*threatModifier;
            //         }
            //         //console.log(`Cast: ${event['ability']['name']}`, event);
            //         break;
            //     case 'damage':
            //         //Apply threat modifiers only on hits/crits/blocks
            //         t = (event['hitType'] <=4)?gDmgTable[event['ability']['guid']]:0;
            //         if (t == undefined) {
            //             console.log(`Unknown Damage: ${event['ability']['name']} (${event['ability']['guid']})`);
            //             t=0;
            //         }
            //         this.threat += (event['amount']+t)*threatModifier;
            //         //console.log(`Damage: [${event['hitType']}]${event['ability']['name']} = ${(event['amount']+t)*threatModifier} (${t})`, event);
            //         break;
            //     case 'applydebuff':
            //     case 'applydebuffstack':
            //     case 'refreshdebuff':
            //         t = gDebuffTable[event['ability']['guid']];
            //         if (t == undefined) {
            //             console.log(`Unknown Debuff: ${event['ability']['name']} (${event['ability']['guid']})`);
            //             break;
            //         }
            //         this.threat += (t)*threatModifier;
            //         //console.log(`Debuff: ${event['ability']['name']} = ${(t)*threatModifier} (${t})`, event);
            //         break;
            //     case 'energize':
            //         this.threat += (event['resourceChange']*5)*threatModifier;
            //         break;
            //     case 'heal':
            //         this.threat += (event['amount'])*threatModifier/2;
            //         break;
            //     case 'applybuff':
            //     case 'refreshbuff':
            //         t = gBuffTable[event['ability']['guid']];
            //         if (t == undefined) {
            //             console.log(`Unknown Buff: ${event['ability']['name']} (${event['ability']['guid']})`, event);
            //             break;
            //         }
            //         this.threat += (t)*threatModifier;
            //         //console.log(`Buff: ${event['ability']['name']} = ${(t)*threatModifier} (${t})`, event);
            //         break;
            //     case 'extraattacks':
            //         break;
            //     case 'removebuff':
            //     case 'removebuffstack':
            //     case 'removedebuff':
            //         break;
            //     default:
            //         console.log('unhandled type: ' + event['type']);
            //         break;
            // }
        }
    
    }
}



$( document ).ready(function() {
    console.log("threat.js");

    $("#target").submit(function( event ) {
        event.preventDefault();

        console.log("clicked");
        gAPIKey = $("#api").val();
        let gReportCode = $("#report").val();
        gCharName = $("#char").val();
        console.log(gAPIKey, gReportCode, gCharName);

        if (!gAPIKey || !gReportCode || !gCharName) {
            alert("Fill in the damn form");
        } else {
            newParse(gReportCode, (p) => {
                console.log(p);
                for (boss of p.encounters) {
                    console.log(boss['name'], (boss['end_time'] - boss['start_time']) / 1000);
                }
                p.calc_fight(p.encounters[1], (e) => {
                    console.log("Total threat: " + e.threat);
                    console.log("TPS: " + (e.threat / e.time))
                });
            });
        }
    });
});