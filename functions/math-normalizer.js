const SUPERSCRIPT_MAP = Object.freeze({
  '0': '\u2070',
  '1': '\u00b9',
  '2': '\u00b2',
  '3': '\u00b3',
  '4': '\u2074',
  '5': '\u2075',
  '6': '\u2076',
  '7': '\u2077',
  '8': '\u2078',
  '9': '\u2079',
  '+': '\u207a',
  '-': '\u207b',
  x: '\u02e3',
  y: '\u02b8',
  n: '\u207f'
});

function toSuperscript(value) {
  const text = String(value || '')
    .replace(/\$/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, '')
    .replace(/\u2212/g, '-');

  if (!text) return '';

  let result = '';
  for (const char of text) {
    const mapped = SUPERSCRIPT_MAP[char];
    if (!mapped) return '';
    result += mapped;
  }
  return result;
}

function withTenPower(match, lead, exponent) {
  const power = toSuperscript(exponent);
  return power ? `${lead} \u00d7 10${power}` : match;
}

function tenPowerOnly(match, exponent) {
  const power = toSuperscript(exponent);
  return power ? `10${power}` : match;
}

function withIonCharge(match, element, charge, sign) {
  const power = toSuperscript(`${charge}${sign}`);
  return power ? `${element}${power}` : match;
}

function prepareBreaks(value) {
  const text = String(value || '');
  return {
    hadHtmlBreaks: /<br\s*\/?>/i.test(text),
    text: text.replace(/<br\s*\/?>/gi, '\n')
  };
}

function restoreBreaks(value, hadHtmlBreaks) {
  const text = String(value || '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return hadHtmlBreaks ? text.replace(/\n/g, '<br>') : text;
}

function stripScrapedCss(value) {
  let text = String(value || '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '\n')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '\n');

  const selectorBlockPattern = /(?:^|\n|\s)(?:table|tbody|thead|tr|th\s*,\s*td|th|td|body\[data-theme=['"]?dark['"]?\]\s+th\s*,\s*body\[data-theme=['"]?dark['"]?\]\s+td|\.[A-Za-z][\w-]*(?:\s+(?:table|th|td))?)\s*\{[^{}]*\}/gi;

  for (let pass = 0; pass < 8; pass++) {
    const next = text.replace(selectorBlockPattern, '\n');
    if (next === text) break;
    text = next;
  }

  return text;
}

function repairGluedTextFragments(value) {
  return String(value || '')
    .replace(/canbeformedusingtheelementsoftheset/gi, 'can be formed using the elements of the set')
    .replace(/beformedusingtheelementsoftheset/gi, 'be formed using the elements of the set')
    .replace(/suchthatthesumofallthediagonalelementsof/gi, 'such that the sum of all the diagonal elements of')
    .replace(/sumofallthediagonalelementsof/gi, 'sum of all the diagonal elements of')
    .replace(/diagonalelementsof/gi, 'diagonal elements of')
    .replace(/forsomeaandbinR/gi, 'for some a and b in R')
    .replace(/someaandb/gi, 'some a and b')
    .replace(/andbinR/gi, 'and b in R')
    .replace(/solutionis/gi, 'solution is')
    .replace(/Thenxis/g, 'Then x is')
    .replace(/Molarmassof/gi, 'Molar mass of')
    .replace(/concentrationofthesolution/gi, 'concentration of the solution')
    .replace(/canbeformed/gi, 'can be formed')
    .replace(/formedusing/gi, 'formed using')
    .replace(/usingtheelements/gi, 'using the elements')
    .replace(/elementsoftheset/gi, 'elements of the set')
    .replace(/suchthat/gi, 'such that')
    .replace(/sumofall/gi, 'sum of all')
    .replace(/diagonalelements/gi, 'diagonal elements');
}

function replaceBalancedCommand(value, commandName, replacer) {
  const source = String(value || '');
  const needle = `\\${commandName}{`;
  let result = '';
  let cursor = 0;

  while (cursor < source.length) {
    const start = source.indexOf(needle, cursor);
    if (start < 0) {
      result += source.slice(cursor);
      break;
    }

    result += source.slice(cursor, start);
    let index = start + needle.length;
    let depth = 1;

    while (index < source.length && depth > 0) {
      const char = source[index];
      if (char === '\\') {
        index += 2;
        continue;
      }
      if (char === '{') depth += 1;
      if (char === '}') depth -= 1;
      index += 1;
    }

    if (depth !== 0) {
      result += source.slice(start);
      break;
    }

    const body = source.slice(start + needle.length, index - 1);
    result += replacer(body);
    cursor = index;
  }

  return result;
}

function readBalancedGroup(source, startIndex) {
  if (source[startIndex] !== '{') return null;

  let index = startIndex + 1;
  let depth = 1;

  while (index < source.length && depth > 0) {
    const char = source[index];
    if (char === '\\') {
      index += 2;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    index += 1;
  }

  if (depth !== 0) return null;
  return {
    body: source.slice(startIndex + 1, index - 1),
    end: index
  };
}

function replaceTwoArgCommand(value, commandName, replacer) {
  const source = String(value || '');
  const needle = `\\${commandName}`;
  let result = '';
  let cursor = 0;

  while (cursor < source.length) {
    const start = source.indexOf(needle, cursor);
    if (start < 0) {
      result += source.slice(cursor);
      break;
    }

    result += source.slice(cursor, start);
    let index = start + needle.length;
    while (/\s/.test(source[index] || '')) index += 1;

    const first = readBalancedGroup(source, index);
    if (!first) {
      result += source.slice(start, start + needle.length);
      cursor = start + needle.length;
      continue;
    }

    index = first.end;
    while (/\s/.test(source[index] || '')) index += 1;

    const second = readBalancedGroup(source, index);
    if (!second) {
      result += source.slice(start, first.end);
      cursor = first.end;
      continue;
    }

    result += replacer(first.body, second.body);
    cursor = second.end;
  }

  return result;
}

function cleanMatrixBody(body) {
  return String(body || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&amp;/g, '&')
    .replace(/\\hfill\s*/g, '')
    .replace(/\\cr\b/g, '\\\\')
    .replace(/\{\s*(-?\d+(?:\.\d+)?)\s*\}/g, '$1')
    .replace(/\s*&\s*/g, ' & ')
    .replace(/\s*\\\\\s*/g, ' \\\\ ')
    .replace(/[ \t]*\n+[ \t]*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/(?:\s*\\\\\s*)+$/g, '')
    .trim();
}

function convertDelimitedMatrices(value) {
  return String(value || '')
    .replace(/\\left\[\s*\{*\s*\\begin\{matrix\}([\s\S]*?)\\end\{matrix\}\s*\}*\s*\\right\]/g, (_, body) => {
      return `\\begin{bmatrix}${body}\\end{bmatrix}`;
    })
    .replace(/\\left\(\s*\{*\s*\\begin\{matrix\}([\s\S]*?)\\end\{matrix\}\s*\}*\s*\\right\)/g, (_, body) => {
      return `\\begin{pmatrix}${body}\\end{pmatrix}`;
    })
    .replace(/\\left\|\s*\{*\s*\\begin\{matrix\}([\s\S]*?)\\end\{matrix\}\s*\}*\s*\\right\|/g, (_, body) => {
      return `\\begin{vmatrix}${body}\\end{vmatrix}`;
    })
    .replace(/\\left\\\{\s*\{*\s*\\begin\{matrix\}([\s\S]*?)\\end\{matrix\}\s*\}*\s*\\right\./g, (_, body) => {
      return `\\begin{cases}${body}\\end{cases}`;
    })
    .replace(/\\left\.\s*\{*\s*\\begin\{matrix\}([\s\S]*?)\\end\{matrix\}\s*\}*\s*\\right\\\}/g, (_, body) => {
      return `\\left.\\begin{matrix}${body}\\end{matrix}\\right\\}`;
    });
}

function normalizeLegacyMatrices(value) {
  let text = String(value || '')
    .replace(/\\hfill\s*/g, '')
    .replace(/\\cr\b/g, '\\\\');

  for (let pass = 0; pass < 5; pass++) {
    const next = replaceBalancedCommand(text, 'matrix', (body) => {
      return `\\begin{matrix}${cleanMatrixBody(body)}\\end{matrix}`;
    });
    if (next === text) break;
    text = next;
  }

  return convertDelimitedMatrices(text);
}

const LATEX_TEXT_COMMANDS = Object.freeze({
  alpha: '\u03b1',
  beta: '\u03b2',
  gamma: '\u03b3',
  delta: '\u03b4',
  theta: '\u03b8',
  lambda: '\u03bb',
  mu: '\u03bc',
  pi: '\u03c0',
  sigma: '\u03c3',
  omega: '\u03c9',
  Delta: '\u0394',
  Omega: '\u03a9',
  infty: '\u221e',
  times: '\u00d7',
  cdot: '\u00b7',
  pm: '\u00b1',
  mp: '\u2213',
  le: '\u2264',
  leq: '\u2264',
  leqslant: '\u2264',
  ge: '\u2265',
  geq: '\u2265',
  geqslant: '\u2265',
  neq: '\u2260',
  approx: '\u2248',
  sim: '\u223c',
  equiv: '\u2261',
  in: '\u2208',
  notin: '\u2209',
  subset: '\u2282',
  subseteq: '\u2286',
  cup: '\u222a',
  cap: '\u2229',
  union: '\u222a',
  intersection: '\u2229',
  rightarrow: '\u2192',
  leftarrow: '\u2190',
  to: '\u2192',
  sum: '\u2211',
  prod: '\u220f',
  int: '\u222b',
  partial: '\u2202',
  degree: '\u00b0',
  sin: 'sin',
  cos: 'cos',
  tan: 'tan',
  cot: 'cot',
  sec: 'sec',
  cosec: 'cosec',
  log: 'log',
  ln: 'ln',
  lim: 'lim',
  gcd: 'gcd',
  det: 'det',
  lceil: '\u2308',
  rceil: '\u2309',
  lfloor: '\u230a',
  rfloor: '\u230b'
});

const MATHBB_TEXT = Object.freeze({
  R: '\u211d',
  N: '\u2115',
  Z: '\u2124',
  Q: '\u211a',
  C: '\u2102'
});

function readableLatexFragment(value) {
  let text = String(value || '');

  for (let pass = 0; pass < 4; pass++) {
    const next = replaceTwoArgCommand(text, 'dfrac', (top, bottom) => `(${readableLatexFragment(top)})/(${readableLatexFragment(bottom)})`);
    text = replaceTwoArgCommand(next, 'tfrac', (top, bottom) => `(${readableLatexFragment(top)})/(${readableLatexFragment(bottom)})`);
    text = replaceTwoArgCommand(text, 'frac', (top, bottom) => `(${readableLatexFragment(top)})/(${readableLatexFragment(bottom)})`);
  }

  for (let pass = 0; pass < 4; pass++) {
    const next = replaceBalancedCommand(text, 'sqrt', (body) => `\u221a(${readableLatexFragment(body)})`);
    if (next === text) break;
    text = next;
  }

  text = text
    .replace(/\\mathbb\{([RNCZQ])\}/g, (_, letter) => MATHBB_TEXT[letter] || letter)
    .replace(/\\begin\{(bmatrix|pmatrix|vmatrix|matrix|cases)\}([\s\S]*?)\\end\{\1\}/g, (_, env, body) => {
      const rows = body
        .split(/\\\\/)
        .map((row) => row.replace(/\s*&\s*/g, ', ').trim())
        .filter(Boolean);
      if (env === 'pmatrix') return `(${rows.join('; ')})`;
      if (env === 'vmatrix') return `|${rows.join('; ')}|`;
      return `[${rows.join('; ')}]`;
    });

  for (let pass = 0; pass < 4; pass++) {
    const before = text;
    ['mathrm', 'mathbf', 'boldsymbol', 'text', 'operatorname', 'overline', 'bar', 'hat', 'widehat'].forEach((command) => {
      text = replaceBalancedCommand(text, command, (body) => readableLatexFragment(body));
    });
    if (text === before) break;
  }

  return text
    .replace(/\\left|\\right/g, '')
    .replace(/\\limits\b/g, '')
    .replace(/\\(?:quad|qquad)\b|\\[,!;:]/g, ' ')
    .replace(/\\([A-Za-z]+)/g, (match, command) => LATEX_TEXT_COMMANDS[command] || command)
    .replace(/\\([{}_[\]()|])/g, '$1')
    .replace(/\^\{\s*([^{}]{1,16})\s*\}/g, (match, power) => toSuperscript(power) || `^(${power.trim()})`)
    .replace(/\^([+\-]?\d|[nxy])/g, (match, power) => toSuperscript(power) || match)
    .replace(/_\{\s*([^{}]{1,24})\s*\}/g, '_$1')
    .replace(/\s*\\\\\s*/g, '; ')
    .replace(/\\/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toReadableMathText(value) {
  const prepared = prepareBreaks(value);
  let text = normalizeLegacyMatrices(repairGluedTextFragments(stripScrapedCss(prepared.text)))
    .replace(/\$\$\$+/g, '$$')
    .replace(/\$\$/g, '$')
    .replace(/\$/g, '');

  text = readableLatexFragment(text)
    .replace(/\{\s*([^{}\n]{1,80})\s*\}/g, '$1')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/([([{\u2308\u230a])\s+/g, '$1')
    .replace(/\s+([)\]}\u2309\u230b])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return restoreBreaks(text, prepared.hadHtmlBreaks);
}

function isInsideDollarMath(text, offset) {
  let count = 0;
  for (let index = 0; index < offset; index++) {
    if (text[index] === '$' && text[index - 1] !== '\\') count += 1;
  }
  return count % 2 === 1;
}

function countUnescapedDollars(value) {
  const text = String(value || '');
  let count = 0;
  for (let index = 0; index < text.length; index++) {
    if (text[index] === '$' && text[index - 1] !== '\\') count += 1;
  }
  return count;
}

function outsideDollarMathSegments(value) {
  const text = String(value || '');
  const segments = [];
  let current = '';
  let insideMath = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '$' && text[index - 1] !== '\\') {
      if (!insideMath) segments.push(current);
      current = '';
      insideMath = !insideMath;
      continue;
    }
    current += char;
  }

  if (!insideMath) segments.push(current);
  return segments;
}

const MATHJAX_ERROR_TEXT_PATTERN = /Math\s+not\s+terminated|Missing\s+\\(?:begin|end)|Unknown\s+environment/i;
const SCRAPED_TABLE_MARKER_PATTERN = /(?:^|\n|<br\s*\/?>)\s*\.tg(?:\s|\{|<br\s*\/?>|$)|border-collapse|border-spacing|word-break|font-family|vertical-align/i;
const RAW_LATEX_OUTSIDE_MATH_PATTERN = /\\(?:frac|dfrac|tfrac|mathrm|mathbf|mathbb|text|left|right|begin|end|sqrt|over|times|sum|limits|operatorname|alpha|beta|gamma|theta|pi|infty|Delta|Omega|mu)\b|\\[{}]|\\\\/;
const GLUED_SOURCE_WORD_PATTERN = /\b(?:canbeformedusingtheelementsoftheset|beformedusingtheelementsoftheset|suchthatthesumof|sumofallthediagonal|diagonalelementsof|canbeformed|formedusing|usingtheelements|elementsoftheset|suchthat|sumofall|diagonalelements|forsome|someaandb|andbinR|solutionis|Thenxis|Molarmassof|concentrationofthesolution)/i;
const MATHISH_TEXT_PATTERN = /[\\{}_^=+*|<>,\/-]|\d/;

function hasBrokenMathFragments(value) {
  const text = String(value || '');
  if (!text) return false;
  if (MATHJAX_ERROR_TEXT_PATTERN.test(text)) return true;
  if (SCRAPED_TABLE_MARKER_PATTERN.test(text)) return true;
  if (GLUED_SOURCE_WORD_PATTERN.test(text)) return true;
  if (countUnescapedDollars(text) % 2 !== 0) return true;

  return outsideDollarMathSegments(text).some((segment) => {
    return RAW_LATEX_OUTSIDE_MATH_PATTERN.test(segment);
  });
}

function normalizeBrokenDollarFragments(value) {
  let text = String(value || '')
    .replace(/\$\$\$+/g, '$$')
    .replace(/\$\$/g, '$');

  text = text
    .replace(/\[\{\$([A-Za-z]_\{[^}]+\})\$\}\]/g, (_, symbol) => `[${symbol}]`)
    .replace(/\(\$([A-Za-z]_\{[^}]+\})\$\)_\{?\s*3\s*x\s*3\s*\}?/gi, (_, symbol) => `(${symbol})_{3 \\times 3}`)
    .replace(/_\{?\s*3\s*x\s*3\s*\}?/gi, '_{3 \\times 3}')
    .replace(/\$\s*\$([A-Za-z]_\{[^}]+\})\$\s*\\in\s*T\s*\$/g, (_, symbol) => `$${symbol} \\in T$`)
    .replace(/\{\$([A-Za-z]_\{[^}]+\})\$\}/g, (_, symbol) => `{${symbol}}`)
    .replace(/\(\$\\alpha\$,\s*\$\\beta\$,\s*\$\\gamma\$\$?\)/g, '$(\\alpha, \\beta, \\gamma)$');

  text = text.replace(/\$([A-Za-z]_\{[^}]+\})\$/g, (match, symbol, offset, source) => {
    return isInsideDollarMath(source, offset) ? symbol : match;
  });

  return text
    .replace(/\$([^$\n]{1,260}?)\s+(and|be|is|are|was|were|such|where|with|for|from|then|which|denote|denotes|equal|has)\b/gi, (match, formula, word) => {
      return `$${formula.trim()}$ ${word}`;
    })
    .replace(/\$([^$\n]{1,220}?(?:\\[A-Za-z]+(?:\{[^{}]*\})*|[A-Za-z0-9_}\]])\s+)(be|is|are|was|were|such|where|with|for|from|then|which|denote|denotes)\b/g, (match, formula, word) => {
      return /[\\{}_^=+\-*/<>,]/.test(formula) ? `$${formula.trim()}$ ${word}` : match;
    })
    .replace(/\b([A-Za-z])\$\s*\\in\s*\$([A-Za-z])\b/g, (_, variable, setName) => `$${variable} \\in ${setName}$`)
    .replace(/(\d+)\$\\pi\s*\$/g, (_, coefficient) => `$${coefficient}\\pi$`)
    .replace(/([\s(])[\u2212-]\$\\pi\$/g, '$1$-\\pi$')
    .replace(/\$(?=(?:Let|For|If|Then|Where|The|Select|Choose|and|where|then|is|for|which|if)\b)/g, '$ ')
    .replace(/([A-Za-z0-9)}\]])\$(?=(?:and|where|then|is|for|which|if)\b)/gi, '$1$ ')
    .replace(/\$,\s*\$/g, () => '$, $')
    .replace(/([a-z])\$(?=[A-Z])/g, (_, lead) => `${lead} $`)
    .replace(/(\$\\alpha\$)\s+(4x\s*\+\s*5y\s*\+\s*6z)/g, '$1\n$2')
    .replace(/(\$\\beta\$)\s+(7x\s*\+\s*8y\s*\+\s*9z)/g, '$1\n$2')
    .replace(/\$\\gamma\$\s*[\u2212-]\s*1/g, '$\\gamma - 1$')
    .replace(/\$\\forall\$\s*([A-Za-z])\s*\\in\s*([A-Za-z])\$/g, '$\\forall $1 \\in $2$')
    .replace(/\$\\in\$\s*(\[[^\]\n]{1,80}\])\$/g, '\u2208 $1')
    .replace(/\$\s*(which|where|then|for|if|is|are|was|were|be|has|denote|denotes)\s*\$/gi, ' $1 ')
    .replace(/(\$[^$\n]{1,120}\$)(?=[A-Za-z])/g, '$1 ')
    .replace(/\b([A-Za-z]{2,})\$\s+(?=(?:and|where|then|is|are|was|were|for|which|if|with|in|of|to|from|on|by)\b)/gi, removeStrayDollarBeforeWord)
    .replace(/(?<!\$)(\d+(?:\.\d+)?)\$\s+(?=(?:and|where|then|is|are|was|were|for|which|if|with|in|of|to|from|on|by)\b)/gi, removeStrayDollarBeforeWord)
    .replace(/\^\{\s*[\u2212-]\s*\$\s*(\d+)\s*\}/g, '^{-$1}')
    .replace(/(\d+)\s*(?:\u00d7|\\times)\s*\$\s*(\d+)/g, '$1 \u00d7 $2')
    .replace(/[ \t]{2,}/g, ' ');
}

const LOOSE_MATH_WORD_PATTERN = /\s+(and|be|is|are|was|were|such|where|with|for|from|then|which|denote|denotes|equal|equals|has|in)\b/i;
const SAFE_TEXT_AFTER_DOLLAR_PATTERN = /\s*(?:[,.;:)]|$)/;
const LOOSE_MATH_COMMA_PATTERN = /,\s+[A-Za-z]/;

function hasLikelyFormulaMarker(value) {
  return /\\[A-Za-z]+|[_^=+\-*/<>|]|\d/.test(String(value || ''));
}

function removeStrayDollarBeforeWord(match, token, offset, source) {
  const dollarOffset = offset + String(token).length;
  return isInsideDollarMath(source, dollarOffset) ? match : `${token} `;
}

function closeLooseDollarBeforeText(value) {
  const text = String(value || '');

  return text.replace(/\$([^$\n]{1,260})/g, (match, body) => {
    const commaMatch = body.match(LOOSE_MATH_COMMA_PATTERN);
    if (commaMatch && commaMatch.index > 0) {
      const formula = body.slice(0, commaMatch.index).trim();
      if (formula && hasLikelyFormulaMarker(formula)) {
        return `$${formula}$${body.slice(commaMatch.index)}`;
      }
    }

    const wordMatch = body.match(LOOSE_MATH_WORD_PATTERN);
    if (!wordMatch || wordMatch.index <= 0) return match;

    const formula = body.slice(0, wordMatch.index).trimEnd();
    if (!formula || !hasLikelyFormulaMarker(formula)) return match;

    const rest = body.slice(wordMatch.index);
    if (!SAFE_TEXT_AFTER_DOLLAR_PATTERN.test(rest) && !/^\s+[A-Za-z]/.test(rest)) return match;

    return `$${formula}$${rest}`;
  });
}

function repairLooseDollarMath(value) {
  return closeLooseDollarBeforeText(value)
    .replace(/\$\\forall\$\s*([A-Za-z])\s*\\in\s*([A-Za-z])\$/g, '$\\forall $1 \\in $2$')
    .replace(/\$\\in\$\s*(\[[^\]\n]{1,80}\])\$/g, '\u2208 $1')
    .replace(/\$\s*(which|where|then|for|if|is|are|was|were|be|has|denote|denotes)\s*\$/gi, ' $1 ')
    .replace(/(\$[^$\n]{1,120}\$)(?=[A-Za-z])/g, '$1 ')
    .replace(/\b([A-Za-z]{2,})\$\s+(?=(?:and|where|then|is|are|was|were|for|which|if|with|in|of|to|from|on|by)\b)/gi, removeStrayDollarBeforeWord)
    .replace(/(?<!\$)(\d+(?:\.\d+)?)\$\s+(?=(?:and|where|then|is|are|was|were|for|which|if|with|in|of|to|from|on|by)\b)/gi, removeStrayDollarBeforeWord);
}

function normalizeMathSymbols(value) {
  const prepared = prepareBreaks(value);
  const normalized = normalizeBrokenDollarFragments(normalizeLegacyMatrices(repairGluedTextFragments(stripScrapedCss(prepared.text))))
    .replace(/10\s*\$\$\s*-\s*\$\$\s*(\d+)/g, (match, power) => tenPowerOnly(match, `-${power}`))
    .replace(/10\s*\$\s*-\s*\$\s*(\d+)/g, (match, power) => tenPowerOnly(match, `-${power}`))
    .replace(/\s*\$\$\s*\\times\s*\$\$\s*/g, ' \u00d7 ')
    .replace(/\s*\$\s*\\times\s*\$\s*/g, ' \u00d7 ')
    .replace(/\s*\$\$\s*-\s*\$\$\s*/g, '\u2212')
    .replace(/\s*\$\s*-\s*\$\s*/g, '\u2212')
    .replace(/((?:\d+(?:\.\d+)?)|[A-Za-z])\s*\u00d7\s*10\s*([+\u2212-]\s*\d+)/g, withTenPower)
    .replace(/((?:\d+(?:\.\d+)?)|[A-Za-z])\s*\u00d7\s*10\s+(\d+)/g, withTenPower)
    .replace(/10\^\{\s*([+\u2212-]?\s*(?:\d+|[xyn]))\s*\}/g, tenPowerOnly)
    .replace(/\b([A-Z][a-z]?)\s+([0-9])\s*([+\u2212-])\s*(?=(?:\(|<br))/g, withIonCharge)
    .replace(/\bK\s+(sp|a|b|c|p|w)\b/g, (match, subscript) => `$K_{${subscript}}$`);

  return restoreBreaks(repairLooseDollarMath(normalized), prepared.hadHtmlBreaks);
}

module.exports = {
  normalizeMathSymbols,
  hasBrokenMathFragments,
  repairLooseDollarMath,
  toReadableMathText
};
