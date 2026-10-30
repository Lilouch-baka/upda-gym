// Glossary for long-press definitions: one-line meaning + French term.
// `match` lists extra spellings found in question text (case-insensitive, whole words).
export const GLOSSARY = [
  { term: 'Axis', fr: 'Axe', def: 'A line through space about which forms and spaces are arranged; Ching’s most elementary ordering device.' },
  { term: 'Baluster', fr: 'Balustre', def: 'One of the vertical posts supporting a handrail; gaps must stop a 100 mm sphere.', match: ['balusters'] },
  { term: 'Base plate', fr: 'Platine (pied de poteau)', def: 'Steel plate under a column that spreads its load over the footing.' },
  { term: 'Bearing capacity', fr: 'Capacité portante', def: 'The pressure the ground can safely carry without failure or excessive settlement.' },
  { term: 'Bond', fr: 'Appareillage', def: 'The overlapping pattern of masonry units that ties a wall together.', match: ['bonding'] },
  { term: 'Buttress', fr: 'Contrefort', def: 'A mass of masonry built against a wall to resist outward thrust; a flying buttress bridges across.', match: ['buttresses', 'flying buttresses'] },
  { term: 'Caisson', fr: 'Caisson', def: 'Watertight chamber for building foundations below water.' },
  { term: 'Cantilever', fr: 'Porte-à-faux', def: 'A member fixed at one end and free at the other.' },
  { term: 'Cavity wall', fr: 'Mur creux (double paroi)', def: 'Two leaves of masonry with a gap between them that stops moisture crossing.', match: ['cavity walls'] },
  { term: 'Change order', fr: 'Ordre de modification (avenant)', def: 'Written agreement changing the work, the contract sum and/or the contract time.', match: ['change orders'] },
  { term: 'Cladding', fr: 'Bardage / revêtement de façade', def: 'A non-structural layer of one material covering another.' },
  { term: 'Critical path', fr: 'Chemin critique', def: 'The longest chain of dependent activities; any delay on it delays the project.', match: ['critical path method', 'CPM'] },
  { term: 'Damp-proof membrane', fr: 'Membrane anti-humidité', def: 'Impervious sheet under a ground slab that stops rising moisture.', match: ['DPM'] },
  { term: 'Deflection', fr: 'Flèche', def: 'How far a structural member bends under load.' },
  { term: 'Expansion joint', fr: 'Joint de dilatation', def: 'A gap that lets parts of a building move with temperature without cracking.', match: ['expansion joints'] },
  { term: 'Fast-track', fr: 'Procédure accélérée (fast-track)', def: 'Overlapping design and construction to finish sooner.', match: ['fastrack', 'fast-track scheduling'] },
  { term: 'Feasibility study', fr: 'Étude de faisabilité', def: 'Study testing whether a project is viable before committing to it.' },
  { term: 'Float', fr: 'Marge (battement)', def: 'Time an activity can slip without delaying the project (total) or the next activity (free).', match: ['slack', 'total slack', 'total float'] },
  { term: 'Floor area ratio', fr: 'Coefficient d’occupation des sols (COS)', def: 'Gross floor area ÷ plot area.', match: ['FAR'] },
  { term: 'Folded plate', fr: 'Voile plissé', def: 'Thin, deep plates joined rigidly along their edges; stiff because of the folds.' },
  { term: 'Footing', fr: 'Semelle', def: 'The widened base of a foundation that spreads load to the soil.', match: ['footings'] },
  { term: 'Green belt', fr: 'Ceinture verte', def: 'Protected open land ringing a city to limit sprawl.' },
  { term: 'Joist', fr: 'Solive', def: 'A horizontal member carrying a floor, ceiling or flat roof.', match: ['joists'] },
  { term: 'Lap joint', fr: 'Assemblage à recouvrement', def: 'A joint made by overlapping two members.' },
  { term: 'Lien', fr: 'Privilège (droit de rétention)', def: 'A legal claim on property to secure payment for work or materials.' },
  { term: 'Lintel', fr: 'Linteau', def: 'A beam spanning the top of an opening.' },
  { term: 'Liquidated damages', fr: 'Pénalités de retard (dommages-intérêts forfaitaires)', def: 'A sum fixed in the contract, payable for delay.' },
  { term: 'Nominal damages', fr: 'Dommages-intérêts symboliques', def: 'A token sum awarded for a breach that caused no real loss.' },
  { term: 'Nominal size', fr: 'Dimension nominale (de coordination)', def: 'Actual size of a unit plus one mortar joint.' },
  { term: 'Parol evidence', fr: 'Preuve testimoniale (règle de la preuve orale)', def: 'Rule barring spoken statements from contradicting a complete written contract.', match: ['parol evidence rule', 'parole evidence'] },
  { term: 'Pile', fr: 'Pieu', def: 'A column driven or cast into the ground to carry load down to firm strata.', match: ['piles', 'piled foundation', 'pile foundation'] },
  { term: 'Post-occupancy evaluation', fr: 'Évaluation post-occupation', def: 'Assessing a building after people have used it for a while.', match: ['POE'] },
  { term: 'Programming', fr: 'Programmation', def: 'Defining the client’s needs and the design problem before design starts (problem seeking).', match: ['architectural programming'] },
  { term: 'Quantum meruit', fr: 'Paiement au prorata du travail effectué', def: '“As much as earned”: reasonable payment for work actually done.' },
  { term: 'Raft foundation', fr: 'Radier', def: 'A slab foundation under the whole building that spreads load on weak soil.', match: ['raft', 'raft foundations'] },
  { term: 'Rafter', fr: 'Chevron', def: 'A sloping member of a pitched roof.', match: ['rafters'] },
  { term: 'Riser', fr: 'Contremarche (hauteur de marche)', def: 'The vertical part of a step, or its height.', match: ['risers'] },
  { term: 'Shop drawings', fr: 'Plans d’atelier (plans d’exécution)', def: 'Detailed fabrication drawings prepared by the contractor or supplier.', match: ['shop drawing'] },
  { term: 'Sill', fr: 'Appui (de fenêtre) / seuil', def: 'Bottom horizontal member of a window or door opening.', match: ['cill'] },
  { term: 'Slenderness ratio', fr: 'Élancement', def: 'Effective length ÷ radius of gyration; governs column buckling.' },
  { term: 'Space frame', fr: 'Structure tridimensionnelle', def: 'A 3D truss of linked members, efficient for long spans.' },
  { term: 'Specification', fr: 'Cahier des clauses techniques (CCTP)', def: 'Written description of materials, quality and workmanship.', match: ['specifications', 'specs'] },
  { term: 'Springing line', fr: 'Ligne de naissance (de l’arc)', def: 'The level at which an arch starts to curve.', match: ['springing'] },
  { term: 'Stirrup', fr: 'Étrier (cadre)', def: 'A bent bar around the main reinforcement that resists shear in a beam.', match: ['stirrups'] },
  { term: 'String', fr: 'Limon', def: 'The inclined member supporting the ends of the treads and risers of a stair.', match: ['stringer', 'stair string'] },
  { term: 'Threshold', fr: 'Seuil', def: 'Strip under a door covering the joint between floor finishes.' },
  { term: 'Tread', fr: 'Giron (marche)', def: 'The horizontal part of a step that you stand on, or its depth.', match: ['treads'] },
  { term: 'Value engineering', fr: 'Analyse de la valeur', def: 'Delivering the required function at the lowest life-cycle cost.' },
  { term: 'Visual inertia', fr: 'Inertie visuelle', def: 'How concentrated and stable a form looks (Ching).' },
  { term: 'Waffle slab', fr: 'Dalle nervurée (gaufrée)', def: 'Two-way ribbed concrete slab, efficient for long spans and heavy loads.' },
  { term: 'Water–cement ratio', fr: 'Rapport eau/ciment (E/C)', def: 'Mass of water ÷ mass of cement; lower means stronger concrete.', match: ['water cement ratio', 'water-cement ratio'] },
  { term: 'Work breakdown structure', fr: 'Organigramme des tâches (WBS)', def: 'Hierarchical breakdown of the project scope into work packages.', match: ['WBS'] },
  { term: 'Zoning', fr: 'Zonage', def: 'Rules on land use, density and height that implement the master plan.', match: ['land-use zoning', 'land use zoning'] },
  { term: 'Ziggurat', fr: 'Ziggourat', def: 'Stepped Mesopotamian temple tower of mud brick.', match: ['ziggurats'] },
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const LOOKUP = new Map();
// Spellings written in capitals (FAR, WBS, POE) only match when written in capitals in the text.
const ABBREVIATIONS = new Set();
for (const g of GLOSSARY)
  for (const k of [g.term, ...(g.match || [])]) {
    LOOKUP.set(k.toLowerCase(), g);
    if (/^[A-Z]{2,5}$/.test(k)) ABBREVIATIONS.add(k.toLowerCase());
  }

// Longest spellings first so "raft foundation" wins over "raft".
// No lookbehind (older iOS Safari): group 1 captures the boundary character instead.
const PATTERN = new RegExp(
  `(^|[^\\w-])(${[...LOOKUP.keys()].sort((a, b) => b.length - a.length).map(escape).join('|')})(?![\\w-])`,
  'gi',
);

// Split text into plain strings and {text, entry} pieces. Each term is marked once per text.
export function glossSplit(text) {
  if (!text) return [];
  const out = [];
  const seen = new Set();
  let last = 0;
  for (const m of text.matchAll(PATTERN)) {
    const word = m[2];
    const start = m.index + m[1].length;
    const entry = LOOKUP.get(word.toLowerCase());
    // Abbreviations only count when written in capitals ("FAR", not "far").
    if (ABBREVIATIONS.has(word.toLowerCase()) && word !== word.toUpperCase()) continue;
    if (seen.has(entry.term)) continue;
    seen.add(entry.term);
    if (start > last) out.push(text.slice(last, start));
    out.push({ text: word, entry });
    last = start + word.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
