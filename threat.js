var gAPIKey, gCharName, gParse;
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




function handler_changeThreatModifier(threatModifier) {
    return (encounter, event) => {
        encounter.threatModifier = threatModifier;
        return 0;
    }
}

function handler_castCanMiss(threatValue) {
    return (encounter, event) => {
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
    return (encounter, event) => {
        if (event['type'] == 'damage' && event['hitType']<=4) {
            return event['amount'] + threatValue;
        }
        return 0;
    }
}

function handler_threatOnDebuff(threatValue) {
    return (encounter, event) => {
        switch (event['type']) {
            case 'applydebuff':
            case 'refreshdebuff':
                return threatValue;
        }
        return 0;
    }
}

function handler_threatOnBuff(threatValue) {
    return (encounter, event) => {
        switch (event['type']) {
            case 'applybuff':
            case 'refreshbuff':
                return threatValue;
        }
        return 0;
    }
}

var gHandlers = {
    /* Stances */
      71: handler_changeThreatModifier(1.495), //Defensive
    2457: handler_changeThreatModifier(0.8),   //Battle
    2458: handler_changeThreatModifier(0.8),   //Berserker


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

    //Intercept
    20252: handler_threatOnHit(0), //Intercept
    20253: ()=>{return 0},         //Intercept Stun



    /* Abilities */
    //Sunder Armor
    11597: handler_castCanMiss(261), //Rank 5

    //Battleshout
    11551: handler_threatOnBuff(52), //Rank 6
    25289: handler_threatOnBuff(60), //Rank 7 (AQ)

    //Demo Shout
    11556: handler_threatOnDebuff(43),


    /* Consumables */
    //Gift of Arthas
    11374: handler_threatOnDebuff(90),



    /* Zero Threat Abilities */
      355: ()=>{return 0}, //Taunt
    20560: ()=>{return 0}, //Mocking Blow
    10610: ()=>{return 0}, //Windfury Totem
    20007: ()=>{return 0}, //Heroic Strength (Crusader)
    17528: ()=>{return 0}, //Mighty Rage
     2687: ()=>{return 0}, //Bloodrage (cast)
    29131: ()=>{return 0}, //Bloodrage (buff)
    29478: ()=>{return 0}, //Battlegear of Might
    23602: ()=>{return 0}, //Shield Specialization
    12964: ()=>{return 0}, //Unbridled Wrath
    11578: ()=>{return 0}, //Charge
     7922: ()=>{return 0}, //Charge Stun
}


function fetch_events(playerID, reportCode, encounterID, callback, events=[], startTimestamp=0) {
    $.get(`https://classic.warcraftlogs.com/v1/report/events/summary/${reportCode}?`+$.param({
        view: 'summary',
        sourceid: playerID,
        start: startTimestamp,
        end: 9999999999999,
        encounter: encounterID,
        translate: true,
        api_key: gAPIKey,
    }), (data) => {
        // TODO: Verify data before concat (check last and first events?)
        events.push(...data['events']);
        let nextPageTimestamp = data['nextPageTimestamp'];
        if (nextPageTimestamp) {
            fetch_events(playerID, reportCode, encounterID, callback, events, nextPageTimestamp);
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
                case 'Recklessness':
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
                case 'Berserker Stance':
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

        this.encounters = report['fights'].filter((fight) => {
            return (fight['boss'] && fight['kill']);
        }).map((fight) => {
            return new Encounter(this.reportCode, fight);
        });
    }

    getFriendlyEncounters(playerId) {
        let player = this.friendlies.find(p => p.id == playerId);
        let playerFights = player.fights.map(e => e.id);
        console.log(playerFights);
        return this.encounters.filter(e => playerFights.includes(e.id));
    }

    getEncounter(encounterID) {
        return this.encounters.find(e => e.encounterID == encounterID);
    }
}


class Encounter {
    constructor(reportCode, fight) {
        this.reportCode = reportCode;

        this._fight = fight;
        this.id = fight['id'];
        this.encounterID = fight['boss'];
        this.start = fight['start_time'];
        this.stop = fight['end_time'];
        this.name = fight['name'];
        this.time = (this.stop - this.start) / 1000;
    }

    // Adding a method to the constructor
    parse(playerID, callback) {
        this.playerID = playerID;
        fetch_events(playerID, this.reportCode, this.encounterID, (events) => {
            this.events = events;
            this.calculate();
            callback(this);
        });
    }

    calculate() {
        // console.log(this.events, this.events.length);
        console.log("--------------------------------------------")
        console.log(`Beginning calculation of ${this._fight.name}`);

        // Identify the stance we start in based on ability usage
        let startStance = identify_start_stance(this.events);
        this.threatModifier = 0;
        switch (startStance) {
            case 'Defensive Stance':
                gHandlers[71](this);
                break;
            case 'Berserker Stance':
                gHandlers[2458](this);
                break;
            case 'Battle Stance':
                gHandlers[2457](this);
                break;
            default:
                throw "Failed to identify starting stance";
        }
        console.log(`Identified starting stance as '${startStance}' using modifier ${this.threatModifier}`);
        

        this.threat = 0.0;
        for (let event of this.events) {
            if (event.sourceID != this.playerID)
                continue;

            let t = 0;
            switch (event['type']) {
                case 'combatantinfo': //TODO: Retrieve gear
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
                    t = f(this, event);
            }
            // console.log(this.threat, t, event);
            this.threat += (t * this.threatModifier);
        }
    }
}



$( document ).ready(function() {
    console.log("threat.js");

    $("#reportForm").submit((event) => {
        console.log("clicked");
        gAPIKey = $("#api").val();
        let gReportCode = $("#report").val();
        console.log(gAPIKey, gReportCode);

        if (!gAPIKey || !gReportCode) {
            alert("Fill in the damn form");
        } else {
            newParse(gReportCode, (p) => {
                gParse = p;

                console.log(p);
                for (boss of p.encounters) {
                    console.log(boss['name'], (boss['end_time'] - boss['start_time']) / 1000);
                }

                let pList = $('#playerList');
                pList.empty();
                for (player of p.friendlies) {
                    if (player.type == "Warrior") {
                        pList.append($('<option>', {
                            value: player.id,
                            text: player.name,
                        }));
                        console.log(player.id, player.name);
                    }
                }
                pList.trigger('change');
                $('#parseForm').show();
            });
        }

        event.preventDefault();
        return false;
    });

    $('#playerList').change((event) => {
        let selected = $(this).find("option:selected");
        let playerId = selected.val();
        let playerName = selected.text();
        console.log(playerId, playerName);

        let encounters = gParse.getFriendlyEncounters(playerId);
        console.log(encounters);
        let eList = $('#encounterList');
        eList.empty();
        for (boss of encounters) {
            eList.append($('<option>', {
                value: boss.encounterID,
                text: `${boss.name} (${boss.time.toFixed(2)})`,
            }));
        }
        eList.trigger('change');
    });

    $("#parseForm").submit((event) => {
        let encounterID = $('#encounterList option:selected').val();
        let playerID = $('#playerList option:selected').val();

        let encounter = gParse.getEncounter(encounterID);
        encounter.parse(playerID, (e) => {
            console.log("Total threat: " + e.threat);
            console.log("TPS: " + (e.threat / e.time));

            let playerName = $('#playerList option:selected').text();
            $("#results").append($('<h1>', {text: `${playerName} - ${e.name} (${e.time.toFixed(2)})`}));
            $("#results").append($('<div>', {text: `Total threat: ${e.threat.toFixed(0)}`}));
            $("#results").append($('<div>', {text: `TPS: ${(e.threat / e.time).toFixed(2)}`}));
        });

        event.preventDefault();
        return false;
    })
});