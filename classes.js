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
    return (player, event) => {
        return [0, name];
    }
}

function handler_changeThreatModifier(threatModifier, name) {
    return (player, event) => {
        player.threatModifier = threatModifier;
        return [0, name];
    }
}

function handler_castCanMiss(threatValue, name) {
    return (player, event) => {
        switch (event.type) {
            case 'cast':
                return [threatValue, name];
            case 'damage':
                return [-threatValue, name];
        }
        return [0, name];
    }
}

function handler_modDamage(threatMod, name) {
    return (player, event) => {
        if (event.type == 'damage') {
            return [event['amount']*threatMod, name];
        }
        return [0, name];
    }
}

function handler_damage(name) {
    return (player, event) => {
        if (event.type == 'damage') {
            return [event['amount'], name];
        }
        return [0, name];
    }
}

function handler_threatOnHit(threatValue=0, name) {
    return (player, event) => {
        if (event.type == 'damage' && event['hitType']<=6) {
            return [event['amount'] + threatValue, name];
        }
        return [0, name];
    }
}

function handler_threatOnDebuff(threatValue, name) {
    return (player, event) => {
        switch (event.type) {
            case 'applydebuff':
            case 'refreshdebuff':
                return [threatValue, name];
        }
        return [0, name];
    }
}

function handler_threatOnBuff(threatValue, name) {
    return (player, event) => {
        switch (event.type) {
            case 'applybuff':
            case 'refreshbuff':
                return [threatValue, name];
        }
        return [0, name];
    }
}


class Player {
    classSpells = {};

    globalSpells = {
        /* Physical */
            1: handler_damage("Melee"),
         7919: handler_damage("Shoot Crossbow"),
        16624: handler_damage("Thorium Shield Spike"),
    

        /* Consumables */
        11374: handler_threatOnDebuff(90, "Gift of Arthas"),
    
    
        /* Damage/Weapon Procs */
        20007: handler_zero("Heroic Strength (Crusader)"),
        18138: handler_damage("Shadow Bolt (Deathbringer Proc)"),
        24388: handler_damage("Brain Damage (Lobotomizer Proc)"),
        23267: handler_damage("Firebolt (Perdition's Proc)"),
        18833: handler_damage("Firebolt (Alcor's Proc)"),
        
        21992: (player, event) => {
            switch (event.type) {
                case 'applydebuff':
                case 'refreshdebuff':
                    return [90, "Thunderfury"];
                case 'damage':
                    return [event['amount'], "Thunderfury"];
            }
            return [0, "Thunderfury"];
        },
        27648: handler_threatOnDebuff(145, "Thunderfury"),
        
        /* Thorn Effects */
         9910: handler_damage("Thorns"),  //Thorns (Rank 6)
        17275: handler_damage("Heart of the Scale"), //Heart of the Scale
        22600: handler_damage("Force Reactive Disk"), //Force Reactive
        11350: handler_zero("Oil of Immolation"),   //Oil of Immolation (buff)
        11351: handler_damage("Oil of Immolation"), //Oil of Immolation (dmg)
        
        /* Explosives */
        13241: handler_damage("Goblin Sapper Charge"), //Goblin Sapper Charge
    
    
        /* Zero Threat Abilities */
        10610: handler_zero("Windfury Totem"), //Windfury Totem
        20572: handler_zero("Blood Fury"), //Blood Fury
        26296: handler_zero("Berserking (Troll racial)"), //Berserking (Troll racial)
        26635: handler_zero("Berserking (Troll racial)"), //Berserking (Troll racial)
        22850: handler_zero("Sanctuary"), //Sanctuary
         9515: handler_zero("Summon Tracking Hound"), //Summon Tracking Hound
    
        /* Consumable Buffs (zero-threat) */
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

    constructor(playerID, events) {
        this.id = playerID;
        this.threatModifier = 0.0;
    }

    spell(id) {
        return this.classSpells[id] || this.globalSpells[id];
    }
}




class Warrior extends Player {
    classSpells = {
        /* Stances */
        71: handler_changeThreatModifier(1.495, "Defensive Stance"),
        2457: handler_changeThreatModifier(0.8, "Battle Stance"),
        2458: handler_changeThreatModifier(0.8, "Berserker Stance"),

        /* Physical */
        12721: handler_damage("Deep Wounds"),
         6552: handler_threatOnHit(60, "Pummel (Rank 1)"), //TODO: Verify these values ingame
         6554: handler_threatOnHit(80, "Pummel (Rank 2)"),
        
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
        23922: handler_threatOnHit(166, "Shield Slam (Rank 1)"), //Rank 1
        23923: handler_threatOnHit(200, "Shield Slam (Rank 2)"), //Rank 2
        23924: handler_threatOnHit(225, "Shield Slam (Rank 3)"), //Rank 3
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
        20647: handler_modDamage(1.25, "Execute"),
     
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



        /* Zero threat abilities */
         355: handler_zero("Taunt"), //Taunt
        1161: handler_zero("Challenging Shout"), //Challenging Shout
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
         871: handler_zero("Shield Wall"),
        1719: handler_zero("Recklessness"), //Recklessness
       12323: handler_zero("Piercing Howl"), //Piercing Howl
       14204: handler_zero("Enrage"), //Enrage
       12975: handler_zero("Last Stand (cast)"), //Last Stand (cast)
       12976: handler_zero("Last Stand (buff)"), //Last Stand (buff)
        2565: handler_zero("Shield Block"), //Shield Block


        /* Consumable */
         6613: handler_zero("Great Rage Potion"), //Great Rage Potion
        17528: handler_zero("Mighty Rage Potion"), //Mighty Rage Potion
    }

    constructor(playerID, events) {
        super(playerID, events);

        // Identify the starting stance based on ability usage
        let startStance = this.identify_start_stance(events);
        if (startStance == 0)
            throw "Failed to identify starting stance";
        let [_, stanceName] = this.spell(startStance)(this);

        console.log(`Identified starting stance as '${stanceName}' using modifier ${this.threatModifier}`);
    }

    identify_start_stance(events) {
        let possibleStances = [71, 2457, 2458];
        for (let event of events) {
            if (event.sourceID != this.id)
                continue;
            if (event.type == 'cast') {
                switch (event.ability.guid) {
                    //Overpower
                    case 7384:
                    case 7887:
                    case 11584:
                    case 11585:
                    //Charge
                    case 100:
                    case 6178:
                    case 11578:
                    //Thunderclap
                    case 6343:
                    case 8198:
                    case 8204:
                    case 8205:
                    case 11580:
                    case 11581:
                    //Mocking Blow
                    case 694:
                    case 7400:
                    case 7402:
                    case 20559:
                    case 20560:
                    //Retaliation
                    case 20230:
                    //Sweeping Strikes
                    case 12292:
                        return 2457; //Battle Stance

                    //Intercept
                    case 20252:
                    case 20617:
                    case 20616:
                    //Whirlwind
                    case 1680:
                    //Berserker Rage
                    case 18499:
                    //Recklessness
                    case 1719:
                    //Pummel
                    case 6552:
                    case 6554:
                        return 2458; //Berserker Stance

                    //Taunt
                    case 355:
                    //Disarm
                    case 676:
                    //Revenge
                    case 6572:
                    case 6574:
                    case 7379:
                    case 11600:
                    case 11601:
                    case 25288:
                    //Shield Block
                    case 2565:
                    //Shield Wall
                    case 871:
                        return 71; //Defensive Stance
                    
                    //Hamstring
                    case 1715:
                    case 7372:
                    case 7373:
                    //Execute
                    case 5308:
                    case 20658:
                    case 20660:
                    case 20661:
                    case 20662:
                        possibleStances.filter(s => s!=71)
                        break;
                    
                    //Rend
                    case 772:
                    case 6546:
                    case 6547:
                    case 6548:
                    case 11572:
                    case 11573:
                    case 11574:
                    //Shield Bash
                    case 72:
                    case 1671:
                    case 1672:
                        possibleStances.filter(s => s!=2458)
                        break;
                }
                if (possibleStances.length == 1)
                    return possibleStances[0];
            } else if (event.type == 'removebuff') {
                if (possibleStances.includes(event.ability.guid)) {
                    return event.ability.guid;
                }
            }
        }
        return 0;
    }
}


class Druid extends Player {
    classSpells = {
        /* Forms */
        9634: handler_changeThreatModifier(1.45, "Bear Form"),
        768: handler_changeThreatModifier(0.71, "Cat Form"),

        /* Bear */
         6807: handler_modDamage(1.75, "Maul (Rank 1)"),
         6808: handler_modDamage(1.75, "Maul (Rank 2)"),
         6809: handler_modDamage(1.75, "Maul (Rank 3)"),
         8972: handler_modDamage(1.75, "Maul (Rank 4)"),
         9745: handler_modDamage(1.75, "Maul (Rank 5)"),
         9880: handler_modDamage(1.75, "Maul (Rank 6)"),
         9881: handler_modDamage(1.75, "Maul"),

          779: handler_modDamage(1.75, "Swipe (Rank 1)"),
          780: handler_modDamage(1.75, "Swipe (Rank 2)"),
          769: handler_modDamage(1.75, "Swipe (Rank 3)"),
         9754: handler_modDamage(1.75, "Swipe (Rank 4)"),
         9908: handler_modDamage(1.75, "Swipe"),

           99: handler_threatOnDebuff(9, "Demoralizing Roar (Rank 1)"),
         1735: handler_threatOnDebuff(15, "Demoralizing Roar (Rank 2)"),
         9490: handler_threatOnDebuff(20, "Demoralizing Roar (Rank 3)"),
         9747: handler_threatOnDebuff(30, "Demoralizing Roar (Rank 4)"),
         9898: handler_threatOnDebuff(39, "Demoralizing Roar"),

         6795: handler_zero("Growl"),
         5229: handler_zero("Enrage"),
        17057: handler_zero("Furor"),

         8983: handler_zero("Bash"), //TODO test bash threat

        /* Cat */
         9850: handler_damage("Claw"),
         9830: handler_damage("Shred"),
         9904: handler_damage("Rake"),
        22829: handler_damage("Ferocious Bite"),
         9867: handler_damage("Ravage"),
         9896: handler_damage("Rip"),
         9827: handler_damage("Pounce"),
         9913: handler_zero("Prowl"),
         9846: handler_zero("Tiger's Fury"),

         1850: handler_zero("Dash (Rank 1)"),
         9821: handler_zero("Dash"),
         
         8998: handler_castCanMiss(-240, "Cower (Rank 1)"),
         9000: handler_castCanMiss(-390, "Cower (Rank 2)"),
         9892: handler_castCanMiss(-600, "Cower"),

        /* Healing */
        //TODO

        /* Abilities */
        16857: handler_threatOnDebuff(108, "Faerie Fire (Feral)(Rank 1)"),
        17390: handler_threatOnDebuff(108, "Faerie Fire (Feral)(Rank 2)"),
        17391: handler_threatOnDebuff(108, "Faerie Fire (Feral)(Rank 3)"),
        17392: handler_threatOnDebuff(108, "Faerie Fire (Feral)"),
        
         770: handler_threatOnDebuff(108, "Faerie Fire (Rank 1)"),
         778: handler_threatOnDebuff(108, "Faerie Fire (Rank 2)"),
        9749: handler_threatOnDebuff(108, "Faerie Fire (Rank 3)"),
        9907: handler_threatOnDebuff(108, "Faerie Fire"),

        16870: handler_zero("Clearcasting"),
        29166: handler_zero("Innervate"),

        22842: handler_zero("Frienzed Regeneration (Rank 1)"),
        22895: handler_zero("Frienzed Regeneration (Rank 2)"),
        22896: handler_zero("Frienzed Regeneration"),

        24932: handler_zero("Leader of the Pack"),

        /* Items */
        13494: handler_zero("Manual Crowd Pummeler"),
    }

    constructor(playerID, events) {
        super(playerID, events);

        // Identify the starting form based on ability usage
        let startForm = this.identify_start_form(events);
        
        let _,stanceName
        if (startForm == -1) {
            stanceName = "Human"
            self.threatModifier = 1.0
            //throw "Failed to identify starting form";
        } else {
            [_, stanceName] = this.spell(startForm)(this);
        }
        
        console.log(`Identified starting form as '${stanceName}' using modifier ${this.threatModifier}`);
    }

    identify_start_form(events) {
        for (let event of events) {
            if (event.sourceID != this.id)
                continue;
            if (event.type == 'cast') {
                switch (event.ability.guid) {
                    //Maul
                    case 6807:
                    case 6808:
                    case 6809:
                    case 8972:
                    case 9745:
                    case 9880:
                    case 9881:
                    //Swipe
                    case 779:
                    case 780:
                    case 769:
                    case 9754:
                    case 9908:
                    //Demoralizing Roar
                    case 99:
                    case 1735:
                    case 9490:
                    case 9747:
                    case 9898:
                    //Growl
                    case 6795:
                    //Enrage
                    case 5229:
                    //Furor
                    case 17057:
                    //Bash
                    case 8983:
                        return 9634; //Bear Form

                    //Claw
                    case 9850:
                    //Shred
                    case 9830:
                    //Rake
                    case 9904:
                    //Ferocious Bite
                    case 22829:
                    //Ravage
                    case 9867:
                    //Rip
                    case 9896:
                    //Pounce
                    case 9827:
                    //Prowl
                    case 9913:
                    //Tiger's Fury
                    case 9846:
                    //Dash`
                    case 1850:
                    case 9821:
                        return 768; //Cat Form
                        
                    //TODO Healing spells
                    case 0:
                        return 0;
                }
            } else if (event.type == 'removebuff') {
                if ([9634, 768].includes(event.ability.guid)) {
                    return event.ability.guid;
                }
            }
        }
        return -1;
    }
}

const gClasses = {
    "Warrior": Warrior,
    "Druid": Druid,
}
