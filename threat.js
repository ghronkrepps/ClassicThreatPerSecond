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



function handler_zero(name) {
    return (encounter, event) => {
        return [0, name];
    }
}

function handler_changeThreatModifier(threatModifier, name) {
    return (encounter, event) => {
        encounter.threatModifier = threatModifier;
        return [0, name];
    }
}

function handler_castCanMiss(threatValue, name) {
    return (encounter, event) => {
        switch (event['type']) {
            case 'cast':
                return [threatValue, name];
            case 'damage':
                return [-threatValue, name];
        }
        return [0, name];
    }
}

function handler_damage(name) {
    return (encounter, event) => {
        if (event['type'] == 'damage') {
            return [event['amount'], name];
        }
        return [0, name];
    }
}

function handler_threatOnHit(threatValue=0, name) {
    return (encounter, event) => {
        if (event['type'] == 'damage' && event['hitType']<=6) {
            return [event['amount'] + threatValue, name];
        }
        return [0, name];
    }
}

function handler_threatOnDebuff(threatValue, name) {
    return (encounter, event) => {
        switch (event['type']) {
            case 'applydebuff':
            case 'refreshdebuff':
                return [threatValue, name];
        }
        return [0, name];
    }
}

function handler_threatOnBuff(threatValue, name) {
    return (encounter, event) => {
        switch (event['type']) {
            case 'applybuff':
            case 'refreshbuff':
                return [threatValue, name];
        }
        return [0, name];
    }
}

var gHandlers = {
    /* Stances */
      71: handler_changeThreatModifier(1.495, "Defensive Stance"),
    2457: handler_changeThreatModifier(0.8, "Battle Stance"),
    2458: handler_changeThreatModifier(0.8, "Berserker Stance"),


    /* Physical */
        1: handler_damage("Melee"),
     7919: handler_damage("Shoot Crossbow"),
    16624: handler_damage("Thorium Shield Spike"),
    12721: handler_damage("Deep Wounds"),
     6552: handler_damage("Pummel (Rank 1)"), // (TODO: Did this interrupt)
     6554: handler_damage("Pummel (Rank 2)"), // (TODO: Did this interrupt)

    23881: handler_damage("Bloodthirst"), //Rank 1
    23892: handler_damage("Bloodthirst"), //Rank 2
    23893: handler_damage("Bloodthirst"), //Rank 3
    23894: handler_damage("Bloodthirst"), //Rank 4
    23888: handler_zero("Bloodthirst"),   //Buff
    23885: handler_zero("Bloodthirst"),   //Buff

    //Heroic Strike
       78: handler_threatOnHit(20, "Heroic Strike"),
      284: handler_threatOnHit(39, "Heroic Strike"),
      285: handler_threatOnHit(59, "Heroic Strike"),
     1608: handler_threatOnHit(78, "Heroic Strike"),
    11564: handler_threatOnHit(98, "Heroic Strike"),
    11565: handler_threatOnHit(118, "Heroic Strike"),
    11566: handler_threatOnHit(137, "Heroic Strike"),
    11567: handler_threatOnHit(145, "Heroic Strike"),
    25286: handler_threatOnHit(175, "Heroic Strike"), // (AQ)

    //Shield Slam
    23925: handler_threatOnHit(250, "Shield Slam"), //Rank 4

    //Revenge
    11601: handler_threatOnHit(315, "Revenge"), //Rank 5
    25288: handler_threatOnHit(355, "Revenge"), //Rank 6 (AQ)
    12798: handler_zero("Revenge Stun"),           //Revenge Stun

    //Cleave
      845: handler_threatOnHit(10, "Cleave"),  //Rank 1
     7369: handler_threatOnHit(40, "Cleave"),  //Rank 2
    11608: handler_threatOnHit(60, "Cleave"),  //Rank 3
    11609: handler_threatOnHit(70, "Cleave"),  //Rank 4
    20569: handler_threatOnHit(100, "Cleave"), //Rank 5

    //Whirlwind
     1680: handler_damage("Whirlwind"), //Whirlwind

    //Hamstring
    7373: handler_threatOnHit(145, "Hamstring"),

    //Intercept
    20252: handler_threatOnHit(0, "Intercept"), //Intercept
    20253: handler_zero("Intercept Stun"),         //Intercept Stun (Rank 1)
    20616: handler_threatOnHit(0, "Intercept"), //Intercept (Rank 2)
    20614: handler_zero("Intercept Stun"),         //Intercept Stun (Rank 2)
    20617: handler_threatOnHit(0, "Intercept"), //Intercept (Rank 3)
    20615: handler_zero("Intercept Stun"),         //Intercept Stun (Rank 3)

    //Execute
    20647: (encounter, event) => {
        return [event['amount'] * 1.2, "Execute"];
    },



    /* Abilities */
    //Sunder Armor
    11597: handler_castCanMiss(261, "Sunder Armor"), //Rank 6

    //Battleshout
    11551: handler_threatOnBuff(52, "Battle Shout"), //Rank 6
    25289: handler_threatOnBuff(60, "Battle Shout"), //Rank 7 (AQ)

    //Demo Shout
    11556: handler_threatOnDebuff(43, "Demoralizing Shout"),

    //Mocking Blow
    20560: handler_damage("Mocking Blow"),


    /* Consumables */
    //Gift of Arthas
    11374: handler_threatOnDebuff(90, "Gift of Arthas"),


    /* Damage/Weapon Procs */
    20007: handler_zero("Heroic Strength (Crusader)"),   //Heroic Strength (Crusader)
    18138: handler_damage("Shadow Bolt (Deathbringer Proc)"), //Deathbringer (Shadow Bolt)

    /* Thorn Effects */
    9910: handler_damage("Thorns"),  //Thorns (Rank 6)
    17275: handler_damage("Heart of the Scale"), //Heart of the Scale
    22600: handler_damage("Force Reactive Disk"), //Force Reactive
    11350: handler_zero("Oil of Immolation"),   //Oil of Immolation (buff)
    11351: handler_damage("Oil of Immolation"), //Oil of Immolation (dmg)

    /* Explosives */
    13241: handler_damage("Goblin Sapper Charge"), //Goblin Sapper Charge


    /* Zero Threat Abilities */
      355: handler_zero("Taunt"), //Taunt
     1161: handler_zero("Challenging Shout"), //Challenging Shout
    10610: handler_zero("Windfury Totem"), //Windfury Totem
     2687: handler_zero("Bloodrage"), //Bloodrage (cast)
    29131: handler_zero("Bloodrage"), //Bloodrage (buff)
    29478: handler_zero("Battlegear of Might"), //Battlegear of Might
    23602: handler_zero("Shield Specialization"), //Shield Specialization
    12964: handler_zero("Unbridled Wrath"), //Unbridled Wrath
    11578: handler_zero("Charge"), //Charge
     7922: handler_zero("Charge Stun"), //Charge Stun
    18499: handler_zero("Berserker Rage"), //Berserker Rage
    12966: handler_zero("Flurry (Rank 1)"), //Flurry (Rank 1)
    12967: handler_zero("Flurry (Rank 2)"), //Flurry (Rank 2)
    12968: handler_zero("Flurry (Rank 3)"), //Flurry (Rank 3)
    12969: handler_zero("Flurry (Rank 4)"), //Flurry (Rank 4)
    12970: handler_zero("Flurry (Rank 5)"), //Flurry (Rank 5)
    12328: handler_zero("Death Wish"), //Death Wish
     1719: handler_zero("Recklessness"), //Recklessness
    20572: handler_zero("Blood Fury"), //Blood Fury
    12323: handler_zero("Piercing Howl"), //Piercing Howl
    14204: handler_zero("Enrage"), //Enrage
    12975: handler_zero("Last Stand (cast)"), //Last Stand (cast)
    12976: handler_zero("Last Stand (buff)"), //Last Stand (buff)
     2565: handler_zero("Shield Block"), //Shield Block
    26296: handler_zero("Berserking (Troll racial)"), //Berserking (Troll racial)
    26635: handler_zero("Berserking (Troll racial)"), //Berserking (Troll racial)
    22850: handler_zero("Sanctuary"), //Sanctuary
     9515: handler_zero("Summon Tracking Hound"), //Summon Tracking Hound

    /* Consumable Buffs (zero-threat) */
     6613: handler_zero("Great Rage Potion"), //Great Rage Potion
    17528: handler_zero("Mighty Rage Potion"), //Mighty Rage Potion
    10667: handler_zero("Rage of Ages"), //Rage of Ages
    25804: handler_zero("Rumsey Rum Black Label"), //Rumsey Rum Black Label
    17038: handler_zero("Winterfall Firewater"), //Winterfall Firewater
     8220: handler_zero("Savory Deviate Delight (Flip Out)"), //Savory Deviate Delight (Flip Out)
    17543: handler_zero("Fire Protection"), //Fire Protection
    17548: handler_zero("Greater Shadow Protection Potion"), //Greater Shadow Protection Potion
    18125: handler_zero("Blessed Sunfruit"), //Blessed Sunfruit
    17538: handler_zero("Elixir of the Mongoose"), //Elixir of the Mongoose
    11359: handler_zero("Restorative Potion (Restoration) Buff"), //Restorative Potion (Restoration) Buff
    23396: handler_zero("Restorative Potion (Restoration) Dispel"), //Restorative Potion (Restoration) Dispel
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
    $.get(`https://classic.warcraftlogs.com:443/v1/report/fights/${reportCode}?translate=true&api_key=${gAPIKey}`, (data) => {
        callback(new Parse(reportCode, data));
    }).fail((error) => {
        callback(undefined);
        alert(error.responseJSON.error);
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

        this.playerID = -1;
    }

    // Adding a method to the constructor
    parse(playerID, callback) {
        if (this.playerID == playerID)
            return callback(this);
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
        this.breakdown = {};
        this.cast_count = {};
        for (let event of this.events) {
            if (event.sourceID != this.playerID)
                continue;

            let t = 0;
            let event_name = "";
            switch (event['type']) {
                case 'combatantinfo': //TODO: Retrieve gear
                case 'extraattacks':
                    break;
                case 'heal':
                    t = event.amount / 2;
                    event_name = "Heal";
                    break;
                case 'energize':
                    t = event.resourceChange * 5;
                    event_name = "Rage Gains";
                    break;
                default:
                    let f = gHandlers[event.ability.guid];
                    if (f == undefined) {
                        console.log(`Unhandled ability ${event.ability.name} (${event.ability.guid})`)
                        continue;
                    }
                    let threat_info = f(this, event);
                    t = threat_info[0];
                    event_name = threat_info[1];

                    if (event['type'] === 'cast') {
                        let cast_entry = this.cast_count[event_name];
                        if (cast_entry === undefined) {
                            this.cast_count[event_name] = 1;
                        } else {
                            this.cast_count[event_name]++;
                        }
                    }
            }
            // console.log(this.threat, t, event);
            this.threat += (t * this.threatModifier);

            if (t > 0) {
                let breakdown_entry = this.breakdown[event_name];
                if (breakdown_entry === undefined) {
                    this.breakdown[event_name] = t;
                } else {
                    this.breakdown[event_name] += t;
                }
            }
        }
    }
}

class Enemy {
    constructor(enemyID, encounterID) {
        this.id = enemyID;
        this.players = [];
    }

    addThreat(playerID, threat) {
        let player = this.players[playerID] || {threat:0};

        player.threat += threat;

        this.players[playerID] = player;
    }
}


$( document ).ready(function() {
    $("#reportForm").submit((event) => {
        gAPIKey = $("#api").val();
        let reportURL = $("#report").val();
        console.log(gAPIKey, reportURL);

        if (!gAPIKey || !reportURL) {
            alert("Fill in the damn form");
        } else {
            let reportID = reportURL;
            try {
                reportID = /^https?:\/\/classic\.warcraftlogs\.com\/reports\/(.*?)(#.*)?$/.exec(reportURL)[1];
            } catch (error) {}

            $("#results").empty();
            $('#parseForm').hide();
            $("#reportForm > input[type='submit']").attr("disabled", true);
            newParse(reportID, (p) => {
                $("#reportForm > input[type='submit']").removeAttr("disabled");
                if (!p) {return};
                gParse = p;

                $("#parseTitle").text(gParse.title);

                let pList = $('#playerList');
                pList.empty();
                for (player of p.friendlies) {
                    if (player.type == "Warrior") {
                        pList.append($('<option>', {
                            value: player.id,
                            text: player.name,
                        }));
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


        let savedEncounterID = $('#encounterList option:selected').val();

        let encounters = gParse.getFriendlyEncounters(playerId);
        let eList = $('#encounterList').empty();
        for (boss of encounters) {
            eList.append($('<option>', {
                value: boss.encounterID,
                text: `${boss.name} (${boss.time.toFixed(2)})`,
            }));
        }

        let reselectEncounter = $(this).find(`option[value=${savedEncounterID}]`)
        if (reselectEncounter) {
            reselectEncounter.attr('selected','selected');
        }

        eList.trigger('change');
    });

    $("#parseForm").submit((event) => {
        let encounterID = $('#encounterList option:selected').val();
        let playerID = $('#playerList option:selected').val();

        let encounter = gParse.getEncounter(encounterID);
        encounter.parse(playerID, (e) => {
            let playerName = $('#playerList option:selected').text();
            let results = $("#results").empty();
            results.append($('<h1>', {text: `${playerName} - ${e.name} (${e.time.toFixed(2)})`}));
            results.append($('<div>', {text: `Total threat: ${e.threat.toFixed(0)}`}));
            results.append($('<div>', {text: `TPS: ${(e.threat / e.time).toFixed(2)}`}));

            let entries = Object.entries(e.breakdown);
            entries.sort(function (a, b) {
                return b[1] - a[1];
            });

            google.charts.load('current', {'packages': ['corechart', 'table']});
            google.charts.setOnLoadCallback(function () {
                numberFormat = new google.visualization.NumberFormat({ fractionDigits: 1 })
                percentFormat = new google.visualization.NumberFormat({ fractionDigits: 2, suffix: "%" });
                let dataTable = new google.visualization.DataTable();
                dataTable.addColumn('string', "Source");
                dataTable.addColumn('string', "Casts");
                dataTable.addColumn('string', "CPM");
                dataTable.addColumn('number', "Threat");
                dataTable.addColumn('number', "TPS");
                dataTable.addColumn('number', "Percent");
                dataTable.addRows(entries.map((value, index, array) => {
                    let abilityThreat = value[1];
                    let percentage = 100 * abilityThreat / e.threat;
                    let tps = abilityThreat / e.time;
                    let name = value[0];
                    let casts = e.cast_count[name];
                    let cpm = 60 * casts / e.time;
                    if (isNaN(cpm)) {
                        cpm = "--";
                    } else {
                        cpm = cpm.toFixed(1);
                    }

                    if (isNaN(casts)) {
                        casts = "--"
                    } else {
                        casts = casts.toString()
                    }
                    return [ name, casts, cpm, abilityThreat, tps, percentage ];
                }));
                let table = new google.visualization.Table(document.getElementById("table"));
                numberFormat.format(dataTable, 4);
                percentFormat.format(dataTable, 5);
                table.draw(dataTable);
            });
        });

        event.preventDefault();
        return false;
    })
});
