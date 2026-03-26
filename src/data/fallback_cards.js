// M.E.R.L.I.N. — Contextual Fallback Cards (56+ cards)
// Updated: short text (2-3 phrases, ~150 chars max)

import { FACTIONS, BIOME_FACTIONS } from '../game/constants.js'

function card(id, title, text, choices, tags = [], conditions = {}) {
  return { id, title, text, choices: choices.map(c => ({ label: c[0], preview: c[1] })), tags, conditions }
}

export const FALLBACK_POOLS = {
  early_game: [
    card('e01', 'Le Campement Lointain',
      'Des lueurs orangees dansent entre les arbres. Un campement protege par un cercle de pierres moussues. Un chien grogne dans ta direction.',
      [['L\'eviter prudemment', 'Prudent'], ['Observer depuis les taillis', 'Sagesse'], ['Approcher mains ouvertes', 'Social']], ['exploration'], { max_card: 30 }),

    card('e02', 'Le Chemin Divise',
      'Le sentier se scinde a la hauteur d\'un vieux frene. Un chemin monte vers la lumiere, l\'autre s\'enfonce dans l\'ombre. Un corbeau attend ta decision.',
      [['Vers la lumiere', 'Spirituel'], ['Mediter au carrefour', 'Sagesse'], ['Vers l\'ombre', 'Mystere']], ['exploration'], { max_card: 30 }),

    card('e03', 'Le Ruisseau Chantant',
      'Un ruisseau cristallin murmure une melodie ancienne. L\'air sent la menthe sauvage. Un sentiment de paix t\'envahit, presque suspect.',
      [['Se reposer au bord', 'Repos'], ['Ecouter la melodie', 'Sagesse'], ['Traverser et continuer', 'Avancer']], ['nature'], { max_card: 30 }),

    card('e04', 'Les Premiers Oghams',
      'Des Oghams creusent l\'ecorce d\'un chene millenaire. La seve suinte comme des larmes dorees. Une vibration pulse sous ta paume.',
      [['Dechiffrer les signes', 'Sagesse'], ['Tracer ton propre Ogham', 'Audace'], ['Passer ton chemin', 'Ignorer']], ['magic'], { max_card: 30 }),

    card('e05', 'La Clairiere du Gui',
      'Du gui sacre scintille sur un chene venerable. Des offrandes anciennes jonchent le pied du tronc. Un silence sacre regne ici.',
      [['Cueillir le gui', 'Nature'], ['Prier les anciens', 'Piete'], ['Observer les oiseaux', 'Calme']], ['nature'], { max_card: 30 }),

    card('e06', 'Le Renard Argente',
      'Un renard au pelage d\'argent t\'observe depuis un rocher. Ses yeux brillent d\'une intelligence surnaturelle. Il fait quelques pas vers un sentier cache, puis attend.',
      [['Le suivre', 'Aventure'], ['Lui offrir un morceau', 'Generosite'], ['Le laisser partir', 'Respect']], ['creature'], { max_card: 30 }),

    card('e07', 'La Brume du Matin',
      'La brume efface le monde a trois pas. Des formes dansent a la limite de ta vision. Quelque part, une cloche tinte comme un battement de coeur.',
      [['Avancer prudemment', 'Prudent'], ['Invoquer les Oghams', 'Magie'], ['Courir a travers', 'Audace']], ['atmosphere'], { max_card: 30 }),

    card('e08', 'Le Cercle de Pierres',
      'Un cercle de menhirs vibre d\'une energie ancienne. Des spirales semblent bouger dans la lumiere. Les oiseaux se sont tus. Le cercle attend.',
      [['Entrer dans le cercle', 'Risque'], ['Mediter a l\'exterieur', 'Sagesse'], ['Contourner', 'Prudent']], ['magic'], { max_card: 30 }),

    card('e09', 'L\'Oiseau Messager',
      'Un corbeau d\'un noir absolu porte un ruban rouge a sa patte. Il croasse trois fois, puis depose a tes pieds une pierre gravee d\'un Ogham inconnu.',
      [['Prendre la pierre gravee', 'Curiosite'], ['Nourrir l\'oiseau', 'Generosite'], ['L\'ignorer', 'Refuser']], ['creature'], { max_card: 30 }),

    card('e10', 'Le Vieux Pont',
      'Un pont de pierre enjambe un torrent tumultueux. Les dalles sont couvertes de mousse. Le pont tremble sous tes pieds.',
      [['Traverser avec soin', 'Prudent'], ['Chercher un gue en amont', 'Exploration'], ['Sauter le torrent', 'Audace']], ['exploration'], { max_card: 30 }),

    card('e10', 'La Source Sacree',
      'Une source jaillit entre les racines d\'un chene. L\'eau brille d\'eclats dores. Les blessures des voyageurs s\'y apaisent, dit-on.',
      [['Boire de l\'eau', 'Soin'], ['Remplir ta gourde', 'Prevoyant'], ['Mediter aupres de la source', 'Spirituel']], ['healing', 'nature'], { max_card: 30 }),

    card('e11', 'L\'Herboriste Solitaire',
      'Une vieille femme cueille des simples pres du sentier. Son regard est bienveillant. "Prends ceci, voyageur. Tu en auras besoin."',
      [['Accepter le remede', 'Soin'], ['Demander ses conseils', 'Sagesse'], ['La remercier et continuer', 'Respect']], ['healing', 'stranger'], { max_card: 30 }),
  ],

  mid_game: [
    card('m01', 'Le Voyageur Mysterieux',
      'Un voyageur encapuchonne connait ton nom. Son visage porte des tatouages spirales d\'initie. Ses yeux brillent d\'un savoir inquietant.',
      [['Se mefier et reculer', 'Prudent'], ['Parlementer', 'Diplomatie'], ['Ecouter son recit', 'Ouvert']], ['stranger'], { min_card: 10, max_card: 50 }),

    card('m02', 'Le Banquet des Korrigans',
      'Des korrigans festoient sous un dolmen phosphorescent. L\'un leve sa coupe: "Rejoins la fete! Mais ceux qui mangent ici ne repartent pas toujours..."',
      [['Refuser poliment', 'Sage'], ['Danser avec eux', 'Feerie'], ['Voler leur tresor', 'Risque']], ['creature'], { min_card: 10 }),

    card('m03', 'La Tempete d\'Ames',
      'Le ciel se dechire. Des voix anciennes hurlent dans le vent. Des silhouettes translucides courent a travers les eclairs. La tempete n\'est pas naturelle.',
      [['S\'abriter et attendre', 'Survie'], ['Ecouter les voix', 'Mystique'], ['Affronter la tempete', 'Courage']], ['danger'], { min_card: 15 }),

    card('m04', 'Le Marche des Ombres',
      'Un marche apparait dans la brume. Les etals vendent des souvenirs d\'enfance et des larmes cristallisees. Aucun marchand ne projette d\'ombre.',
      [['Marchander un objet', 'Commerce'], ['Observer les marchands', 'Discretion'], ['Traverser sans rien toucher', 'Prudent']], ['mystery'], { min_card: 10 }),

    card('m05', 'La Source Empoisonnee',
      'Une source sacree suinte noire et visqueuse. Les arbres proches ont perdu leurs feuilles. Une presence malveillante rode sous la surface.',
      [['Chercher la cause en amont', 'Enquete'], ['Tenter un rituel de purification', 'Magie'], ['S\'eloigner rapidement', 'Eviter']], ['danger'], { min_card: 10 }),

    card('m06', 'Le Pacte du Loup',
      'Un loup immense se dresse sur le sentier. Ses yeux sont trop humains. Une cicatrice en forme d\'Ogham marque son flanc. Il veut quelque chose de toi.',
      [['Montrer sa gorge', 'Soumission'], ['Communier avec lui', 'Lien'], ['Grogner en retour', 'Defi']], ['creature'], { min_card: 15 }),

    card('m07', 'Le Chant du Barde',
      'Un barde joue une melodie si belle que les pierres pleurent. "Chaque chanson est une porte, voyageur. Laquelle veux-tu franchir?"',
      [['Ecouter en silence', 'Sagesse'], ['Joindre ta voix a la sienne', 'Art'], ['Demander un chant guerrier', 'Social']], ['npc'], { min_card: 10 }),

    card('m08', 'La Porte Cachee',
      'Derriere la cascade, une porte gravee de spirales pulse d\'une lueur bleue. Un souffle chaud emane de la pierre. Quelque chose respire de l\'autre cote.',
      [['Ouvrir la porte', 'Risque'], ['Dechiffrer les spirales', 'Sagesse'], ['Sceller la porte', 'Prudent']], ['mystery'], { min_card: 15 }),

    card('m09', 'L\'Epreuve du Feu',
      'Un cercle de flammes t\'entoure. Merlin t\'observe: "Le feu revele ce que l\'ombre cache. Montre-moi ce que tu es vraiment."',
      [['Traverser les flammes', 'Courage'], ['Mediter au centre', 'Sagesse'], ['Appeler Merlin a l\'aide', 'Humilite']], ['trial'], { min_card: 15 }),

    card('m10', 'Le Miroir d\'Eau',
      'Un lac immobile reflete un ciel etranger. Ton reflet te fixe avec un sourire que tu ne portes pas, puis leve une main que tu n\'as pas bougee.',
      [['Plonger dans le lac', 'Audace'], ['Toucher la surface', 'Curiosite'], ['Reculer lentement', 'Prudent']], ['magic'], { min_card: 10 }),
  ],

  late_game: [
    card('l01', 'Les Signes Anciens',
      'Les anciens signes brillent sur chaque pierre. Des glyphes d\'avant les druides. Le voile entre les mondes s\'amincit a chaque pas.',
      [['Les dechiffrer un par un', 'Magie'], ['Observer le schema global', 'Sagesse'], ['Les ignorer et avancer', 'Pratique']], ['magic'], { min_card: 20 }),

    card('l02', 'Le Jugement de Merlin',
      'Merlin, plus grave que jamais: "Chaque choix t\'a mene ici. Les factions observent, les esprits jugent. Montre-moi que j\'ai eu raison de te choisir."',
      [['Montrer ta sagesse', 'Sagesse'], ['Montrer ta force', 'Force'], ['Montrer ton humilite', 'Humilite']], ['merlin'], { min_card: 25 }),

    card('l03', 'La Derniere Epreuve',
      'Le nemeton sacre se revele — des arbres petrifies en colonnes de pierre vivante. Les druides passes chuchotent ton nom. C\'est ici que tout se decide.',
      [['Entrer avec respect', 'Sage'], ['Invoquer les Oghams', 'Magie'], ['Foncer tete baissee', 'Audace']], ['trial'], { min_card: 25 }),

    card('l04', 'L\'Ombre du Passe',
      'Tes choix passes se materialisent devant toi. Chaque ombre porte le visage de quelqu\'un que tu as aide ou abandonne. "Nous sommes le poids de ton passage."',
      [['Les accepter comme tiennes', 'Sagesse'], ['Les affronter en duel', 'Courage'], ['Les fuir dans la brume', 'Risque']], ['consequence'], { min_card: 20 }),

    card('l05', 'Le Crepuscule des Dieux',
      'Le ciel s\'embrase de couleurs impossibles. Les anciens dieux observent depuis les nuages. Ton dernier choix determinera le destin du monde entier.',
      [['S\'agenouiller', 'Humilite'], ['Lever les bras au ciel', 'Invocation'], ['Marcher droit sans flechir', 'Determination']], ['climax'], { min_card: 25 }),

    card('l06', 'Le Pont entre les Mondes',
      'Un pont de brume relie deux collines. D\'un cote le monde des vivants, de l\'autre le Sidhe. Merlin attend au milieu. "Ose-tu traverser?"',
      [['Traverser vers le Sidhe', 'Audace'], ['Rester du cote des vivants', 'Prudent'], ['Parler a Merlin d\'abord', 'Sagesse']], ['sacred', 'magic'], { min_card: 18 }),

    card('l07', 'La Meute des Ombres',
      'Des loups spectraux encerclent le sentier. Leurs yeux luisent d\'une intelligence surnaturelle. L\'alpha te fixe — il veut quelque chose.',
      [['Soutenir son regard', 'Courage'], ['Offrir de la nourriture', 'Diplomatie'], ['Invoquer une protection', 'Magie']], ['creature', 'danger'], { min_card: 15 }),

    card('l08', 'La Forge des Ames',
      'Une forge abandonnee fume encore. L\'enclume porte des marques d\'Oghams. Un marteau pulse d\'energie. "Forge ton propre destin", murmure le vent.',
      [['Forger une arme', 'Force'], ['Forger un talisman', 'Magie'], ['Laisser la forge en paix', 'Respect']], ['sacred', 'stranger'], { min_card: 15 }),

    card('l09', 'Le Conseil des Anciens',
      'Six silhouettes encapuchonnees forment un cercle. Chacune represente une faction. Elles parlent en meme temps: "Qui soutiens-tu?"',
      [['Les Druides et la Sagesse', 'Sagesse'], ['Les Guerriers et la Force', 'Force'], ['L\'Equilibre entre tous', 'Diplomatie']], ['sacred', 'trial'], { min_card: 20 }),

    card('l10', 'La Prophetie Oubliee',
      'Un parchemin tombe du ciel, brillant de runes. La prophetie parle de toi — ou de quelqu\'un qui te ressemble. Les mots changent quand tu les lis.',
      [['Lire a voix haute', 'Audace'], ['Garder le parchemin', 'Prudent'], ['Le bruler dans le feu', 'Destruction']], ['magic', 'mystery'], { min_card: 18 }),
  ],

  crisis: [
    card('c01', 'La Source Claire',
      'Une source claire emerge entre les roches. L\'eau chante un appel de guerison. Des fleurs blanches poussent tout autour. Tes forces reviendront.',
      [['Se reposer longuement', 'Recuperation'], ['Mediter au bord', 'Paix'], ['Boire vite et repartir', 'Energie']], ['recovery']),

    card('c02', 'L\'Abri Naturel',
      'Un creux entre les racines d\'un chene immense, tapisse de mousse douce. L\'arbre se penche pour te proteger. Un sanctuaire pour voyageurs epuises.',
      [['S\'abriter et dormir', 'Repos'], ['Mediter en securite', 'Paix'], ['Pousser encore un peu', 'Risque']], ['recovery']),

    card('c03', 'Le Don de la Foret',
      'Des baies lumineuses pulsent au pied d\'un vieux chene, comme de petits coeurs vegetaux. Les Oghams disent: "Prends ce que la foret offre."',
      [['Manger les baies', 'Guerir'], ['Remercier l\'arbre', 'Gratitude'], ['Les garder pour plus tard', 'Prudent']], ['recovery']),

    card('c04', 'Le Souffle du Vent',
      'Un vent doux et chaud t\'enveloppe. Il porte l\'odeur des prairies de ton enfance. Les feuilles dansent en spirales d\'Oghams ephemeres.',
      [['Se laisser porter', 'Abandon'], ['Canaliser le vent', 'Pouvoir'], ['Resister au confort', 'Endurance']], ['recovery']),

    card('c05', 'La Priere de Minuit',
      'Les etoiles s\'alignent en "Roue d\'Argent." L\'air vibre d\'une energie propice a la guerison. Les pierres elles-memes semblent prier avec toi.',
      [['Prier pour la force', 'Vigueur'], ['Prier pour la sagesse', 'Sagesse'], ['Prier pour la paix', 'Harmonie']], ['recovery']),
  ],

  universal: [
    card('u01', 'Le Vent des Secrets',
      'Le vent murmure des secrets entre les feuilles mortes. Des lettres d\'Ogham se forment brievement dans le tourbillon avant de se disperser.',
      [['Ecouter attentivement', 'Sagesse'], ['Mediter sur le message', 'Paix'], ['Ignorer et continuer', 'Continuer']], ['nature']),

    card('u02', 'La Route Continue',
      'La foret change imperceptiblement a chaque pas. Les chenes cedent aux bouleaux, puis aux ifs. Un chant d\'oiseau presque humain resonne au loin.',
      [['Avancer prudemment', 'Prudent'], ['Observer les changements', 'Vigilance'], ['Accelerer le pas', 'Rapide']], ['travel']),

    card('u03', 'Le Choix Simple',
      'Trois sentiers s\'ouvrent au pied d\'un cairn. L\'un fleuri, l\'autre luminescent, le dernier escarpe. L\'Ogham grave dit simplement: "Choisis."',
      [['Le sentier fleuri', 'Sagesse'], ['Le sentier luminescent', 'Magie'], ['Le sentier escarpe', 'Audace']], ['choice']),

    card('u04', 'Le Dolmen Solitaire',
      'Un dolmen solitaire dans la lande. Des offrandes recentes y reposent. Le vent siffle entre les dalles comme un chant grave.',
      [['Deposer une offrande', 'Piete'], ['Communier avec la pierre', 'Spirituel'], ['Prendre une offrande', 'Risque']], ['sacred']),

    card('u05', 'L\'Echo du Passe',
      'Un echo resonne — ta propre voix, vieillie, venue d\'un autre temps. Elle prononce des mots que tu n\'as pas encore dits.',
      [['Repondre a l\'echo', 'Dialogue'], ['Ecouter en silence', 'Patience'], ['Fuir la vallee', 'Peur']], ['mystery']),

    card('u06', 'Le Feu du Bivouac',
      'Les flammes du bivouac dessinent des visages dans les braises. Les druides lisaient l\'avenir dans le feu. Des etincelles montent vers les etoiles.',
      [['Se rechauffer', 'Repos'], ['Lire les flammes', 'Divination'], ['Monter la garde', 'Vigilance']], ['rest']),

    card('u07', 'La Mousse Ancienne',
      'La mousse couvre tout ici. Le temps ralentit. Des empreintes non humaines marquent le sol — trop petites, orteils fourchus. Les korrigans passent par ici.',
      [['S\'asseoir et ecouter', 'Paix'], ['Creuser sous la mousse', 'Curiosite'], ['Avancer rapidement', 'Continuer']], ['nature']),

    card('u08', 'Les Etoiles d\'Ogham',
      'Les constellations forment des Oghams dans le ciel nocturne. Les etoiles pulsent doucement. Ton Souffle vibre en resonance avec le ciel.',
      [['Dechiffrer le message', 'Sagesse'], ['Tracer un Ogham de reponse', 'Magie'], ['Dormir sous les etoiles', 'Repos']], ['magic']),

    card('u09', 'Le Loup Gris',
      'Un loup gris argente par la lune s\'assoit a dix pas de toi, patient comme la pierre. Dans ses yeux, le reflet d\'un feu qui n\'existe pas.',
      [['Rester immobile', 'Prudent'], ['Lui parler doucement', 'Lien'], ['Fuir dans l\'obscurite', 'Courir']], ['creature']),

    card('u10', 'La Pluie des Druides',
      'Une pluie chaude et parfumee tombe sur le nemeton. Les pierres dressees brillent, revelant des gravures invisibles en temps normal.',
      [['Danser sous la pluie', 'Joie'], ['Recueillir l\'eau sacree', 'Sagesse'], ['S\'abriter et observer', 'Prudent']], ['weather']),
  ],

  merlin_direct: [
    card('md01', 'Les Mots de Merlin',
      'Merlin apparait sans bruit. "Tu te debrouilles bien, voyageur. Mais la route est encore longue. Chaque pas est un choix. N\'oublie jamais cela."',
      [['Merci, Merlin', 'Gratitude'], ['Mediter ses paroles', 'Sagesse'], ['Je le sais deja', 'Confiance']], ['merlin']),

    card('md02', 'L\'Avertissement',
      'La voix de Merlin resonne dans ta tete: "Prends garde. Les factions observent. L\'equilibre est fragile. Un mot de trop et les alliances se brisent."',
      [['Je ferai attention', 'Prudent'], ['Explique-moi, Merlin', 'Curiosite'], ['Je n\'ai pas peur', 'Audace']], ['merlin']),

    card('md03', 'La Lecon',
      'Merlin trace un Ogham dans la terre. "Chaque choix est grave dans la pierre de ton destin. Tu ne peux pas l\'effacer. La pierre se souvient de tout."',
      [['Je comprends', 'Sagesse'], ['Enseigne-moi davantage', 'Apprentissage'], ['Le destin se forge', 'Determination']], ['merlin']),

    card('md04', 'Le Sourire du Druide',
      'Merlin sourit — un evenement si rare que les oiseaux s\'arretent. "Tu me rappelles quelqu\'un. Moi, peut-etre. Ne fais pas les memes erreurs."',
      [['Qui etais-tu, Merlin?', 'Curiosite'], ['Partager un souvenir', 'Lien'], ['Sourire en retour', 'Amitie']], ['merlin']),

    card('md05', 'L\'Enigme',
      'Merlin bloque le chemin. "Qu\'est-ce qui a six visages mais un seul coeur? Qu\'est-ce qui survit aux dieux eux-memes?" Il attend ta reponse.',
      [['Les six Factions', 'Sagesse'], ['Je ne sais pas encore', 'Humilite'], ['Toi, Merlin', 'Audace']], ['merlin']),
  ],

  // Phase 2: Additional variety cards
  variety: [
    card('v01', 'Le Cerf Blanc',
      'Un cerf blanc surgit du brouillard. Sa ramure porte des runes lumineuses. Il te fixe un instant, puis s\'enfonce dans la foret. Tu sens un appel.',
      [['Suivre le cerf', 'Quete'], ['L\'observer partir', 'Sagesse'], ['Appeler les druides', 'Aide']], ['creature', 'sacred']),

    card('v02', 'La Cascade Cachee',
      'Derriere un rideau de lierre, une cascade murmure. L\'eau tombe dans un bassin d\'obsidienne. Des reflets d\'etoiles dansent a la surface malgre le jour.',
      [['Se baigner', 'Soin'], ['Boire l\'eau etoilee', 'Magie'], ['Contourner la cascade', 'Prudent']], ['nature', 'healing']),

    card('v03', 'Le Forgeron des Ombres',
      'Un marteau frappe une enclume invisible. Le forgeron travaille dans l\'ombre d\'un dolmen. Ses yeux brillent comme des braises. "J\'ai quelque chose pour toi."',
      [['Acheter une arme', 'Commerce'], ['Demander un conseil', 'Sagesse'], ['Refuser et partir', 'Mefiance']], ['stranger', 'merchant']),

    card('v04', 'La Danse des Fees',
      'Un cercle de champignons lumineux pulse au rythme d\'une musique invisible. Des fees minuscules dansent en spirale. Entrer dans le cercle pourrait tout changer.',
      [['Danser avec elles', 'Feerie'], ['Observer depuis l\'exterieur', 'Prudent'], ['Briser le cercle', 'Risque']], ['creature', 'magic']),

    card('v05', 'Le Gardien de Pierre',
      'Une statue de guerrier celte s\'anime lentement. La mousse tombe de ses epaules. "Qui ose fouler ce sol sacre?" Sa voix gronde comme le tonnerre.',
      [['Je suis un voyageur', 'Diplomatie'], ['Je cherche la verite', 'Quete'], ['Je ne recule pas', 'Courage']], ['sacred', 'danger']),

    card('v06', 'La Nuit des Lucioles',
      'Des milliers de lucioles emerges des sous-bois. Elles forment des constellations vivantes qui se reconfigurent sans cesse. L\'une d\'elles se pose sur ta main.',
      [['Suivre les lucioles', 'Exploration'], ['Capturer leur lumiere', 'Magie'], ['Rester immobile et observer', 'Paix']], ['nature', 'mystic']),
  ],

  npc_encounter: [
    card('npc01', 'Le Druide Ancien',
      'Un vieux druide emerge de la brume. "Les esprits m\'ont parle de toi. Ils disent que tu portes un fardeau qui n\'est pas le tien." Il te tend une infusion.',
      [['Demander conseil', 'Sagesse'], ['Offrir ton aide', 'Generosite'], ['Passer ton chemin', 'Independance']], ['npc']),

    card('npc02', 'La Villageoise',
      'Une villageoise t\'interpelle: "Les loups rodent plus pres chaque nuit! Les anciens disent que ce sont des esprits envoyes par une faction mecontente."',
      [['Proposer de l\'aide', 'Altruisme'], ['Ecouter attentivement', 'Empathie'], ['Ignorer l\'appel', 'Indifference']], ['npc']),

    card('npc03', 'Le Barde Errant',
      'Un barde gratte sa lyre pres d\'un feu mourant. "Chaque histoire a six faces, ami. L\'histoire du heros, du sage, ou du roi — laquelle veux-tu?"',
      [['L\'histoire du heros', 'Epique'], ['L\'histoire du sage', 'Sagesse'], ['L\'histoire du roi', 'Pouvoir']], ['npc']),

    card('npc04', 'Le Guerrier du Gue',
      'Un guerrier balafre bloque le gue. "On ne passe pas sans prouver sa valeur, druide." Ses bras portent les tatouages spirales de sept generations.',
      [['Affronter le defi', 'Courage'], ['Ruser pour le distraire', 'Intelligence'], ['Chercher un autre passage', 'Evitement']], ['npc']),

    card('npc05', 'Le Marchand des Ombres',
      'Un marchand aux yeux dores ne cligne jamais. "Tout se troque, voyageur. Un souvenir d\'enfance contre un charme. J\'accepte aussi les promesses non tenues."',
      [['Troquer un souvenir', 'Commerce'], ['Examiner ses merveilles', 'Curiosite'], ['Marchander dur', 'Negociation']], ['npc']),

    card('npc06', 'La Fileuse de Brume',
      'Une femme tisse la brume entre ses doigts. "Je tisse les destins. Le tien s\'effiloche a certains endroits. Veux-tu savoir ce qui t\'attend?"',
      [['Demander ton destin', 'Curiosite'], ['Lui confier un secret', 'Confiance'], ['Refuser de savoir', 'Prudent']], ['npc']),

    card('npc07', 'Le Forgeron des Dieux',
      'Un forgeron immense martele une lame. Les etincelles flottent, suspendues. "Les dieux m\'ont appris a forger. Que veux-tu que je forge pour toi, mortel?"',
      [['Commander une arme', 'Force'], ['Offrir ton aide a la forge', 'Service'], ['Observer en silence', 'Sagesse']], ['npc']),

    card('npc08', 'L\'Enfant Perdu',
      'Un enfant aux yeux trop grands et aux oreilles pointues pleure pres d\'un menhir. "Les korrigans m\'ont chasse. Je veux juste rentrer chez moi."',
      [['L\'accompagner', 'Compassion'], ['Invoquer les esprits', 'Magie'], ['Lui indiquer la route', 'Rapide']], ['npc']),
  ],

  promise: [
    card('p01', 'Le Pacte de la Lune',
      'Sous la pleine lune, une voix propose un pacte. "Le pouvoir de voir a travers les mensonges. En echange, un service par nuit de lune."',
      [['Accepter le pacte', 'Pouvoir'], ['Negocier les termes', 'Diplomatie'], ['Refuser fermement', 'Libre']], ['promise']),

    card('p02', 'La Promesse du Gui',
      'Le gui sacre tend ses branches. La voix de la foret s\'eleve: "Jure de proteger ce nemeton, druide. Jure sur ton sang et sur ton nom."',
      [['Jurer protection', 'Honneur'], ['Jurer sous condition', 'Prudence'], ['Decliner humblement', 'Liberte']], ['promise']),

    card('p03', 'Le Serment du Sang',
      'Une lame de silex repose sur un autel. "Celui qui verse son sang ici sera lie a la terre pour toujours." Le silex brille sous la lune.',
      [['Verser ton sang', 'Sacrifice'], ['Chercher un autre moyen', 'Alternative'], ['Refuser le serment', 'Libre']], ['promise']),
  ],
}

const RECENT_LIMIT = 20
let _recentlyUsed = []

export function getFallbackCard(context) {
  const pools = _selectPools(context)
  let candidates = pools.filter(c => !_recentlyUsed.includes(c.id))
  if (candidates.length === 0) {
    _recentlyUsed = []
    candidates = pools
  }
  if (candidates.length === 0) return _emergencyCard(context)

  const selected = candidates[Math.floor(Math.random() * candidates.length)]
  _recentlyUsed.push(selected.id)
  if (_recentlyUsed.length > RECENT_LIMIT) _recentlyUsed.shift()
  return structuredClone(selected)
}

function _selectPools(ctx) {
  const pools = []
  const cp = ctx.cards_played ?? 0

  if (cp < 15) pools.push(...FALLBACK_POOLS.early_game)
  else if (cp < 40) pools.push(...FALLBACK_POOLS.mid_game)
  else pools.push(...FALLBACK_POOLS.late_game)

  // Crisis detection based on faction hostility
  const factions = ctx.factions ?? {}
  const hasHostile = FACTIONS.some(k => (factions[k] ?? 50) <= 25)
  if (hasHostile) pools.push(...FALLBACK_POOLS.crisis)

  if (ctx.life <= 1) pools.push(...FALLBACK_POOLS.crisis)

  pools.push(...FALLBACK_POOLS.universal)
  if (FALLBACK_POOLS.variety) pools.push(...FALLBACK_POOLS.variety)

  // Filter by conditions
  return pools.filter(c => {
    const cond = c.conditions ?? {}
    if (cond.min_card && cp < cond.min_card) return false
    if (cond.max_card && cp > cond.max_card) return false
    return true
  })
}

function _emergencyCard(ctx) {
  return {
    id: 'emergency',
    title: 'Un Moment de Calme',
    text: 'Le vent se tait, les ombres reculent. La mousse sous tes pieds est douce. Tu respires profondement.',
    choices: [
      { label: 'Se reposer', preview: 'Recuperation' },
      { label: 'Mediter', preview: 'Paix' },
      { label: 'Continuer', preview: 'Avancer' },
    ],
  }
}
