var gAPIKey, gParse;


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

    getPlayer(playerID) {
        return this.friendlies.find(p => p.id == playerID);
    }

    getFriendlyEncounters(playerID) {
        let player = this.friendlies.find(p => p.id == playerID);
        let playerFights = player.fights.map(e => e.id);
        return this.encounters.filter(e => playerFights.includes(e.id));
    }

    getEncounter(id) {
        return this.encounters.find(e => e.id == id);
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

        this.events = [];
        this.playerIDs = [];
    }

    // Adding a method to the constructor
    parse(playerID, callback) {
        this.playerID = playerID;
        if (this.playerIDs.includes(playerID)) {
            this.calculate();
            callback(this);
        } else {
            this.playerIDs.push(playerID);
            this.fetch_events(() => {
                this.calculate();
                callback(this);
            });
        }
    }

    fetch_events(callback, startTimestamp=this.start) {
        $.get(`https://classic.warcraftlogs.com/v1/report/events/summary/${this.reportCode}?`+$.param({
            view: 'summary',
            sourceid: this.playerID,
            start: startTimestamp,
            end: this.stop,
            encounter: this.encounterID,
            translate: true,
            api_key: gAPIKey,
        }), (data) => {
            this.events.push(...data['events']);
            let nextPageTimestamp = data['nextPageTimestamp'];
            if (nextPageTimestamp) {
                this.fetch_events(callback, nextPageTimestamp);
            } else {
                callback();
            }
        });
    }

    calculate() {
        let p = gParse.getPlayer(this.playerID);
        this.player = new gClasses[p.type](this.playerID, this.events);

        // console.log(this.events, this.events.length);
        console.log("--------------------------------------------")
        console.log(`Beginning calculation of ${this._fight.name} (${this.time})`);
        

        this.threat = 0.0;
        this.breakdown = {};
        this.cast_count = {};
        for (let event of this.events) {
            if (event.sourceID != this.playerID)
                continue;

            let t = 0;
            let event_name = "";
            switch (event.type) {
                case 'combatantinfo': //TODO: Retrieve gear
                case 'extraattacks':
                    break;
                case 'heal':
                    // Amount healed always in event.amount, overhealing in event.overheal
                    t = (event.amount / 2.0) * this.player.threatModifier;
                    event_name = "Heal";
                    break;
                case 'energize':
                    // resourceChange is always the full amount, have to subtract event.waste
                    switch (event.resourceChangeType) {
                        case 0:
                            t = (event.resourceChange - event.waste) / 2.0;
                            event_name = "Mana Gains";
                            break;
                        case 1:
                            t = (event.resourceChange - event.waste) * 5.0;
                            event_name = "Rage Gains";
                            break;
                        default:
                            console.log(`Unhandled resource gain [${event.resourceChangeType}] ${event.ability.name} (${event.ability.guid})`)
                            continue;
                    }
                    break;
                case 'damage':
                    // Ignore self damage (e.g. sappers)
                    if (event.targetID == this.playerID)
                        continue;
                case 'cast':
                default:
                    let f = this.player.spell(event.ability.guid);
                    if (f == undefined) {
                        console.log(`Unhandled ability ${event.ability.name} (${event.ability.guid})`)
                        continue;
                    }
                    [t, event_name] = f(this.player, event);
                    t *= this.player.threatModifier;

                    if (event.type == 'cast') {
                        this.cast_count[event_name] = (this.cast_count[event_name]||0)+1;
                    }
            }
            if (t) {
                this.breakdown[event_name] = (this.breakdown[event_name]||0)+t;
            }

            // console.log(this.threat, t, event);
            this.threat += t;
        }
    }
}

class Enemy {
    constructor(enemyID, fightID) {
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

            $("#table").empty();
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
                    if (gClasses[player.type]) {
                        pList.append($('<option>', {
                            value: player.id,
                            text: `[${player.type}] ${player.name}`,
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


        let savedFightID = $('#encounterList option:selected').val();

        let encounters = gParse.getFriendlyEncounters(playerId);
        let eList = $('#encounterList').empty();
        for (boss of encounters) {
            eList.append($('<option>', {
                value: boss.id,
                text: `${boss.name} (${boss.time.toFixed(2)})`,
            }));
        }

        let reselectEncounter = $(this).find(`option[value=${savedFightID}]`)
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
