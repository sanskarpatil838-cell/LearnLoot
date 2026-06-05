const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { hasBrokenMathFragments } = require('../functions/math-normalizer');

const BASE_URL = 'https://questions.examside.com/past-years/jee/jee-advanced';
const OUTPUT_PATH = path.resolve(__dirname, '..', 'functions', 'jee-advanced-pyq-question-bank.js');
const QUESTIONS_PER_CHAPTER = 50;

const CHAPTER_SOURCES = {
  physics: {
    'Units and Dimensions': [{ slug: 'units-and-measurements' }],
    'Mathematics in Physics (Vectors, Calculus Basics)': [
      { slug: 'units-and-measurements', keywords: ['dimension', 'vector', 'error', 'significant'] }
    ],
    'Motion in One Dimension': [{ slug: 'motion' }],
    'Motion in Two Dimensions': [{ slug: 'motion-in-a-plane' }, { slug: 'motion', keywords: ['projectile', 'plane', 'relative', 'vector'] }],
    'Laws of Motion': [{ slug: 'laws-of-motion' }],
    'Work, Power and Energy': [{ slug: 'work-power-and-energy' }],
    'Center of Mass, Momentum and Collision': [
      { slug: 'impulse-and-momentum' },
      { slug: 'laws-of-motion', keywords: ['collision', 'momentum', 'centre', 'center', 'system'] }
    ],
    'Rotational Motion': [{ slug: 'rotational-motion' }],
    Gravitation: [{ slug: 'gravitation' }],
    'Mechanical Properties of Solids': [
      { slug: 'properties-of-matter', keywords: ['elastic', 'young', 'stress', 'strain', 'solid', 'wire'] }
    ],
    'Mechanical Properties of Fluids': [
      { slug: 'properties-of-matter', keywords: ['fluid', 'viscos', 'surface tension', 'bernoulli', 'pressure', 'liquid'] }
    ],
    'Thermal Properties of Matter': [
      { slug: 'heat-and-thermodynamics', keywords: ['calor', 'thermal', 'heat transfer', 'expansion', 'temperature'] }
    ],
    'Kinetic Theory of Gases': [
      { slug: 'heat-and-thermodynamics', keywords: ['gas', 'kinetic', 'molecule', 'rms', 'mean free'] }
    ],
    Thermodynamics: [
      { slug: 'heat-and-thermodynamics', keywords: ['thermodynamic', 'adiabatic', 'isothermal', 'entropy', 'cycle', 'engine'] }
    ],
    Oscillations: [{ slug: 'simple-harmonic-motion' }],
    'Waves and Sound': [{ slug: 'waves' }],
    Electrostatics: [{ slug: 'electrostatics' }],
    Capacitance: [{ slug: 'capacitor' }, { slug: 'electrostatics', keywords: ['capacitor', 'capacitance', 'dielectric'] }],
    'Current Electricity': [{ slug: 'current-electricity' }],
    'Magnetic Effects of Current': [{ slug: 'magnetism', keywords: ['current', 'wire', 'loop', 'field', 'force'] }],
    'Magnetic Properties of Matter': [{ slug: 'magnetism', keywords: ['magnet', 'dipole', 'earth', 'bar magnet'] }],
    'Electromagnetic Induction': [{ slug: 'electromagnetic-induction' }, { slug: 'alternating-current', keywords: ['inductor', 'flux', 'emf'] }],
    'Alternating Current': [{ slug: 'alternating-current' }, { slug: 'electromagnetic-induction', keywords: ['ac', 'inductor', 'transformer'] }],
    'Electromagnetic Waves': [{ slug: 'electromagnetic-waves' }, { slug: 'wave-optics', keywords: ['electromagnetic', 'polarization', 'light'] }],
    'Ray Optics': [{ slug: 'geometrical-optics' }],
    'Wave Optics': [{ slug: 'wave-optics' }, { slug: 'geometrical-optics', keywords: ['polarization', 'interference', 'diffraction'] }],
    'Dual Nature of Matter': [{ slug: 'dual-nature-of-radiation' }],
    'Atomic Physics': [{ slug: 'atoms-and-nuclei', keywords: ['atom', 'bohr', 'spectra', 'x-ray', 'photoelectric'] }],
    'Nuclear Physics': [{ slug: 'atoms-and-nuclei', keywords: ['nucleus', 'nuclear', 'radio', 'decay', 'binding', 'fission'] }],
    'Experimental Physics': [{ slug: 'practical-physics' }, { slug: 'units-and-measurements', keywords: ['error', 'experiment', 'measurement', 'least count'] }]
  },
  chemistry: {
    'Some Basic Concepts of Chemistry': [{ slug: 'some-basic-concepts-of-chemistry' }],
    'Structure of Atom': [{ slug: 'structure-of-atom' }],
    'Periodic Classification': [{ slug: 'periodic-table-and-periodicity' }],
    'Chemical Bonding': [{ slug: 'chemical-bonding-and-molecular-structure' }],
    'Chemistry - Thermodynamics': [{ slug: 'thermodynamics' }],
    'Chemical Equilibrium': [{ slug: 'chemical-equilibrium' }, { slug: 'ionic-equilibrium', keywords: ['equilibrium', 'constant', 'degree'] }],
    'Ionic Equilibrium': [{ slug: 'ionic-equilibrium' }, { slug: 'chemical-equilibrium', keywords: ['acid', 'base', 'ph', 'buffer', 'solubility'] }],
    'Redox Reactions': [{ slug: 'redox-reactions' }],
    'General Organic Chemistry (GOC)': [{ slug: 'basics-of-organic-chemistry' }],
    Hydrocarbons: [{ slug: 'hydrocarbons' }],
    Solutions: [{ slug: 'solutions' }, { slug: 'some-basic-concepts-of-chemistry', keywords: ['molarity', 'molality', 'solution', 'concentration'] }],
    Electrochemistry: [{ slug: 'electrochemistry' }],
    'Chemical Kinetics': [{ slug: 'chemical-kinetics-and-nuclear-chemistry' }],
    'd & f Block': [{ slug: 'd-and-f-block-elements' }],
    'Coordination Compounds': [{ slug: 'coordination-compounds' }],
    'p-Block (13 & 14)': [{ slug: 'p-block-elements', keywords: ['boron', 'carbon', 'aluminium', 'silicon', 'group 13', 'group 14'] }],
    'p-Block (15-18)': [{ slug: 'p-block-elements', keywords: ['nitrogen', 'oxygen', 'halogen', 'noble', 'xenon', 'group 15', 'group 16', 'group 17', 'group 18'] }],
    'Haloalkanes & Haloarenes': [{ slug: 'haloalkanes-and-haloarenes' }, { slug: 'basics-of-organic-chemistry', keywords: ['halide', 'substitution', 'elimination'] }],
    'Alcohols, Phenols & Ethers': [{ slug: 'alcohols-phenols-and-ethers' }],
    'Aldehydes & Ketones': [
      { slug: 'aldehydes-ketones-and-carboxylic-acids', keywords: ['aldehyde', 'ketone', 'carbonyl', 'aldol', 'cannizzaro'] }
    ],
    'Carboxylic Acid Derivatives': [
      { slug: 'aldehydes-ketones-and-carboxylic-acids', keywords: ['carboxylic', 'acid chloride', 'ester', 'amide', 'anhydride'] }
    ],
    Amines: [{ slug: 'compounds-containing-nitrogen' }],
    Biomolecules: [{ slug: 'biomolecules' }],
    'Practical Chemistry': [
      { slug: 'salt-analysis' },
      { slug: 'practical-organic-chemistry' },
      { slug: 'coordination-compounds', keywords: ['test', 'colour', 'precipitate', 'complex'] }
    ]
  },
  mathematics: {
    'JEE Maths - Basic Mathematics': [
      { slug: 'quadratic-equation-and-inequalities' },
      { slug: 'sequences-and-series' },
      { slug: 'mathematical-induction-and-binomial-theorem' }
    ],
    'JEE Maths - Sets and Relations': [
      { slug: 'functions', keywords: ['set', 'relation', 'domain', 'range', 'mapping'] },
      { slug: 'complex-numbers', keywords: ['locus', 'set'] }
    ],
    'JEE Maths - Functions': [
      { slug: 'functions' },
      { slug: 'limits-continuity-and-differentiability', keywords: ['function', 'domain', 'range'] }
    ],
    'JEE Maths - Trigonometric Ratios and Identities': [
      { slug: 'trigonometric-functions-and-equations', keywords: ['identity', 'value', 'sin', 'cos', 'tan'] }
    ],
    'JEE Maths - Trigonometric Equations': [
      { slug: 'trigonometric-functions-and-equations', keywords: ['equation', 'solution', 'roots', 'interval'] }
    ],
    'JEE Maths - Inverse Trigonometric Functions': [
      { slug: 'inverse-trigonometric-functions' },
      { slug: 'trigonometric-functions-and-equations', keywords: ['inverse', 'principal', 'solution'] }
    ],
    'JEE Maths - Heights and Distances': [
      { slug: 'trigonometric-functions-and-equations', keywords: ['angle', 'triangle', 'height', 'distance'] },
      { slug: 'properties-of-triangle' }
    ],
    'JEE Maths - Complex Numbers': [{ slug: 'complex-numbers' }],
    'JEE Maths - Quadratic Equation': [{ slug: 'quadratic-equation-and-inequalities' }],
    'JEE Maths - Sequences and Series': [{ slug: 'sequences-and-series' }],
    'JEE Maths - Binomial Theorem': [
      { slug: 'mathematical-induction-and-binomial-theorem', keywords: ['binomial', 'coefficient', 'term'] },
      { slug: 'sequences-and-series', keywords: ['series', 'coefficient'] },
      { slug: 'permutations-and-combinations', keywords: ['coefficient', 'selection'] }
    ],
    'JEE Maths - Permutation and Combination': [
      { slug: 'permutations-and-combinations' },
      { slug: 'probability', keywords: ['arrangement', 'selection', 'ways'] },
      { slug: 'mathematical-induction-and-binomial-theorem', keywords: ['coefficient'] }
    ],
    'JEE Maths - Probability': [{ slug: 'probability' }],
    'JEE Maths - Straight Lines': [
      { slug: 'straight-lines-and-pair-of-straight-lines' },
      { slug: 'circle', keywords: ['line', 'tangent', 'normal'] }
    ],
    'JEE Maths - Circle': [{ slug: 'circle' }],
    'JEE Maths - Parabola': [{ slug: 'parabola' }, { slug: 'ellipse', keywords: ['focus', 'directrix'] }],
    'JEE Maths - Ellipse': [{ slug: 'ellipse' }, { slug: 'hyperbola', keywords: ['eccentricity', 'focus'] }],
    'JEE Maths - Hyperbola': [{ slug: 'hyperbola' }, { slug: 'ellipse', keywords: ['eccentricity', 'asymptote'] }],
    'JEE Maths - Properties of Triangles': [
      { slug: 'properties-of-triangle' },
      { slug: 'trigonometric-functions-and-equations', keywords: ['triangle', 'angle', 'sin', 'cos'] },
      { slug: 'circle', keywords: ['triangle', 'chord'] }
    ],
    'JEE Maths - Mathematical Reasoning': [
      { slug: 'mathematical-induction-and-binomial-theorem', keywords: ['induction', 'integer', 'true', 'prove'] },
      { slug: 'functions', keywords: ['statement', 'condition'] }
    ],
    'JEE Maths - Statistics': [{ slug: 'statistics' }, { slug: 'probability', keywords: ['mean', 'variance'] }],
    'JEE Maths - Matrices': [{ slug: 'matrices-and-determinants', keywords: ['matrix', 'matrices'] }],
    'JEE Maths - Determinants': [{ slug: 'matrices-and-determinants', keywords: ['determinant', 'det'] }],
    'JEE Maths - Vector Algebra': [{ slug: 'vector-algebra' }],
    'JEE Maths - Three Dimensional Geometry': [{ slug: '3d-geometry' }],
    'JEE Maths - Limits': [{ slug: 'limits-continuity-and-differentiability', keywords: ['limit'] }],
    'JEE Maths - Continuity and Differentiability': [
      { slug: 'limits-continuity-and-differentiability', keywords: ['continuous', 'differentiable', 'derivative'] }
    ],
    'JEE Maths - Differentiation': [
      { slug: 'differentiation' },
      { slug: 'limits-continuity-and-differentiability', keywords: ['derivative', 'differentiable'] },
      { slug: 'application-of-derivatives', keywords: ['derivative'] }
    ],
    'JEE Maths - Application of Derivatives': [{ slug: 'application-of-derivatives' }],
    'JEE Maths - Indefinite Integration': [
      { slug: 'indefinite-integrals' },
      { slug: 'definite-integration', keywords: ['integral', 'primitive'] }
    ],
    'JEE Maths - Definite Integration': [{ slug: 'definite-integration' }],
    'JEE Maths - Area Under Curves': [
      { slug: 'application-of-integration' },
      { slug: 'definite-integration', keywords: ['area', 'integral'] }
    ],
    'JEE Maths - Differential Equations': [
      { slug: 'differential-equations' },
      { slug: 'indefinite-integrals', keywords: ['differential', 'solution'] },
      { slug: 'definite-integration', keywords: ['differential', 'integral'] }
    ]
  }
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const COMBINATION_DISTRACTORS = [
  ['A'],
  ['B'],
  ['C'],
  ['D'],
  ['A', 'B'],
  ['A', 'C'],
  ['A', 'D'],
  ['B', 'C'],
  ['B', 'D'],
  ['C', 'D'],
  ['A', 'B', 'C'],
  ['A', 'B', 'D'],
  ['A', 'C', 'D'],
  ['B', 'C', 'D'],
  ['A', 'B', 'C', 'D']
];

function decodeHtml(value) {
  let text = String(value || '');
  for (let pass = 0; pass < 2; pass++) {
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&minus;/g, '-')
      .replace(/&times;/g, 'x')
      .replace(/&rarr;/g, '->')
      .replace(/&larr;/g, '<-')
      .replace(/&ge;/g, '>=')
      .replace(/&le;/g, '<=')
      .replace(/&alpha;/g, 'alpha')
      .replace(/&beta;/g, 'beta')
      .replace(/&gamma;/g, 'gamma')
      .replace(/&delta;/g, 'delta')
      .replace(/&theta;/g, 'theta')
      .replace(/&lambda;/g, 'lambda')
      .replace(/&mu;/g, 'mu')
      .replace(/&pi;/g, 'pi')
      .replace(/&rho;/g, 'rho')
      .replace(/&sigma;/g, 'sigma')
      .replace(/&omega;/g, 'omega')
      .replace(/&Delta;/g, 'Delta')
      .replace(/&nabla;/g, 'nabla');
  }
  return text;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getAttribute(tag, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*(['"])(.*?)\\1`, 'i');
  return tag.match(pattern)?.[2] || '';
}

function safeImageSrc(src) {
  const raw = String(src || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  if (raw.startsWith('/')) return `https://questions.examside.com${raw}`;
  return '';
}

function safeIntegerAttribute(value) {
  const numeric = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(numeric) && numeric > 0 && numeric <= 20 ? String(numeric) : '';
}

const ALLOWED_SOURCE_TAGS = new Set([
  'p', 'br', 'img', 'div', 'span', 'strong', 'b', 'em', 'i', 'u',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
  'ul', 'ol', 'li', 'sub', 'sup', 'center'
]);

function sanitizeSourceHtml(content, imageAltFallback = 'JEE Advanced diagram') {
  return stripHiddenSourceBlocks(content)
    .replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (tag, rawName) => {
      const name = rawName.toLowerCase();
      const closing = /^<\s*\//.test(tag);
      if (!ALLOWED_SOURCE_TAGS.has(name)) return '';
      if (closing) return name === 'br' || name === 'img' ? '' : `</${name}>`;
      if (name === 'br') return '<br>';
      if (name === 'img') {
        const src = safeImageSrc(getAttribute(tag, 'data-orsrc') || getAttribute(tag, 'src'));
        if (!src) return '';
        const alt = decodeHtml(getAttribute(tag, 'alt') || imageAltFallback);
        return `<img class="quiz-question-image" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy">`;
      }
      if (name === 'td' || name === 'th') {
        const colspan = safeIntegerAttribute(getAttribute(tag, 'colspan'));
        const rowspan = safeIntegerAttribute(getAttribute(tag, 'rowspan'));
        const attrs = [
          colspan ? `colspan="${colspan}"` : '',
          rowspan ? `rowspan="${rowspan}"` : ''
        ].filter(Boolean).join(' ');
        return attrs ? `<${name} ${attrs}>` : `<${name}>`;
      }
      return `<${name}>`;
    })
    .trim();
}

function stripHiddenSourceBlocks(content) {
  return String(content || '')
    .replace(/\r/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const SUPERSCRIPT_MAP = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '−': '⁻',
  '(': '⁽',
  ')': '⁾'
};

const SUBSCRIPT_MAP = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '−': '₋',
  '(': '₍',
  ')': '₎'
};

function plainTagText(value) {
  return normalizeWhitespace(decodeHtml(String(value || '').replace(/<[^>]+>/g, '')));
}

function toScriptText(value, map) {
  const text = plainTagText(value).replace(/\s+/g, '');
  if (!text || !Array.from(text).every((char) => map[char])) return '';
  return Array.from(text).map((char) => map[char]).join('');
}

const EXTRA_SUPERSCRIPT_MAP = {
  x: '\u02e3',
  y: '\u02b8',
  n: '\u207f'
};

function toPowerScript(value) {
  const text = plainTagText(value)
    .replace(/\$/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, '')
    .replace(/\u2212/g, '-');
  const numeric = toScriptText(text, SUPERSCRIPT_MAP);
  if (numeric) return numeric;

  const variable = text.match(/^([+-]?)([xyn])$/);
  if (!variable) return '';
  return `${toScriptText(variable[1], SUPERSCRIPT_MAP)}${EXTRA_SUPERSCRIPT_MAP[variable[2]]}`;
}

function formatTenPower(match, exponent) {
  const power = toPowerScript(exponent);
  return power ? `10${power}` : match;
}

function normalizeHtmlMathTags(value) {
  return String(value || '')
    .replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, (match, inner) => {
      return toScriptText(inner, SUPERSCRIPT_MAP) || `^{${plainTagText(inner)}}`;
    })
    .replace(/<sub\b[^>]*>([\s\S]*?)<\/sub>/gi, (match, inner) => {
      return toScriptText(inner, SUBSCRIPT_MAP) || `_{${plainTagText(inner)}}`;
    });
}

function normalizeMathDelimiters(value) {
  return String(value || '')
    .replace(/\$\$\$+/g, '$$')
    .replace(/\t\{/g, '\\text{')
    .replace(/\\t\{/g, '\\text{')
    .replace(/\\left\(/g, '\\left(')
    .replace(/\\right\)/g, '\\right)')
    .replace(/\$\$\s*([^$\n]{1,90}?)\s*\$\$/g, (match, inner) => {
      const formula = inner.trim();
      return /\\begin|\\\\/.test(formula) ? match : `$${formula}$`;
    })
    .replace(/10\s*\$\s*-\s*\$\s*(\d+)/g, (match, power) => `10${toScriptText(`-${power}`, SUPERSCRIPT_MAP)}`)
    .replace(/10\s*\$\s*-\s*\$\s*([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, '10⁻$1')
    .replace(/([A-Za-z])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*\$\s*-\s*\$/g, '$1$2⁻')
    .replace(/\b([A-Za-z])_\{([A-Za-z0-9+-]+)\}/g, (match, base, subscript) => `$${base}_{${subscript}}$`)
    .replace(/\b([A-Z][a-z]?)\^\{([0-9]+[+−-])\}/g, (match, element, charge) => {
      return `${element}${toScriptText(charge, SUPERSCRIPT_MAP)}`;
    })
    .replace(/10\^\{([+−-]?\d+)\}/g, (match, power) => {
      return `10${toScriptText(power, SUPERSCRIPT_MAP)}`;
    })
    .replace(/\{\{10\}\^\{\s*([^{}]{1,20})\s*\}\}/g, formatTenPower)
    .replace(/\{10\}\^\{\s*([^{}]{1,20})\s*\}/g, formatTenPower)
    .replace(/10\^\{\s*([^{}]{1,20})\s*\}/g, formatTenPower)
    .replace(/(\d+(?:\.\d+)?)\s*\$\s*\\times\s*\$\s*10\s*([⁻⁺⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, '$1 × 10$2')
    .replace(/([A-Za-z])\s*\$\s*\\times\s*\$\s*10\s*([⁻⁺⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, '$1 × 10$2')
    .replace(/\s*\$\s*\\times\s*\$\s*/g, ' × ')
    .replace(/\s*\$\s*-\s*\$\s*/g, '−')
    .replace(/\b([A-Z][a-z]?)\^\{([0-9]+[+−-])\}/g, (match, element, charge) => {
      return `${element}${toScriptText(charge, SUPERSCRIPT_MAP)}`;
    })
    .replace(/10\^\{([+−-]?\d+)\}/g, (match, power) => {
      return `10${toScriptText(power, SUPERSCRIPT_MAP)}`;
    })
    .replace(/\b([A-Z][a-z]?)\s+([0-9])([+-])(?=\s*\()/g, (match, element, charge, sign) => {
      return `${element}${toScriptText(`${charge}${sign}`, SUPERSCRIPT_MAP)}`;
    })
    .replace(/\s+\$/g, ' $')
    .replace(/\$\s+/g, '$ ');
}

function contentToTextAndHtml(content) {
  const images = [];
  const cleaned = stripHiddenSourceBlocks(content);
  const withImageMarkers = cleaned.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = getAttribute(tag, 'data-orsrc') || getAttribute(tag, 'src');
    const alt = decodeHtml(getAttribute(tag, 'alt') || 'JEE Advanced diagram');
    const index = images.push({ src, alt }) - 1;
    return `\n[[PYQ_IMAGE_${index}]]\n`;
  });

  const text = normalizeWhitespace(decodeHtml(
    withImageMarkers
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  ));

  const plain = normalizeWhitespace(text.replace(/\[\[PYQ_IMAGE_(\d+)]]/g, (_, indexText) => {
    const image = images[Number(indexText)] || {};
    return `[Diagram: ${image.alt || image.src || 'JEE Advanced diagram'}]`;
  }));

  const html = sanitizeSourceHtml(cleaned, 'JEE Advanced diagram') || escapeHtml(plain).replace(/\n/g, '<br>');

  return { plain, html };
}

function comboLabel(letters) {
  return `Only ${letters.join(', ')}`;
}

function chooseCombinationOptions(correctLetters, questionId) {
  const correctKey = correctLetters.join('');
  const distractors = COMBINATION_DISTRACTORS
    .filter((letters) => letters.join('') !== correctKey)
    .sort((a, b) => {
      const seedA = `${questionId}|${a.join('')}`;
      const seedB = `${questionId}|${b.join('')}`;
      return hashText(seedA) - hashText(seedB);
    })
    .slice(0, 3);

  const all = [correctLetters, ...distractors].sort((a, b) => {
    const seedA = `${questionId}|option|${a.join('')}`;
    const seedB = `${questionId}|option|${b.join('')}`;
    return hashText(seedA) - hashText(seedB);
  });

  const options = all.map(comboLabel);
  return { options, answerIndex: all.findIndex((letters) => letters.join('') === correctKey) };
}

function makeNumericOptions(correctAnswer, questionId) {
  const correct = normalizeWhitespace(correctAnswer);
  if (!correct || correct.length > 48) return null;

  const values = [correct];
  const numeric = Number(correct);
  if (Number.isFinite(numeric)) {
    const offsets = numeric === 0 ? [1, -1, 2, -2] : [1, -1, 2, -2, numeric, -numeric];
    offsets.forEach((offset) => {
      const value = Number.isInteger(numeric) && Number.isInteger(offset)
        ? String(numeric + offset)
        : String(Number((numeric + offset).toFixed(2)));
      if (!values.includes(value)) values.push(value);
    });
  } else {
    const rangeMatch = correct.match(/^(-?\d+(?:\.\d+)?)\s*(?:to|-)\s*(-?\d+(?:\.\d+)?)$/i);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      [
        `${start + 1} to ${end + 1}`,
        `${start - 1} to ${end - 1}`,
        `${start} to ${end + 1}`,
        `${start + 1} to ${end}`
      ].forEach((value) => {
        if (!values.includes(value)) values.push(value);
      });
    }
  }

  ['0', '1', '2', '4', 'Cannot be determined'].forEach((value) => {
    if (values.length < 6 && !values.includes(value)) values.push(value);
  });

  if (values.length < 4) return null;

  const options = values
    .slice(0, 6)
    .sort((a, b) => hashText(`${questionId}|numeric|${a}`) - hashText(`${questionId}|numeric|${b}`))
    .slice(0, 4);

  if (!options.includes(correct)) {
    options[hashText(questionId) % 4] = correct;
  }

  return { options, answerIndex: options.indexOf(correct) };
}

function hashText(value) {
  let hash = 2166136261;
  for (const char of String(value || '')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function extractQuestionsArrays(html) {
  const arrays = [];
  for (const match of html.matchAll(/questions:\[/g)) {
    const source = extractArrayLiteral(html, match.index);
    try {
      const value = vm.runInNewContext(source, {}, { timeout: 1000 });
      if (Array.isArray(value) && value.some((item) => item && item.question_id)) {
        arrays.push(value);
      }
    } catch (error) {
      console.warn(`Skipped one questions array: ${error.message}`);
    }
  }
  return arrays;
}

function extractArrayLiteral(text, markerIndex) {
  const start = text.indexOf('[', markerIndex);
  if (start < 0) throw new Error('questions array start not found');

  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;

  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) inString = false;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      quote = char;
    } else if (char === '[') {
      depth++;
    } else if (char === ']') {
      depth--;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }

  throw new Error('questions array end not found');
}

function scoreQuestionForChapter(question, sourceConfig) {
  const haystack = [
    question.topic,
    question.topicName,
    question.paperTitle,
    question.question?.en?.content,
    question.bookmark?.en?.excerpt
  ].map((value) => String(value || '').toLowerCase()).join(' ');

  const keywords = Array.isArray(sourceConfig.keywords) ? sourceConfig.keywords : [];
  const keywordScore = keywords.reduce((score, keyword) => {
    return haystack.includes(String(keyword).toLowerCase()) ? score + 25 : score;
  }, 0);

  return keywordScore + Number(question.year || 0) / 10000;
}

function buildQuizQuestion(rawQuestion, appChapter, sourceSlug) {
  const english = rawQuestion.question?.en || {};
  const rawOptions = Array.isArray(english.options) ? english.options : [];
  const correctLetters = Array.isArray(english.correct_options)
    ? english.correct_options.map((letter) => String(letter || '').trim().toUpperCase()).filter(Boolean)
    : [];

  if (!english.content) return null;
  if (rawQuestion.type !== 'mcq') return null;
  if (rawQuestion.isBonus) return null;

  const prompt = contentToTextAndHtml(english.content);
  const paperTitle = rawQuestion.paperTitle || rawQuestion.bookmark?.en?.title || 'JEE Advanced PYQ';
  const explanation = contentToTextAndHtml(english.explanation || '');
  const displayChapter = String(appChapter || '').replace(/^JEE Maths - /, '');
  const source = `${paperTitle} | ${displayChapter} | ${rawQuestion.question_id}`;

  if (rawQuestion.type === 'integer') {
    const answerText = contentToTextAndHtml(english.answer || rawQuestion.answer || '').plain
      .replace(/^\[|\]$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const numericOptions = makeNumericOptions(answerText, rawQuestion.question_id);
    if (!numericOptions) return null;
    return {
      q: prompt.plain,
      qHtml: prompt.html,
      o: numericOptions.options,
      oHtml: numericOptions.options.map(escapeHtml),
      a: numericOptions.answerIndex,
      s: normalizeWhitespace(`${paperTitle}. Original numerical answer: ${answerText}. ${explanation.plain || 'Solve the imported JEE Advanced numerical problem and match the value.'}`),
      source,
      pyq: true,
      exactPaperText: true,
      pyqConvertedNumerical: true,
      pyqSourceSlug: sourceSlug
    };
  }

  if (rawOptions.length !== 4 || correctLetters.length < 1) return null;
  if (correctLetters.some((letter) => !OPTION_LETTERS.includes(letter))) return null;

  const optionTexts = rawOptions.map((option) => contentToTextAndHtml(option.content || option));
  const originalAnswer = correctLetters.join(', ');

  if (rawQuestion.type === 'mcqm' || correctLetters.length > 1) {
    const originalChoicesPlain = optionTexts
      .map((option, index) => `${OPTION_LETTERS[index]}. ${option.plain}`)
      .join('\n');
    const originalChoicesHtml = optionTexts
      .map((option, index) => `<strong>${OPTION_LETTERS[index]}.</strong> ${option.html}`)
      .join('<br>');
    const { options, answerIndex } = chooseCombinationOptions(correctLetters, rawQuestion.question_id);
    return {
      q: normalizeWhitespace(`${prompt.plain}\n\nOriginal choices:\n${originalChoicesPlain}\n\nChoose the option-set that contains all correct choices.`),
      qHtml: `${prompt.html}<br><br><strong>Original choices:</strong><br>${originalChoicesHtml}<br><br><strong>Choose the option-set that contains all correct choices.</strong>`,
      o: options,
      oHtml: options.map(escapeHtml),
      a: answerIndex,
      s: normalizeWhitespace(`${paperTitle}. Original JEE Advanced multi-correct answer: ${originalAnswer}. ${explanation.plain || 'Use the original option-set logic to verify every statement.'}`),
      source,
      pyq: true,
      exactPaperText: true,
      pyqSourceSlug: sourceSlug
    };
  }

  const correctIndex = rawOptions.findIndex((option) => String(option.identifier || '').toUpperCase() === correctLetters[0]);
  if (correctIndex < 0) return null;

  return {
    q: prompt.plain,
    qHtml: prompt.html,
    o: optionTexts.map((option) => option.plain),
    oHtml: optionTexts.map((option) => option.html),
    a: correctIndex,
    s: normalizeWhitespace(`${paperTitle}. Correct option: ${correctLetters[0]}. ${explanation.plain || 'Refer to the original JEE Advanced solution for the full derivation.'}`),
    source,
    pyq: true,
    exactPaperText: true,
    pyqSourceSlug: sourceSlug
  };
}

function hasBrokenRenderFragments(question) {
  const fields = [
    question.q,
    question.qHtml,
    ...(Array.isArray(question.o) ? question.o : []),
    ...(Array.isArray(question.oHtml) ? question.oHtml : [])
  ];

  return fields.some(hasBrokenMathFragments);
}

function dedupeQuestions(questions) {
  const seen = new Set();
  return questions.filter((question) => {
    const key = normalizeWhitespace(question.q).toLowerCase().slice(0, 500);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchChapterQuestions(subject, sourceConfig) {
  const url = `${BASE_URL}/${subject}/${sourceConfig.slug}`;
  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`Skipped ${url}: ${response.status}`);
    return [];
  }

  const html = await response.text();
  return extractQuestionsArrays(html)
    .flat()
    .filter((question) => question && question.question_id)
    .map((question) => ({
      question,
      score: scoreQuestionForChapter(question, sourceConfig)
    }));
}

async function buildBankForSubject(subject, mapping) {
  const sourceCache = new Map();
  const output = {};

  for (const [appChapter, sourceConfigs] of Object.entries(mapping)) {
    const collected = [];

    for (const sourceConfig of sourceConfigs) {
      const cacheKey = `${subject}/${sourceConfig.slug}`;
      if (!sourceCache.has(cacheKey)) {
        sourceCache.set(cacheKey, await fetchChapterQuestions(subject, sourceConfig));
      }

      const rawItems = sourceCache.get(cacheKey) || [];
      rawItems.forEach((entry) => {
        const score = scoreQuestionForChapter(entry.question, sourceConfig);
        collected.push({ ...entry, score, sourceSlug: sourceConfig.slug });
      });
    }

    const imported = dedupeQuestions(
      collected
        .sort((a, b) => b.score - a.score)
        .map((entry) => buildQuizQuestion(entry.question, appChapter, entry.sourceSlug))
        .filter((question) => question && !hasBrokenRenderFragments(question))
    ).slice(0, QUESTIONS_PER_CHAPTER);

    if (imported.length) {
      output[appChapter] = imported;
    }

    console.log(`${subject.padEnd(9)} ${appChapter}: ${imported.length}`);
  }

  return output;
}

async function main() {
  const physics = await buildBankForSubject('physics', CHAPTER_SOURCES.physics);
  const chemistry = await buildBankForSubject('chemistry', CHAPTER_SOURCES.chemistry);
  const mathematics = await buildBankForSubject('mathematics', CHAPTER_SOURCES.mathematics);
  const bank = { ...physics, ...chemistry, ...mathematics };
  const generatedAt = new Date().toISOString();

  const file = `// Generated by scripts/import-jee-advanced-pyq.cjs on ${generatedAt}.
// JEE Advanced PYQ supplement. Loaded after generated banks and placed before fallback questions.

const JEE_ADVANCED_PYQ_BANK = ${JSON.stringify(bank, null, 2)};

Object.entries(JEE_ADVANCED_PYQ_BANK).forEach(([chapterName, importedQuestions]) => {
    if (!Array.isArray(importedQuestions) || importedQuestions.length === 0) return;

    chapters[chapterName] = importedQuestions.slice(0, 50);
    CHAPTER_PART_SIZE_OVERRIDES[chapterName] = 10;
});
`;

  fs.writeFileSync(OUTPUT_PATH, file, 'utf8');
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
