"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tags = void 0;
exports.Tags = {
    // Categories
    // ----------
    physical: {
        name: "Physical",
        desc: "Move deals damage with the Attack and Defense stats.",
        moveFilter: function (move) { return move.category === 'Physical'; },
    },
    special: {
        name: "Special",
        desc: "Move deals damage with the Special Attack and Special Defense stats.",
        moveFilter: function (move) { return move.category === 'Special'; },
    },
    status: {
        name: "Status",
        desc: "Move does not deal damage.",
        moveFilter: function (move) { return move.category === 'Status'; },
    },
    // Pokemon tags
    // ------------
    mega: {
        name: "Mega",
        speciesFilter: function (species) { return !!species.isMega; },
    },
    mythical: {
        name: "Mythical",
        speciesFilter: function (species) { return species.tags.includes("Mythical"); },
    },
    sublegendary: {
        name: "Sub-Legendary",
        speciesFilter: function (species) { return species.tags.includes("Sub-Legendary"); },
    },
    restrictedlegendary: {
        name: "Restricted Legendary",
        speciesFilter: function (species) { return species.tags.includes("Restricted Legendary"); },
    },
    paradox: {
        name: "Paradox",
        speciesFilter: function (species) { return species.tags.includes("Paradox"); },
    },
    // Move tags
    // ---------
    zmove: {
        name: "Z-Move",
        moveFilter: function (move) { return !!move.isZ; },
    },
    maxmove: {
        name: "Max Move",
        moveFilter: function (move) { return !!move.isMax; },
    },
    contact: {
        name: "Contact",
        desc: "Affected by a variety of moves, abilities, and items. Moves affected by contact moves include: Spiky Shield, King's Shield. Abilities affected by contact moves include: Iron Barbs, Rough Skin, Gooey, Flame Body, Static, Tough Claws. Items affected by contact moves include: Rocky Helmet, Sticky Barb.",
        moveFilter: function (move) { return 'contact' in move.flags; },
    },
    sound: {
        name: "Sound",
        desc: "Doesn't affect Soundproof Pokémon. (All sound moves also bypass Substitute.)",
        moveFilter: function (move) { return 'sound' in move.flags; },
    },
    powder: {
        name: "Powder",
        desc: "Doesn't affect Grass-type Pokémon, Overcoat Pokémon, or Safety Goggles holders.",
        moveFilter: function (move) { return 'powder' in move.flags; },
    },
    fist: {
        name: "Fist",
        desc: "Boosted 1.2x by Iron Fist.",
        moveFilter: function (move) { return 'punch' in move.flags; },
    },
    pulse: {
        name: "Pulse",
        desc: "Boosted 1.5x by Mega Launcher.",
        moveFilter: function (move) { return 'pulse' in move.flags; },
    },
    bite: {
        name: "Bite",
        desc: "Boosted 1.5x by Strong Jaw.",
        moveFilter: function (move) { return 'bite' in move.flags; },
    },
    ballistic: {
        name: "Ballistic",
        desc: "Doesn't affect Bulletproof Pokémon.",
        moveFilter: function (move) { return 'bullet' in move.flags; },
    },
    bypassprotect: {
        name: "Bypass Protect",
        desc: "Bypasses Protect, Detect, King's Shield, and Spiky Shield.",
        moveFilter: function (move) { return move.target !== 'self' && !('protect' in move.flags); },
    },
    nonreflectable: {
        name: "Nonreflectable",
        desc: "Can't be bounced by Magic Coat or Magic Bounce.",
        moveFilter: function (move) { return move.target !== 'self' && move.category === 'Status' && !('reflectable' in move.flags); },
    },
    nonmirror: {
        name: "Nonmirror",
        desc: "Can't be copied by Mirror Move.",
        moveFilter: function (move) { return move.target !== 'self' && !('mirror' in move.flags); },
    },
    nonsnatchable: {
        name: "Nonsnatchable",
        desc: "Can't be copied by Snatch.",
        moveFilter: function (move) { return ['allyTeam', 'self', 'adjacentAllyOrSelf'].includes(move.target) && !('snatch' in move.flags); },
    },
    bypasssubstitute: {
        name: "Bypass Substitute",
        desc: "Bypasses but does not break a Substitute.",
        moveFilter: function (move) { return 'bypasssub' in move.flags; },
    },
    gmaxmove: {
        name: "G-Max Move",
        moveFilter: function (move) { return typeof move.isMax === 'string'; },
    },
    // Tiers
    // -----
    uber: {
        name: "Uber",
        speciesFilter: function (species) { return species.tier === 'Uber' || species.tier === '(Uber)' || species.tier === 'AG'; },
    },
    ou: {
        name: "OU",
        speciesFilter: function (species) { return species.tier === 'OU' || species.tier === '(OU)'; },
    },
    uubl: {
        name: "UUBL",
        speciesFilter: function (species) { return species.tier === 'UUBL'; },
    },
    uu: {
        name: "UU",
        speciesFilter: function (species) { return species.tier === 'UU'; },
    },
    rubl: {
        name: "RUBL",
        speciesFilter: function (species) { return species.tier === 'RUBL'; },
    },
    ru: {
        name: "RU",
        speciesFilter: function (species) { return species.tier === 'RU'; },
    },
    nubl: {
        name: "NUBL",
        speciesFilter: function (species) { return species.tier === 'NUBL'; },
    },
    nu: {
        name: "NU",
        speciesFilter: function (species) { return species.tier === 'NU'; },
    },
    publ: {
        name: "PUBL",
        speciesFilter: function (species) { return species.tier === 'PUBL'; },
    },
    pu: {
        name: "PU",
        speciesFilter: function (species) { return species.tier === 'PU' || species.tier === '(NU)'; },
    },
    zu: {
        name: "ZU",
        speciesFilter: function (species) { return species.tier === '(PU)'; },
    },
    nfe: {
        name: "NFE",
        speciesFilter: function (species) { return species.tier === 'NFE'; },
    },
    lc: {
        name: "LC",
        speciesFilter: function (species) { return species.doublesTier === 'LC'; },
    },
    captier: {
        name: "CAP Tier",
        speciesFilter: function (species) { return species.isNonstandard === 'CAP'; },
    },
    caplc: {
        name: "CAP LC",
        speciesFilter: function (species) { return species.tier === 'CAP LC'; },
    },
    capnfe: {
        name: "CAP NFE",
        speciesFilter: function (species) { return species.tier === 'CAP NFE'; },
    },
    ag: {
        name: "AG",
        speciesFilter: function (species) { return species.tier === 'AG'; },
    },
    // Doubles tiers
    // -------------
    duber: {
        name: "DUber",
        speciesFilter: function (species) { return species.doublesTier === 'DUber' || species.doublesTier === '(DUber)'; },
    },
    dou: {
        name: "DOU",
        speciesFilter: function (species) { return species.doublesTier === 'DOU' || species.doublesTier === '(DOU)'; },
    },
    dbl: {
        name: "DBL",
        speciesFilter: function (species) { return species.doublesTier === 'DBL'; },
    },
    duu: {
        name: "DUU",
        speciesFilter: function (species) { return species.doublesTier === 'DUU'; },
    },
    dnu: {
        name: "DNU",
        speciesFilter: function (species) { return species.doublesTier === '(DUU)'; },
    },
    // Nat Dex tiers
    // -------------
    ndag: {
        name: "ND AG",
        speciesFilter: function (species) { return species.natDexTier === 'AG'; },
    },
    nduber: {
        name: "ND Uber",
        speciesFilter: function (species) { return species.natDexTier === 'Uber' || species.natDexTier === '(Uber)'; },
    },
    ndou: {
        name: "ND OU",
        speciesFilter: function (species) { return species.natDexTier === 'OU' || species.natDexTier === '(OU)'; },
    },
    nduubl: {
        name: "ND UUBL",
        speciesFilter: function (species) { return species.natDexTier === 'UUBL'; },
    },
    nduu: {
        name: "ND UU",
        speciesFilter: function (species) { return species.natDexTier === 'UU'; },
    },
    ndrubl: {
        name: "ND RUBL",
        speciesFilter: function (species) { return species.natDexTier === 'RUBL'; },
    },
    ndru: {
        name: "ND RU",
        speciesFilter: function (species) { return species.natDexTier === 'RU'; },
    },
    // Legality tags
    past: {
        name: "Past",
        genericFilter: function (thing) { return thing.isNonstandard === 'Past'; },
    },
    future: {
        name: "Future",
        genericFilter: function (thing) { return thing.isNonstandard === 'Future'; },
    },
    lgpe: {
        name: "LGPE",
        genericFilter: function (thing) { return thing.isNonstandard === 'LGPE'; },
    },
    unobtainable: {
        name: "Unobtainable",
        genericFilter: function (thing) { return thing.isNonstandard === 'Unobtainable'; },
    },
    cap: {
        name: "CAP",
        speciesFilter: function (thing) { return thing.isNonstandard === 'CAP'; },
    },
    custom: {
        name: "Custom",
        genericFilter: function (thing) { return thing.isNonstandard === 'Custom'; },
    },
    nonexistent: {
        name: "Nonexistent",
        genericFilter: function (thing) { return !!thing.isNonstandard && thing.isNonstandard !== 'Unobtainable'; },
    },
    // filter columns
    // --------------
    introducedgen: {
        name: "Introduced Gen",
        genericNumCol: function (thing) { return thing.gen; },
    },
    height: {
        name: "Height",
        speciesNumCol: function (species) { return species.heightm; },
    },
    weight: {
        name: "Weight",
        speciesNumCol: function (species) { return species.weightkg; },
    },
    hp: {
        name: "HP",
        desc: "Hit Points",
        speciesNumCol: function (species) { return species.baseStats.hp; },
    },
    atk: {
        name: "Atk",
        desc: "Attack",
        speciesNumCol: function (species) { return species.baseStats.atk; },
    },
    def: {
        name: "Def",
        desc: "Defense",
        speciesNumCol: function (species) { return species.baseStats.def; },
    },
    spa: {
        name: "SpA",
        desc: "Special Attack",
        speciesNumCol: function (species) { return species.baseStats.spa; },
    },
    spd: {
        name: "SpD",
        desc: "Special Defense",
        speciesNumCol: function (species) { return species.baseStats.spd; },
    },
    spe: {
        name: "Spe",
        desc: "Speed",
        speciesNumCol: function (species) { return species.baseStats.spe; },
    },
    bst: {
        name: "BST",
        desc: "Base Stat Total",
        speciesNumCol: function (species) { return species.bst; },
    },
    basepower: {
        name: "Base Power",
        moveNumCol: function (move) { return move.basePower; },
    },
    priority: {
        name: "Priority",
        moveNumCol: function (move) { return move.priority; },
    },
    accuracy: {
        name: "Accuracy",
        moveNumCol: function (move) { return move.accuracy === true ? 101 : move.accuracy; },
    },
    maxpp: {
        name: "Max PP",
        moveNumCol: function (move) { return move.pp; },
    },
};
