// M.E.R.L.I.N. — Intro Texts
// 2-paragraph cinematic introductions by biome + season
// Specific situations, no filler — each intro sets the scene concretely

const SEASON_NAMES = ['Samhain', 'Imbolc', 'Bealtaine', 'Lughnasadh']

const INTRO_BY_BIOME = {
  broceliande: {
    default: [
      "Les brumes de Broceliande se levent lentement, devoilant les racines noueuses des chenes millenaires. Au loin, entre les troncs, une lueur ambre pulse — le Nemeton, coeur sacre de la foret. Les korrigans ont laisse des traces dans la rosee.",
      "Le sentier s'ouvre devant toi, etroit et sinueux. Merlin murmure dans le vent: 'Les signes de la foret te guideront, mais chaque choix porte son ombre.' Il n'y a pas de retour possible.",
    ],
    0: [
      "La nuit de Samhain enveloppe Broceliande. Le voile entre les mondes est si mince que les esprits anciens murmurent entre les chenes. Des feux follets dansent au sommet des menhirs, et les dolmens resonnent d'echos oublies.",
      "Merlin se tient au centre du cercle de pierres, nimbe d'une lueur bleue. 'Cette nuit, les morts parlent aux vivants. Ecoute-les bien.' Le froid mord ta peau. Le voile entre les mondes n'attend pas les hesitants.",
    ],
    1: [
      "Imbolc eveille la foret. Les premieres fleurs percent la neige sous les racines de Merlin, fragiles et obstinees. L'eau des sources sacrees recommence a couler, cristalline. Le corbeau revient — messager du druide.",
      "Dans la clairiere du Nemeton, Merlin pose sa main sur l'ecorce du chene-mere. 'La terre se souvient de tout. Que te racontera-t-elle?' Le soleil pale filtre entre les branches nues. Le renouveau commence.",
    ],
    2: [
      "Bealtaine embrase Broceliande d'or et de feu. Les fees dansent sur les sentiers oublies, leurs rires resonnent comme des clochettes d'argent. Les flammes sacrees ont ete allumees — le sidhe est ouvert cette nuit.",
      "Merlin observe les flammes, le regard lointain. 'Le feu revele la verite, mais il brule aussi ceux qui la fuient.' Les etincelles montent vers les etoiles. Quelque chose en toi repond a la chaleur — il est temps d'avancer.",
    ],
    3: [
      "Lughnasadh dore les feuillages de Broceliande. La moisson des ames approche sous le regard du druide. Les pierres murmurent plus fort que jamais, et chaque feuille qui tombe porte un secret.",
      "Merlin te tend une pomme doree. 'Le fruit de la connaissance a un prix. Es-tu pret a le payer?' L'automne murmure sa melancolie entre les branches. Le cycle touche a sa fin — ou a son recommencement.",
    ],
  },
  landes: {
    default: [
      "Les landes s'etendent a perte de vue, tapissees de bruyere pourpre et de genets d'or. Le vent hurle une complainte sans fin entre les menhirs solitaires. Pas d'arbres pour se cacher — la terre est nue, honnete, implacable.",
      "Au sommet de la colline la plus haute, un cairn ancien marque l'entree d'un tumulus. Les symboles graves sur les pierres commencent a luire. Merlin dit que les reponses se trouvent dans l'obscurite.",
    ],
  },
  cotes: {
    default: [
      "Les falaises plongent dans l'ocean tumultueux. Le sel et le vent portent la voix de creatures anciennes — sirenes, selkies, esprits des profondeurs. Les vagues frappent la roche avec la rage d'un geant enchaine.",
      "Dans une grotte a flanc de falaise, Merlin attend, assis sur un trone de varech. 'L'ocean ne ment jamais. Mais il ne dit pas toute la verite.' Le cri des mouettes se mele au grondement des vagues.",
    ],
  },
  monts: {
    default: [
      "Les monts sombres se dressent sous un ciel de plomb. Le voile entre les mondes est si mince qu'on peut voir les ombres des anciens marcher sur les cretes. Le brouillard s'accroche aux pentes comme un manteau vivant.",
      "Merlin t'attend au col, la ou les deux vallees se rencontrent. 'Les hauteurs offrent la clarte, mais elles exposent aussi a la foudre.' Le tonnerre gronde au loin. Les runes sur ton baton vibrent doucement.",
    ],
  },
  ile_sein: {
    default: [
      "L'Ile de Sein emerge des brumes comme un reve fragile. Neuf pretresses vivaient ici autrefois, maitresses de la guerison, de la tempete et de la prophetie. Leur presence hante encore chaque pierre de ce sanctuaire.",
      "Merlin est grave. 'Sein est le dernier bastion. Ce que tu trouveras ici changera tout — ou te consumera.' La barque t'a depose sur la greve. Le silence est assourdissant.",
    ],
  },
  huelgoat: {
    default: [
      "La foret de Huelgoat cache ses rochers geants sous un manteau de mousse et de mystere. Le chaos de rochers defie la raison — des blocs de granit empiles comme des jouets d'enfant. L'eau coule en dessous, invisible et chantante.",
      "Merlin rit doucement. 'Huelgoat est un puzzle. Chaque rocher est une reponse a une question que tu n'as pas encore posee.' Tu te faufiles entre les rochers moussus. Les korrigans observent, ils attendent.",
    ],
  },
  ecosse: {
    default: [
      "Les highlands ecossaises s'ouvrent devant toi. Les lochs sombres refletent un ciel ancien, charge de nuages voyageurs. La lande est couverte de bruyere et de fougere, et les ruines d'un broch pictish temoignent d'un peuple oublie.",
      "Merlin est venu ici jadis, dit la legende. 'L'Ecosse est la soeur jumelle de la Bretagne. Les memes mysteres, les memes pierres dressees, un autre vent.' Le vent d'Ecosse est plus froid. Mais la flamme interieure brule plus fort.",
    ],
  },
  iles_mystiques: {
    default: [
      "Les iles mystiques flottent entre reve et realite. Les cristaux anciens pulsent d'une lumiere qui n'appartient a aucun soleil connu. Les Tuatha De Danann ont marche sur ces rivages — leurs empreintes brillent encore dans le sable dore.",
      "Merlin hesite. Pour la premiere fois, tu le vois douter. 'Ces iles sont plus anciennes que moi. Plus anciennes que la memoire des pierres.' Les cristaux chantent une melodie inaudible. Tu es arrive au bout du monde connu.",
    ],
  },
}

export function getIntroText(biomeKey, seasonIndex = 0) {
  const biome = INTRO_BY_BIOME[biomeKey] ?? INTRO_BY_BIOME.broceliande
  return biome[seasonIndex] ?? biome.default
}

export function getSeasonName(seasonIndex) {
  return SEASON_NAMES[seasonIndex] ?? SEASON_NAMES[0]
}
