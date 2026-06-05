// JEE-only Maths replacement bank. The UI displays these chapter keys with
// normal chapter titles, while MHT-CET keeps the older unprefixed maths bank.
(function () {
  const JEE_MATH_PREFIX = 'JEE Maths - ';

  const CLASS_11_JEE_MATH_CHAPTERS = [
    'Basic Mathematics',
    'Sets and Relations',
    'Functions',
    'Trigonometric Ratios and Identities',
    'Trigonometric Equations',
    'Inverse Trigonometric Functions',
    'Heights and Distances',
    'Complex Numbers',
    'Quadratic Equation',
    'Sequences and Series',
    'Binomial Theorem',
    'Permutation and Combination',
    'Probability',
    'Straight Lines',
    'Circle',
    'Parabola',
    'Ellipse',
    'Hyperbola',
    'Properties of Triangles',
    'Mathematical Reasoning',
    'Statistics'
  ];

  const CLASS_12_JEE_MATH_CHAPTERS = [
    'Matrices',
    'Determinants',
    'Vector Algebra',
    'Three Dimensional Geometry',
    'Limits',
    'Continuity and Differentiability',
    'Differentiation',
    'Application of Derivatives',
    'Indefinite Integration',
    'Definite Integration',
    'Area Under Curves',
    'Differential Equations'
  ];

  function gcd(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) {
      const t = y;
      y = x % y;
      x = t;
    }
    return x || 1;
  }

  function frac(n, d) {
    if (d === 0) return 'undefined';
    const sign = n * d < 0 ? '-' : '';
    const g = gcd(n, d);
    const a = Math.abs(n / g);
    const b = Math.abs(d / g);
    return b === 1 ? `${sign}${a}` : `${sign}\\frac{${a}}{${b}}`;
  }

  function nCr(n, r) {
    if (r < 0 || r > n) return 0;
    let ans = 1;
    for (let i = 1; i <= Math.min(r, n - r); i += 1) {
      ans = ans * (n - Math.min(r, n - r) + i) / i;
    }
    return Math.round(ans);
  }

  function det2(a, b, c, d) {
    return a * d - b * c;
  }

  function det3(m) {
    return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
      - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
      + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  }

  function sq(n) {
    return n * n;
  }

  function texValue(value) {
    return typeof value === 'number' ? String(value) : String(value);
  }

  function ensureFour(correct, distractors) {
    const values = [texValue(correct)];
    distractors.map(texValue).forEach((value) => {
      if (!values.includes(value)) values.push(value);
    });
    const numeric = Number(correct);
    let step = 1;
    while (values.length < 4 && Number.isFinite(numeric)) {
      [numeric + step, numeric - step, numeric + 2 * step].map(texValue).forEach((value) => {
        if (values.length < 4 && !values.includes(value)) values.push(value);
      });
      step += 1;
    }
    ['None of these', 'No real value', 'All of these', 'Cannot be determined'].forEach((fallback) => {
      if (values.length < 4 && !values.includes(fallback)) values.push(fallback);
    });
    return values.slice(0, 4);
  }

  function makeOptions(correct, distractors, seed) {
    const values = ensureFour(correct, distractors);
    const shift = seed % 4;
    const o = values.slice(shift).concat(values.slice(0, shift));
    return { o, a: o.indexOf(texValue(correct)) };
  }

  function makeQuestion(q, correct, distractors, solution, seed, concept) {
    const { o, a } = makeOptions(correct, distractors, seed);
    return {
      q,
      o,
      a,
      s: solution,
      source: `JEE Advanced/Olympiad generated ${concept}`
    };
  }

  function buildChapter(title, builder) {
    return Array.from({ length: 50 }, (_, index) => {
      const question = builder(index);
      return {
        ...question,
        source: question.source || `JEE Advanced/Olympiad generated ${title} Q${index + 1}`
      };
    });
  }

  function generateBasicMath(title, i) {
    const t = i % 10;
    const k = 2 + Math.floor(i / 10);
    if (t === 0) {
      const m = 2 * k + 1;
      const ans = m * m - 2;
      return makeQuestion(
        `If $x+x^{-1}=${m}$ for $x>1$, then the value of $x^2+x^{-2}$ is`,
        ans,
        [ans + 2, ans - 2, m * m],
        `Square $x+x^{-1}=${m}$: $x^2+2+x^{-2}=${m * m}$, so the value is ${ans}.`,
        i,
        title
      );
    }
    if (t === 1) {
      const a = k + 2;
      const b = k * k + 3;
      const count = 2 * a + 1;
      return makeQuestion(
        `The number of integral values of $x$ satisfying $|x-${b}|\\le ${a}$ is`,
        count,
        [count - 1, count + 1, 2 * a],
        `The interval is $[${b - a},${b + a}]$, containing ${count} integers.`,
        i,
        title
      );
    }
    if (t === 2) {
      const n = 6 + k;
      const ans = Math.floor((n * n + 2 * n) / 4);
      return makeQuestion(
        `For real $x$, the maximum value of $[x(n-x)]$ when $n=${n}$ and $[\\cdot]$ denotes greatest integer is`,
        ans,
        [ans - 1, ans + 1, Math.floor(n * n / 4)],
        `The maximum of $x(${n}-x)$ is at $x=${frac(n, 2)}$ and equals ${n * n / 4}. Its greatest integer is ${ans}.`,
        i,
        title
      );
    }
    if (t === 3) {
      const a = k + 1;
      return makeQuestion(
        `If $u=a+\\sqrt{a^2+1}$ with $a=${a}$, then $u-u^{-1}$ equals`,
        2 * a,
        [2 * a + 1, 2 * a - 1, a],
        `Since $u^{-1}=\\sqrt{a^2+1}-a$, we get $u-u^{-1}=2a=${2 * a}.`,
        i,
        title
      );
    }
    if (t === 4) {
      const a = k + 2;
      const ans = 2 * a;
      return makeQuestion(
        `The minimum value of $x+\\frac{${a * a}}{x}$ for $x>0$ is`,
        ans,
        [a, ans + a, ans - a],
        `By AM-GM, $x+${a * a}/x\\ge 2${a}=${2 * a}$.`,
        i,
        title
      );
    }
    if (t === 5) {
      const a = k + 1;
      const b = k + 3;
      const ans = a + b;
      return makeQuestion(
        `A polynomial $P(x)$ leaves remainders ${a} and ${b} when divided by $x-1$ and $x+1$ respectively. The remainder when $P(x)$ is divided by $x^2-1$ is $mx+n$. Find $2n$.`,
        ans,
        [ans + 2, ans - 2, b - a],
        `Remainder $R=mx+n$. Then $m+n=${a}$ and $-m+n=${b}$, so $2n=${a + b}.`,
        i,
        title
      );
    }
    if (t === 6) {
      const a = k + 2;
      const ans = a + 1;
      return makeQuestion(
        `If $\\log_a x+\\log_x a=\\frac{${sq(ans) + 1}}{${ans}}$, $x>a>1$, then $\\log_a x$ equals`,
        ans,
        [ans - 1, ans + 1, frac(1, ans)],
        `Put $y=\\log_a x>1$. Then $y+1/y=${frac(sq(ans) + 1, ans)}$, so $y=${ans}.`,
        i,
        title
      );
    }
    if (t === 7) {
      const a = k + 2;
      return makeQuestion(
        `The solution set of $\\sqrt{x-${a}}+\\sqrt{${a + 4}-x}=2$ is`,
        `$\\{${a},${a + 4}\\}$`,
        [`$\\{${a + 1},${a + 3}\\}$`, `$[${a},${a + 4}]$`, `$\\{${a + 2}\\}$`],
        `Squaring shows the product of the two radicals must be zero; hence $x=${a}$ or $x=${a + 4}$.`,
        i,
        title
      );
    }
    if (t === 8) {
      const a = k + 1;
      const ans = a * (a + 1);
      return makeQuestion(
        `If $[x]+[2x]+[3x]=${6 * a}$ and $x\\in[${a},${a + 1})$, then the number of possible integral values of $[6x]$ is`,
        1,
        [2, 3, 0],
        `For $x\\in[${a},${a + 1})$, the left side is $6a+[\\{x\\}]+[2\\{x\\}]+[3\\{x\\}]$. It equals $6a$ only for $\\{x\\}<1/3$, giving only $[6x]=${6 * a}.`,
        i,
        title
      );
    }
    const a = k + 2;
    return makeQuestion(
      `The number of real roots of $|x^2-${a * a}|=${a}x$ is`,
      4,
      [2, 3, 1],
      `Split into $x^2-${a * a}=${a}x$ and ${a * a}-$x^2=${a}x$; both quadratics have two real roots, all distinct.`,
      i,
      title
    );
  }

  function generateSetsRelations(title, i) {
    const t = i % 10;
    const n = 5 + Math.floor(i / 10);
    if (t === 0) {
      const ans = Array.from({ length: n }, (_, j) => Math.floor(n / (j + 1))).reduce((s, v) => s + v, 0);
      return makeQuestion(
        `Let $A=\\{1,2,\\ldots,${n}\\}$ and $R=\\{(a,b):a\\mid b\\}$. The number of ordered pairs in $R$ is`,
        ans,
        [ans + n, ans - 1, n * n],
        `For each $a$, $b$ can be any multiple of $a$ not exceeding ${n}. Sum $\\sum_{a=1}^{${n}}\\lfloor ${n}/a\\rfloor=${ans}$.`,
        i,
        title
      );
    }
    if (t === 1) {
      const ans = Math.pow(2, n);
      return makeQuestion(
        `The number of symmetric relations on a set with ${n} elements is`,
        `2^{${n * (n + 1) / 2}}`,
        [`2^{${n * n}}`, `2^{${n * (n - 1) / 2}}`, `2^{${n * (n + 1)}}`],
        `Choose diagonal entries freely and unordered off-diagonal pairs freely: ${n}+${n * (n - 1) / 2}=${n * (n + 1) / 2} choices.`,
        i,
        title
      );
    }
    if (t === 2) {
      const m = n + 1;
      return makeQuestion(
        `The number of onto functions from a ${m}-element set to a 3-element set is`,
        Math.pow(3, m) - 3 * Math.pow(2, m) + 3,
        [Math.pow(3, m), Math.pow(3, m) - Math.pow(2, m), 3 * Math.pow(2, m) - 3],
        `By inclusion-exclusion: $3^{${m}}-3\\cdot2^{${m}}+3$.`,
        i,
        title
      );
    }
    if (t === 3) {
      const ans = Math.pow(3, n * n - n);
      return makeQuestion(
        `The number of reflexive relations on a set of ${n} elements is`,
        `2^{${n * n - n}}`,
        [`2^{${n * n}}`, `2^{${n}}`, `3^{${n * n - n}}`],
        `All ${n} diagonal pairs are forced; the remaining ${n * n - n} pairs are optional.`,
        i,
        title
      );
    }
    if (t === 4) {
      return makeQuestion(
        `On $\\mathbb Z$, define $aRb$ iff $a-b$ is divisible by ${n}$. The number of equivalence classes is`,
        n,
        [n - 1, n + 1, 2 * n],
        `The classes are the residue classes modulo ${n}.`,
        i,
        title
      );
    }
    if (t === 5) {
      const a = n;
      const b = n + 2;
      return makeQuestion(
        `If $|A|=${a}$ and $|B|=${b}$, then the number of relations from $A$ to $B$ whose domain is all of $A$ is`,
        `$(${Math.pow(2, b)}-1)^{${a}}$`,
        [`2^{${a * b}}`, `$${Math.pow(2, b)}^{${a}}$`, `$(${Math.pow(2, a)}-1)^{${b}}$`],
        `For each element of $A$, choose a non-empty subset of $B$ to relate to it.`,
        i,
        title
      );
    }
    if (t === 6) {
      const ans = 2 * n + 1;
      return makeQuestion(
        `For $A=\\{-${n},\\ldots,${n}\\}$, let $R=\\{(x,y):x^2=y^2\\}$. The number of ordered pairs in $R$ is`,
        ans * 2 - 1,
        [ans, ans * 2, ans * 2 + 1],
        `For $0$ there is one partner; every nonzero value has two partners with the same square. Total $1+2(2${n})=${4 * n + 1}.`,
        i,
        title
      );
    }
    if (t === 7) {
      return makeQuestion(
        `Let $R$ be the relation $xRy\\Leftrightarrow x+y$ is even on integers. Which option is correct?`,
        'R is an equivalence relation with two classes',
        ['R is symmetric but not transitive', 'R is transitive but not reflexive', 'R is a partial order'],
        `Parity is preserved by reflexivity, symmetry and transitivity; the two classes are even and odd integers.`,
        i,
        title
      );
    }
    if (t === 8) {
      const ans = n * (n + 1) / 2;
      return makeQuestion(
        `The number of ordered pairs $(A,B)$ of subsets of a ${n}-element set satisfying $A\\subseteq B$ is`,
        `3^{${n}}`,
        [`2^{${n}}`, `4^{${n}}`, `3^{${n - 1}}`],
        `Each element is in neither set, in $B$ only, or in both $A$ and $B$.`,
        i,
        title
      );
    }
    return makeQuestion(
      `If $A$ has ${n} elements, the number of anti-symmetric relations on $A$ is`,
      `$2^{${n}}3^{${n * (n - 1) / 2}}$`,
      [`$3^{${n * (n - 1) / 2}}$`, `$2^{${n * n}}$`, `$2^{${n * (n + 1) / 2}}$`],
      `Each diagonal pair is optional, and for every unordered pair at most one direction or neither may be selected.`,
      i,
      title
    );
  }

  function generateFunctions(title, i) {
    const t = i % 10;
    const k = 2 + Math.floor(i / 10);
    if (t === 0) {
      const a = k + 1;
      return makeQuestion(
        `For $f(x)=\\frac{x-${a}}{x+${a}}$, the value of $f(f(0))$ is`,
        frac(-a - 1, -a + 1),
        [frac(a - 1, a + 1), frac(-a + 1, a + 1), '0'],
        `First $f(0)=-1$. Then $f(-1)=\\frac{-1-${a}}{-1+${a}}=${frac(-a - 1, -a + 1)}$.`,
        i,
        title
      );
    }
    if (t === 1) {
      const h = k + 1;
      const min = k;
      return makeQuestion(
        `The range of $f(x)=x^2-${2 * h}x+${h * h + min}$ over real $x$ is`,
        `$[${min},\\infty)$`,
        [`$(${min},\\infty)$`, `$(-\\infty,${min}]$`, '$\\mathbb R$'],
        `Complete square: $f(x)=(x-${h})^2+${min}$.`,
        i,
        title
      );
    }
    if (t === 2) {
      const a = k + 2;
      return makeQuestion(
        `If $f(x+1)=x^2+${a}x+1$, then $f'(2)$ equals`,
        a + 2,
        [a, a + 1, a + 3],
        `Put $u=x+1$, so $f(u)=(u-1)^2+${a}(u-1)+1$. Thus $f'(u)=2u+${a - 2}$ and $f'(2)=${a + 2}.`,
        i,
        title
      );
    }
    if (t === 3) {
      return makeQuestion(
        `The fundamental period of $f(x)=\\sin(${k}x)+\\cos(${k + 1}x)$ is`,
        `$2\\pi$`,
        [`$\\pi$`, `$\\frac{2\\pi}{${k}}$`, `$\\frac{2\\pi}{${k + 1}}$`],
        `Since ${k} and ${k + 1} are coprime, the common period is $2\\pi$.`,
        i,
        title
      );
    }
    if (t === 4) {
      const a = k + 1;
      return makeQuestion(
        `If $f(x)+2f(1/x)=x$ for $x\\ne0$, then $f(${a})$ is`,
        frac(2 - a * a, 3 * a),
        [frac(a * a - 2, 3 * a), frac(a * a + 2, 3 * a), frac(a, 3)],
        `Use the equations $f(x)+2f(1/x)=x$ and $2f(x)+f(1/x)=2/x$, then eliminate $f(1/x)$.`,
        i,
        title
      );
    }
    if (t === 5) {
      return makeQuestion(
        `For $f(x)=\\frac{${k}x+1}{x+${k}}$, which real value is not in the range?`,
        `${k}`,
        [`${-k}`, '0', '1'],
        `Solving $y=\\frac{${k}x+1}{x+${k}}$ gives $x=\\frac{1-${k}y}{y-${k}}$, so $y=${k}$ is impossible.`,
        i,
        title
      );
    }
    if (t === 6) {
      const ans = 2 * k - 1;
      return makeQuestion(
        `If $f$ is odd and $f(x)=x^2+${ans}x+${k}$ for $x>0$, then $f(-${k})$ equals`,
        -k * k - ans * k - k,
        [k * k + ans * k + k, -k * k + ans * k - k, -ans],
        `For odd $f$, $f(-${k})=-f(${k})=-(${k * k}+${ans * k}+${k}).`,
        i,
        title
      );
    }
    if (t === 7) {
      return makeQuestion(
        `For $f(x)=x^3-3${k}x$, the number of intervals of monotonicity on $\\mathbb R$ is`,
        3,
        [1, 2, 4],
        `$f'(x)=3(x^2-${k})$ changes sign at $\\pm\\sqrt{${k}}$, giving three monotonic intervals.`,
        i,
        title
      );
    }
    if (t === 8) {
      return makeQuestion(
        `The domain of $f(x)=\\log(x-${k})+\\sqrt{${k + 5}-x}$ is`,
        `$(${k},${k + 5}]$`,
        [`$[${k},${k + 5}]$`, `$(${k},${k + 5})$`, `$[${k},\\infty)$`],
        `Need $x-${k}>0$ and ${k + 5}-$x\\ge0$.`,
        i,
        title
      );
    }
    return makeQuestion(
      `If $f(f(x))=x$ and $f(x)=\\frac{ax+b}{cx-a}$, then which condition is necessary?`,
      '$a^2+bc\\ne0$',
      ['$a^2+bc=0$', '$b=c=0$', '$a=0$ only'],
      `A non-constant Mobius map is involutory when represented by a matrix with trace zero, and it must be invertible: determinant $-a^2-bc\\ne0$.`,
      i,
      title
    );
  }

  function generateTrig(title, i, mode) {
    const t = i % 10;
    const k = 2 + Math.floor(i / 10);
    if (mode === 'equations') {
      if (t < 5) {
        const m = k + t + 1;
        return makeQuestion(
          `The number of solutions of $\\sin(${m}x)=\\sin x$ in $[0,2\\pi)$ is`,
          2 * m,
          [2 * m - 2, 2 * m + 2, m],
          `Use $${m}x=x+2r\\pi$ or $${m}x=\\pi-x+2r\\pi$ and count distinct roots in one full period.`,
          i,
          title
        );
      }
      const a = k + t;
      return makeQuestion(
        `The number of roots of $\\tan x+\\cot x=${frac(a * a + 1, a)}$ in $(0,\\pi)$ is`,
        2,
        [0, 1, 4],
        `Put $y=\\tan x$. Then $y+1/y=${frac(a * a + 1, a)}$ gives two positive reciprocal values, hence two roots in $(0,\\pi)$.`,
        i,
        title
      );
    }
    if (mode === 'inverse') {
      if (t === 0) {
        const a = k;
        return makeQuestion(
          `For $a>0$, $\\tan^{-1}a+\\tan^{-1}(1/a)$ equals`,
          `$\\frac{\\pi}{2}$`,
          ['$0$', '$\\pi$', '$\\frac{\\pi}{4}$'],
          `For positive reciprocal arguments, the principal arctangent sum is $\\pi/2$.`,
          i,
          title
        );
      }
      if (t === 1) {
        return makeQuestion(
          `The value of $\\sin^{-1}(\\sin ${frac(2 * k + 1, 2)}\\pi)$ is`,
          `$${frac(-1, 2)}\\pi$`,
          [`$${frac(1, 2)}\\pi$`, '$0$', `$${frac(3, 2)}\\pi$`],
          `Reduce to the principal range $[-\\pi/2,\\pi/2]$. Odd half-turns fold to $-\\pi/2$ or $\\pi/2$ depending on parity.`,
          i,
          title
        );
      }
      if (t === 2) {
        return makeQuestion(
          `If $x\\in[-1,1]$, then $\\cos^{-1}x+\\cos^{-1}(-x)$ equals`,
          '$\\pi$',
          ['$0$', '$\\frac{\\pi}{2}$', '$2\\pi$'],
          `The two angles are supplementary in the principal range.`,
          i,
          title
        );
      }
      if (t === 3) {
        const a = k + 1;
        return makeQuestion(
          `The value of $\\tan\\left(\\sin^{-1}\\frac{${a}}{${a + 2}}\\right)$ is`,
          `$\\frac{${a}}{2\\sqrt{${a + 1}}}$`,
          [`$\\frac{2\\sqrt{${a + 1}}}{${a}}$`, `$\\frac{${a}}{${a + 2}}$`, `$\\frac{${a + 2}}{2\\sqrt{${a + 1}}}$`],
          `If $\\sin\\theta=${a}/${a + 2}$, then $\\cos\\theta=2\\sqrt{${a + 1}}/${a + 2}$.`,
          i,
          title
        );
      }
      return makeQuestion(
        `The principal value of $\\tan^{-1}(\\tan(${k}\\pi+\\frac{\\pi}{${t + 3}}))$ is`,
        `$\\frac{\\pi}{${t + 3}}$`,
        [`$${k}\\pi+\\frac{\\pi}{${t + 3}}$`, `$-\\frac{\\pi}{${t + 3}}$`, '$0$'],
        `Principal values of $\\tan^{-1}$ lie in $(-\\pi/2,\\pi/2)$; the extra $k\\pi$ is removed.`,
        i,
        title
      );
    }
    if (mode === 'heights') {
      const h = 10 + 2 * k + t;
      if (t % 2 === 0) {
        return makeQuestion(
          `A tower subtends angles $45^\\circ$ and $30^\\circ$ at two points on the same straight road on one side of the tower. If the distance between the points is ${h}, the height of the tower is`,
          `$\\frac{${h}(\\sqrt3+1)}{2}$`,
          [`$\\frac{${h}(\\sqrt3-1)}{2}$`, `$${h}\\sqrt3$`, `$${h}$`],
          `Let height be $H$. Distances are $H$ and $H\\sqrt3$; their difference is ${h}.`,
          i,
          title
        );
      }
      return makeQuestion(
        `From the top of a tower of height ${h}, the angles of depression of two points on opposite sides are $30^\\circ$ and $60^\\circ$. The distance between the points is`,
        `$\\frac{4${h}}{\\sqrt3}$`,
        [`$\\frac{2${h}}{\\sqrt3}$`, `$${h}\\sqrt3$`, `$2${h}$`],
        `Horizontal distances are ${h}$\\sqrt3$ and ${h}/\\sqrt3$; add them.`,
        i,
        title
      );
    }
    if (t === 0) {
      const a = k + 2;
      const b = k + 3;
      return makeQuestion(
        `The maximum value of $${a}\\sin x+${b}\\cos x$ is`,
        `$\\sqrt{${a * a + b * b}}$`,
        [`${a + b}`, `$\\sqrt{${Math.abs(a * a - b * b)}}$`, `${Math.max(a, b)}`],
        `Maximum of $a\\sin x+b\\cos x$ is $\\sqrt{a^2+b^2}$.`,
        i,
        title
      );
    }
    if (t === 1) {
      const a = k + 1;
      return makeQuestion(
        `If $\\tan x+\\cot x=${frac(a * a + 1, a)}$, then $\\tan^2x+\\cot^2x$ equals`,
        frac(Math.pow(a * a + 1, 2) - 2 * a * a, a * a),
        [frac(Math.pow(a * a + 1, 2), a * a), frac(a * a + 1, a), '2'],
        `Square $\\tan x+\\cot x$ and subtract $2$.`,
        i,
        title
      );
    }
    if (t === 2) {
      return makeQuestion(
        `The exact value of $\\prod_{r=1}^{${k}}\\sin\\frac{r\\pi}{${2 * k + 1}}\\big/\\prod_{r=1}^{${k}}\\cos\\frac{r\\pi}{${2 * k + 1}}$ is`,
        1,
        [2, frac(1, 2), `${2 * k + 1}`],
        `Pair $\\cos(r\\pi/(2k+1))=\\sin((k-r+1)\\pi/(2k+1))$. Products are equal.`,
        i,
        title
      );
    }
    if (t === 3) {
      return makeQuestion(
        `If $\\sin x+\\cos x=\\sqrt{${k}}$, then $\\sin 2x$ equals`,
        k - 1,
        [k, 1 - k, frac(k - 1, 2)],
        `Squaring gives $1+\\sin2x=${k}$.`,
        i,
        title
      );
    }
    if (t === 4) {
      return makeQuestion(
        `The minimum value of $${k}\\sin^2x+${k + 3}\\cos^2x$ is`,
        k,
        [k + 3, 2 * k + 3, k - 1],
        `The expression is a weighted average of ${k} and ${k + 3}.`,
        i,
        title
      );
    }
    if (t === 5) {
      return makeQuestion(
        `The value of $\\sum_{r=1}^{${2 * k}}\\cos\\frac{r\\pi}{${2 * k + 1}}$ is`,
        frac(-1, 2),
        [frac(1, 2), 0, -1],
        `Use roots of unity or pair symmetric cosines in a regular polygon.`,
        i,
        title
      );
    }
    if (t === 6) {
      return makeQuestion(
        `If $\\tan A=${k}$ and $\\tan B=${k + 1}$, then $\\tan(A-B)$ is`,
        frac(-1, k * (k + 1) + 1),
        [frac(1, k * (k + 1) + 1), frac(1, k * (k + 1) - 1), `${k * (k + 1)}`],
        `Use $\\tan(A-B)=\\frac{${k}-${k + 1}}{1+${k}(${k + 1})}$.`,
        i,
        title
      );
    }
    if (t === 7) {
      return makeQuestion(
        `The number of distinct values of $\\sin x+\\sin(x+\\frac{2\\pi}{3})+\\sin(x+\\frac{4\\pi}{3})$ is`,
        1,
        [0, 2, 'infinitely many nonzero values'],
        `The sum is identically zero, so it has exactly one distinct value.`,
        i,
        title
      );
    }
    if (t === 8) {
      return makeQuestion(
        `The maximum value of $\\sin x\\cos x+\\sin x+\\cos x$ is`,
        `$\\sqrt2+\\frac12$`,
        ['2', '$\\sqrt2$', '$\\frac32$'],
        `Put $u=\\sin x+\\cos x$, so $u\\in[-\\sqrt2,\\sqrt2]$ and the expression is $(u^2-1)/2+u$. This convex quadratic is maximized at the endpoint $u=\\sqrt2$, giving $\\sqrt2+1/2$.`,
        i,
        title
      );
    }
    return makeQuestion(
      `The value of $\\cos^2\\frac{\\pi}{${2 * k}}+\\cos^2\\frac{2\\pi}{${2 * k}}+\\cdots+\\cos^2\\frac{${2 * k - 1}\\pi}{${2 * k}}$ is`,
      k,
      [k - 1, k + 1, 2 * k],
      `Use $\\cos^2\\theta=(1+\\cos2\\theta)/2$ and sum roots of unity cosine terms.`,
      i,
      title
    );
  }

  function generateComplexQuadratic(title, i, mode) {
    const t = i % 10;
    const k = 2 + Math.floor(i / 10);
    if (mode === 'quadratic') {
      if (t === 0) {
        const p = k + 2;
        const q = k + 5;
        return makeQuestion(
          `The range of $m$ for which $x^2-2${p}x+m=0$ has both roots in $(${p - 1},${p + 1})$ is`,
          `$${p * p - 1}<m<${p * p}$`,
          [`$m>${p * p}$`, `$m<${p * p - 1}$`, `$${p * p}<m<${p * p + 1}$`],
          `Shift $y=x-${p}$, so roots of $y^2+(m-${p * p})=0$ must lie in $(-1,1)$.`,
          i,
          title
        );
      }
      if (t === 1) {
        const a = k + 1;
        const ans = 2 * a * a - 4;
        return makeQuestion(
          `If the roots of $x^2-${2 * a}x+${a * a - 1}=0$ are $\\alpha,\\beta$, then $\\alpha^4+\\beta^4$ equals`,
          ans * ans - 2 * (a * a - 1) * (a * a - 1),
          [ans, ans + 4, ans - 4],
          `Use power sums with $\\alpha+\\beta=${2 * a}$ and $\\alpha\\beta=${a * a - 1}$.`,
          i,
          title
        );
      }
      if (t === 2) {
        const a = k + 2;
        return makeQuestion(
          `The least value of $x^2+\\frac{${a * a}}{x^2}$ for $x\\ne0$ is`,
          2 * a,
          [a, 4 * a, a * a],
          `By AM-GM on $x^2$ and ${a * a}/$x^2$, the minimum is ${2 * a}.`,
          i,
          title
        );
      }
      if (t === 3) {
        const a = k + 3;
        return makeQuestion(
          `If $x^2+px+q=0$ has roots ${a} and ${a + 2}, then $p+q$ equals`,
          -2 * a - 2 + a * (a + 2),
          [a * (a + 2), -2 * a - 2, a + 2],
          `$p=-(sum)$ and $q=product$.`,
          i,
          title
        );
      }
      if (t === 4) {
        return makeQuestion(
          `The equation $x^2-2(${k})x+${k * k + 1}=0$ has roots lying`,
          'on a vertical line in the complex plane',
          ['on the real axis', 'on the unit circle', 'on a horizontal line'],
          `The roots are ${k}$\\pm i$, so their real parts are equal.`,
          i,
          title
        );
      }
      if (t === 5) {
        return makeQuestion(
          `If the quadratic $x^2+2x+\\lambda$ is positive for all real $x$, then`,
          '$\\lambda>1$',
          ['$\\lambda<1$', '$\\lambda\\ge1$', '$\\lambda=1$'],
          `For positive leading coefficient and no real zero, discriminant must be negative: $4-4\\lambda<0$.`,
          i,
          title
        );
      }
      if (t === 6) {
        const a = k + 1;
        return makeQuestion(
          `If $\\alpha,\\beta$ are roots of $x^2-${a}x+1=0$, then $\\alpha^3+\\beta^3$ equals`,
          a * a * a - 3 * a,
          [a * a - 2, a * a * a, a * a * a + 3 * a],
          `Use $p_3=s^3-3ps$ with $s=${a}$ and $p=1$.`,
          i,
          title
        );
      }
      if (t === 7) {
        const a = k + 2;
        return makeQuestion(
          `For what value of $c$ do $x^2-${a}x+c$ and $x^2-cx+${a}$ have a common root $1$?`,
          a - 1,
          [a, a + 1, 1 - a],
          `Substitute $x=1$ in the first equation: $1-${a}+c=0$.`,
          i,
          title
        );
      }
      if (t === 8) {
        return makeQuestion(
          `The number of real roots of $x^4-2${k}x^2+${k * k - 1}=0$ is`,
          4,
          [0, 2, 3],
          `Put $y=x^2$. Then $y=${k}\\pm1$, both positive for ${k}>1.`,
          i,
          title
        );
      }
      return makeQuestion(
        `If $x^2+bx+c=0$ has roots with negative real parts and positive product, then for real coefficients it is necessary that`,
        '$b>0,c>0$',
        ['$b<0,c>0$', '$b>0,c<0$', '$b<0,c<0$'],
        `For roots $r_1,r_2$, sum is $-b$ and product is $c$. Negative real parts give positive $b$ and positive $c$.`,
        i,
        title
      );
    }
    if (t === 0) {
      const a = k + 1;
      return makeQuestion(
        `The locus $|z-${a}|=2|z+${a}|$ is a circle. Its radius is`,
        frac(4 * a, 3),
        [frac(2 * a, 3), frac(a, 3), `${a}`],
        `Use Apollonius circle: after squaring, center is $-5a/3$ and radius $4a/3$.`,
        i,
        title
      );
    }
    if (t === 1) {
      return makeQuestion(
        `If $\\omega$ is a non-real cube root of unity, then $(1-\\omega)(1-\\omega^2)$ equals`,
        3,
        [1, -3, 0],
        `$(1-\\omega)(1-\\omega^2)=1-(\\omega+\\omega^2)+\\omega^3=1-(-1)+1=3$.`,
        i,
        title
      );
    }
    if (t === 2) {
      const r = k + 2;
      return makeQuestion(
        `If $|z-${r}i|\\le ${k}$, then the minimum value of $|z+${r}i|$ is`,
        r * 2 - k,
        [r * 2 + k, k, r - k],
        `The two centers are separated by ${2 * r}; subtract the radius ${k}.`,
        i,
        title
      );
    }
    if (t === 3) {
      return makeQuestion(
        `The product of all non-real ${2 * k + 1}th roots of unity is`,
        1,
        [-1, `${2 * k + 1}`, 0],
        `The product of all roots is $(-1)^{n+1}=1$ for odd $n$; removing root $1$ keeps product $1$.`,
        i,
        title
      );
    }
    if (t === 4) {
      return makeQuestion(
        `If $z+\\bar z=${2 * k}$ and $z\\bar z=${k * k + 4}$, then $|z-${k}|$ equals`,
        2,
        [4, k, Math.sqrt(k * k + 4).toFixed(0)],
        `The real part is ${k}; hence $|z-${k}|$ is the absolute imaginary part, equal to 2.`,
        i,
        title
      );
    }
    if (t === 5) {
      return makeQuestion(
        `Multiplication by $\\frac{1+i}{\\sqrt2}$ rotates the complex plane through`,
        '$\\frac{\\pi}{4}$ anticlockwise',
        ['$\\frac{\\pi}{4}$ clockwise', '$\\frac{\\pi}{2}$ anticlockwise', 'no rotation'],
        `The multiplier has modulus 1 and argument $\\pi/4$.`,
        i,
        title
      );
    }
    if (t === 6) {
      return makeQuestion(
        `If $z$ lies on $|z|=1$, the maximum value of $|z+${k}|$ is`,
        k + 1,
        [k - 1, k, k + 2],
        `The farthest point on the unit circle from $-${k}$ is along the real axis, giving ${k}+1.`,
        i,
        title
      );
    }
    if (t === 7) {
      return makeQuestion(
        `The image of the line $\\operatorname{Re} z=${k}$ under $w=z+\\bar z$ is`,
        `the single point ${2 * k}`,
        ['a vertical line', 'a circle', 'the real axis excluding zero'],
        `Since $z+\\bar z=2\\operatorname{Re}z=${2 * k}$.`,
        i,
        title
      );
    }
    if (t === 8) {
      return makeQuestion(
        `If $z^2+1=0$, then $z^{${4 * k + 1}}+z^{${4 * k + 3}}$ equals`,
        0,
        [1, -1, 2],
        `The roots are $\\pm i$; powers ${4 * k + 1} and ${4 * k + 3} are negatives.`,
        i,
        title
      );
    }
    return makeQuestion(
      `If $z=x+iy$ satisfies $\\left|\\frac{z-1}{z+1}\\right|=1$, then the locus is`,
      'the imaginary axis except $z=-1$',
      ['the real axis', 'a circle of radius 1', 'the line $x=1$'],
      `It means distances from $1$ and $-1$ are equal, so $x=0$.`,
      i,
      title
    );
  }

  function generateSequenceBinomial(title, i, mode) {
    const t = i % 10;
    const k = 2 + Math.floor(i / 10);
    if (mode === 'sequence') {
      if (t === 0) {
        const a = k + 1;
        const d = k + 2;
        const n = k + 8;
        const ans = n * (2 * a + (n - 1) * d) / 2;
        return makeQuestion(
          `For the AP with $a_1=${a}$ and common difference ${d}, $S_{${n}}$ equals`,
          ans,
          [ans + n, ans - n, n * (a + d)],
          `Use $S_n=n[2a+(n-1)d]/2$.`,
          i,
          title
        );
      }
      if (t === 1) {
        const a = k + 1;
        const n = k + 4;
        const ans = a * (Math.pow(2, n) - 1);
        return makeQuestion(
          `The sum of first ${n} terms of the GP ${a}, ${2 * a}, ${4 * a}, ... is`,
          ans,
          [ans + a, ans - a, a * Math.pow(2, n)],
          `Sum is $a(2^n-1)=${ans}$.`,
          i,
          title
        );
      }
      if (t === 2) {
        const a = k + 2;
        return makeQuestion(
          `If $a_n=\\frac{1}{n(n+${a})}$, then $\\sum_{n=1}^{\\infty}a_n$ equals`,
          `$\\frac{1}{${a}}\\left(1+\\frac12+\\cdots+\\frac1{${a}}\\right)$`,
          [`$\\frac1{${a}}$`, `$\\frac1{${a + 1}}$`, `$\\frac{${a}}{${a + 1}}$`],
          `Use $1/[n(n+a)]=(1/a)(1/n-1/(n+a))$ and telescope.`,
          i,
          title
        );
      }
      if (t === 3) {
        return makeQuestion(
          `If $a_{n+1}=2a_n+1$ and $a_1=${k}$, then $a_${k + 3}$ is`,
          (k + 1) * Math.pow(2, k + 2) - 1,
          [(k + 1) * Math.pow(2, k + 1) - 1, k * Math.pow(2, k + 2), (k + 1) * Math.pow(2, k + 2)],
          `Add 1 to both sides: $a_{n+1}+1=2(a_n+1)$.`,
          i,
          title
        );
      }
      if (t === 4) {
        return makeQuestion(
          `If $a,b,c$ are in GP and $\\log a,\\log b,\\log c$ are in AP, which condition is forced?`,
          '$b^2=ac$',
          ['$a+b=2c$', '$a^2=bc$', '$ab=c^2$'],
          `Both statements encode the same geometric mean condition.`,
          i,
          title
        );
      }
      return makeQuestion(
        `For an HP, if first term is ${k} and second term is ${2 * k}, the common difference of the reciprocal AP is`,
        frac(-1, 2 * k),
        [frac(1, 2 * k), frac(-1, k), frac(1, k)],
        `Reciprocals are $1/${k}$ and $1/${2 * k}$, so difference is $-1/${2 * k}$.`,
        i,
        title
      );
    }
    if (mode === 'binomial') {
      if (t === 0) {
        const n = k + 8;
        const r = k + 2;
        const ans = nCr(n, r) * Math.pow(2, r);
        return makeQuestion(
          `The coefficient of $x^{${r}}$ in $(1+2x)^{${n}}$ is`,
          ans,
          [nCr(n, r), ans / 2, ans + nCr(n, r)],
          `Coefficient is $\\binom{${n}}{${r}}2^{${r}}=${ans}$.`,
          i,
          title
        );
      }
      if (t === 1) {
        const n = 2 * k + 4;
        return makeQuestion(
          `The middle coefficient in $(x+x^{-1})^{${n}}$ is`,
          nCr(n, n / 2),
          [nCr(n, n / 2 - 1), nCr(n, n / 2) + n, nCr(n, n / 2) - n],
          `The constant middle term has coefficient $\\binom{${n}}{${n / 2}}$.`,
          i,
          title
        );
      }
      if (t === 2) {
        const n = k + 5;
        return makeQuestion(
          `The sum of coefficients of odd powers of $x$ in $(1+x)^{${n}}$ is`,
          `2^{${n - 1}}`,
          [`2^{${n}}`, `2^{${n - 2}}`, `${nCr(n, Math.floor(n / 2))}`],
          `Use $P(1)-P(-1)$ divided by 2.`,
          i,
          title
        );
      }
      if (t === 3) {
        const n = k + 6;
        return makeQuestion(
          `The coefficient of $x^{${k}}$ in $(1+x+x^2)^{${n}}$ is`,
          nCr(n, k) + (k >= 2 ? nCr(n, k - 2) * nCr(n - k + 2, 1) : 0),
          [nCr(n, k), nCr(n + 1, k), nCr(n, k) + nCr(n, k - 1)],
          `Count selections with $k$ ones, or one $x^2$ replacing two $x$ choices; this is the trinomial coefficient.`,
          i,
          title
        );
      }
      if (t === 4) {
        return makeQuestion(
          `The number of rational terms in $(\\sqrt2+\\sqrt[3]{3})^{${6 * k}}$ is`,
          k + 1,
          [k, 2 * k + 1, 3 * k],
          `A term is rational when exponents of both radicals are multiples of 2 and 3; the chosen exponent must be a multiple of 6.`,
          i,
          title
        );
      }
      return makeQuestion(
        `If $\\binom{n}{${k}}=\\binom{n}{${k + 2}}$, then $n$ equals`,
        2 * k + 2,
        [2 * k + 1, 2 * k + 3, k + 2],
        `Equal symmetric binomial coefficients require ${k}+${k + 2}=n.`,
        i,
        title
      );
    }
    throw new Error(`Unsupported sequence/binomial mode: ${mode}`);
  }

  function generateCountingProbability(title, i, mode) {
    const t = i % 10;
    const k = 2 + Math.floor(i / 10);
    if (mode === 'permutation') {
      if (t === 0) {
        const n = k + 5;
        return makeQuestion(
          `The number of onto functions from a ${n}-element set to a 4-element set is`,
          Math.pow(4, n) - 4 * Math.pow(3, n) + 6 * Math.pow(2, n) - 4,
          [Math.pow(4, n), Math.pow(4, n) - Math.pow(3, n), 4 * Math.pow(3, n)],
          `Apply inclusion-exclusion over missing elements of the codomain.`,
          i,
          title
        );
      }
      if (t === 1) {
        const n = k + 4;
        return makeQuestion(
          `The number of derangements of ${n} objects is nearest to`,
          Math.round(factorial(n) / Math.E),
          [factorial(n - 1), Math.round(factorial(n) / 2), factorial(n)],
          `Derangements equal $n!\\sum_{r=0}^{n}(-1)^r/r!$, nearest to $n!/e$.`,
          i,
          title
        );
      }
      if (t === 2) {
        return makeQuestion(
          `The number of non-negative integer solutions of $x_1+x_2+x_3+x_4=${k + 8}$ is`,
          nCr(k + 11, 3),
          [nCr(k + 8, 3), nCr(k + 10, 3), nCr(k + 11, 4)],
          `Stars and bars gives $\\binom{${k + 8}+4-1}{3}$.`,
          i,
          title
        );
      }
      if (t === 3) {
        return makeQuestion(
          `The number of ways to arrange ${k} identical red, ${k + 1} identical blue and ${k + 2} identical green balls in a row is`,
          frac(factorial(3 * k + 3), factorial(k) * factorial(k + 1) * factorial(k + 2)),
          [factorial(3 * k + 3), nCr(3 * k + 3, k), nCr(3 * k + 3, k + 1)],
          `Use multinomial count.`,
          i,
          title
        );
      }
      return makeQuestion(
        `From ${k + 5} points on a circle, the number of quadrilaterals is`,
        nCr(k + 5, 4),
        [nCr(k + 5, 3), nCr(k + 4, 4), nCr(k + 5, 2)],
        `Every choice of 4 points determines a cyclic quadrilateral.`,
        i,
        title
      );
    }
    const n = k + 4;
    if (t === 0) {
      return makeQuestion(
        `A fair coin is tossed ${n} times. The probability of exactly two heads is`,
        `$\\frac{${nCr(n, 2)}}{2^{${n}}}$`,
        [`$\\frac{${nCr(n, 2)}}{2^{${n - 1}}}$`, `$\\frac{2}{2^{${n}}}$`, `$\\frac{${n}}{2^{${n}}}$`],
        `Choose the two head positions and divide by $2^n$.`,
        i,
        title
      );
    }
    if (t === 1) {
      const sums = [4, 6, 8, 10, 12];
      const sum = sums[Math.floor(i / 10)];
      const total = sum <= 7 ? sum - 1 : 13 - sum;
      const fav = Array.from({ length: 6 }, (_, index) => index + 1)
        .filter((first) => first % 2 === 1 && sum - first >= 1 && sum - first <= 6 && (sum - first) % 2 === 1)
        .length;
      return makeQuestion(
        `Two dice are thrown. Given that the sum is ${sum}, the probability that both dice show odd numbers is`,
        frac(fav, total),
        [frac(Math.max(0, fav - 1), total), frac(fav + 1, total + 1), frac(1, 2)],
        `There are ${total} ordered pairs with sum ${sum}; ${fav} of them have both entries odd.`,
        i,
        title
      );
    }
    if (t === 2) {
      return makeQuestion(
        `If $P(A)=\\frac12$, $P(B)=\\frac{${k}}{${2 * k + 2}}$ and $P(A\\cap B)=\\frac{1}{${2 * k + 2}}$, then $P(A\\mid B)$ is`,
        frac(1, k),
        [frac(1, k + 1), frac(k, k + 1), frac(1, 2)],
        `Use $P(A|B)=P(A\\cap B)/P(B)$.`,
        i,
        title
      );
    }
    if (t === 3) {
      return makeQuestion(
        `A bag has ${k} red and ${k + 2} blue balls. Two balls are drawn without replacement. Probability of one red and one blue is`,
        frac(2 * k * (k + 2), (2 * k + 2) * (2 * k + 1)),
        [frac(k * (k + 2), (2 * k + 2) * (2 * k + 1)), frac(k, 2 * k + 2), frac(k + 2, 2 * k + 2)],
        `Use ordered draw count or combinations: $2rb/[n(n-1)]$.`,
        i,
        title
      );
    }
    return makeQuestion(
      `For a binomial random variable $X\\sim B(${n},\\frac12)$, $P(X$ is even$)$ equals`,
      frac(1, 2),
      [frac(1, 4), frac(3, 4), `$\\frac{${n}}{2^{${n}}}$`],
      `For $p=1/2$, even and odd counts are equal.`,
      i,
      title
    );
  }

  function factorial(n) {
    let value = 1;
    for (let i = 2; i <= n; i += 1) value *= i;
    return value;
  }

  function generateCoordinate(title, i, mode) {
    const t = i % 10;
    const k = 2 + Math.floor(i / 10);
    if (mode === 'line') {
      if (t === 0) {
        return makeQuestion(
          `The distance of the point $(${k},${k + 1})$ from the line $3x-4y+${k}=0$ is`,
          frac(Math.abs(3 * k - 4 * (k + 1) + k), 5),
          [frac(k, 5), frac(k + 1, 5), frac(k + 2, 5)],
          `Use distance formula $|Ax_0+By_0+C|/\\sqrt{A^2+B^2}$.`,
          i,
          title
        );
      }
      if (t === 1) {
        return makeQuestion(
          `The line through $(${k},1)$ perpendicular to $${k}x+2y-1=0$ has slope`,
          frac(2, k),
          [frac(-k, 2), frac(k, 2), frac(-2, k)],
          `Original slope is $-${k}/2$; perpendicular slope is $2/${k}$.`,
          i,
          title
        );
      }
      return makeQuestion(
        `The area of the triangle cut off by $\\frac{x}{${k}}+\\frac{y}{${k + 2}}=1$ with coordinate axes is`,
        frac(k * (k + 2), 2),
        [k * (k + 2), frac(k + 2, 2), frac(k, 2)],
        `Intercepts are ${k} and ${k + 2}; area is half their product.`,
        i,
        title
      );
    }
    if (mode === 'circle') {
      if (t === 0) {
        return makeQuestion(
          `The radius of $x^2+y^2-${2 * k}x+${2 * (k + 1)}y-${k}=0$ is`,
          `$\\sqrt{${2 * k * k + 3 * k + 1}}$`,
          [`$\\sqrt{${k * k + k}}$`, `$${k}$`, `$\\sqrt{${k}}$`],
          `Radius squared is $g^2+f^2-c=${k * k}+${(k + 1) * (k + 1)}+${k}$.`,
          i,
          title
        );
      }
      if (t === 1) {
        return makeQuestion(
          `Length of tangent from $(${k + 3},0)$ to $x^2+y^2=${k * k}$ is`,
          `$\\sqrt{${(k + 3) * (k + 3) - k * k}}$`,
          [`${k + 3}`, `${k}`, `$\\sqrt{${k * k + (k + 3) * (k + 3)}}$`],
          `Tangent length squared is distance from center squared minus radius squared.`,
          i,
          title
        );
      }
      return makeQuestion(
        `The radical axis of $x^2+y^2=${k * k}$ and $x^2+y^2-2${k}x+${k}=0$ is`,
        `$2${k}x-${k}=${k * k}$`,
        [`$x=${k}$`, `$2${k}x+${k}=${k * k}$`, `$y=${k}$`],
        `Subtract the two circle equations.`,
        i,
        title
      );
    }
    if (mode === 'parabola') {
      const a = k;
      if (t === 0) {
        return makeQuestion(
          `For $y^2=4${a}x$, the equation of tangent at parameter $t=${k + 1}$ is`,
          `$${k + 1}y=x+${a * sq(k + 1)}$`,
          [`$y=${k + 1}x+${a}$`, `$${k + 1}x=y+${a}$`, `$x=${a}y+${k + 1}$`],
          `For $y^2=4ax$, tangent at parameter $t$ is $ty=x+at^2$.`,
          i,
          title
        );
      }
      return makeQuestion(
        `For $y^2=4${a}x$, length of latus rectum is`,
        4 * a,
        [2 * a, a, 8 * a],
        `The latus rectum length of $y^2=4ax$ is $4a$.`,
        i,
        title
      );
    }
    if (mode === 'ellipse') {
      const a = k + 4;
      const b = k + 2;
      if (t === 0) {
        return makeQuestion(
          `For $\\frac{x^2}{${a * a}}+\\frac{y^2}{${b * b}}=1$, the eccentricity is`,
          `$\\frac{\\sqrt{${a * a - b * b}}}{${a}}$`,
          [`$\\frac{${b}}{${a}}$`, `$\\frac{\\sqrt{${a * a + b * b}}}{${a}}$`, `$\\frac{${a}}{${b}}$`],
          `For an ellipse, $e=\\sqrt{1-b^2/a^2}$.`,
          i,
          title
        );
      }
      return makeQuestion(
        `For $\\frac{x^2}{${a * a}}+\\frac{y^2}{${b * b}}=1$, length of latus rectum is`,
        frac(2 * b * b, a),
        [frac(b * b, a), frac(2 * a * a, b), `${2 * b}`],
        `Length of latus rectum is $2b^2/a$.`,
        i,
        title
      );
    }
    if (mode === 'hyperbola') {
      const a = k + 2;
      const b = k + 1;
      if (t === 0) {
        return makeQuestion(
          `For $\\frac{x^2}{${a * a}}-\\frac{y^2}{${b * b}}=1$, the eccentricity is`,
          `$\\frac{\\sqrt{${a * a + b * b}}}{${a}}$`,
          [`$\\frac{${b}}{${a}}$`, `$\\frac{\\sqrt{${a * a - b * b}}}{${a}}$`, `$\\frac{${a}}{${b}}$`],
          `For a hyperbola, $e=\\sqrt{1+b^2/a^2}$.`,
          i,
          title
        );
      }
      return makeQuestion(
        `The asymptotes of $\\frac{x^2}{${a * a}}-\\frac{y^2}{${b * b}}=1$ are`,
        `$y=\\pm\\frac{${b}}{${a}}x$`,
        [`$y=\\pm\\frac{${a}}{${b}}x$`, `$x=\\pm\\frac{${b}}{${a}}y$`, `$y=\\pm ${a * b}x$`],
        `Replace the constant by zero and solve for $y/x$.`,
        i,
        title
      );
    }
    throw new Error(`Unsupported coordinate mode: ${mode}`);
  }

  function generateTriangleReasonStats(title, i, mode) {
    const t = i % 10;
    const k = 2 + Math.floor(i / 10);
    if (mode === 'triangle') {
      if (t === 0) {
        return makeQuestion(
          `In a triangle with sides ${k + 3}, ${k + 4}, ${2 * k + 5}, the semiperimeter is`,
          frac(4 * k + 12, 2),
          [2 * k + 5, 4 * k + 12, k + 6],
          `Semiperimeter is half the sum of sides.`,
          i,
          title
        );
      }
      if (t === 1) {
        return makeQuestion(
          `If $R$ and $r$ are circumradius and inradius of an equilateral triangle of side ${k}, then $R/r$ is`,
          2,
          [3, frac(3, 2), frac(1, 2)],
          `For an equilateral triangle, $R=a/\\sqrt3$ and $r=a/(2\\sqrt3)$.`,
          i,
          title
        );
      }
      return makeQuestion(
        `If $A+B+C=\\pi$, then $\\tan A+\\tan B+\\tan C$ equals`,
        '$\\tan A\\tan B\\tan C$',
        ['$0$', '$1$', '$-\\tan A\\tan B\\tan C$'],
        `Use tangent addition for $A+B+C=\\pi$.`,
        i,
        title
      );
    }
    if (mode === 'reasoning') {
      if (t === 0) {
        return makeQuestion(
          `The negation of "for every real $x$, there exists an integer $n$ with $n>x$" is`,
          'there exists a real $x$ such that every integer $n$ satisfies $n\\le x$',
          ['for every real $x$, every integer $n$ satisfies $n\\le x$', 'there exists an integer $n$ greater than every real $x$', 'no real number is less than an integer'],
          `Negate quantifiers in order and negate the inequality.`,
          i,
          title
        );
      }
      if (t === 1) {
        return makeQuestion(
          `The statement $(p\\Rightarrow q)$ is logically equivalent to`,
          '$\\neg p\\vee q$',
          ['$p\\vee\\neg q$', '$p\\wedge q$', '$q\\Rightarrow p$'],
          `Implication is false only when $p$ is true and $q$ is false.`,
          i,
          title
        );
      }
      return makeQuestion(
        `The contrapositive of "$p\\Rightarrow q$" is`,
        '$\\neg q\\Rightarrow\\neg p$',
        ['$q\\Rightarrow p$', '$\\neg p\\Rightarrow\\neg q$', '$p\\wedge q$'],
        `Contrapositive reverses and negates both statements.`,
        i,
        title
      );
    }
    const dataA = [k, k + 2, k + 4, k + 6];
    if (t === 0) {
      return makeQuestion(
        `The variance of the data ${dataA.join(', ')} is`,
        5,
        [4, 6, 10],
        `The deviations from the mean are $-3,-1,1,3$, so variance is $(9+1+1+9)/4=5$.`,
        i,
        title
      );
    }
    if (t === 1) {
      return makeQuestion(
        `If every observation in a data set is transformed as $y=3x+${k}$, the variance is multiplied by`,
        9,
        [3, k, 1],
        `Variance is multiplied by the square of the scale factor.`,
        i,
        title
      );
    }
    return makeQuestion(
      `For the data ${k}, ${k}, ${k + 1}, ${k + 3}, ${k + 3}, the median is`,
      k + 1,
      [k, k + 2, k + 3],
      `The middle observation after ordering is ${k + 1}.`,
      i,
      title
    );
  }

  function generateLinearAlgebra(title, i, mode) {
    const t = i % 10;
    const k = 2 + Math.floor(i / 10);
    if (mode === 'matrix') {
      if (t === 0) {
        return makeQuestion(
          `If $A=\\begin{pmatrix}${k}&1\\\\0&${k}\\end{pmatrix}$, then the $(1,2)$ entry of $A^${k + 2}$ is`,
          (k + 2) * Math.pow(k, k + 1),
          [(k + 1) * Math.pow(k, k + 1), Math.pow(k, k + 2), (k + 2) * Math.pow(k, k)],
          `Write $A=${k}I+N$ with $N^2=0$. Then $A^n=${k}^nI+n${k}^{n-1}N$.`,
          i,
          title
        );
      }
      if (t === 1) {
        return makeQuestion(
          `If $A^2-${2 * k}A+I=O$, then $A^{-1}$ equals`,
          `$${2 * k}I-A$`,
          [`$A-${2 * k}I$`, `$A+${2 * k}I$`, `$${k}I-A$`],
          `Multiply by $A^{-1}$: $A-${2 * k}I+A^{-1}=O$.`,
          i,
          title
        );
      }
      return makeQuestion(
        `The trace of $\\begin{pmatrix}${k}&1\\\\${k + 1}&${k + 2}\\end{pmatrix}$ is`,
        2 * k + 2,
        [k + 2, 2 * k + 1, k * (k + 2) - k - 1],
        `Trace is the sum of diagonal entries.`,
        i,
        title
      );
    }
    if (t === 0) {
      return makeQuestion(
        `The determinant $\\left|\\begin{matrix}1&1&1\\\\a&b&c\\\\a^2&b^2&c^2\\end{matrix}\\right|$ equals`,
        '$(b-a)(c-a)(c-b)$',
        ['$(a-b)(b-c)(c-a)$', '$(a+b+c)^2$', '$abc$'],
        `This is the Vandermonde determinant.`,
        i,
        title
      );
    }
    if (t === 1) {
      const m = [[k, 1, 1], [1, k, 1], [1, 1, k]];
      const ans = det3(m);
      return makeQuestion(
        `The determinant of $\\begin{pmatrix}${k}&1&1\\\\1&${k}&1\\\\1&1&${k}\\end{pmatrix}$ is`,
        ans,
        [(k - 1) * (k - 1), (k + 2) * (k - 1), Math.pow(k, 3)],
        `Eigenvalues are ${k + 2}, ${k - 1}, ${k - 1}; determinant is their product.`,
        i,
        title
      );
    }
    return makeQuestion(
      `If two rows of a determinant are interchanged, the determinant is multiplied by`,
      -1,
      [0, 1, 2],
      `Interchanging two rows changes the sign of the determinant.`,
      i,
      title
    );
  }

  function generateVector3D(title, i, mode) {
    const t = i % 10;
    const k = 2 + Math.floor(i / 10);
    if (mode === 'vector') {
      if (t === 0) {
        const a = [k, 1, 2];
        const b = [1, k + 1, -1];
        const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
        return makeQuestion(
          `For $\\vec a=${k}\\hat i+\\hat j+2\\hat k$ and $\\vec b=\\hat i+${k + 1}\\hat j-\\hat k$, $\\vec a\\cdot\\vec b$ is`,
          dot,
          [dot + 1, dot - 1, k * (k + 1)],
          `Compute component-wise dot product.`,
          i,
          title
        );
      }
      if (t === 1) {
        const cross = [0, 0, k * k - 1];
        return makeQuestion(
          `Area of the parallelogram formed by $\\vec a=${k}\\hat i+\\hat j$ and $\\vec b=\\hat i+${k}\\hat j$ is`,
          k * k - 1,
          [k * k + 1, k, 2 * k],
          `Area is $|\\vec a\\times\\vec b|=|${k * k}-1|$.`,
          i,
          title
        );
      }
      return makeQuestion(
        `If $\\vec a\\cdot\\vec b=0$ and $|\\vec a|=${k}$, $|\\vec b|=${k + 1}$, then $|\\vec a\\times\\vec b|$ is`,
        k * (k + 1),
        [k + k + 1, k * k, (k + 1) * (k + 1)],
        `For perpendicular vectors, cross product magnitude is product of magnitudes.`,
        i,
        title
      );
    }
    if (t === 0) {
      return makeQuestion(
        `The distance of point $(${k},0,0)$ from the plane $x+y+z=${k + 3}$ is`,
        `$\\sqrt3$`,
        [`$${k}$`, `$\\frac{${k}}{\\sqrt3}$`, '3'],
        `Distance is $|${k}-${k + 3}|/\\sqrt3=\\sqrt3$.`,
        i,
        title
      );
    }
    if (t === 1) {
      return makeQuestion(
        `Direction ratios of the line of intersection of planes $x+y+z=1$ and $x-y+${k}z=2$ are proportional to`,
        `(${k + 1},1-${k},-2)`,
        [`(1,1,${k})`, `(${k},1,1)`, `(2,${k - 1},${k + 1})`],
        `Take cross product of normals $(1,1,1)$ and $(1,-1,${k})$.`,
        i,
        title
      );
    }
    return makeQuestion(
      `The angle between planes $x+y+z=0$ and $x-y+z=0$ has cosine`,
      frac(1, 3),
      [frac(2, 3), 0, frac(-1, 3)],
      `Angle between planes equals angle between normals $(1,1,1)$ and $(1,-1,1)$.`,
      i,
      title
    );
  }

  function generateCalculus(title, i, mode) {
    const t = i % 10;
    const k = 2 + Math.floor(i / 10);
    if (mode === 'limit') {
      if (t === 0) {
        return makeQuestion(
          `The value of $\\lim_{x\\to0}\\frac{\\sin(${k}x)}{\\sin(${k + 1}x)}$ is`,
          frac(k, k + 1),
          [frac(k + 1, k), frac(1, k), 1],
          `Use $\\sin ax\\sim ax$.`,
          i,
          title
        );
      }
      if (t === 1) {
        return makeQuestion(
          `The value of $\\lim_{x\\to0}\\frac{e^{${k}x}-1-${k}x}{x^2}$ is`,
          frac(k * k, 2),
          [k * k, frac(k, 2), 0],
          `Use $e^{kx}=1+kx+k^2x^2/2+o(x^2)$.`,
          i,
          title
        );
      }
      return makeQuestion(
        `The value of $\\lim_{x\\to0}\\frac{\\log(1+${k}x)}{x}$ is`,
        k,
        [k - 1, k + 1, frac(1, k)],
        `Use $\\log(1+u)\\sim u$.`,
        i,
        title
      );
    }
    if (mode === 'continuity') {
      if (t === 0) {
        return makeQuestion(
          `For $f(x)=\\frac{x^2-${k * k}}{x-${k}}$ for $x\\ne ${k}$, continuity at $x=${k}$ requires $f(${k})=$`,
          2 * k,
          [k, k * k, 0],
          `The removable-limit value is $x+${k}$ at $x=${k}$.`,
          i,
          title
        );
      }
      return makeQuestion(
        `For differentiability of $f(x)=|x-${k}|+a x$ at $x=${k}$, the value of $a$ is`,
        'no real value',
        [0, 1, -1],
        `The left and right derivatives of $|x-${k}|$ differ by 2; adding $ax$ cannot remove the corner.`,
        i,
        title
      );
    }
    if (mode === 'differentiation') {
      if (t === 0) {
        return makeQuestion(
          `If $y=x^x$, then $\\frac{dy}{dx}$ equals`,
          `$x^x\\left(\\log x+1\\right)$`,
          ['$x^{x-1}$', '$x^x\\log x$', '$x^x/x$'],
          `Log-differentiate: $\\log y=x\\log x$.`,
          i,
          title
        );
      }
      return makeQuestion(
        `If $x=a\\cos^3t$, $y=a\\sin^3t$, then $\\frac{dy}{dx}$ is`,
        '$-\\tan t$',
        ['$\\tan t$', '$-\\cot t$', '$\\cot t$'],
        `Compute $(dy/dt)/(dx/dt)$.`,
        i,
        title
      );
    }
    if (mode === 'aod') {
      if (t === 0) {
        return makeQuestion(
          `The maximum value of $x(${k}-x)$ for real $x$ is`,
          frac(k * k, 4),
          [frac(k * k, 2), k, k * k],
          `It is a downward parabola with vertex at $x=${k}/2$.`,
          i,
          title
        );
      }
      return makeQuestion(
        `The tangent to $y=x^2$ at $x=${k}$ cuts the $y$-axis at`,
        -k * k,
        [k * k, -2 * k, 0],
        `Tangent is $y-${k * k}=2${k}(x-${k})$, so intercept is $-${k * k}$.`,
        i,
        title
      );
    }
    throw new Error(`Unsupported calculus mode: ${mode}`);
  }

  function generateIntegration(title, i, mode) {
    const t = i % 10;
    const k = 2 + Math.floor(i / 10);
    if (mode === 'indefinite') {
      if (t === 0) {
        return makeQuestion(
          `An antiderivative of $\\frac{2x}{x^2+${k}}$ is`,
          `$\\log(x^2+${k})+C$`,
          [`$\\frac{1}{x^2+${k}}+C$`, `$2\\log(x^2+${k})+C$`, `$x^2+${k}+C$`],
          `Use substitution $u=x^2+${k}$.`,
          i,
          title
        );
      }
      return makeQuestion(
        `An antiderivative of $e^{${k}x}$ is`,
        `$\\frac{1}{${k}}e^{${k}x}+C$`,
        [`$${k}e^{${k}x}+C$`, `$e^{${k}x}+C$`, `$\\frac{1}{${k + 1}}e^{${k}x}+C$`],
        `Divide by the derivative of ${k}x.`,
        i,
        title
      );
    }
    if (mode === 'definite') {
      if (t === 0) {
        return makeQuestion(
          `The value of $\\int_0^\\pi \\sin^{${2 * k - 1}}x\\cos x\\,dx$ is`,
          0,
          [frac(1, 2 * k), 1, -1],
          `Use $u=\\sin x$; endpoints both give $u=0$.`,
          i,
          title
        );
      }
      return makeQuestion(
        `The value of $\\int_0^1 x^{${k}}\\,dx$ is`,
        frac(1, k + 1),
        [frac(1, k), frac(k, k + 1), k + 1],
        `Integrate power: $x^{k+1}/(k+1)$ from 0 to 1.`,
        i,
        title
      );
    }
    if (mode === 'area') {
      if (t === 0) {
        return makeQuestion(
          `The area bounded by $y=x$ and $y=x^2$ is`,
          '$\\frac16$',
          ['$\\frac13$', '$\\frac12$', '$1$'],
          `Integrate $x-x^2$ from 0 to 1.`,
          i,
          title
        );
      }
      return makeQuestion(
        `The area under $y=${k}x$ from $x=0$ to $x=1$ is`,
        frac(k, 2),
        [k, frac(1, k), frac(k + 1, 2)],
        `It is a triangle/integral $\\int_0^1 ${k}x\\,dx$.`,
        i,
        title
      );
    }
    if (mode === 'de') {
      if (t === 0) {
        return makeQuestion(
          `The general solution of $\\frac{dy}{dx}=${k}x^{${k - 1}}$ is`,
          `$y=x^{${k}}+C$`,
          [`$y=${k}x^{${k}}+C$`, `$y=x^{${k - 1}}+C$`, `$y=\\frac{x^{${k}}}{${k}}+C$`],
          `Integrate the right side.`,
          i,
          title
        );
      }
      return makeQuestion(
        `The solution of $\\frac{dy}{dx}+y=0$ with $y(0)=${k}$ is`,
        `$y=${k}e^{-x}$`,
        [`$y=${k}e^{x}$`, `$y=e^{-${k}x}$`, `$y=${k}-x$`],
        `Separate variables: $dy/y=-dx$.`,
        i,
        title
      );
    }
    throw new Error(`Unsupported integration mode: ${mode}`);
  }

  const GENERATORS = {
    'Basic Mathematics': (i) => generateBasicMath('Basic Mathematics', i),
    'Sets and Relations': (i) => generateSetsRelations('Sets and Relations', i),
    Functions: (i) => generateFunctions('Functions', i),
    'Trigonometric Ratios and Identities': (i) => generateTrig('Trigonometric Ratios and Identities', i, 'identities'),
    'Trigonometric Equations': (i) => generateTrig('Trigonometric Equations', i, 'equations'),
    'Inverse Trigonometric Functions': (i) => generateTrig('Inverse Trigonometric Functions', i, 'inverse'),
    'Heights and Distances': (i) => generateTrig('Heights and Distances', i, 'heights'),
    'Complex Numbers': (i) => generateComplexQuadratic('Complex Numbers', i, 'complex'),
    'Quadratic Equation': (i) => generateComplexQuadratic('Quadratic Equation', i, 'quadratic'),
    'Sequences and Series': (i) => generateSequenceBinomial('Sequences and Series', i, 'sequence'),
    'Binomial Theorem': (i) => generateSequenceBinomial('Binomial Theorem', i, 'binomial'),
    'Permutation and Combination': (i) => generateCountingProbability('Permutation and Combination', i, 'permutation'),
    Probability: (i) => generateCountingProbability('Probability', i, 'probability'),
    'Straight Lines': (i) => generateCoordinate('Straight Lines', i, 'line'),
    Circle: (i) => generateCoordinate('Circle', i, 'circle'),
    Parabola: (i) => generateCoordinate('Parabola', i, 'parabola'),
    Ellipse: (i) => generateCoordinate('Ellipse', i, 'ellipse'),
    Hyperbola: (i) => generateCoordinate('Hyperbola', i, 'hyperbola'),
    'Properties of Triangles': (i) => generateTriangleReasonStats('Properties of Triangles', i, 'triangle'),
    'Mathematical Reasoning': (i) => generateTriangleReasonStats('Mathematical Reasoning', i, 'reasoning'),
    Statistics: (i) => generateTriangleReasonStats('Statistics', i, 'statistics'),
    Matrices: (i) => generateLinearAlgebra('Matrices', i, 'matrix'),
    Determinants: (i) => generateLinearAlgebra('Determinants', i, 'determinant'),
    'Vector Algebra': (i) => generateVector3D('Vector Algebra', i, 'vector'),
    'Three Dimensional Geometry': (i) => generateVector3D('Three Dimensional Geometry', i, '3d'),
    Limits: (i) => generateCalculus('Limits', i, 'limit'),
    'Continuity and Differentiability': (i) => generateCalculus('Continuity and Differentiability', i, 'continuity'),
    Differentiation: (i) => generateCalculus('Differentiation', i, 'differentiation'),
    'Application of Derivatives': (i) => generateCalculus('Application of Derivatives', i, 'aod'),
    'Indefinite Integration': (i) => generateIntegration('Indefinite Integration', i, 'indefinite'),
    'Definite Integration': (i) => generateIntegration('Definite Integration', i, 'definite'),
    'Area Under Curves': (i) => generateIntegration('Area Under Curves', i, 'area'),
    'Differential Equations': (i) => generateIntegration('Differential Equations', i, 'de')
  };

  [...CLASS_11_JEE_MATH_CHAPTERS, ...CLASS_12_JEE_MATH_CHAPTERS].forEach((title) => {
    const key = `${JEE_MATH_PREFIX}${title}`;
    const builder = GENERATORS[title];
    if (!builder) throw new Error(`Missing JEE maths generator for ${title}`);
    chapters[key] = buildChapter(title, builder);
    CHAPTER_PART_SIZE_OVERRIDES[key] = 10;
  });
})();
