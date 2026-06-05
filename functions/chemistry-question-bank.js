// Supplemental JEE Advanced / Olympiad Chemistry question bank.
// Loaded by functions/api.js after question-bank.js in the same VM context.

const ADVANCED_CHEMISTRY_LENSES = [
    {
        name: 'hidden quantitative constraint',
        prompt: 'the visible data are insufficient until a hidden stoichiometric, charge-balance, or conservation constraint is imposed',
        correct: (topic, chapter) => `use ${topic} as the controlling constraint, write the hidden balance first, and only then apply the ${chapter} relation`,
        wrongA: (topic, chapter) => `substitute into a memorized ${chapter} formula before identifying the limiting ${topic} condition`,
        wrongB: (topic) => `compare visible coefficients directly and ignore the concealed ${topic} balance`,
        wrongC: (topic) => `assume all supplied quantities are independent even though ${topic} couples them`
    },
    {
        name: 'exception and anomaly audit',
        prompt: 'three options follow a common textbook trend, but the correct option depends on a high-level exception or anomaly',
        correct: (topic, chapter) => `apply the normal ${chapter} trend, then test the known exception created by ${topic}`,
        wrongA: (topic) => `extend the ordinary trend beyond its valid range and miss the ${topic} anomaly`,
        wrongB: (topic) => `quote the exception but apply it to the wrong species or condition in ${topic}`,
        wrongC: () => 'rank only by atomic number, molar mass, or visible formula without checking electronic structure'
    },
    {
        name: 'graph or table inversion',
        prompt: 'a graph, table, titration curve, spectrum, or experimental observation must be inverted to recover the chemical variable',
        correct: (topic, chapter) => `translate the data into the variable required by ${topic}, then infer the ${chapter} conclusion`,
        wrongA: (topic) => `read the plotted slope, intercept, or colour change as the answer without converting it through ${topic}`,
        wrongB: () => 'use the raw numerical order even though the chemical variable is reciprocal, logarithmic, or squared',
        wrongC: (topic) => `discard the endpoint, equivalence point, or limiting observation that actually encodes ${topic}`
    },
    {
        name: 'mechanism and intermediate control',
        prompt: 'the answer is controlled by the rate-determining step, intermediate stability, orbital interaction, or reaction pathway',
        correct: (topic, chapter) => `identify the intermediate or transition-state feature in ${topic}; that feature decides the ${chapter} result`,
        wrongA: (topic) => `choose the product or order from final thermodynamic stability while the controlling step is ${topic}`,
        wrongB: () => 'ignore stereoelectronic alignment, leaving-group ability, or ligand-field splitting when it controls the pathway',
        wrongC: (topic) => `assume the mechanism is unchanged after the medium, substituent, ligand, or oxidation state alters ${topic}`
    },
    {
        name: 'limiting-case and consistency filter',
        prompt: 'each option looks plausible, so the correct answer is the one that survives limiting cases, units, signs, and chemical feasibility',
        correct: (topic, chapter) => `check units, charge, atom balance, oxidation-state feasibility, and the limiting case of ${topic}`,
        wrongA: () => 'accept a dimensionally or chemically inconsistent expression because it resembles a standard result',
        wrongB: (topic) => `ignore the zero-concentration, infinite-dilution, high-temperature, or strong-field limit of ${topic}`,
        wrongC: (topic) => `choose an option that violates conservation of atoms, charge, spin, or stereochemistry in ${topic}`
    }
];

const chemistryChapterTopics = {
    'Some Basic Concepts of Chemistry': [
        'mole concept with limiting reagent',
        'equivalent mass and n-factor selection',
        'empirical and molecular formula from percentage composition',
        'concentration terms and dilution accounting',
        'stoichiometry with purity and percentage yield',
        'gas-volume stoichiometry under non-identical conditions',
        'atom economy and conservation of atoms',
        'mixture analysis using simultaneous mole equations',
        'significant figures in chemical calculations',
        'density, molarity, molality, and mole fraction conversion'
    ],
    'Structure of Atom': [
        'Bohr energy levels for hydrogen-like species',
        'spectral series and transition energy',
        'de Broglie wavelength of accelerated particles',
        'Heisenberg uncertainty in electron localization',
        'quantum numbers and orbital capacity',
        'radial and angular nodes',
        'Aufbau exceptions in electronic configuration',
        'shielding and effective nuclear charge',
        'photoelectric threshold and photon energy',
        'orbital shape and probability interpretation'
    ],
    'Periodic Classification': [
        'atomic and ionic radius trends',
        'ionization enthalpy anomalies',
        'electron gain enthalpy exceptions',
        'electronegativity and bond polarity trend',
        'metallic and non-metallic character',
        'diagonal relationship',
        'oxide acidity and basicity across a period',
        'inert pair effect onset',
        'second-period anomalous behavior',
        'screening and penetration effect'
    ],
    'Chemical Bonding': [
        'VSEPR shape prediction with lone pairs',
        'hybridization versus geometry',
        'molecular orbital bond order',
        'magnetic nature from MO configuration',
        'Born-Haber cycle and lattice enthalpy',
        'dipole moment and molecular symmetry',
        'hydrogen bonding strength and consequences',
        'resonance and formal charge stability',
        'Fajan rule and covalent character',
        'coordinate bonding and back bonding'
    ],
    'Chemistry - Thermodynamics': [
        'state functions versus path functions',
        'Hess law and enthalpy cycle construction',
        'bond enthalpy approximation limits',
        'entropy change and disorder counting',
        'Gibbs energy and spontaneity',
        'temperature dependence of spontaneity',
        'relation between delta G and equilibrium constant',
        'Kirchhoff equation for enthalpy variation',
        'calorimetry at constant pressure and volume',
        'Born-Haber energy balance'
    ],
    'Chemical Equilibrium': [
        'Kc and Kp relation with gas mole change',
        'reaction quotient and direction of shift',
        'Le Chatelier principle with pressure and temperature',
        'degree of dissociation from equilibrium constant',
        'inert gas addition at constant volume or pressure',
        'heterogeneous equilibrium expression',
        'simultaneous equilibria and coupled constants',
        'approximation validity in equilibrium calculations',
        'van Hoff temperature dependence',
        'common product or reactant perturbation'
    ],
    'Ionic Equilibrium': [
        'weak acid pH with approximation check',
        'weak base hydrolysis and Kb relation',
        'buffer pH using Henderson equation',
        'salt hydrolysis and solution nature',
        'solubility product and ionic product comparison',
        'common ion effect on solubility',
        'polyprotic acid stepwise dissociation',
        'acid-base titration curve and indicator range',
        'amphoteric hydroxide dissolution',
        'pH after mixing strong acid and strong base'
    ],
    'Redox Reactions': [
        'oxidation number assignment in complex species',
        'ion-electron balancing in acidic medium',
        'ion-electron balancing in basic medium',
        'equivalent weight in redox titration',
        'disproportionation and comproportionation',
        'oxidizing and reducing strength order',
        'redox stoichiometry with permanganate and dichromate',
        'electron transfer count from balanced equation',
        'medium dependence of redox products',
        'cell notation from redox half-reactions'
    ],
    'General Organic Chemistry (GOC)': [
        'inductive effect and acidity-basicity',
        'resonance effect and charge delocalization',
        'hyperconjugation and alkene stability',
        'carbocation stability and rearrangement tendency',
        'carbanion stability and electron-withdrawing groups',
        'free radical stability',
        'aromaticity using Huckel rule',
        'tautomerism and enol content',
        'nucleophile-electrophile strength comparison',
        'stereoisomerism and chirality detection'
    ],
    'Hydrocarbons': [
        'alkane conformational stability',
        'free radical halogenation selectivity',
        'Markovnikov addition to alkenes',
        'peroxide effect in HBr addition',
        'ozonolysis product identification',
        'alkyne acidity and acetylide formation',
        'electrophilic aromatic substitution mechanism',
        'directing effects in benzene derivatives',
        'combustion analysis of hydrocarbons',
        'polymerization of alkenes and dienes'
    ],
    'Solutions': [
        'Raoult law for ideal solutions',
        'positive and negative deviation from ideality',
        'Henry law and gas solubility',
        'relative lowering of vapour pressure',
        'boiling point elevation',
        'freezing point depression',
        'osmotic pressure and molar mass',
        'van Hoff factor and abnormal molar mass',
        'azeotrope composition behavior',
        'mole fraction and partial pressure calculation'
    ],
    'Electrochemistry': [
        'Nernst equation for non-standard cell potential',
        'standard electrode potential and spontaneity',
        'conductance, conductivity, and molar conductivity',
        'Kohlrausch law at infinite dilution',
        'Faraday laws of electrolysis',
        'electrolysis product prediction',
        'concentration cell emf',
        'Gibbs energy relation with cell emf',
        'corrosion as electrochemical process',
        'fuel cell overall reaction accounting'
    ],
    'Chemical Kinetics': [
        'rate law and order from initial rates',
        'molecularity versus order',
        'integrated first-order equation',
        'half-life dependence on concentration',
        'pseudo first-order reactions',
        'Arrhenius equation and activation energy',
        'collision theory and orientation factor',
        'catalyst effect on activation energy',
        'parallel reaction product ratio',
        'rate-determining step in mechanism'
    ],
    'd & f Block': [
        'transition metal electronic configuration',
        'variable oxidation states',
        'lanthanoid contraction consequences',
        'color from d-d transitions',
        'magnetic moment from unpaired electrons',
        'catalytic activity of transition metals',
        'complex formation tendency',
        'KMnO4 and K2Cr2O7 redox behavior',
        'actinoid oxidation-state variability',
        'interstitial compound formation'
    ],
    'Coordination Compounds': [
        'IUPAC naming of coordination compounds',
        'coordination number and geometry',
        'valence bond theory hybridization',
        'crystal field splitting in octahedral complexes',
        'high-spin and low-spin magnetic behavior',
        'geometrical and optical isomerism',
        'linkage and ionization isomerism',
        'effective atomic number rule',
        'stability constant and chelate effect',
        'spectrochemical series ligand strength'
    ],
    'p-Block (13 & 14)': [
        'electron deficiency of boron compounds',
        'diborane structure and banana bonds',
        'borax bead test chemistry',
        'amphoteric behavior of aluminium compounds',
        'inert pair effect in group 13 and 14',
        'catenation tendency of carbon',
        'allotropes of carbon',
        'carbides and their hydrolysis products',
        'silicates and silicones structure',
        'oxidation states of tin and lead'
    ],
    'p-Block (15-18)': [
        'nitrogen oxides and oxoacids',
        'ammonia basicity and ligand behavior',
        'phosphorus allotropes and oxoacids',
        'oxygen and ozone oxidizing behavior',
        'sulphur oxoacids and structures',
        'halogen oxidizing power order',
        'interhalogen compound geometry',
        'acidic strength of hydrogen halides',
        'noble gas compounds and hybridization',
        'inert pair effect in heavier p-block elements'
    ],
    'Haloalkanes & Haloarenes': [
        'SN1 versus SN2 mechanism selection',
        'stereochemical outcome of substitution',
        'elimination versus substitution competition',
        'reactivity order of alkyl halides',
        'allylic and benzylic halide reactivity',
        'aryl halide low reactivity toward SN1 and SN2',
        'Grignard reagent formation and reaction',
        'Wurtz and Fittig coupling limitations',
        'polyhalogen compounds and uses',
        'leaving group ability'
    ],
    'Alcohols, Phenols & Ethers': [
        'acidity order of alcohols and phenols',
        'Lucas test for alcohol classification',
        'dehydration of alcohols and rearrangement',
        'oxidation of alcohols by strong oxidants',
        'Williamson ether synthesis limitations',
        'phenol electrophilic substitution',
        'Kolbe reaction and Reimer-Tiemann reaction',
        'ether cleavage by hydrogen halides',
        'distinguishing tests for phenols and alcohols',
        'intramolecular and intermolecular hydrogen bonding'
    ],
    'Aldehydes & Ketones': [
        'nucleophilic addition to carbonyl carbon',
        'reactivity order of aldehydes and ketones',
        'Tollens and Fehling tests',
        'aldol condensation condition',
        'Cannizzaro reaction requirement',
        'haloform reaction condition',
        'Grignard addition to carbonyls',
        'Clemmensen and Wolff-Kishner reductions',
        'cyanohydrin and oxime formation',
        'alpha hydrogen acidity'
    ],
    'Carboxylic Acid Derivatives': [
        'acid strength of substituted carboxylic acids',
        'nucleophilic acyl substitution mechanism',
        'reactivity order of acid derivatives',
        'acid chloride reactions',
        'ester hydrolysis in acidic and basic medium',
        'amide basicity and resonance',
        'Hell-Volhard-Zelinsky reaction',
        'decarboxylation of beta-keto acids',
        'Claisen condensation condition',
        'reduction of carboxylic acid derivatives'
    ],
    'Amines': [
        'basicity order of aliphatic and aromatic amines',
        'Hinsberg test for amine classification',
        'carbylamine test for primary amines',
        'diazotization of aromatic primary amines',
        'azo coupling reaction',
        'Gabriel phthalimide synthesis',
        'Hofmann bromamide degradation',
        'aniline directing effect in substitution',
        'quaternary ammonium salt formation',
        'separation of amine mixtures'
    ],
    'Biomolecules': [
        'reducing and non-reducing sugars',
        'mutarotation of glucose',
        'glycosidic linkage identification',
        'amino acid zwitterion and isoelectric point',
        'peptide bond formation',
        'protein denaturation',
        'enzyme specificity',
        'nucleoside and nucleotide distinction',
        'DNA base pairing',
        'vitamin classification by solubility'
    ],
    'Practical Chemistry': [
        'systematic salt analysis sequence',
        'flame test interpretation',
        'confirmatory tests for cations',
        'confirmatory tests for anions',
        'gas evolution tests',
        'organic functional group tests',
        'acid-base titration indicator selection',
        'redox titration endpoint detection',
        'chromatography separation principle',
        'experimental error and observation reliability'
    ]
};

function getChemistryDisplayChapterName(chapterName) {
    return chapterName === 'Chemistry - Thermodynamics' ? 'Thermodynamics' : chapterName;
}

function rotateAdvancedChemistryOptions(correct, distractors, shift) {
    const base = [correct, ...distractors.slice(0, 3)];
    const values = base.filter((option, index) => base.indexOf(option) === index);
    while (values.length < 4) values.push(`Incomplete advanced-chemistry conclusion ${values.length}`);
    const offset = shift % 4;
    const o = [...values.slice(offset), ...values.slice(0, offset)];
    return { o, a: o.indexOf(correct) };
}

function buildAdvancedChemistryQuestionSet(chapterName, topics) {
    if (!Array.isArray(topics) || topics.length !== 10) {
        throw new Error(`Chemistry chapter ${chapterName} must define exactly 10 concept topics.`);
    }

    const displayChapterName = getChemistryDisplayChapterName(chapterName);
    const questions = [];
    const conceptKeys = new Set();

    topics.forEach((topic, topicIndex) => {
        ADVANCED_CHEMISTRY_LENSES.forEach((lens, lensIndex) => {
            const conceptKey = `${topic} :: ${lens.name}`;
            if (conceptKeys.has(conceptKey)) {
                throw new Error(`Duplicate Chemistry concept in ${chapterName}: ${conceptKey}`);
            }
            conceptKeys.add(conceptKey);

            const correct = `Use ${topic}: ${lens.correct(topic, displayChapterName)}.`;
            const distractors = [
                `Misread ${topic}: ${lens.wrongA(topic, displayChapterName)}.`,
                `Over-simplify ${topic}: ${lens.wrongB(topic, displayChapterName)}.`,
                `Use a shortcut outside its range: ${lens.wrongC(topic, displayChapterName)}.`
            ];
            const { o, a } = rotateAdvancedChemistryOptions(correct, distractors, topicIndex + lensIndex);
            const number = questions.length + 1;
            questions.push({
                q: `In a problem on ${topic}, the hidden difficulty is ${lens.prompt}. Which option is correct?`,
                o,
                a,
                s: `Unique concept ${number}: ${topic} with ${lens.name}. A correct solution first identifies the governing chemical model, then checks mass balance, charge balance, oxidation state, orbital/electronic effect, thermodynamic feasibility, kinetic pathway, and limiting-case consistency as applicable. This prevents the standard JEE Advanced trap of using a memorized ${displayChapterName} shortcut outside its assumptions.`,
                source: `${displayChapterName} advanced chemistry concept ${number}`
            });
        });
    });

    if (questions.length !== 50 || conceptKeys.size !== 50) {
        throw new Error(`Chemistry chapter ${chapterName} generated ${questions.length} questions and ${conceptKeys.size} concepts instead of 50.`);
    }

    return questions;
}

Object.entries(chemistryChapterTopics).forEach(([chapterName, topics]) => {
    chapters[chapterName] = buildAdvancedChemistryQuestionSet(chapterName, topics);
    CHAPTER_PART_SIZE_OVERRIDES[chapterName] = 10;
});
