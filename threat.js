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



function handler_zero() {
    return (encounter, event) => {
        return 0;
    }
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

function handler_damage() {
    return (encounter, event) => {
        if (event['type'] == 'damage') {
            return event['amount'];
        }
        return 0;
    }
}

function handler_threatOnHit(threatValue=0) {
    return (encounter, event) => {
        if (event['type'] == 'damage' && event['hitType']<=6) {
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
        1: handler_damage(), //Melee
     7919: handler_damage(), //Shoot Crossbow
     9910: handler_damage(), //Thorns
    16624: handler_damage(), //Thorium Shield Spike
    12721: handler_damage(), //Deep Wounds

    //Bloodthirst
    23881: handler_damage(), //Rank 1
    23892: handler_damage(), //Rank 2
    23893: handler_damage(), //Rank 3
    23894: handler_damage(), //Rank 4
    23888: handler_zero(),   //Buff

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
    12798: handler_zero(),           //Revenge Stun

    //Cleave
      845: handler_threatOnHit(10),  //Rank 1
     7369: handler_threatOnHit(40),  //Rank 2
    11608: handler_threatOnHit(60),  //Rank 3
    11609: handler_threatOnHit(70),  //Rank 4
    20569: handler_threatOnHit(100), //Rank 5

    //Whirlwind
     1680: handler_damage(), //Whirlwind

    //Hamstring
    7373: handler_threatOnHit(145),

    //Intercept
    20252: handler_threatOnHit(0), //Intercept
    20253: handler_zero(),         //Intercept Stun (Rank 1)
    20616: handler_threatOnHit(0), //Intercept (Rank 2)
    20614: handler_zero(),         //Intercept Stun (Rank 2)
    20617: handler_threatOnHit(0), //Intercept (Rank 3)
    20615: handler_zero(),         //Intercept Stun (Rank 3)

    //Execute
    20647: (encounter, event) => {
        return event['amount'] + 1.2;
    },



    /* Abilities */
    //Sunder Armor
    11597: handler_castCanMiss(261), //Rank 5

    //Battleshout
    11551: handler_threatOnBuff(52), //Rank 6
    25289: handler_threatOnBuff(60), //Rank 7 (AQ)

    //Demo Shout
    11556: handler_threatOnDebuff(43),

    //Mocking Blow
    20560: handler_damage(), 


    /* Consumables */
    //Gift of Arthas
    11374: handler_threatOnDebuff(90),


    /* Damage/Weapon Procs */
    20007: handler_zero(),   //Heroic Strength (Crusader)
    18138: handler_damage(), //Deathbringer (Shadow Bolt)



    /* Zero Threat Abilities */
      355: handler_zero(), //Taunt
    10610: handler_zero(), //Windfury Totem
     2687: handler_zero(), //Bloodrage (cast)
    29131: handler_zero(), //Bloodrage (buff)
    29478: handler_zero(), //Battlegear of Might
    23602: handler_zero(), //Shield Specialization
    12964: handler_zero(), //Unbridled Wrath
    11578: handler_zero(), //Charge
     7922: handler_zero(), //Charge Stun
    18499: handler_zero(), //Berserker Rage
    12966: handler_zero(), //Flurry (Rank 1)
    12967: handler_zero(), //Flurry (Rank 2)
    12968: handler_zero(), //Flurry (Rank 3)
    12969: handler_zero(), //Flurry (Rank 4)
    12970: handler_zero(), //Flurry (Rank 5)
    12328: handler_zero(), //Death Wish
     1719: handler_zero(), //Recklessness
    20572: handler_zero(), //Blood Fury
    12323: handler_zero(), //Piercing Howl
    14204: handler_zero(), //Enrage

    /* Consumable Buffs */
    17528: handler_zero(), //Mighty Rage
    10667: handler_zero(), //Rage of Ages
    25804: handler_zero(), //Rumsey Rum Black Label
    17038: handler_zero(), //Winterfall Firewater
     8220: handler_zero(), //Savory Deviate Delight (Flip Out)
    17543: handler_zero(), //Fire Protection
    18125: handler_zero(), //Blessed Sunfruit
    17538: handler_zero(), //Elixir of the Mongoose
    11359: handler_zero(), //Restorative Potion (Restoration) Buff
    23396: handler_zero(), //Restorative Potion (Restoration) Dispell
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