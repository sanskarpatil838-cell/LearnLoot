// ============================================================
//  JEE Maths Master – n2.js  (Updated)
//  New Features: Login/Profile, Difficulty Levels, Sound Effects,
//                Ambient Music, Leaderboard, Performance Charts
// ============================================================

// ===== FRONTEND QUESTION DATA =====
const chapters = {
    "Sets, Relations, and Functions": [
        {q: "If R = {(x, y) : x, y ∈ Z, x² + 3y² ≤ 8} is a relation on the set of integers Z, then the domain of R⁻¹ is",
         o: ["{-2, -1, 1, 2}", "{0, 1}", "{-2, -1, 0, 1, 2}", "{-1, 0, 1}"],
         a: 3,
         s: "Given R = {(x, y) : x, y ∈ Z, x² + 3y² ≤ 8}\nWhen x = 0, 3y² ≤ 8 ⇒ y ∈ {-1, 0, 1}\nDomain of R⁻¹ = value of y = {-1, 0, 1}\nHence option d is the answer."},
        {q: "Let the function f: [0, 1] → R be defined by f(x) = 4ˣ/(4ˣ + 2). Then the value of f(1/40) + f(2/40) + f(3/40) + … + f(39/40) – f(1/2) is",
         o: ["19", "20", "39", "40"],
         a: 0,
         s: "Given f(x) = 4ˣ/(4ˣ + 2)\nf(1-x) = 4¹⁻ˣ/(4¹⁻ˣ + 2)\nf(x) + f(1-x) = 1\nSo f(1/40)+f(39/40)=1, forming 19 pairs.\nThus the expression = 19 + f(1/2) - f(1/2) = 19"},
        {q: "The function f: [0, 3] → [1, 29], defined by f(x) = 2x³ – 15x² + 36x + 1 is",
         o: ["one one and onto", "onto but not one one", "one one but not onto", "neither one one nor onto"],
         a: 1,
         s: "f'(x) = 6(x-2)(x-3), so f is not one-one (increases then decreases).\nf(0)=1, f(2)=29, range=[1,29] so f is onto.\nAnswer: onto but not one-one."},
        {q: "Let f(x) be a quadratic polynomial such that f(-1) + f(2) = 0. If one of the roots of f(x) = 0 is 3, then its other root lies in",
         o: ["(-3, -1)", "(1, 3)", "(-1, 0)", "(0, 1)"],
         a: 2,
         s: "Let f(x) = ax² + bx + c. Product of roots = c/a = -6/5.\nOne root is 3, so other root = -2/5 ∈ (-1,0).\nHence option c."},
        {q: "If f(x + y) = f(x)f(y) and ∑ₓ₌₁∞ f(x) = 2, x, y ∈ N, then f(4)/f(2) is:",
         o: ["2/3", "1/9", "1/3", "4/9"],
         a: 3,
         s: "f(n) = [f(1)]ⁿ. Using geometric sum, f(1) = 2/3.\nf(4)/f(2) = (2/3)^4/(2/3)^2 = (2/3)² = 4/9"},
        {q: "If f(x) = logₑ((1–x)/(1+x)), |x| < 1, then f(2x/(1+x²)) is equal to:",
         o: ["2f(x)", "2f(x²)", "(f(x))²", "-2f(x)"],
         a: 0,
         s: "Substituting 2x/(1+x²): f(2x/(1+x²)) = logₑ((1-x)²/(1+x)²) = 2logₑ((1-x)/(1+x)) = 2f(x)"},
        {q: "Let [t] denote the greatest integer ≤ t. The equation [x]² + 2[x+2] – 7 = 0 has",
         o: ["exactly four integral solutions", "infinitely many solutions", "no integral solution", "exactly two solutions"],
         a: 1,
         s: "Using [x+2]=[x]+2: [x]² + 2[x] - 3 = 0 ⇒ ([x]+3)([x]-1)=0.\n[x]=1: x∈[1,2); [x]=-3: x∈[-3,-2). Both are intervals → infinitely many solutions."},
        {q: "Let f(n) = [1/3 + 3n/100]·n, where [n] denotes greatest integer ≤ n. Then ∑ₙ₌₁⁵⁶ f(n) is equal to",
         o: ["56", "689", "1287", "1399"],
         a: 3,
         s: "For n=1 to 22: f(n)=0; for n=23 to 55: f(n)=n; for n=56: f(56)=2×56.\nSum = 23+24+...+55 + 112 = 1287 + 112 = 1399"},
        {q: "Let [t] denote the greatest integer ≤ t. The value of ∫₀³ [x²] dx is",
         o: ["3 - √3 - √2", "3 + √3 - √2", "5 - √3 - √2", "3 - √3 + √2"],
         a: 2,
         s: "Break [0,3] where x²=1,2: ∫₀¹ 0 dx + ∫₁^√2 1 dx + ∫_√2^√3 2 dx + ∫_√3^√... = 5 - √3 - √2"},
        {q: "If X = {4ⁿ – 3n – 1 : n ∈ N} and Y = {9(n–1) : n ∈ N}, then X∪Y is equal to",
         o: ["X", "Y", "N", "None"],
         a: 1,
         s: "4ⁿ – 3n – 1 = (1+3)ⁿ – 3n – 1 = 9[C(n,2) + ...] is always a multiple of 9.\nSo X ⊆ Y, hence X∪Y = Y."}
    ],
  "Complex Numbers and Quadratic Equations": [
    {q: "If 3/(2+ cos θ+i sin θ) = a+ib, then [(a-2)²+b²] is", 
     o: ["0", "1", "-1", "2"], 
     a: 1,
     s: "Given 3/(2+ cos θ+ i sin θ) = a+ib\n3 ((2+ cos θ) – i sin θ)/(2+ cos θ + i sin θ)((2+cos θ)- i sin θ)\n= ((6+ 3 cos θ) – i 3 sin θ)/((2+cos θ)²+ sin² θ)\n= ((6+ 3 cos θ) – i(3 sin θ))/(5+4 cos θ)\nComparing with a+ib, we get\na = (6+ 3 sin θ)/(5+ 4 cos θ)\nb = -3 sin θ/(5+ 4极 θ)\n(a-2)²+b² = [(6+ 3 sin θ)/(5+ 4 cos θ)]-2)²+(-3 sin θ/(5+ 4 cos θ))²\n= (-4-5 cos θ)²+9 sin²θ)/(5+ 4 cos θ)²\n= ((4+5 cos θ)²+9 sin²θ)/(5+ 4 cos θ)²\n= (16 + 40 cos θ +25 cos²θ+ 9 sin²θ)/(5 +4 cos θ)²\n= (16 + 40 cos θ+ 16 cos²θ+ 9 (sin²θ +cos²θ))/(5+ 4 cos θ)²\n= (16 + 40 cos θ+ 16 cos²θ+ 9)/(5 +4 cos θ)²\n= (16 cos²θ+ 40 cos θ+25)/(5+4 cos θ)²\n= (4 cos θ+5)²/(5+4 cos θ)²\n= 1"},
     
    {q: "If z = x + iy is a complex number where x and y are integers. Then, the area of the rectangle whose vertices are the roots of the equation z\bar{z}^3 + \bar{z}z^3 = 350", 
     o: ["48", "32", "40", "80"], 
     a: 0,
     s: "Given z\bar{z}^3 + \bar{z}z^3 = 350\nTake z = x+iy\n(x+iy)(x-iy)[(x-iy)²+(x+iy)²] = 350\n(x²+y²)(2x²-2y²) = 350\n(x²+y²)(x²-y²) = 175 = (25)×7\nx²+y² = 25 (i)\nx²-y² = 7 (ii)\nAdding (i) and (ii), we get\n2x² = 32\nx = ±4\nAnd y = ±3\nHence the vertices of the triangle are (4,3), (4, -3), (-4, -3) and (-4,3).\nArea of rectangle = length × breadth = 8×6 = 48"},
     
    {q: "If 1, a₁, a₂,…aₙ₋₁ are the nth roots of unity, then the value of (1-a₁) (1 – a₂)(1 – a₃)…(1 – aₙ₋₁) is", 
     o: ["√3", "1/2", "n", "0"], 
     a: 2,
     s: "Given 1, a₁, a₂,…aₙ₋₁ are the nth roots of unity.\nSo xⁿ-1 = (x-1)(x-a₁)…(x-aₙ₋₁)\n( xⁿ-1) /(x-1) = (x-a₁)(x-a₂)…(x-aₙ₋₁)\nxⁿ⁻¹+xⁿ⁻²+…x²+x+1 = (x-a₁)(x-a₂)…(x-aₙ₋₁)\nSubstitute x = 1\n(1-a₁)(1-a₂)…(1-aₙ₋₁) = 1+1+1+…n times = n"},
     
    {q: "If |(z+i)/(z-i)| = √3, then radius of the circle is", 
     o: ["2/√21", "1/√21", "√3", "√21"], 
     a: 2,
     s: "Take z = x+iy\n|z| = √(x²+y²)\nGiven |(z+i)/(z-i)| = √3\n|(z+i) | = √3|(z-i)|\nPut z = x+iy\n|(x+(y+1)i) | = √3|(x+(y-1)i)|\nSquaring we get\nx²+ (y+1)² = 3(x²+(y-1)²)\nx²+ y² +2y + 1 = 3x²+ 3y²– 6y +3\n2x²+ 2y²– 8y + 2 = 0\nx²+ y²– 4极 + 1 = 0\nEquation of circle is (x-h)² + (y-k)² = r²\nWhere (h, k) is the centre and radius is r.\n(x-0)² + (y-2)² = √3²\nRadius is √3."},
     
    {q: "If α and β ∈ C are the distinct roots of the equation x²– x + 1 = 0, then α¹⁰¹+ β¹⁰⁷ is equal to:", 
     o: ["1", "2", "-1", "0"], 
     a: 0,
     s: "x²– x +1 = 0\nSolve by using quadratic formula, we get\nx = (1±i√3)/2 = (1+i√3)/2 , (1-i√3)/2 = -(-1-i√3)/2, -(-1+i√3)/2 = -ω², -ω\nα= -ω²\nβ = -ω\nα¹⁰¹+ β¹⁰⁷ = (-ω²)¹⁰¹ + (-ω)¹⁰⁷ = -(ω²⁰²+ ω¹⁰⁷) = -[(ω³)⁶⁷ ω+ (ω³)³⁵ ω²] = -[ω +ω²] = 1"},
     
    {q: "The region represented by {z = x+iy ∈ C : z -Re(z) ≤1} is also given by the inequality:", 
     o: ["y² ≤ 2(x + 1/2)", "y² ≤ x + (1/2)", "y² ≥ 2(x + 1)", "y² ≥ (x + 1)"], 
     a: 0,
     s: "{z = x + iy ∈ C : z -Re(z) ≤ 1}\n|z| = √(x²+y²)\nRe(z) = x\nz- Re(z) ≤1\n=>√(x²+y²)-x≤ 1\n=> √(x²+y²)≤ 1+x\n=>(x²+y²)≤ (1+x²+2x)\n=> y² ≤ 2(x + 1/2)"},
     
    {q: "If ((1+i)/(1-i))ᵐ/² = ((1+i)/(i-1))ⁿ/³ = 1, (m, n∈N) then the greatest common divisor of the least values of m and n is", 
     o: ["1", "2", "3", "4"], 
     a: 3,
     s: "[(1+i)(1+i)/(1+i)(1-i)]ᵐ/² = [(1+i)(-1-i)/(-1+i)(-1-i)]ⁿ/³ = 1\nSolving LHS: (2i/2)ᵐ/² = 1 => m = 8\nSolving RHS: [(-1-i-i+1)/(1+1)]ⁿ/³ = 1\n(-2i/2)ⁿ/³ = 1\n(-i)ⁿ/³ = 1 => n = 12\nGreatest common divisor of m and n is 4."},
     
    {q: "If z is any complex number satisfying |z – 3 – 2i | ≤ 2, then the minimum value of |2z – 6 + 5i| is", 
     o: ["2", "1", "3", "5"], 
     a: 3,
     s: "|z – 3 – 2i | ≤ 2\n|2z – 6 + 5i| = 2|z – 3 + (5/2)i|\n|z – 3 + (5/2)i| = |z – 3 -2i+2i+(5/2)i| = |(z – 3 -2i)+(9/2)i|\n≥ ||z – 3 -2i)|-(9/2)| ≥ |2-9/2|≥ 5/2\n=> |z – 3 + (5/2)i|≥ 5/2\n=> |2z – 6+ 5i|≥ 5"},
     
    {q: "If z is a complex number such that the imaginary part of z is non-zero and a = z² + z + 1 is real. Then, a cannot take the value", 
     o: ["-1", "1/3", "1/2", "3/4"], 
     a: 3,
     s: "Given a = z²+z+1\nz²+z+1−a = 0\nIf solution is not real then b²-4ac<0.\n1 – 4(1-a) <0\n1 – 4 + 4a <0\n-3 + 4a <0\n4a <3\na< 3/4\nValues of a less than 3/4 will give non real solutions."},
     
    {q: "Let a, b, x and y be real numbers such that a-b = 1 and y ≠ 0. If the complex number z = x + iy satisfies Im((az +b)/(z+1)) = y, then which of the following is(are) possible value(s) of x?", 
     o: ["-1 + √(1 – y²)", "-1 – √(1 – y²)", "1 + √(1 + y²)", "1 – √(1 + y²)"], 
     a: 0,
     s: "a – b = 1\ny ≠ 0\nIm[(az +b)/(z+1)] = y\nLet z = x+iy\n=> Im [(a(x + iy) + b)/(x + iy + 1)][((x + 1) – iy)/((x + 1) – iy)] = y\n=> [-(ax + b)y + ay(x+1)]/(x+1)² + y² = y\n=> (-axy – by + axy + ay)/(x+1)² + y² = y\n=> a – b = (x+1)² + y²\n=> 1 = (x+1)² + y²\nSo x = -1 ±√(1-y²)"}
 ],
   "Permutations and Combinations": [
    {q: "There are 3 sections in a question paper and each section contains 5 questions. A candidate has to answer a total of 5 questions, choosing at least one question from each section. Then the number of ways, in which the candidate can choose the questions, is:", 
     o: ["2250", "2255", "1500", "3000"], 
     a: 0,
     s: "Total number of sections = 3\nNumber of questions in each section = 5\nNumber of ways = 3(5C1×5C2×5C2) + 3(5C1 ×5C1×5C3)\n= 3(5×5×2×5×2) + 3(5×5×10)\n= 750 + 1500\n= 2250"},
     
    {q: "A test consists of 6 multiple choice questions, each having 4 alternative answers of which only one is correct. The number of ways, in which a candidate answers all six questions such that exactly four of the answers are correct, is", 
     o: ["120", "135", "150", "180"], 
     a: 1,
     s: "Number of multiple choice questions = 6\nNumber of alternative answers = 4\nNumber of ways = 6C4×1×3²\n= 15×9\n= 135"},
     
    {q: "Total number of six-digit numbers in which only and all the five digits 1, 3, 5, 7, and 9 appear, is", 
     o: ["56", "(½)(6!)", "6!", "(5/2) 6!"], 
     a: 3,
     s: "Selecting all 5 digits = 5C5 = 1 way\nWe need to select one more digit to make it a 6 digit number = 5C1 = 5 ways\nTotal number of permutations = 6!/2!\nTotal numbers = 5C5×5C1×(6!/2!) = (5/2) 6!"},
     
    {q: "The total number of ways in which 5 balls of different colours can be distributed among 3 persons so that each person gets at least one ball is", 
     o: ["75", "150", "210", "243"], 
     a: 1,
     s: "n = 5, r = 3\nNumber of ways = rⁿ – rC1(r-1)ⁿ + rC2(r-2)ⁿ – rC3(r-3)ⁿ\n= 3⁵ – 3C1(2)⁵ + 3C2(1)⁵ – 3C3(0)⁵\n= 243 – 96 + 3\n= 150"},
     
    {q: "Let S = {1, 2, 3, 4}. The total number of unordered pairs of disjoint subsets of S is equal to", 
     o: ["25", "34", "42", "41"], 
     a: 3,
     s: "S = {1, 2, 3, 4}\nEvery element of S can be an element of A or of B or of neither of the subsets.\nThere exist 3 possibilities for each element.\nTotal number of ordered pairs of subsets = 3⁴+1 = 81+1 = 82\nTotal number of unordered pairs = 82/2 = 41"},
     
    {q: "Six cards and six envelopes are numbered 1, 2, 3, 4, 5, 6, and cards are to be placed in envelopes so that each envelope contains exactly one card and no card is placed in the envelope bearing the same number and moreover the card numbered 1 is always placed in envelope numbered 2. Then the number of ways it can be done is", 
     o: ["264", "265", "53", "67"], 
     a: 2,
     s: "If card number '2' goes in envelope '1': derangement of 4 things = 4!(1/2! – 1/3! + 1/4!) = 9 ways\nIf card number '2' doesn't go in envelope '1': derangement of 5 things = 5!(1/2! – 1/3! – 1/4! + 1/5!) = 44 ways\nTotal ways = 9+44 = 53"},
     
    {q: "A debate club consists of 6 girls and 4 boys. A team of 4 members is said to be selected from this club including the selection of a captain (from among these 4 members) for the team. If the team has to be included at most one boy, then the number of ways of selecting the team is", 
     o: ["380", "320", "260", "95"], 
     a: 0,
     s: "Case 1: all 4 girls = 6C4 = 15 ways\nCase 2: 3 girls + 1 boy = 6C3 × 4C1 = 80 ways\nTotal ways to select team = 15+80 = 95\nWays to select captain = 4C1 = 4\nTotal ways = 95 × 4 = 380"},
     
    {q: "The number of 5 digit numbers which are divisible by 4, with the digits from the set {1, 2, 3, 4, 5} and the repetition of digit is allowed is", 
     o: ["625", "600", "500", "6250"], 
     a: 0,
     s: "A number is divisible by 4 if last two digits are divisible by 4\nValid endings: 12, 24, 32, 44, 52\nFirst 3 digits can be arranged in 5³ ways\nTotal numbers = 5³ × 5 = 625"},
     
    {q: "A bag contains 2 apples, 3 oranges, and 4 bananas. The number of ways in which 3 fruits can be selected if atleast one banana is always in the combination (Assume fruits of same species to be alike) is", 
     o: ["6", "10", "29", "7"], 
     a: 0,
     s: "Case 1: 2 bananas + 1 other = 1 way\nCase 2: 1 banana + 2 same fruits = 2C1 = 2 ways\nCase 3: 1 banana + 2 different fruits = 1 way\nCase 4: 3 bananas = 1 way\nTotal ways = 1 + 2 + 1 + 2 = 6"},
     
    {q: "Team A consists of 7 boys and n girls and Team B has 4 boys and 6 girls. If a total of 52 single matches can be arranged between these two teams when a boy plays against a boy and a girl plays against a girl, then n is equal to", 
     o: ["5", "6", "2", "4"], 
     a: 3,
     s: "Boy matches = 7C1 × 4C1 = 28\nGirl matches = nC1 × 6C1 = 6n\nTotal matches = 28 + 6n = 52\n6n = 24\nn = 4"}
],
   "Binomial Theorem": [
    {q: "Coefficient of x¹¹ in the expansion (1 + x²)⁴ (1 + x³)⁷ (1 + x⁴)¹² is", 
     o: ["1051", "1106", "1113", "1120"], 
     a: 2,
     s: "(1 + x²)⁴ (1 + x³)⁷ (1 + x⁴)¹²\nFind 2m + 3n + 4p = 11\nPossibilities: m=0,n=1,p=2; m=1,n=3,p=0; m=2,n=1,p=1; m=4,n=1,p=0\nCoefficient = ⁴C₀×⁷C₁×¹²C₂ + ⁴C₁×⁷C₃×¹²C₀ + ⁴C₂×⁷C₁×¹²C₁ + ⁴C₄×⁷C₁×¹²C₀\n= 462 + 140 + 504 + 7 = 1113"},
     
    {q: "The coefficients of three consecutive terms of (1+x)ⁿ⁺⁵ are in the ratio 5: 10: 14. Then n =", 
     o: ["4", "5", "6", "7"], 
     a: 2,
     s: "ⁿ⁺⁵Cᵣ₋₁ : ⁿ⁺⁵Cᵣ : ⁿ⁺⁵Cᵣ₊₁ = 5: 10: 14\nⁿ⁺⁵Cᵣ/ⁿ⁺⁵Cᵣ₋₁ = 10/5 ⇒ (n+6-r)/r = 2 ⇒ n = 3r-6\nⁿ⁺⁵Cᵣ₊₁/ⁿ⁺⁵Cᵣ = 14/10 ⇒ (n+5-r)/(r+1) = 7/5\nSolving: 5(3r-6) - 12r + 18 = 0 ⇒ 3r - 12 = 0 ⇒ r=4\nn = 3(4)-6 = 6"},
     
    {q: "The coefficient of x⁹ in the expansion (1+x)(1+x²)(1+x³) ..(1+x¹⁰⁰) is", 
     o: ["6", "7", "8", "9"], 
     a: 2,
     s: "To get power 9, possibilities: (0,9), (1,8), (2,7), (3,6), (4,5) = 5 ways\n(1,2,6), (1,3,5), (2,3,4) = 3 ways\nTotal coefficient = 8"},
     
    {q: "If {p} denotes the fractional part of the number p, then {3²⁰⁰/8}, is equal to", 
     o: ["5/8", "7/8", "3/8", "1/8"], 
     a: 3,
     s: "3²⁰⁰/8 = (1/8)9¹⁰⁰ = 1/8 (1 + 8)¹⁰⁰ = 1/8 + integer\n{1/8 + integer} = 1/8"},
     
    {q: "The coefficient of x⁷ in the expression (1 + x)¹⁰ + x(1 + x)⁹ + x²(1 + x)⁸ + ⋯ + x¹⁰ is", 
     o: ["420", "330", "210", "120"], 
     a: 1,
     s: "S = (1+x)¹⁰ + x(1+x)⁹ + x²(1+x)⁸ + ⋯ + x¹⁰\nS = (1+x)¹¹ - x¹¹\nCoefficient of x⁷ is ¹¹C₇ = 330"},
     
    {q: "The coefficient of x⁴ in the expansion of (1+x+x²)¹⁰ is", 
     o: ["615", "620", "625", "630"], 
     a: 0,
     s: "General term: (10!/p!q!r!)x^{q+2r} where q+2r=4\np=6,q=4,r=0: 10!/(6!4!) = 210\np=7,q=2,r=1: 10!/(7!2!1!) = 360\np=8,q=0,r=2: 10!/(8!2!) = 45\nSum = 210+360+45 = 615"},
     
    {q: "If Cᵣ = ²⁵Cᵣ and C₀+5⋅C₁+9⋅C₂ +⋯+101. C₂₅ =2²⁵.k then k is equal to", 
     o: ["50", "51", "52", "53"], 
     a: 1,
     s: "S = ²⁵C₀ + 5⋅²⁵C₁ + 9⋅²⁵C₂ + ⋯ + 101⋅²⁵C₂₅\nReverse and add: 2S = 102[²⁵C₀+²⁵C₁+⋯+²⁵C₂₅] = 102⋅2²⁵\nS = 51⋅2²⁵ ⇒ k = 51"},
     
    {q: "If the fractional part of the number 2⁴⁰³/15 is k/15, then k is equal to", 
     o: ["4", "8", "6", "14"], 
     a: 1,
     s: "2⁴⁰³ = 2⁴⁰⁰ × 2³ = (2⁴)¹⁰⁰ × 8 = 8×16¹⁰⁰ = 8(1+15)¹⁰⁰\n2⁴⁰³/15 = 8(1+15x)/15 = 8x + 8/15\nFractional part = 8/15 ⇒ k = 8"},
     
    {q: "The number of terms in the expansion of the (1+x)¹⁰¹(1+x² -x)¹⁰⁰ in powers of x is", 
     o: ["302", "301", "202", "101"], 
     a: 2,
     s: "(1+x)¹⁰¹(1+x²-x)¹⁰⁰ = (1+x)(1+x)¹⁰⁰(1-x+x²)¹⁰⁰\n= (1+x)[(1+x)(1-x+x²)]¹⁰⁰ = (1+x)(1+x³)¹⁰⁰\n(1+x³)¹⁰⁰ has 101 terms\n(1+x)(1+x³)¹⁰⁰ has 2×101 = 202 terms"},
     
    {q: "The sum of the rational terms in the binomial expansion of (2¹/² + 3¹/⁵)¹⁰ is", 
     o: ["25", "32", "9", "41"], 
     a: 3,
     s: "(2¹/² + 3¹/⁵)¹⁰ = ¹⁰C₀(2¹/²)¹⁰ + ¹⁰C₁(2¹/²)⁹(3¹/⁵) + ... + ¹⁰C₁₀(3¹/⁵)¹⁰\nRational terms: first term = 2⁵ = 32, last term = 3² = 9\nSum = 32 + 9 = 41"}
],
    "Sequences and Series": [
    {q: "Let a₁, a₂, a₃,…be in harmonic progression with a₁ = 5 and a₂₀ = 25. The least positive integer n for which aₙ < 0 is", 
     o: ["22", "23", "24", "25"], 
     a: 3,
     s: "Given a₁, a₂, a₃,…are in HP ⇒ 1/a₁, 1/a₂, 1/a₃ are in AP\n1/a₂₀ = 1/a₁ + 19d ⇒ 1/25 - 1/5 = 19d ⇒ d = -4/(25×19)\n1/aₙ = 1/5 + (n-1)(-4/(25×19)) < 0\nSolving: n > 19×5/4 + 1 ⇒ n > 25 ⇒ n = 25"},
     
    {q: "Let a, b, and c be positive integers such that b/a is an integer. If a, b, c are in geometric progression and the arithmetic mean of a, b, c is b + 2, then the value of (a² + a - 14)/(a + 1) is", 
     o: ["2", "3", "4", "5"], 
     a: 2,
     s: "Let a, b, c = a, ar, ar²\n(a + ar + ar²)/3 = ar + 2 ⇒ ar² - 2ar + a = 6 ⇒ a(r-1)² = 6\n(r-1)² = 6/a ⇒ a = 6\n(a² + a - 14)/(a+1) = (36 + 6 - 14)/7 = 28/7 = 4"},
     
    {q: "A pack contains n cards numbered from 1 to n. Two consecutive numbered cards are removed from the pack and the sum of the numbers on the remaining cards is 1224. If the smaller to the numbers on the removed card is k, then k-20 equals", 
     o: ["5", "10", "15", "50"], 
     a: 0,
     s: "Sum of n natural numbers = n(n+1)/2\nn(n+1)/2 - (k + k+1) = 1224 ⇒ n² + n - 2450 = 4k\nk = (n+50)(n-49)/4\n1 ≤ k ≤ n-1 ⇒ 49 < n < 51 ⇒ n=50\nk = 100/4 = 25 ⇒ k-20 = 5"},
     
    {q: "The sides of the right-angled triangle are in AP. If the triangle has an area 24, then what is the length of its smallest side?", 
     o: ["4", "5", "6", "7"], 
     a: 2,
     s: "Let sides = a-d, a, a+d\n(a+d)² = a² + (a-d)² ⇒ a² + 2ad + d² = a² + a² - 2ad + d²\n4ad = a² ⇒ a = 4d\nArea = ½(a-d)a = 24 ⇒ ½(3d)(4d) = 24 ⇒ 6d² = 24 ⇒ d=2\nSmallest side = a-d = 4d-d = 3d = 6"},
     
    {q: "If the sum of the first n terms of an AP is cn², then the sum of squares of these n terms is", 
     o: ["n(4n² - 1)c²/6", "n(4n² + 1)c²/3", "n(4n² - 1)c²/3", "n(4n² + 1)c²/6"], 
     a: 2,
     s: "Sₙ = cn²\nTₙ = Sₙ - Sₙ₋₁ = cn² - c(n-1)² = c(2n-1)\n∑Tₙ² = c²∑(4n² - 4n + 1) = c²[4∑n² - 4∑n + ∑1]\n= c²[4n(n+1)(2n+1)/6 - 4n(n+1)/2 + n]\n= nc²(4n² - 1)/3"},
     
    {q: "The third term of a geometric progression is 4. The product of the first five terms is", 
     o: ["4³", "4⁴", "4⁵", "4"], 
     a: 2,
     s: "Let GP: a, ar, ar², ar³, ar⁴\nThird term = ar² = 4\nProduct = a×ar×ar²×ar³×ar⁴ = a⁵r¹⁰ = (ar²)⁵ = 4⁵"},
     
    {q: "Let X be the set consisting of the first 2018 terms of an arithmetic progression, 1, 6, 11…., and Y be the set consisting of the first 2018 terms of arithmetic progression 9, 16, 23, …. Then, the number of elements in the set (X ⋃ Y) is", 
     o: ["3748", "3750", "3752", "3754"], 
     a: 0,
     s: "X: AP with a=1, d=5 ⇒ 2018th term = 1+2017×5 = 10086\nY: AP with a=9, d=7 ⇒ 2018th term = 9+2017×7 = 14128\nX∩Y: common terms form AP with a=16, d=35\n10086 ≥ 16 + (n-1)35 ⇒ n ≤ 288.71 ⇒ n=288\nX∪Y = 2018 + 2018 - 288 = 3748"},
     
    {q: "The minimum value of the sum of real numbers a⁻⁵, a⁻⁴, 3a⁻³, 1, a⁸ and a¹⁰ with a > 0 is", 
     o: ["9", "8", "2", "1"], 
     a: 1,
     s: "Using AM ≥ GM:\n(a⁻⁵ + a⁻⁴ + a⁻³ + a⁻³ + a⁻³ + 1 + a⁸ + a¹⁰)/8 ≥ [a⁻⁵×a⁻⁴×a⁻³×a⁻³×a⁻³×1×a⁸×a¹⁰]¹/⁸\n(a⁻⁵ + a⁻⁴ + 3a⁻³ + 1 + a⁸ + a¹⁰)/8 ≥ 1\nSum ≥ 8"},
     
    {q: "Let Sₙ = ∑ₖ₌₁⁴ⁿ (-1)ᵏ⁽ᵏ⁺¹⁾/² k². Then Sₙ can take values", 
     o: ["1056", "1088", "1120", "1332"], 
     a: 0,
     s: "Sₙ = -1² - 2² + 3² + 4² - 5² - 6² + 7² + 8² - ... + (4n)²\n= (-1² + 3² - 5² + 7² -...+ (4n-1)²) + (-2² + 4² - 6² + 8² -...+ (4n)²)\n= 2(4 + 12 + 20+...(8n-4)) + 2(6 + 14 + 22+...(8n-2))\n= n(8n) + n(8n+4) = n(16n+4)\nFor n=8: Sₙ=1056; For n=9: Sₙ=1332"},
     
    {q: "If m arithmetic means (A.Ms) and three geometric means (G.Ms) are inserted between 3 and 243 such that 4th A.M is equal to 2nd G.M, then m is equal to", 
     o: ["39", "40", "41", "42"], 
     a: 0,
     s: "AP: 3, a₁, a₂,...aₘ, 243 ⇒ d = 240/(m+1)\nGP: 3, G₁, G₂, G₃, 243 ⇒ r⁴ = 243/3 = 81 ⇒ r=3\n4th A.M = 2nd G.M ⇒ a₄ = G₂\n3 + 4d = 3r² ⇒ 3 + 4×240/(m+1) = 27\n4×240/(m+1) = 24 ⇒ m+1 = 40 ⇒ m=39"}
],
    "Limits and Derivatives": [
        {q: "lim x→0 (tanx – sinx)/x³ =",
         o: ["0", "1/2", "1", "∞"],
         a: 1,
         s: "(tanx–sinx)/x³ = sinx(1–cosx)/(x³cosx) → (x·x²/2)/x³ = 1/2"},
        {q: "If y = xˣ, then dy/dx =",
         o: ["xˣ(1+lnx)", "xˣ lnx", "x^(x-1)", "xˣ(1-lnx)"],
         a: 0,
         s: "ln y = x ln x ⇒ (1/y)dy/dx = ln x + 1 ⇒ dy/dx = xˣ(1+ln x)"},
        {q: "lim x→0 (aˣ – bˣ)/x =",
         o: ["ln(a/b)", "ln a – ln b", "0", "1"],
         a: 1,
         s: "= lim (e^(x ln a) – e^(x ln b))/x = ln a – ln b"},
        {q: "The derivative of sin⁻¹(2x√(1–x²)) with respect to sin⁻¹x is",
         o: ["2", "1/2", "1", "0"],
         a: 0,
         s: "Let u = sin⁻¹x. y = sin⁻¹(sin 2u) = 2u. dy/du = 2"},
        {q: "lim x→∞ (1 + 1/x)ˣ =",
         o: ["0", "1", "e", "∞"],
         a: 2,
         s: "Standard definition of e"}
    ],
    "Trigonometry": [
    {q: "The positive integer value of n>3 satisfying the equation 1/sin(π/n) = 1/sin(2π/n) + 1/sin(3π/n)", 
     o: ["8", "6", "5", "7"], 
     a: 3,
     s: "1/sin(π/n) - 1/sin(3π/n) = 1/sin(2π/n)\n[sin3π/n - sinπ/n]/(sin3π/n sinπ/n) = 1/sin2π/n\n2cos(2π/n)sin(π/n)/(sin3π/n sinπ/n) sin2π/n = 1\n2sin2π/n cos2π/n/sin3π/n = 1\nsin4π/n/sin3π/n = 1\nsin4π/n = sin3π/n\nπ - 4π/n = 3π/n ⇒ π = 7π/n ⇒ n = 7"},
     
    {q: "If A + B + C = 180° then the value of tan A + tan B + tan C is", 
     o: ["≥3√3", "≥2√3", "> 3√3", "> 2√3"], 
     a: 0,
     s: "A + B + C = 180° ⇒ tan(A+B) = -tanC\n(tanA+tanB)/(1-tanAtanB) = -tanC\ntanA+tanB+tanC = tanAtanBtanC\nUsing AM ≥ GM: (tanA+tanB+tanC)/3 ≥ (tanAtanBtanC)^{1/3}\ntanAtanBtanC ≥ 3(tanAtanBtanC)^{1/3}\nCubing: tan²Atan²Btan²C ≥ 27\ntanAtanBtanC ≥ 3√3"},
     
    {q: "The number of values of θ in the interval (-π/2, π/2) such that θ ≠ nπ/5 for n = 0, ±1, ±2 and tan θ = cot 5θ as well as sin 2θ = cos 4θ", 
     o: ["3", "4", "7", "5"], 
     a: 0,
     s: "tanθ = cot5θ ⇒ θ = nπ + π/2 - 5θ ⇒ θ = nπ/6 + π/12\nsin2θ = cos4θ ⇒ 2sin²2θ + sin2θ - 1 = 0\nsin2θ = -1 or sin2θ = 1/2 ⇒ θ = π/12, 5π/12, -π/4\nθ takes 3 values in (-π/2, π/2)"},
     
    {q: "For x ∈(0, π), the equation sin x + 2 sin 2x - sin 3x = 3 has", 
     o: ["infinitely many solutions", "three solutions", "one solution", "no solution"], 
     a: 3,
     s: "sinx + 2sin2x - sin3x = 3\nUsing identities: sinx + 4sinxcosx - 3sinx + 4sin³x = 3\nsinx(-2 + 4cosx + 4sin²x) = 3\n3 - (2cosx-1)² = 3cosecx\nLHS ≤ 3, RHS ≥ 3, but not equal for same x\nNo solution"},
     
    {q: "If 5(tan² x - cos² x) = 2cos 2x + 9, then the value of cos 4x is", 
     o: ["1/3", "2/9", "-7/9", "-3/5"], 
     a: 2,
     s: "5(tan²x - cos²x) = 2cos2x + 9\n5(sec²x - 1 - cos²x) = 2(2cos²x-1) + 9\n5sec²x - 5 = 9cos²x + 7\nLet cos²x = t: 5/t = 9t + 12\n9t² + 12t - 5 = 0 ⇒ t = 1/3\ncos2x = 2t - 1 = -1/3\ncos4x = 2cos²2x - 1 = 2/9 - 1 = -7/9"},
     
    {q: "If √2 sin α/√(1 + cos 2α) = 1/7 and √((1 - cos 2β)/2) = 1/√10, α, β ∈ (0, π/2), then tan (α + 2β) is equal to", 
     o: ["1", "-1", "0", "1/2"], 
     a: 0,
     s: "√2 sinα/√(1+cos2α) = 1/7 ⇒ tanα = 1/7\n√((1-cos2β)/2) = 1/√10 ⇒ sinβ = 1/√10 ⇒ tanβ = 1/3\ntan2β = (2tanβ)/(1-tan²β) = 3/4\ntan(α+2β) = (tanα+tan2β)/(1-tanαtan2β) = (1/7+3/4)/(1-3/28) = 25/25 = 1"},
     
    {q: "Let the function f: (0, π) → R be defined by f(θ) = (sin θ + cos θ)² + (sin θ - cos θ)⁴. Suppose, the function f has a local minimum at θ precisely when θ ∈ {λ₁ π, … , λᵣ π}, where 0 < λ₁< ⋯ < λᵣ < 1.Then the value of λ₁ + ⋯ + λᵣ is", 
     o: ["1/4", "-2", "1", "1/2"], 
     a: 3,
     s: "f(θ) = (sinθ+cosθ)² + (sinθ-cosθ)⁴\n= 1 + sin2θ + (1-sin2θ)²\n= sin²2θ - sin2θ + 2\n= (sin2θ - 1/2)² + 7/4\nMinimum when sin2θ = 1/2 ⇒ 2θ = π/6, 5π/6 ⇒ θ = π/12, 5π/12\nλ₁ + λ₂ = 1/12 + 5/12 = 1/2"},
     
    {q: "The number of distinct solutions of equation (5/4)cos²2x + cos⁴x + sin⁴x + cos⁶x + sin⁶x = 2 in the interval [0, 2π] is", 
     o: ["2", "8", "4", "1"], 
     a: 1,
     s: "(5/4)cos²2x + cos⁴x + sin⁴x + cos⁶x + sin⁶x = 2\nSimplify to: (5/4)cos²2x - (5/4)sin²2x - (5/4)sin²2x = 0\nsin²2x = 1/2 ⇒ sin2x = ±1/√2\n2x = π/4, 3π/4, 5π/4, 7π/4, 9π/4, 11π/4, 13π/4, 15π/4\nx = π/8, 3π/8, 5π/8, 7π/8, 9π/8, 11π/8, 13π/8, 15π/8\n8 solutions"},
     
    {q: "For what and only what values of α lying between 0 and π is the inequality sin α cos³α > sin³α cos α valid?", 
     o: ["α ∈ (0, π/4)", "α ∈ (0, π/2)", "α ∈ (π/4, π/2)", "none of these"], 
     a: 0,
     s: "sinαcos³α > sin³αcosα\nsinαcosα(cos²α - sin²α) > 0\n(1/2)sin2α cos2α > 0\n(1/4)sin4α > 0\nsin4α > 0 ⇒ 4α ∈ (0,π) ⇒ α ∈ (0,π/4)"},
     
    {q: "The solution of the equation tan θ. tan 2θ = 1 is", 
     o: ["nπ + 5π/12", "nπ - π/12", "2nπ ± π/4", "nπ ± π/6"], 
     a: 3,
     s: "tanθ.tan2θ = 1\ntanθ.(2tanθ/(1-tan²θ)) = 1\n2tan²θ = 1-tan²θ\n3tan²θ = 1\ntan²θ = 1/3\ntanθ = 1/√3\nθ = nπ ± π/6"}
],
    "Coordinate Geometry": [
    {q: "A-line through A (−5, −4) meets the lines x + 3y + 2 = 0, 2x + y + 4 = 0 and x − y − 5 = 0 at B, C and D, respectively. If (15 / AB)² + (10 / AC)² = (6 / AD)², then the equation of the line is", 
     o: ["2x + 3y + 22 = 0", "3x + 2y + 22 = 0", "2x - 3y + 22 = 0", "3x - 2y + 22 = 0"], 
     a: 0,
     s: "Let line through A: (x+5)/cosθ = (y+4)/sinθ = r\nB: r₁ = 15/(cosθ+3sinθ), C: r₂ = 10/(2cosθ+sinθ), D: r₃ = 6/(cosθ-sinθ)\nGiven: (2cosθ+sinθ)² + (cosθ-sinθ)² = (cosθ+3sinθ)²\nSolving: (2cosθ+3sinθ)² = 0 ⇒ tanθ = -2/3\nEquation: y+4 = (-2/3)(x+5) ⇒ 2x+3y+22=0"},
     
    {q: "The equations of two equal sides of an isosceles triangle are 7x − y + 3 = 0 and x + y − 3 = 0, and the third side passes through the point (1, -10). The equation of the third side is", 
     o: ["3x + y + 7 = 0", "x − 3y − 31 = 0", "Both A and B", "None of these"], 
     a: 2,
     s: "Line through (1,-10): y+10 = m(x-1)\nEqual angles with given lines: |(m-7)/(1+7m)| = |(m+1)/(1-m)|\nSolving: m = 1/3 or 3\nEquations: 3x+y+7=0 and x-3y-31=0"},
     
    {q: "The graph of the function cos x cos (x + 2) − cos² (x + 1) is", 
     o: ["A straight line passing through (0, −sin²1) with slope 2", "A straight line passing through (0, 0)", "A parabola with vertex 75°", "A straight line passing through (π/2, −sin²1) and parallel to x-axis"], 
     a: 3,
     s: "y = cosx cos(x+2) - cos²(x+1)\n= cos(x+1-1)cos(x+1+1) - cos²(x+1)\n= cos²(x+1) - sin²1 - cos²(x+1)\n= -sin²1\nConstant function ⇒ horizontal line through (π/2, -sin²1)"},
     
    {q: "In what direction can a line be drawn through the point (1, 2) so that its points of intersection with the line x + y = 4 is at a distance √6/3 from the given point?", 
     o: ["15° or 75°", "30° or 60°", "45° or 135°", "0° or 90°"], 
     a: 0,
     s: "Line: (x-1)/cosθ = (y-2)/sinθ = r\nPoint on line: (1+rcosθ, 2+rsinθ)\nThis point lies on x+y=4 and r=√6/3\ncosθ+sinθ = 3/√6 = √6/2\nsin(θ+45°) = √3/2 ⇒ θ+45° = 60° or 120° ⇒ θ=15° or 75°"},
     
    {q: "A variable line passes through a fixed point P. The algebraic sum of the perpendicular drawn from (2, 0), (0, 2) and (1, 1) on the line is zero, then what are the coordinates of P?", 
     o: ["(0, 0)", "(1, 1)", "(2, 2)", "(1, 2)"], 
     a: 1,
     s: "Let line: y-y₁ = m(x-x₁)\nSum of perpendicular distances = 0\n[|mx₁-y₁-2m| + |mx₁-y₁+2| + |mx₁-y₁+1-m|]/√(1+m²) = 0\nThis holds for all m ⇒ coefficients of m must be zero\nSolving: x₁=1, y₁=1 ⇒ P(1,1)"},
     
    {q: "The area enclosed within the curve |x|+|y|= 1 is", 
     o: ["1", "2", "3", "4"], 
     a: 1,
     s: "The curve forms a square with vertices at (1,0), (0,1), (-1,0), (0,-1)\nSide length = √2\nArea = (√2)² = 2"},
     
    {q: "The locus of a point P, which divides the line joining (1, 0) and (2 cos θ, 2 sin θ) internally in the ratio 2 : 3 for all θ, is a", 
     o: ["Straight line", "Circle", "Parabola", "Ellipse"], 
     a: 1,
     s: "P = ((4cosθ+3)/5, (4sinθ)/5)\nLet P=(h,k): cosθ=(5h-3)/4, sinθ=5k/4\n(5h-3)²/16 + 25k²/16 = 1 ⇒ (5h-3)²+25k²=16\nThis is a circle"},
     
    {q: "The area of a parallelogram formed by the lines ax ± by ± c = 0, is", 
     o: ["c²/ab", "2c²/ab", "4c²/ab", "c²/2ab"], 
     a: 1,
     s: "Lines form a rhombus with vertices at (±c/a, 0) and (0, ±c/b)\nDiagonals: 2c/a and 2c/b\nArea = ½ × (2c/a) × (2c/b) = 2c²/ab"},
     
    {q: "If the sum of the distances of a point from two perpendicular lines in a plane is 1, then its locus is", 
     o: ["A circle", "A square", "A straight line", "Two parallel lines"], 
     a: 1,
     s: "Let perpendicular lines be x=0 and y=0\nDistance sum = |x|+|y| = 1\nThis forms a square with vertices at (1,0), (0,1), (-1,0), (0,-1)"},
     
    {q: "The line 2x + 3y = 12 meets the x-axis at A and y-axis at B. The line through (5, 5) perpendicular to AB meets the x-axis, y-axis and the AB at C, D and E, respectively. If O is the origin of coordinates, then the area of OCEB is", 
     o: ["20/3", "25/3", "10", "15"], 
     a: 0,
     s: "A(6,0), B(0,4)\nPerpendicular line through (5,5): 3x-2y=5\nC(5/3,0), D(0,-5/2), E(3,2)\nOCEB is quadrilateral with vertices O(0,0), C(5/3,0), E(3,2), B(0,4)\nArea = area of trapezium = ½×(5/3+3)×2 + ½×3×2 = 20/3"}
],
   "Three-Dimensional Geometry": [
    {q: "Perpendiculars are drawn from points on the line (x + 2)/2 = (y + 1)/-1 = z/3 to the plane x + y + z = 3. The feet of perpendiculars lie on the line", 
     o: ["x/5 = (y – 1)/8 = (z – 2)/-13", "x/2 = (y – 1)/3 = (z – 2)/-5", "x/4 = (y – 1)/3 = (z – 2)/-7", "x/2 = (y – 1)/-7 = (z – 2)/5"], 
     a: 3,
     s: "Point on line: (2λ-2, -λ-1, 3λ)\nThis point lies on plane ⇒ 4λ-6=0 ⇒ λ=3/2\nP = (1, -5/2, 9/2)\nFoot from (-2,-1,0) to plane: (0,1,2)\nDirection ratios: (1, -7/2, 5/2) = (2,-7,5)\nLine: x/2 = (y-1)/-7 = (z-2)/5"},
     
    {q: "Two lines L₁: x = 5, y/(3 – α) = z/-2 and L₂: x = α, y/-1 = z/(2 – α) are coplanar. Then α can take values", 
     o: ["1", "2", "3", "4"], 
     a: 0,
     s: "For coplanarity: |5-α, 0, 0; 0, 3-α, -2; 1, -1, 2-α| = 0\n(5-α)[(3-α)(2-α)-2] = 0\n(5-α)(α-1)(α-4)=0 ⇒ α=1,4,5"},
     
    {q: "Let P be the image of the point (3, 1, 7) with respect to the plane x – y + z = 3. Then the equation of the plane passing through P and containing the straight line x/1 = y/2 = z/1 is", 
     o: ["x + y – 3z = 0", "3x + z = 0", "x – 4y + 7z = 0", "2x – y = 0"], 
     a: 2,
     s: "Image P: (-1, 5, 3)\nPlane through P: a(x+1)+b(y-5)+c(z-3)=0\nContains line ⇒ a+2b+c=0\nContains origin ⇒ a-5b-3c=0\nSolving: a/1 = b/-4 = c/7\nEquation: (x+1)-4(y-5)+7(z-3)=0 ⇒ x-4y+7z=0"},
     
    {q: "The equation of the plane passing through the point (1, 1, 1) and perpendicular to the planes 2x + y – 2z = 5 and 3x – 6y – 2z = 7 is", 
     o: ["14x + 2y + 15z = 31", "14x + 2y – 15z = 1", "-14x + 2y + 15z = 3", "14x – 2y + 15z = 27"], 
     a: 0,
     s: "Normal vector = |i j k; 2 1 -2; 3 -6 -2| = (-14, -2, -15)\nPlane: -14(x-1)-2(y-1)-15(z-1)=0 ⇒ 14x+2y+15z=31"},
     
    {q: "If for some α ∈ R, the lines L₁: (x + 1)/2 = (y – 2)/-1 = (z – 1)/1 and L₂: (x + 2)/α = (y + 1)/(5 – α) = (z + 1)/1 are coplanar, then the line L₂ passes through the point:", 
     o: ["(2, -10, -2)", "(10, -2, -2)", "(10, 2, 2)", "(-2, 10, 2)"], 
     a: 0,
     s: "Coplanarity condition: |1, -3, -2; 2, -1, 1; α, 5-α, 1| = 0\nSolving: -1(-1+α-5)+3(2-α)-2(10-2α+α)=0 ⇒ α=-4\nL₂: (x+2)/-4 = (y+1)/9 = (z+1)/1\nPoint (2,-10,-2) satisfies this equation"},
     
    {q: "The distance of the point (1, -2, 3) from the plane x – y + z = 5 measured parallel to the line (x/2) = (y/3) = (z/-6) is:", 
     o: ["1/7", "7", "7/5", "1"], 
     a: 3,
     s: "Line through (1,-2,3): (x-1)/2 = (y+2)/3 = (z-3)/-6 = λ\nPoint on line: (2λ+1, 3λ-2, -6λ+3)\nSubstitute in plane: 2λ+1-3λ+2-6λ+3=5 ⇒ -7λ=-1 ⇒ λ=1/7\nDistance = 7λ = 1"},
     
    {q: "Let P be a point in the first octant, whose image Q in the plane x + y = 3 lies on the z-axis. Let the distance of P from the x-axis be 5. If R is the image of P in the xy-plane, then the length of PR is", 
     o: ["6", "7", "8", "9"], 
     a: 2,
     s: "Let P=(a,b,c), Q=(0,0,c)\nPQ ⟂ plane ⇒ (a,b) ∥ (1,1) ⇒ a=b\nMidpoint on plane: a/2+b/2=3 ⇒ a=b=3\nDistance from x-axis = √(b²+c²)=5 ⇒ 9+c²=25 ⇒ c=±4\nPR = |2c| = 8"},
     
    {q: "Let α, β, γ, δ be real numbers such that α² + β² + γ² ≠ 0 and α + γ = 1. Suppose the point (3, 2, -1) is the mirror image of the point (1, 0, -1) with respect to the plane αx + βy + γz = δ. Then which of the following statements is/are TRUE?", 
     o: ["α + β = 2", "δ – γ = 3", "δ + β = 4", "α + β + γ = δ"], 
     a: 0,
     s: "Midpoint (2,1,-1) lies on plane\nPQ ⟂ plane ⇒ direction (2,2,0) ∥ normal (α,β,γ)\nα=β, γ=0\nPlane: x+y=3 ⇒ α=1, β=1, γ=0, δ=3\nα+β=2, δ-γ=3, δ+β=4, α+β+γ=2≠3"},
     
    {q: "In R³, consider the planes P₁: y = 0 and P₂: x + z = 1. Let P₃ be a plane, different from P₁ and P₂, which passes through the intersection of P₁ and P₂. If the distance of the point (0, 1, 0) from P₃ is 1 and the distance of a point (α, β, γ) from P₃ is 2, then which of the following relation is (are) true?", 
     o: ["2α + β + 2γ + 2= 0", "2α – β + 2γ + 4 = 0", "2α + β – 2γ – 10= 0", "2α – β + 2γ – 8 = 0"], 
     a: 1,
     s: "P₃: (x+z-1)+λy=0 ⇒ x+λy+z-1=0\nDistance from (0,1,0): |λ-1|/√(2+λ²)=1 ⇒ λ=-1/2\nDistance from (α,β,γ): |α-β/2+γ-1|/(3/2)=2\n2α-β+2γ-2=±6 ⇒ 2α-β+2γ+4=0 or 2α-β+2γ-8=0"},
     
    {q: "If the straight lines (x – 1)/2 = (y + 1)/k = z/2 and (x + 1)/5 = (y + 1)/2 = z/k are coplanar, then the plane(s) containing these two lines is (are)", 
     o: ["y + 2z = -1", "y + z = -1", "y – z = -1", "y – 2z = -1"], 
     a: 1,
     s: "Coplanarity: |2, -2, -2; 2, k, 2; 5, 2, k| = 0\nSolving: k=±2\nFor k=2: plane y-z=-1\nFor k=-2: plane y+z=-1"}
],
    "Probability": [
    {q: "A die is thrown two times and the sum of the scores appearing on the die is observed to be a multiple of 4. Then the conditional probability that the score 4 has appeared atleast once is:", 
     o: ["1/3", "1/4", "1/8", "1/9"], 
     a: 3,
     s: "A = sum multiple of 4: {(1,3), (2,2), (3,1), (2,6), (3,5), (4,4), (5,3), (6,2), (6,6)}\nB = 4 appears at least once: {(1,4), (2,4), (3,4), (4,4), (5,4), (6,4), (4,1), (4,2), (4,3), (4,5), (4,6)}\nA∩B = {(4,4)}\nP(B|A) = 1/9"},
     
    {q: "There are three bags B₁, B₂, and B₃. The bag B₁ contains 5 red and 5 green balls, B₂ contains 3 red and 5 green balls, and B₃ contains 5 red and 3 green balls, Bags B₁, B₂ and B₃ have probabilities 3/10, 3/10, and 4/10 respectively of being chosen. A bag is selected at random and a ball is chosen at random from the bag. Then which of the following options is/are correct?", 
     o: ["Probability that the selected bag is B₃ and the chosen ball is green equals 3/10", "Probability that the chosen ball is green equals 39/80", "Probability that the chosen ball is green, given that the selected bag is B₃, equals 3/8", "Probability that the selected bag is B₃, given that the chosen balls is green, equals 5/13"], 
     a: 1,
     s: "P(B₃∩G) = (3/8)×(4/10) = 3/20\nP(G) = (5/10)×(3/10) + (5/8)×(3/10) + (3/8)×(4/10) = 39/80\nP(G|B₃) = 3/8\nP(B₃|G) = (3/20)/(39/80) = 4/13"},
     
    {q: "A box contains 15 green and 10 yellow balls. If 10 balls are randomly drawn, one-by-one, with replacement, then the variance of the number of green balls drawn is:", 
     o: ["6", "4", "6/25", "12/5"], 
     a: 3,
     s: "p = 15/25 = 3/5, q = 2/5, n = 10\nVariance = npq = 10×(3/5)×(2/5) = 12/5"},
     
    {q: "For three events A, B, and C, P (Exactly one of A or B occurs) = P (Exactly one of B or C occurs) = P (Exactly one of C or A occurs) = 1/4 and P (All the three events occur simultaneously) = 1/16. Then the probability that at least one of the events occurs is:", 
     o: ["7/16", "7/64", "3/16", "7/32"], 
     a: 0,
     s: "P(A)+P(B)-2P(A∩B)=1/4\nP(B)+P(C)-2P(B∩C)=1/4\nP(C)+P(A)-2P(C∩A)=1/4\nAdding: 2[P(A)+P(B)+P(C)-P(A∩B)-P(B∩C)-P(C∩A)]=3/4\nP(A∪B∪C) = [P(A)+P(B)+P(C)-P(A∩B)-P(B∩C)-P(C∩A)] + P(A∩B∩C) = 3/8 + 1/16 = 7/16"},
     
    {q: "If two different numbers are taken from the set {0, 1, 2, 3, ……, 10}; then the probability that their sum, as well as absolute difference, are both multiples of 4, is:", 
     o: ["12/55", "14/45", "7/55", "6/55"], 
     a: 3,
     s: "Total ways = ¹¹C₂ = 55\nFavorable pairs: (0,4), (0,8), (4,8), (2,6), (2,10), (6,10)\nProbability = 6/55"},
     
    {q: "A bag contains 4 red and 6 black balls. A ball is drawn at random from the bag, its colour is observed and this ball along with two additional balls of the same colour are returned to the bag. If now a ball is drawn at random from the bag, then the probability that this drawn ball is red, is:", 
     o: ["1/5", "3/4", "3/10", "2/5"], 
     a: 3,
     s: "Case 1: First ball red (4/10), then bag has 6 red + 6 black\nCase 2: First ball black (6/10), then bag has 4 red + 8 black\nP(second red) = (4/10)×(6/12) + (6/10)×(4/12) = 1/5 + 1/5 = 2/5"},
     
    {q: "Let U₁ and U₂ be two urns such that U₁ contains 3 white and 2 red balls, and U₂ contains only 1 white ball. A fair coin is tossed. If head appears then 1 ball is drawn at random from U₁ and put into U₂. However, if tail appears then 2 balls are drawn at random from U₁ and put into U₂. Now 1 ball is drawn at random from U₂. Given that the drawn ball from U₂ is white, the probability that head appeared on the coin is", 
     o: ["17/23", "11/23", "15/23", "12/23"], 
     a: 3,
     s: "P(H|W) = [P(W|H)P(H)]/[P(W|H)P(H)+P(W|T)P(T)]\nP(W|H) = (3/5)×1 + (2/5)×(1/2) = 4/5\nP(W|T) = (³C₂/⁵C₂)×1 + (²C₂/⁵C₂)×(1/3) + (³C₁²C₁/⁵C₂)×(2/3) = 23/30\nP(H|W) = (4/5×1/2)/(4/5×1/2+23/30×1/2) = 12/23"},
     
    {q: "The probability of the drawn ball from U₂ being white is", 
     o: ["13/30", "23/30", "19/30", "11/30"], 
     a: 1,
     s: "P(W) = P(H,W) + P(T,W)\nP(H,W) = 1/2×[(3/5)×1 + (2/5)×(1/2)] = 2/5\nP(T,W) = 1/2×[(³C₂/⁵C₂)×1 + (²C₂/⁵C₂)×(1/3) + (³C₁²C₁/⁵C₂)×(2/3)] = 11/30\nP(W) = 2/5 + 11/30 = 23/30"},
     
    {q: "Four persons independently solve a certain problem correctly with probabilities 1/2, 3/4, 1/4, 1/8. Then the probability that the problem is solved correctly by at least one of them is", 
     o: ["235/256", "21/256", "3/256", "253/256"], 
     a: 0,
     s: "P(none solve) = (1/2)×(1/4)×(3/4)×(7/8) = 21/256\nP(at least one) = 1 - 21/256 = 235/256"},
     
    {q: "A seven-digit number is formed using the digit 3, 3, 4, 4, 4, 5, 5. The probability, that number so formed is divisible by 2, is:", 
     o: ["6/7", "4/7", "3/7", "1/7"], 
     a: 2,
     s: "Total numbers = 7!/(2!3!2!) = 210\nNumbers divisible by 2 (ends with 4) = 6!/(2!2!2!) = 90\nProbability = 90/210 = 3/7"}
],
    "Statistics": [
    {q: "The mean of n items is x̄. If the first term is increased by 1, the second by 2 and so on, then what is the new mean?", 
     o: ["x̄ + (n+1)/2", "x̄ + n/2", "x̄ + (n-1)/2", "x̄ + n"], 
     a: 0,
     s: "New mean = [1/n]Σ(xᵢ + i) = [1/n]Σxᵢ + [1/n]Σi = x̄ + [1/n]×[n(n+1)/2] = x̄ + (n+1)/2"},
     
    {q: "The average of n numbers x₁, x₂,……. xₙ is M. If xₙ is replaced by x′, then what is the new average?", 
     o: ["[nM - xₙ + x′]/n", "[nM + x′]/n", "[M - xₙ + x′]/n", "[nM - xₙ]/n"], 
     a: 0,
     s: "Original sum = nM\nNew sum = nM - xₙ + x′\nNew average = (nM - xₙ + x′)/n"},
     
    {q: "Mean of 100 observations is 45. It was later found that two observations 19 and 31 were incorrectly recorded as 91 and 13. The correct mean is", 
     o: ["44.46", "44.64", "45.46", "45.64"], 
     a: 0,
     s: "Original sum = 45×100 = 4500\nCorrect sum = 4500 - (91+13) + (19+31) = 4446\nCorrect mean = 4446/100 = 44.46"},
     
    {q: "The following data gives the distribution of the height of students. Height (in cm): 160,150,152,152,161,154,155 with frequencies: 12,8,4,4,3,3,7. What is the median of the distribution?", 
     o: ["154", "155", "156", "157"], 
     a: 1,
     s: "Arrange in order: 150(8),152(12),154(15),155(22),156(25),160(37),161(41)\nTotal 41 observations ⇒ median = 21st observation\nCumulative frequencies: 150(8),152(12),154(15),155(22) ⇒ 21st falls in 155 group"},
     
    {q: "The mean and S.D. of the marks of 200 candidates were found to be 40 and 15 respectively. Later, it was discovered that a score of 40 was wrongly read as 50. The correct mean and S.D. respectively are", 
     o: ["39.95, 14.98", "39.95, 15.02", "40.05, 14.98", "40.05, 15.02"], 
     a: 0,
     s: "Corrected sum = 40×200 - 50 + 40 = 7990\nCorrect mean = 7990/200 = 39.95\nOriginal Σx² = 200(15²+40²) = 365000\nCorrect Σx² = 365000 - 50² + 40² = 364100\nCorrect variance = 364100/200 - 39.95² = 224.5\nCorrect SD = √224.5 = 14.98"},
     
    {q: "Let r be the range and S² = 1/(n-1)Σ(xᵢ-x̄)² be the S.D. of a set of observations x₁, x₂,….. xₙ, then what is the condition for S?", 
     o: ["S ≤ r√(n/(n-1))", "S ≥ r√(n/(n-1))", "S ≤ r", "S ≥ r"], 
     a: 0,
     s: "Since (xᵢ-x̄)² ≤ r² for all i\nS² = 1/(n-1)Σ(xᵢ-x̄)² ≤ 1/(n-1)×n×r²\nS ≤ r√(n/(n-1))"},
     
    {q: "If a variable takes the discrete values α−4, α−7/2, α−5/2, α−3, α−2, α+1/2, α−1/2, α+5 (α>0), then the median is", 
     o: ["α−5/4", "α−1/2", "α+1/4", "α+5/4"], 
     a: 0,
     s: "Arrange: α−7/2, α−3, α−5/2, α−2, α−1/2, α+1/2, α−4, α+5\nSorted: α−7/2, α−3, α−5/2, α−2, α−1/2, α+1/2, α−4, α+5\nMedian = average of 4th and 5th = [α−2 + α−1/2]/2 = α−5/4"},
     
    {q: "The median of a set of 9 distinct observations is 20.5. If each of the largest 4 observations of the set is increased by 2, then the median of the new set is", 
     o: ["20.5", "22.5", "24.5", "unchanged"], 
     a: 0,
     s: "For 9 observations, median is the 5th observation\nIncreasing largest 4 observations (6th-9th) doesn't affect the 5th observation\nMedian remains 20.5"},
     
    {q: "Runs scored by a batsman in 10 innings are: 38, 70, 48, 34, 42, 55, 63, 46, 54, 44. The mean deviation is", 
     o: ["8.6", "9.6", "10.6", "11.6"], 
     a: 0,
     s: "Arrange: 34,38,42,44,46,48,54,55,63,70\nMedian = (46+48)/2 = 47\nMean deviation = (Σ|xᵢ-47|)/10 = (13+9+5+3+1+1+7+8+16+23)/10 = 86/10 = 8.6"}
 ]
};

const userProvidedChapterOneQuestions = [
    {q: "If A = {1, 2, 3, 4, 5}, number of ordered pairs (X, Y) such that X ⊆ Y ⊆ A is:",
     o: ["2^5", "3^5", "4^5", "5^3"],
     a: 1,
     s: "For each element of A, there are 3 choices: not in Y, in Y but not in X, or in both X and Y.\nSo total = 3^5 = 243."},
    {q: "If n(A) = 20, then number of subsets of A having an odd number of elements is:",
     o: ["2^19", "2^20", "2^18", "20!"],
     a: 0,
     s: "In a set of n elements, the number of even-cardinality subsets equals the number of odd-cardinality subsets.\nEach count is 2^(n-1). For n = 20, the answer is 2^19."},
    {q: "Let A, B ⊆ U. If n(A) = 40, n(B) = 50, and n(A ∪ B) = 70, then n(A ∩ B) is:",
     o: ["10", "15", "20", "25"],
     a: 2,
     s: "n(A ∪ B) = n(A) + n(B) - n(A ∩ B)\n70 = 40 + 50 - x\nx = 20."},
    {q: "For any two sets A, B, A Δ B means symmetric difference. If n(A) = 25, n(B) = 30, and n(A ∩ B) = 10, then n(A Δ B) is:",
     o: ["25", "35", "45", "55"],
     a: 1,
     s: "n(A Δ B) = n(A) + n(B) - 2n(A ∩ B)\n= 25 + 30 - 20 = 35."},
    {q: "If A ⊆ B, then which is always true?",
     o: ["A ∩ B = A", "A ∪ B = A", "A - B = B", "B - A = ∅"],
     a: 0,
     s: "Since all elements of A are already in B, the intersection A ∩ B gives A."},
    {q: "Number of subsets of {1, 2, ..., 10} containing exactly 3 even numbers is:",
     o: ["C(5,3) × 2^5", "C(10,3)", "C(5,3) × C(5,3)", "2^10"],
     a: 0,
     s: "There are 5 even numbers. Choose exactly 3 of them. The 5 odd numbers may be chosen freely.\nTotal = C(5,3) × 2^5."},
    {q: "Let A = {1, 2, 3, ..., 100}. Number of elements divisible by 2 or 3 is:",
     o: ["50", "67", "66", "83"],
     a: 1,
     s: "Numbers divisible by 2: 50\nNumbers divisible by 3: 33\nNumbers divisible by 6: 16\nBy inclusion-exclusion: 50 + 33 - 16 = 67."},
    {q: "Number of subsets of {1, 2, ..., 8} containing no two consecutive elements is:",
     o: ["21", "34", "55", "13"],
     a: 2,
     s: "The number of subsets of {1, ..., n} with no consecutive elements is F_(n+2).\nFor n = 8, the answer is F_10 = 55."},
    {q: "If A ∩ B = A ∪ B, then:",
     o: ["A = B", "A = ∅", "B = ∅", "A ⊂ B"],
     a: 0,
     s: "Intersection equals union only when both sets are identical. Hence A = B."},
    {q: "If A = {x ∈ R : |x - 2| < 3}, then A is:",
     o: ["(-1, 5)", "[-1, 5]", "(-∞, 5)", "(1, 5)"],
     a: 0,
     s: "|x - 2| < 3\n-3 < x - 2 < 3\n-1 < x < 5\nSo A = (-1, 5)."},
    {q: "Number of relations from a set A having 3 elements to a set B having 4 elements is:",
     o: ["2^12", "12", "3^4", "4^3"],
     a: 0,
     s: "A relation from A to B is any subset of A × B.\nn(A × B) = 3 × 4 = 12.\nSo the number of relations is 2^12."},
    {q: "Number of relations on a set of 4 elements is:",
     o: ["2^4", "2^8", "2^16", "4^16"],
     a: 2,
     s: "A relation on A is a subset of A × A.\nIf n(A) = 4, then n(A × A) = 4^2 = 16.\nSo total relations = 2^16."},
    {q: "Number of reflexive relations on a set of 5 elements is:",
     o: ["2^25", "2^20", "2^10", "5!"],
     a: 1,
     s: "A reflexive relation must contain all 5 diagonal pairs. The remaining 25 - 5 = 20 pairs are optional.\nSo the answer is 2^20."},
    {q: "Number of symmetric relations on a set of 4 elements is:",
     o: ["2^10", "2^16", "2^6", "4^4"],
     a: 0,
     s: "For a symmetric relation, diagonal pairs are chosen independently: 4 choices. Off-diagonal unordered pairs: C(4,2) = 6.\nTotal independent choices = 4 + 6 = 10, so the answer is 2^10."},
    {q: "Number of reflexive and symmetric relations on a set of 4 elements is:",
     o: ["2^6", "2^10", "2^12", "2^16"],
     a: 0,
     s: "Reflexive forces all 4 diagonal pairs. Only the off-diagonal unordered pairs are free.\nThere are C(4,2) = 6 such pairs, so the answer is 2^6."},
    {q: "Number of anti-symmetric relations on a set of 3 elements is:",
     o: ["2^3 × 3^3", "3^6", "2^9", "3^3"],
     a: 0,
     s: "Each diagonal pair has 2 choices. For each unordered off-diagonal pair {a, b}, the choices are none, (a,b), or (b,a).\nThere are C(3,2) = 3 such pairs. Answer = 2^3 × 3^3."},
    {q: "Relation R on integers is defined by aRb iff a - b is divisible by 7. Then R is:",
     o: ["Reflexive only", "Symmetric only", "Transitive only", "Equivalence relation"],
     a: 3,
     s: "Reflexive: a - a = 0, divisible by 7.\nSymmetric: if a - b is divisible by 7, then b - a is also divisible by 7.\nTransitive: if a - b and b - c are divisible by 7, then a - c is divisible by 7.\nHence R is an equivalence relation."},
    {q: "If a relation is symmetric and transitive, then it is always reflexive.",
     o: ["True", "False", "True only for finite sets", "True only for infinite sets"],
     a: 1,
     s: "False. The empty relation is symmetric and transitive, but it is not reflexive on a non-empty set."},
    {q: "Number of equivalence relations on a set of 3 elements is:",
     o: ["3", "4", "5", "6"],
     a: 2,
     s: "The number of equivalence relations equals the number of partitions of the set.\nFor 3 elements, the Bell number B_3 = 5."},
    {q: "Number of equivalence relations on a set of 4 elements is:",
     o: ["10", "12", "15", "16"],
     a: 2,
     s: "The number of equivalence relations equals the number of partitions of the set.\nFor 4 elements, the Bell number B_4 = 15."},
    {q: "Number of functions from a set of 4 elements to a set of 3 elements is:",
     o: ["3^4", "4^3", "12", "7"],
     a: 0,
     s: "Each of the 4 domain elements has 3 choices in the codomain.\nSo the number of functions is 3^4 = 81."},
    {q: "Number of one-one functions from a set of 3 elements to a set of 5 elements is:",
     o: ["5^3", "3^5", "5P3", "3P5"],
     a: 2,
     s: "For an injective function, assign distinct images to the 3 domain elements from 5 codomain elements.\nNumber = 5P3 = 5 × 4 × 3 = 60."},
    {q: "Number of onto functions from a set of 4 elements to a set of 3 elements is:",
     o: ["36", "24", "18", "81"],
     a: 0,
     s: "Using inclusion-exclusion:\n3^4 - C(3,1)2^4 + C(3,2)1^4\n= 81 - 48 + 3 = 36."},
    {q: "Number of bijections from a set of 6 elements to itself is:",
     o: ["6^6", "6!", "2^6", "36"],
     a: 1,
     s: "A bijection from a finite set to itself is a permutation.\nSo the number of bijections is 6!."},
    {q: "If f: R → R, f(x) = x^3 + x, then f is:",
     o: ["One-one but not onto", "Onto but not one-one", "Bijective", "Neither one-one nor onto"],
     a: 2,
     s: "f'(x) = 3x^2 + 1 > 0, so f is strictly increasing and hence one-one.\nAlso, its range is R, so it is onto. Therefore f is bijective."},
    {q: "If f(x) = x^2, f: R → R, then f is:",
     o: ["One-one and onto", "One-one but not onto", "Onto but not one-one", "Neither one-one nor onto"],
     a: 3,
     s: "It is not one-one because f(2) = f(-2) = 4.\nIt is not onto R because negative real numbers are not obtained.\nHence it is neither one-one nor onto."},
    {q: "Domain of f(x) = sqrt((x - 1)/(x + 2)) is:",
     o: ["(-∞, -2) ∪ [1, ∞)", "(-∞, -2] ∪ [1, ∞)", "(-2, 1)", "R"],
     a: 0,
     s: "Need (x - 1)/(x + 2) ≥ 0 and x ≠ -2.\nCritical points are -2 and 1.\nThe expression is non-negative on (-∞, -2) ∪ [1, ∞)."},
    {q: "Range of f(x) = |x - 1| + |x + 2| is:",
     o: ["[0, ∞)", "[3, ∞)", "(3, ∞)", "[1, ∞)"],
     a: 1,
     s: "This is the sum of distances from 1 and -2.\nThe minimum possible distance is 1 - (-2) = 3.\nSo the range is [3, ∞)."},
    {q: "If f(x) = (x + 1)/(x - 1), then f inverse(x) is:",
     o: ["(x + 1)/(x - 1)", "(x - 1)/(x + 1)", "(1 - x)/(1 + x)", "x/(x - 1)"],
     a: 0,
     s: "Let y = (x + 1)/(x - 1).\ny(x - 1) = x + 1\nx(y - 1) = y + 1\nx = (y + 1)/(y - 1)\nSo the inverse is the same function."},
    {q: "If f(x + y) = f(x) + f(y) and f is continuous, then:",
     o: ["f(x) = kx", "f(x) = x^2", "f(x) = e^x", "f(x) = log x"],
     a: 0,
     s: "Continuous additive functions are linear.\nTherefore f(x) = kx."},
    {q: "If f(x + y) = f(x)f(y), f(0) ≠ 0, then f(0) is:",
     o: ["0", "1", "-1", "2"],
     a: 1,
     s: "Put x = 0 and y = 0:\nf(0) = f(0)^2.\nSince f(0) ≠ 0, divide by f(0) to get f(0) = 1."},
    {q: "If f(x) = ax + b and f(f(x)) = x, then:",
     o: ["a = 1, b = 0 only", "a = -1, any b", "Both A and B", "No solution"],
     a: 2,
     s: "f(f(x)) = a(ax + b) + b = a^2x + ab + b.\nComparing with x gives a^2 = 1 and b(a + 1) = 0.\nSo either a = 1, b = 0, or a = -1 with any b."},
    {q: "If f: R → R, f(x) = x^3 - 3x, then f is:",
     o: ["One-one", "Onto", "Bijective", "Neither one-one nor onto"],
     a: 1,
     s: "A cubic polynomial of odd degree has range R, so it is onto.\nIt is not one-one because it has turning points."},
    {q: "If f is even and g is odd, then fg is:",
     o: ["Even", "Odd", "Neither", "Constant"],
     a: 1,
     s: "(fg)(-x) = f(-x)g(-x) = f(x)(-g(x)) = -f(x)g(x).\nSo fg is odd."},
    {q: "If f and g are both odd functions, then f + g is:",
     o: ["Even", "Odd", "Neither", "Cannot say"],
     a: 1,
     s: "(f + g)(-x) = f(-x) + g(-x) = -f(x) - g(x) = -(f(x) + g(x)).\nSo f + g is odd."},
    {q: "Let f(x) = 1/x. Then f(f(x)) is:",
     o: ["x", "1/x", "x^2", "-x"],
     a: 0,
     s: "f(f(x)) = f(1/x) = x."},
    {q: "If f: {1, 2, 3} → {1, 2, 3} and f(f(x)) = x, number of such functions is:",
     o: ["3", "4", "5", "6"],
     a: 1,
     s: "Such functions are involutions.\nOn 3 elements: identity gives 1 function, and one transposition with one fixed point gives C(3,2) = 3 functions.\nTotal = 4."},
    {q: "If f: A → A, where A has 3 elements, and f(f(x)) = f(x), number of such functions is:",
     o: ["10", "12", "15", "18"],
     a: 0,
     s: "These are idempotent functions. Choose an image set of size k; elements in the image must be fixed.\nTotal = C(3,1)1^2 + C(3,2)2^1 + C(3,3)3^0 = 3 + 6 + 1 = 10."},
    {q: "Number of onto functions from a 5-element set to a 3-element set is:",
     o: ["150", "180", "210", "243"],
     a: 0,
     s: "Using inclusion-exclusion:\n3^5 - C(3,1)2^5 + C(3,2)1^5\n= 243 - 96 + 3 = 150."},
    {q: "Number of bijections from A to B, where n(A) = n(B) = 5, is:",
     o: ["25", "120", "625", "32"],
     a: 1,
     s: "The number of bijections between two 5-element sets is 5! = 120."},
    {q: "Let f(x) = ln x. Domain and range are:",
     o: ["R, R", "(0, ∞), R", "R, (0, ∞)", "(0, ∞), (0, ∞)"],
     a: 1,
     s: "The logarithm is defined for positive x only, and it can take all real values.\nSo domain = (0, ∞), range = R."},
    {q: "Let f(x) = e^x. Then f: R → R is:",
     o: ["One-one but not onto", "Onto but not one-one", "Bijective", "Neither"],
     a: 0,
     s: "e^x is strictly increasing, so it is one-one.\nIts range is (0, ∞), not all real numbers, so it is not onto R."},
    {q: "If f(x) = x + 1/x, x > 0, then range is:",
     o: ["(-∞, ∞)", "[2, ∞)", "(0, ∞)", "(-∞, -2] ∪ [2, ∞)"],
     a: 1,
     s: "By AM-GM, x + 1/x ≥ 2 for x > 0.\nThe minimum value is 2, so the range is [2, ∞)."},
    {q: "If f(x) = x^2 + 2x + 5, then range is:",
     o: ["[4, ∞)", "[5, ∞)", "(-∞, 4]", "R"],
     a: 0,
     s: "f(x) = x^2 + 2x + 5 = (x + 1)^2 + 4.\nMinimum value is 4, so the range is [4, ∞)."},
    {q: "If f(x) = (x - 2)/(x + 3), then domain is:",
     o: ["R", "R - {-3}", "R - {2}", "(0, ∞)"],
     a: 1,
     s: "The denominator cannot be zero.\nx + 3 ≠ 0, so x ≠ -3.\nDomain = R - {-3}."},
    {q: "If f(x) = sqrt(4 - x^2), then domain is:",
     o: ["[-2, 2]", "(-∞, ∞)", "[0, 2]", "(2, ∞)"],
     a: 0,
     s: "Need 4 - x^2 ≥ 0.\nSo x^2 ≤ 4, giving -2 ≤ x ≤ 2.\nDomain = [-2, 2]."},
    {q: "If f(x) = sqrt(x - 1) + sqrt(5 - x), then domain is:",
     o: ["[1, 5]", "(1, 5)", "(-∞, 1]", "[5, ∞)"],
     a: 0,
     s: "Need x - 1 ≥ 0 and 5 - x ≥ 0.\nSo x ≥ 1 and x ≤ 5.\nDomain = [1, 5]."},
    {q: "Let f(x) = |x| + |x - 2|. Range is:",
     o: ["[0, ∞)", "[2, ∞)", "(2, ∞)", "[1, ∞)"],
     a: 1,
     s: "It is the sum of distances from 0 and 2.\nThe minimum distance is 2, so the range is [2, ∞)."},
    {q: "If f(x) = (2x + 3)/(x - 4), then f inverse(x) is:",
     o: ["(4x + 3)/(x - 2)", "(4x + 3)/(x + 2)", "(3 - 4x)/(x - 2)", "(x - 4)/(2x + 3)"],
     a: 0,
     s: "Let y = (2x + 3)/(x - 4).\ny(x - 4) = 2x + 3\nxy - 4y = 2x + 3\nx(y - 2) = 4y + 3\nx = (4y + 3)/(y - 2).\nSo f inverse(x) = (4x + 3)/(x - 2)."},
    {q: "If f(x + y) = f(x) + f(y) + 2xy, and f(0) = 0, then a possible function is:",
     o: ["f(x) = x^2", "f(x) = 2x", "f(x) = e^x", "f(x) = ln x"],
     a: 0,
     s: "Check f(x) = x^2:\nf(x + y) = (x + y)^2 = x^2 + y^2 + 2xy = f(x) + f(y) + 2xy.\nSo f(x) = x^2 works."}
];

chapters["Sets, Relations, and Functions"].push(...userProvidedChapterOneQuestions);

const generatedQuestionExtensions = {
    "Sets, Relations, and Functions": [
        {q: "Let A = {1, 2, 3, 4}. A relation R on A is defined by aRb if a divides b. The number of ordered pairs in R is",
         o: ["7", "8", "9", "10"],
         a: 1,
         s: "For a = 1, there are 4 choices of b. For a = 2, b can be 2 or 4. For a = 3, b = 3. For a = 4, b = 4. Total = 4 + 2 + 1 + 1 = 8."},
        {q: "If f(x) = (2x - 3)/(x + 1), x != -1, then f inverse(x) is",
         o: ["(x + 3)/(2 - x)", "(x - 3)/(x + 2)", "(2x + 3)/(1 - x)", "(x + 2)/(3 - x)"],
         a: 0,
         s: "Let y = (2x - 3)/(x + 1). Then yx + y = 2x - 3, so x(y - 2) = -(y + 3). Hence x = (y + 3)/(2 - y)."},
        {q: "The range of f(x) = x^2 - 4x + 7 for real x is",
         o: ["[2, infinity)", "[3, infinity)", "(-infinity, 3]", "All real numbers"],
         a: 1,
         s: "f(x) = (x - 2)^2 + 3. The minimum value is 3, so the range is [3, infinity)."},
        {q: "The number of onto functions from a set of 4 elements to a set of 2 elements is",
         o: ["12", "14", "16", "18"],
         a: 1,
         s: "Total functions = 2^4 = 16. Two constant functions are not onto. Hence onto functions = 16 - 2 = 14."},
        {q: "For real x, the range of g(x) = x/(1 + |x|) is",
         o: ["[-1, 1]", "(-1, 1)", "[0, 1)", "(-infinity, infinity)"],
         a: 1,
         s: "As x tends to infinity, g(x) approaches 1 but never equals it. As x tends to -infinity, it approaches -1 but never equals it. The range is (-1, 1)."}
    ],
    "Complex Numbers and Quadratic Equations": [
        {q: "If z = 1 + i, then the real part of z^6 is",
         o: ["-8", "0", "8", "16"],
         a: 1,
         s: "(1 + i)^2 = 2i and (1 + i)^4 = -4. Therefore (1 + i)^6 = -4 * 2i = -8i, whose real part is 0."},
        {q: "If alpha and beta are the roots of x^2 - 2x + 5 = 0, then alpha^2 + beta^2 equals",
         o: ["-6", "-4", "4", "6"],
         a: 0,
         s: "alpha + beta = 2 and alpha beta = 5. Thus alpha^2 + beta^2 = (alpha + beta)^2 - 2 alpha beta = 4 - 10 = -6."},
        {q: "The locus of z = x + iy satisfying |z - 2| = |z + 4| is",
         o: ["x = -1", "x = 1", "y = -1", "y = 1"],
         a: 0,
         s: "The point is equidistant from 2 and -4 on the real axis. So it lies on the perpendicular bisector of the segment joining them, x = -1."},
        {q: "If z = cos theta + i sin theta, then z^5 + z^(-5) is equal to",
         o: ["2 cos 5 theta", "2 sin 5 theta", "cos theta", "sin theta"],
         a: 0,
         s: "By De Moivre theorem, z^5 = cos 5 theta + i sin 5 theta and z^(-5) = cos 5 theta - i sin 5 theta. Sum = 2 cos 5 theta."},
        {q: "For the quadratic equation x^2 + (k - 2)x + 1 = 0 to have equal roots, k is",
         o: ["0 only", "4 only", "0 or 4", "-4 or 0"],
         a: 2,
         s: "Equal roots require discriminant 0. So (k - 2)^2 - 4 = 0, giving k - 2 = +-2. Hence k = 0 or 4."}
    ],
    "Permutations and Combinations": [
        {q: "The number of distinct arrangements of the letters of the word BANANA is",
         o: ["30", "60", "90", "120"],
         a: 1,
         s: "BANANA has 6 letters with A repeated 3 times and N repeated 2 times. Distinct arrangements = 6!/(3!2!) = 60."},
        {q: "A committee of 5 is to be selected from 7 men and 5 women. If the committee must contain at least 2 women, the number of ways is",
         o: ["560", "596", "616", "630"],
         a: 1,
         s: "Choose w women where w = 2, 3, 4, 5. Total = C(5,2)C(7,3) + C(5,3)C(7,2) + C(5,4)C(7,1) + C(5,5)C(7,0) = 350 + 210 + 35 + 1 = 596."},
        {q: "The number of 4 digit even numbers formed using digits 0, 1, 2, 3, 4, 5 without repetition is",
         o: ["144", "150", "156", "180"],
         a: 2,
         s: "If unit digit is 0, first three places can be filled in P(5,3) = 60 ways. If unit digit is 2 or 4, thousands place has 4 choices and the middle two places have P(4,2) choices, giving 2 * 4 * 12 = 96. Total = 156."},
        {q: "The number of diagonals in a polygon of 12 sides is",
         o: ["48", "54", "60", "66"],
         a: 1,
         s: "Number of diagonals of an n-sided polygon is n(n - 3)/2. For n = 12, it is 12 * 9 / 2 = 54."},
        {q: "In how many ways can 5 boys and 3 girls be seated in a row if no two girls sit together?",
         o: ["7200", "10800", "14400", "17280"],
         a: 2,
         s: "Arrange 5 boys in 5! ways. This creates 6 gaps. Choose 3 gaps for girls and arrange them in 3! ways. Total = 5! * C(6,3) * 3! = 14400."}
    ],
    "Binomial Theorem": [
        {q: "The coefficient of x^4 in (1 + 2x)^6 is",
         o: ["120", "180", "240", "360"],
         a: 2,
         s: "The x^4 term is C(6,4)(2x)^4 = 15 * 16 x^4. Coefficient = 240."},
        {q: "The middle term in the expansion of (x + 1/x)^10 is",
         o: ["210", "252", "300", "420"],
         a: 1,
         s: "There are 11 terms, so the middle term is the 6th term. It equals C(10,5)x^5(1/x)^5 = C(10,5) = 252."},
        {q: "The coefficient of x^7 in (1 + x)^8(1 + x^2)^4 is",
         o: ["568", "592", "600", "624"],
         a: 2,
         s: "We need r + 2s = 7. Sum C(8,r)C(4,s) over s = 0,1,2,3 gives 8 + 224 + 336 + 32 = 600."},
        {q: "If the coefficients of x^r and x^(r+1) in (1 + x)^15 are equal, then r is",
         o: ["6", "7", "8", "9"],
         a: 1,
         s: "C(15,r) = C(15,r+1). Equal adjacent coefficients occur at the middle, so r = 7."}
    ],
    "Sequences and Series": [
        {q: "In an AP, the 5th term is 14 and the 12th term is 35. The sum of the first 20 terms is",
         o: ["590", "600", "610", "620"],
         a: 2,
         s: "a + 4d = 14 and a + 11d = 35, so d = 3 and a = 2. Sum of 20 terms = 20/2[2a + 19d] = 10(4 + 57) = 610."},
        {q: "The first term of a GP is 3 and common ratio is 2. If the sum of first n terms is 189, then n is",
         o: ["5", "6", "7", "8"],
         a: 1,
         s: "Sum = 3(2^n - 1)/(2 - 1) = 189. Hence 2^n - 1 = 63, so 2^n = 64 and n = 6."},
        {q: "The value of 1*2 + 2*3 + 3*4 + ... + 10*11 is",
         o: ["420", "440", "460", "480"],
         a: 1,
         s: "Sum k(k+1) from k = 1 to 10 is sum k^2 + sum k = 385 + 55 = 440."},
        {q: "If 2, x, 18 are consecutive terms of a GP and x is positive, then x is",
         o: ["4", "6", "8", "9"],
         a: 1,
         s: "For three consecutive GP terms, x^2 = 2 * 18 = 36. Since x is positive, x = 6."},
        {q: "For the sequence a_n = 3n - 2, the sum of the first 25 terms is",
         o: ["875", "900", "925", "950"],
         a: 2,
         s: "a_1 = 1 and a_25 = 73. Sum = 25/2(1 + 73) = 925."}
    ],
    "Limits and Derivatives": [
        {q: "The value of lim x->0 sin(5x)/sin(2x) is",
         o: ["2/5", "5/2", "1", "0"],
         a: 1,
         s: "Using sin ax ~ ax as x tends to 0, the limit is 5x/2x = 5/2."},
        {q: "If y = x^x for x > 0, then dy/dx is",
         o: ["x^x", "x^(x-1)", "x^x(log x + 1)", "x^x/log x"],
         a: 2,
         s: "Taking log, log y = x log x. Differentiating gives y'/y = log x + 1. Hence y' = x^x(log x + 1)."},
        {q: "If y = log(x^2 + 1), then y'(1) equals",
         o: ["1/2", "1", "2", "4"],
         a: 1,
         s: "y' = 2x/(x^2 + 1). At x = 1, y' = 2/2 = 1."},
        {q: "The value of lim x->2 (x^2 - 4)/(x - 2) is",
         o: ["2", "3", "4", "5"],
         a: 2,
         s: "(x^2 - 4)/(x - 2) = (x - 2)(x + 2)/(x - 2) = x + 2. At x = 2, the value is 4."},
        {q: "The derivative of tan inverse(3x) at x = 0 is",
         o: ["1", "2", "3", "9"],
         a: 2,
         s: "d/dx tan inverse(3x) = 3/(1 + 9x^2). At x = 0, this is 3."},
        {q: "The slope of the curve y = x^3 - 3x at x = 2 is",
         o: ["6", "7", "8", "9"],
         a: 3,
         s: "dy/dx = 3x^2 - 3. At x = 2, slope = 12 - 3 = 9."}
    ],
    "Trigonometry": [
        {q: "If tan theta = 3/4 and theta is acute, then sin 2 theta is",
         o: ["7/25", "12/25", "24/25", "25/24"],
         a: 2,
         s: "sin 2 theta = 2 tan theta/(1 + tan^2 theta) = 2(3/4)/(1 + 9/16) = (3/2)/(25/16) = 24/25."},
        {q: "The number of solutions of sin x = 1/2 in [0, 2pi] is",
         o: ["1", "2", "3", "4"],
         a: 1,
         s: "In [0, 2pi], sin x = 1/2 at x = pi/6 and x = 5pi/6. There are 2 solutions."},
        {q: "The value of cos 75 degrees is",
         o: ["(sqrt(6) - sqrt(2))/4", "(sqrt(6) + sqrt(2))/4", "(sqrt(3) - 1)/2", "(sqrt(3) + 1)/2"],
         a: 0,
         s: "cos 75 = cos(45 + 30) = cos45 cos30 - sin45 sin30 = (sqrt(6) - sqrt(2))/4."},
        {q: "If A + B = pi/2, then tan A tan B is",
         o: ["0", "1", "-1", "tan(A - B)"],
         a: 1,
         s: "Since B = pi/2 - A, tan B = cot A. Therefore tan A tan B = tan A cot A = 1."}
    ],
    "Coordinate Geometry": [
        {q: "The distance of the point (3, 4) from the line 3x + 4y - 10 = 0 is",
         o: ["2", "3", "4", "5"],
         a: 1,
         s: "Distance = |3*3 + 4*4 - 10|/sqrt(3^2 + 4^2) = |15|/5 = 3."},
        {q: "The slope of a line perpendicular to 2x - 3y + 5 = 0 is",
         o: ["2/3", "-2/3", "3/2", "-3/2"],
         a: 3,
         s: "The given line has slope 2/3. A perpendicular line has slope -3/2."},
        {q: "The equation of the circle with centre (1, -2) and radius 5 is",
         o: ["(x - 1)^2 + (y + 2)^2 = 25", "(x + 1)^2 + (y - 2)^2 = 25", "(x - 1)^2 + (y - 2)^2 = 5", "(x + 1)^2 + (y + 2)^2 = 5"],
         a: 0,
         s: "A circle with centre (h, k) and radius r has equation (x - h)^2 + (y - k)^2 = r^2. Here h = 1, k = -2, r = 5."},
        {q: "The area of the triangle with vertices (0,0), (4,0), and (0,3) is",
         o: ["5", "6", "7", "12"],
         a: 1,
         s: "The triangle is right angled with base 4 and height 3. Area = 1/2 * 4 * 3 = 6."}
    ],
    "Three-Dimensional Geometry": [
        {q: "The distance between the points (1, 2, 3) and (4, 6, 3) is",
         o: ["4", "5", "6", "7"],
         a: 1,
         s: "Distance = sqrt((4 - 1)^2 + (6 - 2)^2 + (3 - 3)^2) = sqrt(9 + 16) = 5."},
        {q: "Direction cosines of the vector 2i - j + 2k are",
         o: ["(2/3, -1/3, 2/3)", "(1/3, 2/3, 2/3)", "(2/5, -1/5, 2/5)", "(2, -1, 2)"],
         a: 0,
         s: "Magnitude of 2i - j + 2k is sqrt(4 + 1 + 4) = 3. Direction cosines are 2/3, -1/3, 2/3."},
        {q: "If a = i + 2j + 2k and b = 2i - j + 2k, then a dot b is",
         o: ["2", "4", "6", "8"],
         a: 1,
         s: "a dot b = 1*2 + 2*(-1) + 2*2 = 2 - 2 + 4 = 4."},
        {q: "The angle between vectors i + j and i - j is",
         o: ["0 degrees", "45 degrees", "90 degrees", "180 degrees"],
         a: 2,
         s: "Their dot product is 1*1 + 1*(-1) = 0. Hence the vectors are perpendicular and the angle is 90 degrees."}
    ],
    "Probability": [
        {q: "Two fair dice are thrown. The probability that the sum is 9 is",
         o: ["1/12", "1/9", "1/6", "2/9"],
         a: 1,
         s: "Sum 9 occurs in 4 outcomes: (3,6), (4,5), (5,4), (6,3). Probability = 4/36 = 1/9."},
        {q: "One card is drawn from a standard deck. The probability that it is an ace or a king is",
         o: ["1/13", "2/13", "3/13", "4/13"],
         a: 1,
         s: "There are 4 aces and 4 kings, so favourable cards = 8. Probability = 8/52 = 2/13."},
        {q: "A bag has 3 red and 2 blue balls. Two balls are drawn without replacement. The probability that both are red is",
         o: ["1/5", "3/10", "2/5", "1/2"],
         a: 1,
         s: "Probability = C(3,2)/C(5,2) = 3/10."},
        {q: "If P(A) = 0.5, P(B) = 0.4 and P(A intersection B) = 0.2, then P(A union B) is",
         o: ["0.5", "0.6", "0.7", "0.9"],
         a: 2,
         s: "P(A union B) = P(A) + P(B) - P(A intersection B) = 0.5 + 0.4 - 0.2 = 0.7."}
    ],
    "Statistics": [
        {q: "The mean of 2, 4, 6, 8, 10 is",
         o: ["5", "6", "7", "8"],
         a: 1,
         s: "Mean = (2 + 4 + 6 + 8 + 10)/5 = 30/5 = 6."},
        {q: "The median of 5, 1, 9, 3, 7 is",
         o: ["3", "5", "7", "9"],
         a: 1,
         s: "Arranging the data gives 1, 3, 5, 7, 9. The middle value is 5."},
        {q: "The variance of the data 2, 2, 4, 4 is",
         o: ["0", "1", "2", "4"],
         a: 1,
         s: "Mean = 3. Squared deviations are 1, 1, 1, 1. Variance = 4/4 = 1."},
        {q: "The mode of 1, 2, 2, 3, 3, 3, 4 is",
         o: ["1", "2", "3", "4"],
         a: 2,
         s: "Mode is the value with the highest frequency. Here 3 occurs three times, more than any other value."}
    ]
};

Object.entries(generatedQuestionExtensions).forEach(([chapterName, questions]) => {
    if (!chapters[chapterName]) chapters[chapterName] = [];
    chapters[chapterName].push(...questions);
});

const HARD_QUESTIONS_PER_CHAPTER = 120;

function hardQuestion(questionText, correctValue, distractorValues, solutionText) {
    const { o, a } = makeTextOptions(correctValue, distractorValues);
    return {
        q: `[Hard] ${questionText}`,
        o,
        a,
        s: solutionText,
        difficulty: 'hard',
        generatedHard: true
    };
}

function hardFactorial(n) {
    let value = 1;
    for (let i = 2; i <= n; i++) value *= i;
    return value;
}

function hardNPr(n, r) {
    if (r < 0 || r > n) return 0;
    let value = 1;
    for (let i = 0; i < r; i++) value *= n - i;
    return value;
}

function hardSum(values) {
    return values.reduce((sum, value) => sum + value, 0);
}

function hardPowerText(base, exponent) {
    return `${base}^${exponent}`;
}

function hardSqrtText(value) {
    return Number.isInteger(Math.sqrt(value)) ? String(Math.sqrt(value)) : `√${value}`;
}

function hardLineText(a, b, c) {
    const yPart = `${b < 0 ? '-' : '+'} ${Math.abs(b)}y`;
    const cPart = c === 0 ? '' : ` ${c < 0 ? '-' : '+'} ${Math.abs(c)}`;
    return `${a}x ${yPart}${cPart} = 0`;
}

function hardPlaneText(a, b, c, d) {
    const yPart = `${b < 0 ? '-' : '+'} ${Math.abs(b)}y`;
    const zPart = `${c < 0 ? '-' : '+'} ${Math.abs(c)}z`;
    const dPart = d === 0 ? '' : ` ${d < 0 ? '-' : '+'} ${Math.abs(d)}`;
    return `${a}x ${yPart} ${zPart}${dPart} = 0`;
}

function hardCoeffProductLinear(n, a, m, b, target) {
    let coefficient = 0;
    for (let r = 0; r <= n; r++) {
        const s = target - r;
        if (s >= 0 && s <= m) {
            coefficient += nCr(n, r) * Math.pow(a, r) * nCr(m, s) * Math.pow(b, s);
        }
    }
    return coefficient;
}

function hardCoeffTrinomial(power, target) {
    let coefficient = 0;
    for (let twos = 0; twos <= Math.floor(target / 2); twos++) {
        const ones = target - 2 * twos;
        if (ones + twos <= power) {
            coefficient += nCr(power, twos) * nCr(power - twos, ones);
        }
    }
    return coefficient;
}

function hardDerangement(n) {
    let value = 0;
    for (let k = 0; k <= n; k++) {
        value += (k % 2 === 0 ? 1 : -1) * hardFactorial(n) / hardFactorial(k);
    }
    return Math.round(value);
}

function hardDiceCount(predicate) {
    let count = 0;
    for (let d1 = 1; d1 <= 6; d1++) {
        for (let d2 = 1; d2 <= 6; d2++) {
            if (predicate(d1, d2)) count++;
        }
    }
    return count;
}

function hardCombinedVariance(n1, mean1, var1, n2, mean2, var2) {
    const mean = (n1 * mean1 + n2 * mean2) / (n1 + n2);
    return (n1 * (var1 + Math.pow(mean1 - mean, 2)) + n2 * (var2 + Math.pow(mean2 - mean, 2))) / (n1 + n2);
}

const hardQuestionFactories = {
    "Sets, Relations, and Functions": [
        (k) => {
            const a = 40 + k, b = 52 + 2 * k, c = 61 + k;
            const ab = 9 + (k % 7), bc = 11 + ((2 * k) % 7), ca = 8 + ((3 * k) % 7), abc = 3 + (k % 4);
            const union = a + b + c - ab - bc - ca + abc;
            return hardQuestion(
                `If n(A)=${a}, n(B)=${b}, n(C)=${c}, n(A∩B)=${ab}, n(B∩C)=${bc}, n(C∩A)=${ca}, and n(A∩B∩C)=${abc}, find n(A∪B∪C).`,
                union,
                [union - abc, union + ab, union - bc],
                `Use inclusion-exclusion: n(A∪B∪C)=n(A)+n(B)+n(C)-n(A∩B)-n(B∩C)-n(C∩A)+n(A∩B∩C)=${union}.`
            );
        },
        (k) => {
            const m = 5 + (k % 5);
            const count = Math.pow(3, m) - 3 * Math.pow(2, m) + 3;
            return hardQuestion(
                `The number of onto functions from a set of ${m} elements to a set of 3 elements is`,
                count,
                [Math.pow(3, m), count + 3 * Math.pow(2, m), count - 3],
                `By inclusion-exclusion, onto functions = 3^${m} - C(3,1)2^${m} + C(3,2)1^${m} = ${count}.`
            );
        },
        (k) => {
            const n = 5 + (k % 4);
            const freePairs = n * (n - 1) / 2;
            return hardQuestion(
                `The number of relations on an ${n}-element set that are both reflexive and symmetric is`,
                hardPowerText(2, freePairs),
                [hardPowerText(2, n * n), hardPowerText(2, freePairs + n), hardPowerText(2, n)],
                `Reflexive fixes all diagonal pairs. Symmetry leaves one free choice for each unordered off-diagonal pair, C(${n},2)=${freePairs}. Hence the count is 2^${freePairs}.`
            );
        },
        (k) => {
            const lowerBreak = -2 - k;
            const upperBreak = 3 + k;
            return hardQuestion(
                `The domain of f(x)=sqrt((x-${upperBreak})/(x-${lowerBreak})) is`,
                `(-∞, ${lowerBreak}) ∪ [${upperBreak}, ∞)`,
                [`(-∞, ${lowerBreak}] ∪ [${upperBreak}, ∞)`, `(${lowerBreak}, ${upperBreak})`, `[${lowerBreak}, ${upperBreak}]`],
                `The radicand must be non-negative and the denominator cannot be zero. A sign chart around ${lowerBreak} and ${upperBreak} gives (-∞, ${lowerBreak}) ∪ [${upperBreak}, ∞).`
            );
        },
        (k) => {
            const n = 4 + (k % 3);
            let count = 0;
            for (let r = 1; r <= n; r++) count += nCr(n, r) * Math.pow(r, n - r);
            return hardQuestion(
                `If A has ${n} elements, the number of functions f:A→A satisfying f(f(x))=f(x) for every x∈A is`,
                count,
                [count + nCr(n, 2), Math.pow(n, n), count - n],
                `Such functions are idempotent. Choose an image set of size r, fix every image element, and map the remaining ${n}-r elements into the image: Σ C(${n},r)r^(${n}-r) = ${count}.`
            );
        },
        (k) => {
            const a = 2 + k, b = k + 3, d = k + 4;
            return hardQuestion(
                `If f(x)=(${a}x+${b})/(x+${d}), then f⁻¹(x) is`,
                `(${d}x - ${b})/(${a} - x)`,
                [`(${d}x + ${b})/(${a} - x)`, `(${a}x - ${b})/(${d} - x)`, `(${d}x - ${b})/(x - ${a})`],
                `Let y=(${a}x+${b})/(x+${d}). Then y(x+${d})=${a}x+${b}, so x(y-${a})=${b}-${d}y. Hence x=(${d}y-${b})/(${a}-y).`
            );
        }
    ],
    "Complex Numbers and Quadratic Equations": [
        (k) => {
            const sum = 5 + k, product = 4 + k;
            const value = Math.pow(sum, 3) - 3 * product * sum;
            return hardQuestion(
                `If α and β are roots of x²-${sum}x+${product}=0, then α³+β³ equals`,
                value,
                [value + product, value - sum, Math.pow(sum, 3)],
                `α+β=${sum}, αβ=${product}. Therefore α³+β³=(α+β)³-3αβ(α+β)=${sum}³-3(${product})(${sum})=${value}.`
            );
        },
        (k) => {
            const t = 3 + k;
            const value = t * t - 2;
            return hardQuestion(
                `If z+1/z=${t}, then z²+1/z² is`,
                value,
                [value + 2, value - 2, t * t],
                `Square z+1/z=${t}: z²+2+1/z²=${t * t}. Hence z²+1/z²=${value}.`
            );
        },
        (k) => {
            const m = 2 + (k % 6);
            const n = 4 * m;
            const value = Math.pow(-4, m);
            return hardQuestion(
                `The real part of (1+i)^${n} is`,
                value,
                [-value, 0, value / 2],
                `(1+i)^4=-4, so (1+i)^${n}=((-4))^${m}=${value}, which is real.`
            );
        },
        (k) => {
            const p = k, q = 2 + (k % 3), r = p + 4, s = q - 2;
            const a = 2 * (r - p), b = 2 * (s - q), c = p * p + q * q - r * r - s * s;
            const line = hardLineText(a, b, c);
            return hardQuestion(
                `The locus of z=x+iy satisfying |z-(${p}+${q}i)|=|z-(${r}+${s}i)| is`,
                line,
                [hardLineText(a, -b, c), hardLineText(a, b, -c), hardLineText(b, a, c)],
                `Equating squared distances gives 2(${r}-${p})x + 2(${s}-${q})y + (${p}²+${q}²-${r}²-${s}²)=0, which simplifies to ${line}.`
            );
        },
        (k) => {
            const h = 3 + k, v = 4 + (k % 4), r = 2 + (k % 3);
            const centerDistance = h * h + v * v;
            return hardQuestion(
                `If |z-(${h}+${v}i)|=${r}, the maximum value of |z| is`,
                `${hardSqrtText(centerDistance)} + ${r}`,
                [`${hardSqrtText(centerDistance)} - ${r}`, hardSqrtText(centerDistance), `${hardSqrtText(centerDistance + r * r)}`],
                `The circle has centre distance |${h}+${v}i|=${hardSqrtText(centerDistance)} from the origin and radius ${r}. Maximum |z| = centre distance + radius.`
            );
        },
        (k) => {
            const sum = 6 + k, product = 5 + 2 * k;
            const value = sum * sum - 2 * product;
            return hardQuestion(
                `If α and β are the roots of a quadratic with α+β=${sum} and αβ=${product}, then α²+β² is`,
                value,
                [value + product, value - product, sum * sum],
                `α²+β²=(α+β)²-2αβ=${sum}²-2(${product})=${value}.`
            );
        }
    ],
    "Permutations and Combinations": [
        (k) => {
            const n = 8 + (k % 4), a = 2 + (k % 3), b = 2 + ((k + 1) % 3);
            const count = hardFactorial(n) / (hardFactorial(a) * hardFactorial(b));
            return hardQuestion(
                `A word has ${n} letters, with one letter repeated ${a} times and another repeated ${b} times. The number of distinct arrangements is`,
                count,
                [hardFactorial(n), count * a, count / 2],
                `Divide total permutations by repetitions: ${n}!/(${a}!${b}!)=${count}.`
            );
        },
        (k) => {
            const men = 7 + (k % 4), women = 6 + (k % 3), size = 5;
            let count = 0;
            for (let w = 2; w <= Math.min(women, size); w++) count += nCr(women, w) * nCr(men, size - w);
            return hardQuestion(
                `A committee of ${size} is chosen from ${men} men and ${women} women. If it must contain at least 2 women, the number of ways is`,
                count,
                [nCr(men + women, size), count - nCr(women, 2), count + nCr(men, 2)],
                `Sum over w=2 to ${size}: Σ C(${women},w)C(${men},${size}-w) = ${count}.`
            );
        },
        (k) => {
            const n = 5 + (k % 5);
            const count = hardDerangement(n);
            return hardQuestion(
                `The number of derangements of ${n} distinct objects is`,
                count,
                [hardFactorial(n), count + n, count - (n - 1)],
                `Using !n = n!Σ(-1)^r/r!, !${n}=${count}.`
            );
        },
        (k) => {
            const total = 14 + k;
            const count = nCr(total - 8 + 3, 3);
            return hardQuestion(
                `The number of ways to distribute ${total} identical objects among 4 students so that each gets at least 2 is`,
                count,
                [nCr(total + 3, 3), count - 4, count + total],
                `Let y_i=x_i-2. Then y_1+y_2+y_3+y_4=${total - 8}. Non-negative solutions = C(${total - 8}+3,3)=${count}.`
            );
        },
        (k) => {
            const n = 7 + (k % 5);
            const count = hardFactorial(n - 1) - 2 * hardFactorial(n - 2);
            return hardQuestion(
                `In how many circular arrangements of ${n} distinct people are two particular people not adjacent?`,
                count,
                [hardFactorial(n - 1), 2 * hardFactorial(n - 2), count + n],
                `Total circular arrangements = (${n}-1)!. Adjacent arrangements = 2(${n}-2)!. Hence not adjacent = ${count}.`
            );
        },
        (k) => {
            const maxDigit = 6 + (k % 3);
            const count = hardNPr(maxDigit, 4) + (maxDigit - 1) * hardNPr(maxDigit - 1, 3);
            return hardQuestion(
                `Using digits 0,1,2,...,${maxDigit} without repetition, the number of 5-digit numbers divisible by 5 is`,
                count,
                [count + hardNPr(maxDigit - 1, 3), count - hardNPr(maxDigit - 1, 2), hardNPr(maxDigit + 1, 5)],
                `Last digit is 0 or 5. If last digit is 0, remaining places: P(${maxDigit},4). If last digit is 5, first digit has ${maxDigit - 1} choices and remaining three places P(${maxDigit - 1},3). Total = ${count}.`
            );
        }
    ],
    "Binomial Theorem": [
        (k) => {
            const n = 6 + (k % 4), m = 5 + (k % 3), a = 2 + (k % 3), b = 1 + (k % 2), target = 5 + (k % 3);
            const coefficient = hardCoeffProductLinear(n, a, m, b, target);
            return hardQuestion(
                `The coefficient of x^${target} in (1+${a}x)^${n}(1+${b}x)^${m} is`,
                coefficient,
                [coefficient + nCr(n, target), coefficient - nCr(m, 2), coefficient + a * b],
                `Collect terms where r+s=${target}: Σ C(${n},r)${a}^r C(${m},s)${b}^s = ${coefficient}.`
            );
        },
        (k) => {
            const t = 2 + (k % 4), c = 1 + (k % 3), n = 3 * t, r = 2 * t;
            const term = nCr(n, r) * Math.pow(c, r);
            return hardQuestion(
                `The constant term in (x²+${c}/x)^${n} is`,
                term,
                [nCr(n, t) * Math.pow(c, t), term + nCr(n, r - 1), term - c],
                `General term has x-power 2(${n}-r)-r = ${2 * n}-3r. Set it to 0, so r=${r}. Constant term = C(${n},${r})${c}^${r} = ${term}.`
            );
        },
        (k) => {
            const power = 6 + (k % 5), target = power;
            const coefficient = hardCoeffTrinomial(power, target);
            return hardQuestion(
                `The coefficient of x^${target} in (1+x+x²)^${power} is`,
                coefficient,
                [coefficient + power, coefficient - power, nCr(2 * power, target)],
                `Choose twos and ones so ones + 2*twos = ${target}. Summing C(${power},twos)C(${power}-twos,ones) gives ${coefficient}.`
            );
        },
        (k) => {
            const n = 12 + (k % 8);
            const coefficient = nCr(n, Math.floor(n / 2));
            return hardQuestion(
                `The greatest coefficient in the expansion of (1+x)^${n} is`,
                coefficient,
                [nCr(n, Math.floor(n / 2) - 1), nCr(n, 1), coefficient + n],
                `The greatest binomial coefficient occurs in the middle. It is C(${n}, floor(${n}/2))=${coefficient}.`
            );
        },
        (k) => {
            const r = 3 + (k % 4), n = r + 6 + (k % 4);
            const coefficient = nCr(n, r) * Math.pow(-2, r);
            return hardQuestion(
                `The coefficient of x^${r} in (1-2x)^${n} is`,
                coefficient,
                [Math.abs(coefficient), coefficient / -2, coefficient + nCr(n, r)],
                `The coefficient is C(${n},${r})(-2)^${r} = ${coefficient}.`
            );
        },
        (k) => {
            const n = 5 + (k % 6);
            const sum = (Math.pow(3, n) + Math.pow(-1, n)) / 2;
            return hardQuestion(
                `The sum of coefficients of even powers of x in (1+2x)^${n} is`,
                sum,
                [Math.pow(3, n), Math.pow(3, n) - sum, sum + 1],
                `Even-power coefficient sum = [f(1)+f(-1)]/2 = [3^${n}+(-1)^${n}]/2 = ${sum}.`
            );
        }
    ],
    "Sequences and Series": [
        (k) => {
            const a = 2 + k, d = 3 + (k % 5), n = 20 + (k % 6);
            const sum = n * (2 * a + (n - 1) * d) / 2;
            return hardQuestion(
                `For an AP with first term ${a} and common difference ${d}, S_${n} equals`,
                sum,
                [sum + d * n, sum - a * n, n * (a + d)],
                `S_n = n/2[2a+(n-1)d]. Hence S_${n}=${n}/2[${2 * a}+${n - 1}·${d}]=${sum}.`
            );
        },
        (k) => {
            const a = 2 + (k % 4), r = 2 + (k % 3), n = 5 + (k % 4);
            const sum = a * (Math.pow(r, n) - 1) / (r - 1);
            return hardQuestion(
                `The sum of the first ${n} terms of a GP with first term ${a} and common ratio ${r} is`,
                sum,
                [sum + a, sum - r, a * Math.pow(r, n - 1)],
                `S_n=a(r^n-1)/(r-1)=${a}(${r}^${n}-1)/(${r}-1)=${sum}.`
            );
        },
        (k) => {
            const first = 1 + (k % 5), ratio = 2 + (k % 2), c = 3 + (k % 4), n = 5 + (k % 4);
            const value = Math.pow(ratio, n - 1) * first + c * (Math.pow(ratio, n - 1) - 1) / (ratio - 1);
            return hardQuestion(
                `If a_1=${first} and a_(n+1)=${ratio}a_n+${c}, then a_${n} is`,
                value,
                [value + c, value - first, Math.pow(ratio, n - 1) * first],
                `Solve the linear recurrence: a_n=${ratio}^{${n - 1}}a_1 + ${c}(${ratio}^{${n - 1}}-1)/(${ratio}-1) = ${value}.`
            );
        },
        (k) => {
            const n = 12 + (k % 9);
            const sum = n * (n + 1) * (2 * n + 1) / 6;
            return hardQuestion(
                `The value of 1²+2²+...+${n}² is`,
                sum,
                [sum + n, sum - n, Math.pow(n * (n + 1) / 2, 2)],
                `Use Σr² = n(n+1)(2n+1)/6. For n=${n}, the sum is ${sum}.`
            );
        },
        (k) => {
            const p = 2 + (k % 5), d = 1 + (k % 3), n = 5 + (k % 5);
            const denominator = p + (n - 1) * d;
            return hardQuestion(
                `In an HP, 1/a_1=${p} and the common difference of reciprocals is ${d}. Then a_${n} is`,
                `1/${denominator}`,
                [`1/${denominator + d}`, `1/${p + n}`, `${denominator}`],
                `The reciprocals form an AP: 1/a_${n}=${p}+(${n}-1)${d}=${denominator}. Hence a_${n}=1/${denominator}.`
            );
        },
        (k) => {
            const n = 6 + (k % 8);
            const sum = (n - 1) * Math.pow(2, n) + 1;
            return hardQuestion(
                `The value of Σ r·2^(r-1), where r runs from 1 to ${n}, is`,
                sum,
                [sum - Math.pow(2, n), sum + n, n * Math.pow(2, n - 1)],
                `The finite identity is Σ r2^(r-1) = (n-1)2^n + 1. For n=${n}, this equals ${sum}.`
            );
        }
    ],
    "Limits and Derivatives": [
        (k) => {
            const a = 2 + k;
            const correct = fractionText(-Math.pow(a, 3), 6);
            return hardQuestion(
                `lim x→0 [sin(${a}x)-${a}x]/x³ is`,
                correct,
                [fractionText(Math.pow(a, 3), 6), fractionText(-a, 6), "0"],
                `Using sin u = u - u³/6 + ..., the numerator is -(${a}x)³/6 + ..., so the limit is ${correct}.`
            );
        },
        (k) => {
            const a = 2 + k;
            const correct = fractionText(a * a, 2);
            return hardQuestion(
                `lim x→0 [e^(${a}x)-1-${a}x]/x² is`,
                correct,
                [fractionText(a, 2), `${a * a}`, "0"],
                `e^u=1+u+u²/2+..., so the numerator is (${a}x)²/2 + .... The limit is ${correct}.`
            );
        },
        (k) => {
            const a = 2 + (k % 5);
            return hardQuestion(
                `If y=x^x, then dy/dx at x=${a} is`,
                `${Math.pow(a, a)}(1+ln ${a})`,
                [`${Math.pow(a, a - 1)}(1+ln ${a})`, `${Math.pow(a, a)}ln ${a}`, `${Math.pow(a, a)}`],
                `Log differentiation gives y'=x^x(ln x+1). At x=${a}, y'=${a}^${a}(1+ln ${a}).`
            );
        },
        (k) => {
            const p = 3 + (k % 4), q = 2 + k, x = 2 + (k % 5);
            const slope = 3 * x * x - 2 * p * x + q;
            return hardQuestion(
                `The slope of y=x³-${p}x²+${q}x at x=${x} is`,
                slope,
                [slope + p, slope - q, 3 * x * x],
                `dy/dx=3x²-${2 * p}x+${q}. At x=${x}, slope=${slope}.`
            );
        },
        (k) => {
            const x = 1 + (k % 5), y = 2 + (k % 4);
            const correct = fractionText(-(2 * x + y), x + 2 * y);
            return hardQuestion(
                `For x²+xy+y²=${x * x + x * y + y * y}, dy/dx at (${x},${y}) is`,
                correct,
                [fractionText(-(x + 2 * y), 2 * x + y), fractionText(2 * x + y, x + 2 * y), "0"],
                `Differentiate implicitly: 2x + y + x(dy/dx) + 2y(dy/dx)=0. Thus dy/dx=-(2x+y)/(x+2y)=${correct}.`
            );
        },
        (k) => {
            const a = 1 + k;
            const correct = fractionText(Math.pow(a, 3), 2);
            return hardQuestion(
                `lim x→0 [tan(${a}x)-sin(${a}x)]/x³ is`,
                correct,
                [fractionText(Math.pow(a, 3), 3), fractionText(Math.pow(a, 3), 6), "0"],
                `tan u = u+u³/3+... and sin u = u-u³/6+..., so tan u - sin u = u³/2+.... With u=${a}x, the limit is ${correct}.`
            );
        }
    ],
    "Trigonometry": [
        (k) => {
            const m = 3 + k, n = 4 + k;
            const correct = fractionText(2 * m * n, m * m + n * n);
            return hardQuestion(
                `If tan θ=${m}/${n} and θ is acute, then sin 2θ is`,
                correct,
                [fractionText(m * m - n * n, m * m + n * n), fractionText(m, n), fractionText(2 * m, n)],
                `sin 2θ = 2tanθ/(1+tan²θ) = 2mn/(m²+n²) = ${correct}.`
            );
        },
        (k) => {
            const m = 2 + k, n = 5 + k;
            const correct = fractionText(n * n - m * m, n * n + m * m);
            return hardQuestion(
                `If tan θ=${m}/${n}, then cos 2θ is`,
                correct,
                [fractionText(2 * m * n, n * n + m * m), fractionText(m * m - n * n, n * n + m * m), "1"],
                `cos 2θ=(1-tan²θ)/(1+tan²θ)=(n²-m²)/(n²+m²)=${correct}.`
            );
        },
        (k) => {
            const p = 1 + (k % 4), q = 3 + (k % 5), r = 2 + (k % 4), s = 5 + (k % 5);
            const numerator = p * s + r * q;
            const denominator = q * s - p * r;
            const correct = fractionText(numerator, denominator);
            return hardQuestion(
                `If tan A=${p}/${q} and tan B=${r}/${s}, then tan(A+B) is`,
                correct,
                [fractionText(p * s - r * q, q * s + p * r), fractionText(numerator, q * s + p * r), fractionText(p + r, q + s)],
                `tan(A+B)=(tanA+tanB)/(1-tanA tanB)=(${p}/${q}+${r}/${s})/(1-${p * r}/${q * s})=${correct}.`
            );
        },
        (k) => {
            const a = 3 + k, b = 4 + (k % 5);
            const radius = a * a + b * b;
            return hardQuestion(
                `The maximum value of ${a}sin x + ${b}cos x is`,
                hardSqrtText(radius),
                [`${a + b}`, hardSqrtText(Math.abs(a * a - b * b)), `${Math.max(a, b)}`],
                `The maximum of a sin x + b cos x is sqrt(a²+b²)=sqrt(${radius})=${hardSqrtText(radius)}.`
            );
        },
        (k) => {
            const n = 2 + (k % 8);
            const count = 2 * n + 1;
            return hardQuestion(
                `The number of solutions of sin(${n}x)=0 in [0,2π] is`,
                count,
                [count - 1, 2 * n, count + 1],
                `sin(${n}x)=0 gives ${n}x=rπ. In [0,2π], r=0,1,...,${2 * n}, so there are ${count} solutions.`
            );
        },
        (k) => {
            const n = 2 + (k % 6);
            return hardQuestion(
                `The value of sin²x + sin²(x+2π/${n + 1}) + sin²(x+4π/${n + 1}) averaged over one full period is`,
                "3/2",
                ["1", "2", "0"],
                `Each sin² term has average 1/2 over a full period. The sum of three such shifted terms has average 3/2.`
            );
        }
    ],
    "Coordinate Geometry": [
        (k) => {
            const x = 2 + k, y = 3 + (k % 5), c = 5 + k;
            const numerator = Math.abs(3 * x + 4 * y - c);
            const correct = fractionText(numerator, 5);
            return hardQuestion(
                `The distance of point (${x},${y}) from the line 3x+4y-${c}=0 is`,
                correct,
                [fractionText(numerator, 25), `${numerator}`, fractionText(numerator + 5, 5)],
                `Distance = |3(${x})+4(${y})-${c}|/sqrt(3²+4²) = ${numerator}/5 = ${correct}.`
            );
        },
        (k) => {
            const x1 = k, y1 = 2 + k, x2 = 4 + k, y2 = 7 + (k % 4);
            const area2 = Math.abs(x1 * y2 + x2 * 0 + 0 * y1 - y1 * x2 - y2 * 0 - 0 * x1);
            const correct = fractionText(area2, 2);
            return hardQuestion(
                `The area of triangle with vertices (0,0), (${x1},${y1}), and (${x2},${y2}) is`,
                correct,
                [String(area2), fractionText(area2 + 2, 2), fractionText(Math.abs(area2 - 2), 2)],
                `Area = 1/2 |x1y2-y1x2| = 1/2|${x1}·${y2}-${y1}·${x2}| = ${correct}.`
            );
        },
        (k) => {
            const x1 = k, y1 = 2, x2 = k + 6, y2 = 8;
            const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
            const r2 = (Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 4;
            return hardQuestion(
                `The circle having (${x1},${y1}) and (${x2},${y2}) as endpoints of a diameter is`,
                `(x-${cx})² + (y-${cy})² = ${r2}`,
                [`(x-${cx})² + (y-${cy})² = ${4 * r2}`, `(x+${cx})² + (y+${cy})² = ${r2}`, `(x-${cx})² + (y-${cy})² = ${Math.sqrt(r2)}`],
                `Centre is the midpoint (${cx},${cy}). Radius squared is one-fourth of the diameter squared, so r²=${r2}.`
            );
        },
        (k) => {
            const a = 5 + k, b = 3 + (k % 4);
            const c2 = a * a - b * b;
            return hardQuestion(
                `For ellipse x²/${a * a}+y²/${b * b}=1, the eccentricity is`,
                `${hardSqrtText(c2)}/${a}`,
                [`${b}/${a}`, `${hardSqrtText(a * a + b * b)}/${a}`, `${hardSqrtText(c2)}/${b}`],
                `For x²/a²+y²/b²=1 with a>b, e=sqrt(a²-b²)/a=sqrt(${c2})/${a}.`
            );
        },
        (k) => {
            const x = 3 + k, y = 4 + (k % 5), r2 = x * x + y * y;
            return hardQuestion(
                `The tangent to x²+y²=${r2} at (${x},${y}) is`,
                `${x}x + ${y}y = ${r2}`,
                [`${y}x + ${x}y = ${r2}`, `${x}x - ${y}y = ${r2}`, `${x}x + ${y}y = ${Math.sqrt(r2)}`],
                `For x²+y²=r², tangent at (x1,y1) is xx1+yy1=r². Hence ${x}x+${y}y=${r2}.`
            );
        },
        (k) => {
            const x0 = 2 + k, y0 = 3 + (k % 4);
            const c1 = 2 * x0 + 3 * y0, c2 = 5 * x0 - y0;
            return hardQuestion(
                `The point of intersection of 2x+3y=${c1} and 5x-y=${c2} is`,
                `(${x0}, ${y0})`,
                [`(${y0}, ${x0})`, `(${x0 + 1}, ${y0})`, `(${x0}, ${y0 + 1})`],
                `Both lines were built through (${x0},${y0}): 2(${x0})+3(${y0})=${c1} and 5(${x0})-${y0}=${c2}.`
            );
        }
    ],
    "Three-Dimensional Geometry": [
        (k) => {
            const x = 1 + k, y = 2 + (k % 4), z = 3 + (k % 5), distance = 2 + (k % 5);
            const constant = distance * 7 - (2 * x + 3 * y + 6 * z);
            return hardQuestion(
                `The distance of point (${x},${y},${z}) from plane ${hardPlaneText(2, 3, 6, constant)} is`,
                distance,
                [distance + 1, Math.max(1, distance - 1), distance * 7],
                `Distance = |2x+3y+6z+${constant}|/sqrt(2²+3²+6²). The numerator is ${distance * 7} and denominator is 7, so distance=${distance}.`
            );
        },
        (k) => {
            const a = [1 + k, 2, 3], b = [2, 1 + (k % 4), 4];
            const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
            return hardQuestion(
                `If a=${a[0]}i+${a[1]}j+${a[2]}k and b=${b[0]}i+${b[1]}j+${b[2]}k, then a·b is`,
                dot,
                [dot + a[0], dot - b[1], hardSum(a) + hardSum(b)],
                `Dot product = ${a[0]}·${b[0]} + ${a[1]}·${b[1]} + ${a[2]}·${b[2]} = ${dot}.`
            );
        },
        (k) => {
            const a = [2 + k, 1, 2], b = [2, 1, 2];
            const dot = a[0] * 2 + a[1] + a[2] * 2;
            const correct = fractionText(dot, 3);
            return hardQuestion(
                `The scalar projection of vector ${a[0]}i+j+2k on 2i+j+2k is`,
                correct,
                [String(dot), fractionText(dot, 9), fractionText(dot + 3, 3)],
                `Scalar projection = a·b/|b|. Here a·b=${dot} and |2i+j+2k|=3, so projection=${correct}.`
            );
        },
        (k) => {
            const a = 2 + k, b = 3 + (k % 4), c = 4 + (k % 5);
            return hardQuestion(
                `A plane cuts intercepts ${a}, ${b}, ${c} on the coordinate axes. Its equation is`,
                `x/${a} + y/${b} + z/${c} = 1`,
                [`${a}x + ${b}y + ${c}z = 1`, `x/${a} + y/${b} + z/${c} = 0`, `x/${c} + y/${b} + z/${a} = 1`],
                `The intercept form of a plane is x/a + y/b + z/c = 1.`
            );
        },
        (k) => {
            const a = [1 + k, 2, 3], b = [5 + k, 6, 9];
            const midpoint = `(${(a[0] + b[0]) / 2}, ${(a[1] + b[1]) / 2}, ${(a[2] + b[2]) / 2})`;
            return hardQuestion(
                `The midpoint of (${a.join(',')}) and (${b.join(',')}) is`,
                midpoint,
                [`(${a[0] + b[0]}, ${a[1] + b[1]}, ${a[2] + b[2]})`, `(${b[0] - a[0]}, ${b[1] - a[1]}, ${b[2] - a[2]})`, `(${a[0]}, ${b[1]}, ${a[2]})`],
                `Midpoint is the average of corresponding coordinates: ${midpoint}.`
            );
        },
        (k) => {
            const a = 3 + k, b = 4 + (k % 5), c = 5 + (k % 4);
            const volume = fractionText(a * b * c, 6);
            return hardQuestion(
                `The volume of the tetrahedron cut off by plane x/${a}+y/${b}+z/${c}=1 from the coordinate axes is`,
                volume,
                [String(a * b * c), fractionText(a * b * c, 3), fractionText(a + b + c, 6)],
                `For intercepts a,b,c, tetrahedron volume = abc/6 = ${a}·${b}·${c}/6 = ${volume}.`
            );
        }
    ],
    "Probability": [
        (k) => {
            const r1 = 3 + k, b1 = 2 + (k % 4), r2 = 2 + (k % 5), b2 = 5 + k;
            const numerator = r1 * (r2 + b2);
            const denominator = numerator + r2 * (r1 + b1);
            const correct = fractionText(numerator, denominator);
            return hardQuestion(
                `Bag I has ${r1} red and ${b1} blue balls. Bag II has ${r2} red and ${b2} blue balls. A bag is chosen at random and a red ball is drawn. Probability it came from Bag I is`,
                correct,
                [fractionText(r1, r1 + b1), fractionText(r2, r2 + b2), fractionText(r1 + r2, r1 + b1 + r2 + b2)],
                `By Bayes, P(I|R)=P(R|I)/[P(R|I)+P(R|II)] = (${r1}/${r1 + b1})/[${r1}/${r1 + b1}+${r2}/${r2 + b2}] = ${correct}.`
            );
        },
        (k) => {
            const red = 5 + (k % 5), blue = 6 + (k % 4), draws = 4, success = 2;
            const correct = fractionText(nCr(red, success) * nCr(blue, draws - success), nCr(red + blue, draws));
            return hardQuestion(
                `A box has ${red} red and ${blue} blue balls. If ${draws} balls are drawn without replacement, probability of exactly ${success} red balls is`,
                correct,
                [fractionText(nCr(red, success), nCr(red + blue, draws)), fractionText(nCr(blue, draws - success), nCr(red + blue, draws)), fractionText(success, draws)],
                `Use hypergeometric probability: C(${red},${success})C(${blue},${draws - success})/C(${red + blue},${draws}) = ${correct}.`
            );
        },
        (k) => {
            const n = 5 + (k % 5), success = 2, pDen = 3 + (k % 3);
            const numerator = nCr(n, success) * Math.pow(1, success) * Math.pow(pDen - 1, n - success);
            const denominator = Math.pow(pDen, n);
            const correct = fractionText(numerator, denominator);
            return hardQuestion(
                `If X~Binomial(${n}, 1/${pDen}), then P(X=2) is`,
                correct,
                [fractionText(nCr(n, success), denominator), fractionText(numerator, Math.pow(pDen, success)), fractionText(2, n)],
                `P(X=2)=C(${n},2)(1/${pDen})²(${pDen - 1}/${pDen})^${n - 2} = ${correct}.`
            );
        },
        (k) => {
            const threshold = 6 + (k % 5);
            const evenGivenSum = hardDiceCount((d1, d2) => d1 + d2 > threshold && (d1 + d2) % 2 === 0);
            const totalGivenSum = hardDiceCount((d1, d2) => d1 + d2 > threshold);
            const correct = fractionText(evenGivenSum, totalGivenSum);
            return hardQuestion(
                `Two dice are thrown. Given that the sum is greater than ${threshold}, the probability that the sum is even is`,
                correct,
                [fractionText(evenGivenSum, 36), fractionText(totalGivenSum, 36), fractionText(totalGivenSum - evenGivenSum, totalGivenSum)],
                `Condition on sums greater than ${threshold}. Favourable even-sum outcomes = ${evenGivenSum}; total conditioned outcomes = ${totalGivenSum}. Probability = ${correct}.`
            );
        },
        (k) => {
            const aces = 4, others = 48, draws = 5, exact = 2;
            const correct = fractionText(nCr(aces, exact) * nCr(others, draws - exact), nCr(52, draws));
            return hardQuestion(
                `From a standard deck, 5 cards are drawn. Probability of exactly 2 aces is`,
                correct,
                [fractionText(nCr(aces, exact), nCr(52, draws)), fractionText(nCr(others, draws - exact), nCr(52, draws)), fractionText(exact, draws)],
                `Choose 2 aces and 3 non-aces: C(4,2)C(48,3)/C(52,5) = ${correct}.`
            );
        },
        (k) => {
            const pa = 2 + (k % 4), pb = 3 + (k % 5), den = 10 + k;
            const independent = fractionText(pa * pb, den * den);
            return hardQuestion(
                `If P(A)=${pa}/${den}, P(B)=${pb}/${den}, and A,B are independent, then P(A∪B) is`,
                fractionText(pa * den + pb * den - pa * pb, den * den),
                [fractionText(pa + pb, den), independent, fractionText(pa * den + pb * den, den * den)],
                `For independent events, P(A∩B)=P(A)P(B)=${independent}. Thus P(A∪B)=P(A)+P(B)-P(A∩B).`
            );
        }
    ],
    "Statistics": [
        (k) => {
            const n1 = 20 + k, mean1 = 40 + k, n2 = 15 + (k % 6), mean2 = 55 + (k % 8);
            const correct = fractionText(n1 * mean1 + n2 * mean2, n1 + n2);
            return hardQuestion(
                `A group of ${n1} observations has mean ${mean1}, and another group of ${n2} observations has mean ${mean2}. The combined mean is`,
                correct,
                [fractionText(mean1 + mean2, 2), String(mean1 + mean2), fractionText(n1 * mean2 + n2 * mean1, n1 + n2)],
                `Combined mean = (${n1}·${mean1}+${n2}·${mean2})/(${n1}+${n2}) = ${correct}.`
            );
        },
        (k) => {
            const variance = 4 + k, a = 2 + (k % 4);
            const correct = a * a * variance;
            return hardQuestion(
                `If Var(X)=${variance}, then Var(${a}X+${k}) is`,
                correct,
                [a * variance, correct + k, variance + k],
                `Variance is unaffected by adding a constant and scales by a². So Var(${a}X+${k})=${a}²·${variance}=${correct}.`
            );
        },
        (k) => {
            const knownSum = 120 + 5 * k, knownCount = 8 + (k % 5), targetMean = 18 + (k % 6);
            const missing = targetMean * (knownCount + 1) - knownSum;
            return hardQuestion(
                `The sum of ${knownCount} observations is ${knownSum}. If one more observation is added and the new mean is ${targetMean}, the added observation is`,
                missing,
                [missing + targetMean, missing - knownCount, targetMean],
                `Total required sum = ${targetMean}(${knownCount}+1). Missing observation = ${targetMean * (knownCount + 1)}-${knownSum}=${missing}.`
            );
        },
        (k) => {
            const mean = 20 + k, sd = 4 + (k % 5);
            const correct = `${fractionText(sd * 100, mean)}%`;
            return hardQuestion(
                `If mean=${mean} and standard deviation=${sd}, the coefficient of variation is`,
                correct,
                [`${sd / mean}%`, `${mean / sd}%`, `${sd * mean}%`],
                `Coefficient of variation = (standard deviation / mean) × 100 = ${sd}/${mean} × 100 = ${correct}.`
            );
        },
        (k) => {
            const n1 = 10 + (k % 4), mean1 = 20 + k, var1 = 4 + (k % 5);
            const n2 = 12 + (k % 5), mean2 = 25 + k, var2 = 9 + (k % 4);
            const combinedVariance = hardCombinedVariance(n1, mean1, var1, n2, mean2, var2);
            const correct = Number.isInteger(combinedVariance) ? String(combinedVariance) : combinedVariance.toFixed(2);
            return hardQuestion(
                `Two groups have (n, mean, variance)=(${n1},${mean1},${var1}) and (${n2},${mean2},${var2}). The combined variance is closest to`,
                correct,
                [(combinedVariance + 1).toFixed(2), Math.max(0, combinedVariance - 1).toFixed(2), fractionText(var1 + var2, 2)],
                `Use combined variance: [n1(v1+(m1-m)²)+n2(v2+(m2-m)²)]/(n1+n2). This gives approximately ${correct}.`
            );
        },
        (k) => {
            const base = 5 + k, spread = 2 + (k % 5);
            const values = [base - spread, base, base + spread, base + 2 * spread];
            const mean = hardSum(values) / values.length;
            const meanDeviation = hardSum(values.map((value) => Math.abs(value - mean))) / values.length;
            const correct = Number.isInteger(meanDeviation) ? String(meanDeviation) : meanDeviation.toFixed(2);
            return hardQuestion(
                `The mean deviation about mean for data ${values.join(', ')} is`,
                correct,
                [(meanDeviation + 1).toFixed(2), Math.max(0, meanDeviation - 1).toFixed(2), String(mean)],
                `Mean = ${mean}. Mean deviation = average of absolute deviations from mean = ${correct}.`
            );
        }
    ]
};

Object.entries(hardQuestionFactories).forEach(([chapterName, factories]) => {
    if (!chapters[chapterName]) chapters[chapterName] = [];

    const hardQuestions = [];
    for (let i = 0; i < HARD_QUESTIONS_PER_CHAPTER; i++) {
        const factory = factories[i % factories.length];
        const question = factory(Math.floor(i / factories.length) + 1, i);
        if (!isValidQuizQuestion(question)) {
            throw new Error(`Invalid generated hard question for ${chapterName} at index ${i}`);
        }
        hardQuestions.push(question);
    }

    chapters[chapterName].push(...hardQuestions);
});


const numericalVariantTemplates = {
    "Sets, Relations, and Functions": [
        () => {
            const n = randomInt(5, 9);
            const count = Array.from({ length: n }, (_, i) => Math.floor(n / (i + 1)))
                .reduce((sum, value) => sum + value, 0);
            const { o, a } = makeTextOptions(count, [count - 1, count + 1, count + 2]);
            return {
                q: `Let A = {1, 2, ..., ${n}}. A relation R on A is defined by aRb if a divides b. The number of ordered pairs in R is`,
                o,
                a,
                s: `For each a in A, b can be any multiple of a not exceeding ${n}. The count is floor(${n}/1)+floor(${n}/2)+...+floor(${n}/${n}) = ${count}.`
            };
        },
        () => {
            const h = randomInt(2, 6);
            const minValue = randomInt(1, 9);
            const c = h * h + minValue;
            const { o, a } = makeTextOptions(`[${minValue}, infinity)`, [
                `(${minValue}, infinity)`,
                `(-infinity, ${minValue}]`,
                'All real numbers'
            ]);
            return {
                q: `The range of f(x) = x^2 - ${2 * h}x + ${c}, x belongs to R, is`,
                o,
                a,
                s: `Complete the square: f(x) = (x - ${h})^2 + ${minValue}. Since the square term is non-negative, the minimum value is ${minValue}.`
            };
        }
    ],
    "Complex Numbers and Quadratic Equations": [
        () => {
            const sum = randomInt(3, 8);
            const product = randomInt(4, 16);
            const value = sum * sum - 2 * product;
            const { o, a } = makeTextOptions(value, [value + 2, value - 2, sum * sum + 2 * product]);
            return {
                q: `If alpha and beta are the roots of x^2 - ${sum}x + ${product} = 0, then alpha^2 + beta^2 equals`,
                o,
                a,
                s: `alpha + beta = ${sum} and alpha beta = ${product}. Therefore alpha^2 + beta^2 = (alpha + beta)^2 - 2 alpha beta = ${sum * sum} - ${2 * product} = ${value}.`
            };
        },
        () => {
            const aPoint = randomEvenInt(2, 10);
            let bPoint = randomEvenInt(2, 10);
            if (bPoint === aPoint) bPoint += bPoint < 10 ? 2 : -2;
            const mid = (aPoint - bPoint) / 2;
            const { o, a } = makeTextOptions(`x = ${mid}`, [
                `x = ${-mid}`,
                `y = ${mid}`,
                `x = ${(aPoint + bPoint) / 2}`
            ]);
            return {
                q: `The locus of z = x + iy satisfying |z - ${aPoint}| = |z + ${bPoint}| is`,
                o,
                a,
                s: `The point is equidistant from ${aPoint} and -${bPoint} on the real axis. The perpendicular bisector has x-coordinate (${aPoint} - ${bPoint})/2 = ${mid}.`
            };
        }
    ],
    "Permutations and Combinations": [
        () => {
            const sides = randomInt(7, 16);
            const diagonals = sides * (sides - 3) / 2;
            const { o, a } = makeTextOptions(diagonals, [diagonals + sides, diagonals - sides, sides * (sides - 1) / 2]);
            return {
                q: `The number of diagonals in a polygon of ${sides} sides is`,
                o,
                a,
                s: `Number of diagonals of an n-sided polygon is n(n - 3)/2. For n = ${sides}, diagonals = ${sides}(${sides - 3})/2 = ${diagonals}.`
            };
        },
        () => {
            const men = randomInt(5, 8);
            const women = randomInt(4, 7);
            const committeeSize = 4;
            const ways = range(2, committeeSize)
                .reduce((sum, w) => sum + nCr(women, w) * nCr(men, committeeSize - w), 0);
            const { o, a } = makeTextOptions(ways, [ways - women * men, ways + men * women, nCr(men + women, committeeSize)]);
            return {
                q: `A committee of 4 is to be selected from ${men} men and ${women} women. If the committee must contain at least 2 women, the number of ways is`,
                o,
                a,
                s: `Count cases with 2, 3, and 4 women: C(${women},2)C(${men},2) + C(${women},3)C(${men},1) + C(${women},4) = ${ways}.`
            };
        }
    ],
    "Binomial Theorem": [
        () => {
            const n = randomInt(5, 8);
            const r = randomInt(2, n - 2);
            const k = randomInt(2, 4);
            const coefficient = nCr(n, r) * Math.pow(k, r);
            const { o, a } = makeTextOptions(coefficient, [coefficient / k, coefficient + nCr(n, r), coefficient - nCr(n, r)]);
            return {
                q: `The coefficient of x^${r} in the expansion of (1 + ${k}x)^${n} is`,
                o,
                a,
                s: `The required term is C(${n},${r})(${k}x)^${r}. Coefficient = C(${n},${r}) * ${k}^${r} = ${coefficient}.`
            };
        },
        () => {
            const m = randomInt(3, 6);
            const power = 2 * m;
            const coefficient = nCr(power, m);
            const { o, a } = makeTextOptions(coefficient, [nCr(power, m - 1), coefficient + power, coefficient - power]);
            return {
                q: `The middle term in the expansion of (x + 1/x)^${power} is`,
                o,
                a,
                s: `There are ${power + 1} terms, so the middle term is term ${m + 1}. It equals C(${power},${m})x^${m}(1/x)^${m} = ${coefficient}.`
            };
        }
    ],
    "Sequences and Series": [
        () => {
            const first = randomInt(1, 8);
            const diff = randomInt(2, 6);
            const terms = randomInt(12, 25);
            const last = first + (terms - 1) * diff;
            const sum = terms * (first + last) / 2;
            const { o, a } = makeTextOptions(sum, [sum - terms, sum + terms, terms * last]);
            return {
                q: `For the AP with first term ${first} and common difference ${diff}, the sum of the first ${terms} terms is`,
                o,
                a,
                s: `The ${terms}th term is ${last}. Sum = n/2(first + last) = ${terms}/2(${first} + ${last}) = ${sum}.`
            };
        },
        () => {
            const first = randomInt(2, 5);
            const terms = randomInt(4, 7);
            const ratio = 2;
            const sum = first * (Math.pow(ratio, terms) - 1) / (ratio - 1);
            const { o, a } = makeTextOptions(sum, [sum - first, sum + first, first * Math.pow(ratio, terms)]);
            return {
                q: `The sum of the first ${terms} terms of a GP with first term ${first} and common ratio 2 is`,
                o,
                a,
                s: `Sum = a(r^n - 1)/(r - 1) = ${first}(2^${terms} - 1) = ${sum}.`
            };
        }
    ],
    "Limits and Derivatives": [
        () => {
            const numerator = randomInt(2, 9);
            let denominator = randomInt(2, 9);
            if (denominator === numerator) denominator++;
            const correct = fractionText(numerator, denominator);
            const { o, a } = makeTextOptions(correct, [
                fractionText(denominator, numerator),
                fractionText(numerator + 1, denominator),
                fractionText(numerator, denominator + 1)
            ]);
            return {
                q: `The value of lim x->0 sin(${numerator}x)/sin(${denominator}x) is`,
                o,
                a,
                s: `Using sin(kx) ~ kx as x tends to 0, the limit is ${numerator}/${denominator} = ${correct}.`
            };
        },
        () => {
            const point = randomInt(1, 5);
            const c = point * point;
            const correct = fractionText(1, point);
            const { o, a } = makeTextOptions(correct, [
                fractionText(2, point),
                fractionText(1, point + 1),
                `${point}`
            ]);
            return {
                q: `If y = log(x^2 + ${c}), then y'(${point}) equals`,
                o,
                a,
                s: `y' = 2x/(x^2 + ${c}). At x = ${point}, y' = ${2 * point}/(${point * point} + ${c}) = ${correct}.`
            };
        }
    ],
    "Trigonometry": [
        () => {
            const triples = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]];
            const [opposite, adjacent, hypotenuse] = randomChoice(triples);
            const correct = fractionText(2 * opposite * adjacent, hypotenuse * hypotenuse);
            const { o, a } = makeTextOptions(correct, [
                fractionText(opposite, hypotenuse),
                fractionText(adjacent, hypotenuse),
                fractionText(opposite * adjacent, hypotenuse * hypotenuse)
            ]);
            return {
                q: `If tan theta = ${opposite}/${adjacent} and theta is acute, then sin 2 theta is`,
                o,
                a,
                s: `For the right triangle, sin theta = ${opposite}/${hypotenuse} and cos theta = ${adjacent}/${hypotenuse}. Hence sin 2 theta = 2sin theta cos theta = ${correct}.`
            };
        },
        () => {
            const triples = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]];
            const [opposite, adjacent, hypotenuse] = randomChoice(triples);
            const correct = fractionText(adjacent, hypotenuse);
            const { o, a } = makeTextOptions(correct, [
                fractionText(opposite, hypotenuse),
                fractionText(hypotenuse, adjacent),
                fractionText(adjacent, opposite)
            ]);
            return {
                q: `If sin theta = ${opposite}/${hypotenuse} and theta is acute, then cos theta is`,
                o,
                a,
                s: `Using sin theta = opposite/hypotenuse, the adjacent side is sqrt(${hypotenuse}^2 - ${opposite}^2) = ${adjacent}. Therefore cos theta = ${adjacent}/${hypotenuse}.`
            };
        }
    ],
    "Coordinate Geometry": [
        () => {
            const x = randomInt(1, 8);
            const y = randomInt(1, 8);
            const distance = randomInt(1, 6);
            const c = 3 * x + 4 * y - 5 * distance;
            const { o, a } = makeTextOptions(distance, [distance + 1, Math.max(1, distance - 1), distance + 2]);
            return {
                q: `The distance of the point (${x}, ${y}) from the line ${line3x4yText(c)} is`,
                o,
                a,
                s: `Distance = |3(${x}) + 4(${y}) - (${c})|/sqrt(3^2 + 4^2) = ${5 * distance}/5 = ${distance}.`
            };
        },
        () => {
            let h = randomInt(-5, 5);
            let k = randomInt(-5, 5);
            if (h === 0) h = 1;
            if (k === 0) k = -1;
            const r = randomInt(2, 8);
            const correct = circleEquationText(h, k, r);
            const { o, a } = makeTextOptions(correct, [
                circleEquationText(-h, k, r),
                circleEquationText(h, -k, r),
                circleEquationText(h, k, r + 1)
            ]);
            return {
                q: `The equation of the circle with centre (${h}, ${k}) and radius ${r} is`,
                o,
                a,
                s: `A circle with centre (h, k) and radius r has equation (x - h)^2 + (y - k)^2 = r^2. Substituting h = ${h}, k = ${k}, r = ${r} gives ${correct}.`
            };
        }
    ],
    "Three-Dimensional Geometry": [
        () => {
            const triples = [[1, 2, 2, 3], [2, 3, 6, 7], [3, 4, 0, 5], [2, 4, 4, 6]];
            const [dx, dy, dz, distance] = randomChoice(triples);
            const x = randomInt(-3, 4);
            const y = randomInt(-3, 4);
            const z = randomInt(-3, 4);
            const { o, a } = makeTextOptions(distance, [distance + 1, Math.max(1, distance - 1), dx + dy + dz]);
            return {
                q: `The distance between the points (${x}, ${y}, ${z}) and (${x + dx}, ${y + dy}, ${z + dz}) is`,
                o,
                a,
                s: `Distance = sqrt(${dx}^2 + ${dy}^2 + ${dz}^2) = sqrt(${distance * distance}) = ${distance}.`
            };
        },
        () => {
            const a1 = randomInt(1, 5);
            const a2 = randomInt(-4, 4);
            const a3 = randomInt(1, 5);
            const b1 = randomInt(1, 5);
            const b2 = randomInt(-4, 4);
            const b3 = randomInt(1, 5);
            const dot = a1 * b1 + a2 * b2 + a3 * b3;
            const { o, a } = makeTextOptions(dot, [dot + 2, dot - 2, a1 + a2 + a3 + b1 + b2 + b3]);
            return {
                q: `If a = ${vectorText(a1, a2, a3)} and b = ${vectorText(b1, b2, b3)}, then a dot b is`,
                o,
                a,
                s: `a dot b = (${a1})(${b1}) + (${a2})(${b2}) + (${a3})(${b3}) = ${dot}.`
            };
        }
    ],
    "Probability": [
        () => {
            const sum = randomInt(4, 10);
            const favourable = 6 - Math.abs(7 - sum);
            const correct = fractionText(favourable, 36);
            const { o, a } = makeTextOptions(correct, [
                fractionText(favourable + 1, 36),
                fractionText(favourable, 18),
                fractionText(1, sum)
            ]);
            return {
                q: `Two fair dice are thrown. The probability that the sum is ${sum} is`,
                o,
                a,
                s: `The number of outcomes with sum ${sum} is ${favourable}. Total outcomes = 36. Probability = ${correct}.`
            };
        },
        () => {
            const red = randomInt(3, 7);
            const blue = randomInt(2, 6);
            const correct = fractionText(nCr(red, 2), nCr(red + blue, 2));
            const { o, a } = makeTextOptions(correct, [
                fractionText(red, red + blue),
                fractionText(nCr(blue, 2), nCr(red + blue, 2)),
                fractionText(2, red + blue)
            ]);
            return {
                q: `A bag contains ${red} red and ${blue} blue balls. Two balls are drawn without replacement. The probability that both are red is`,
                o,
                a,
                s: `Favourable selections = C(${red},2), total selections = C(${red + blue},2). Probability = ${correct}.`
            };
        }
    ],
    "Statistics": [
        () => {
            const start = randomInt(2, 12);
            const diff = randomInt(2, 6);
            const values = [start, start + diff, start + 2 * diff, start + 3 * diff, start + 4 * diff];
            const mean = start + 2 * diff;
            const { o, a } = makeTextOptions(mean, [mean - diff, mean + diff, start + diff]);
            return {
                q: `The mean of ${values.join(', ')} is`,
                o,
                a,
                s: `These five values form an AP, so the mean is the middle term: ${mean}.`
            };
        },
        () => {
            const mean = randomInt(4, 12);
            const spread = randomInt(1, 5);
            const values = [mean - spread, mean - spread, mean + spread, mean + spread];
            const variance = spread * spread;
            const { o, a } = makeTextOptions(variance, [variance + spread, Math.max(0, variance - spread), 2 * variance]);
            return {
                q: `The variance of the data ${values.join(', ')} is`,
                o,
                a,
                s: `The mean is ${mean}. Each value is ${spread} away from the mean, so each squared deviation is ${variance}. Hence variance = ${variance}.`
            };
        }
    ]
};

function getFilteredQuestions(ch) {
    const chapterQuestionLimit = typeof CHAPTER_QUESTION_LIMIT === 'number'
        ? CHAPTER_QUESTION_LIMIT
        : 100;
    return (chapters[ch] || []).slice(0, chapterQuestionLimit);
}

function getChapterQuestionCount(ch) {
    return getFilteredQuestions(ch).length;
}

function cloneQuizQuestion(question) {
    return {
        ...question,
        o: Array.isArray(question.o) ? [...question.o] : []
    };
}

function getChapterQuestionId(ch, index) {
    const chapterSlug = String(ch || 'chapter')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'chapter';
    return `${chapterSlug}-${index + 1}`;
}

function getQuestionPoolWithIds(ch) {
    return getFilteredQuestions(ch).map((question, index) => ({
        ...cloneQuizQuestion(question),
        questionId: getChapterQuestionId(ch, index)
    }));
}

function getRandomIndex(max) {
    if (max <= 0) return 0;

    if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
        const values = new Uint32Array(1);
        window.crypto.getRandomValues(values);
        return values[0] % max;
    }

    return Math.floor(Math.random() * max);
}

function randomInt(min, max) {
    return min + getRandomIndex(max - min + 1);
}

function randomEvenInt(min, max) {
    const first = min % 2 === 0 ? min : min + 1;
    const count = Math.floor((max - first) / 2) + 1;
    return first + getRandomIndex(count) * 2;
}

function randomChoice(items) {
    return items[getRandomIndex(items.length)];
}

function range(start, end) {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

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

function fractionText(numerator, denominator) {
    if (denominator === 0) return 'undefined';
    const sign = numerator * denominator < 0 ? '-' : '';
    const n = Math.abs(numerator);
    const d = Math.abs(denominator);
    const divisor = gcd(n, d);
    const simplifiedN = n / divisor;
    const simplifiedD = d / divisor;
    return simplifiedD === 1 ? `${sign}${simplifiedN}` : `${sign}${simplifiedN}/${simplifiedD}`;
}

function nCr(n, r) {
    if (r < 0 || r > n) return 0;
    const k = Math.min(r, n - r);
    let value = 1;
    for (let i = 1; i <= k; i++) {
        value = value * (n - k + i) / i;
    }
    return Math.round(value);
}

function shuffleArray(items) {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = getRandomIndex(i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function hashStringToUint32(value) {
    const text = String(value || '');
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function createSeededRandom(seedText) {
    let seed = hashStringToUint32(seedText) || 1;
    return () => {
        seed += 0x6D2B79F5;
        let value = seed;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffleArrayWithSeed(items, seedText) {
    const shuffled = [...items];
    const random = createSeededRandom(seedText);
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function makeTextOptions(correctValue, distractorValues) {
    const correct = String(correctValue);
    const values = [correct];
    distractorValues.map(String).forEach((value) => {
        if (!values.includes(value)) values.push(value);
    });

    const numericCorrect = Number(correctValue);
    let offset = 1;
    while (values.length < 4 && Number.isFinite(numericCorrect)) {
        const fallback = String(numericCorrect + offset);
        if (!values.includes(fallback)) values.push(fallback);
        offset++;
    }

    const fractionMatch = correct.match(/^(-?\d+)\/(\d+)$/);
    if (fractionMatch) {
        const numerator = Number(fractionMatch[1]);
        const denominator = Number(fractionMatch[2]);
        let fractionOffset = 1;
        while (values.length < 4) {
            [fractionText(numerator + fractionOffset, denominator), fractionText(numerator, denominator + fractionOffset)]
                .forEach((fallback) => {
                    if (values.length < 4 && !values.includes(fallback)) values.push(fallback);
                });
            fractionOffset++;
        }
    }

    ['All real numbers', 'Cannot be determined', 'No solution', 'None of these'].forEach((fallback) => {
        if (values.length < 4 && !values.includes(fallback)) values.push(fallback);
    });

    while (values.length < 4) {
        const fallback = `Extra choice ${values.length + 1}`;
        if (!values.includes(fallback)) values.push(fallback);
    }

    const distractors = shuffleArray(values.filter((value) => value !== correct)).slice(0, 3);
    const o = shuffleArray([correct, ...distractors]);
    return { o, a: o.indexOf(correct) };
}

function signedTerm(value, variable = '') {
    if (value === 0) return '';
    const absValue = Math.abs(value);
    return `${value > 0 ? ' + ' : ' - '}${absValue}${variable}`;
}

function circleEquationText(h, k, r) {
    const xPart = h >= 0 ? `(x - ${h})^2` : `(x + ${Math.abs(h)})^2`;
    const yPart = k >= 0 ? `(y - ${k})^2` : `(y + ${Math.abs(k)})^2`;
    return `${xPart} + ${yPart} = ${r * r}`;
}

function vectorText(x, y, z) {
    return `${x}i${signedTerm(y, 'j')}${signedTerm(z, 'k')}`;
}

function line3x4yText(c) {
    return c >= 0 ? `3x + 4y - ${c} = 0` : `3x + 4y + ${Math.abs(c)} = 0`;
}

function shuffleQuestions(questions) {
    const shuffled = questions.map(cloneQuizQuestion);
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = getRandomIndex(i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function getNumericalVariantTemplateCount(ch) {
    return (numericalVariantTemplates[ch] || []).length;
}

function isValidQuizQuestion(question) {
    return Boolean(
        question
        && question.q
        && Array.isArray(question.o)
        && question.o.length === 4
        && Number.isInteger(question.a)
        && question.a >= 0
        && question.a < question.o.length
        && question.s
    );
}

function generateNumericalVariants(ch) {
    const templates = numericalVariantTemplates[ch] || [];
    return shuffleArray(templates)
        .slice(0, Math.min(NUMERICAL_VARIANTS_PER_ATTEMPT, templates.length))
        .map((template) => {
            try {
                return {
                    ...template(),
                    generatedVariant: true
                };
            } catch (error) {
                console.error('Failed to generate numerical variant:', error);
                return null;
            }
        })
        .filter(isValidQuizQuestion);
}

function getChapterPartCount(ch) {
    const total = getFilteredQuestions(ch).length;
    return Math.max(1, Math.ceil(total / CHAPTER_PART_SIZE));
}

function getChapterPartInfo(ch, partNumber = 1) {
    const totalQuestions = getFilteredQuestions(ch).length;
    const totalParts = getChapterPartCount(ch);
    const safePartNumber = Math.min(Math.max(Number(partNumber) || 1, 1), totalParts);
    const questionCount = Math.min(CHAPTER_PART_SIZE, totalQuestions);
    return {
        partNumber: safePartNumber,
        totalParts,
        totalQuestions,
        startIndex: 0,
        endIndex: questionCount,
        questionCount,
        label: `Part ${safePartNumber} (${questionCount} random questions)`
    };
}

function getChapterPartQuestions(ch, partNumber = 1) {
    const totalParts = getChapterPartCount(ch);
    const safePartNumber = Math.min(Math.max(Number(partNumber) || 1, 1), totalParts);
    const startIndex = (safePartNumber - 1) * CHAPTER_PART_SIZE;
    const endIndex = Math.min(startIndex + CHAPTER_PART_SIZE, getFilteredQuestions(ch).length);
    return getQuestionPoolWithIds(ch)
        .slice(startIndex, endIndex)
        .map(cloneQuizQuestion);
}

function getQuizQuestionsForAttempt(ch, partNumber = 1, quizSeed = '') {
    const seed = String(quizSeed || '').trim();
    if (!seed) return getChapterPartQuestions(ch, partNumber);

    const partInfo = getChapterPartInfo(ch, partNumber);
    return shuffleArrayWithSeed(
        getQuestionPoolWithIds(ch),
        `${ch}|part:${partInfo.partNumber}|seed:${seed}`
    )
        .slice(0, partInfo.questionCount)
        .map(cloneQuizQuestion);
}

function getQuizQuestionsByIds(ch, questionIds = []) {
    if (!Array.isArray(questionIds) || questionIds.length === 0) return [];

    const questionMap = new Map(
        getQuestionPoolWithIds(ch).map((question) => [question.questionId, question])
    );

    return questionIds
        .slice(0, CHAPTER_PART_SIZE)
        .map((id) => questionMap.get(String(id || '').trim()))
        .filter(Boolean)
        .map(cloneQuizQuestion);
}

function getPausedQuestionList(pausedState) {
    if (Array.isArray(pausedState?.qList) && pausedState.qList.length > 0) {
        return pausedState.qList.map(cloneQuizQuestion);
    }

    if (Array.isArray(pausedState?.questionIds) && pausedState.questionIds.length > 0) {
        return getQuizQuestionsByIds(pausedState?.chapter, pausedState.questionIds);
    }

    return getQuizQuestionsForAttempt(
        pausedState?.chapter,
        pausedState?.partNumber || 1,
        pausedState?.quizSeed || ''
    );
}

function gradeQuiz(questions, answers = [], timedOutQuestions = [], marked = [], startingBalance = 0) {
    let score = 0;
    let incorrectCount = 0;
    let timedOutCount = 0;
    let unattemptedCount = 0;
    let attemptedCount = 0;
    let runningReviewPoints = 0;
    let runningCashBalance = Math.max(0, Number(startingBalance) || 0);

    const review = questions.map((question, index) => {
        const rawAnswer = answers[index];
        const userAnswerIndex = Number.isInteger(rawAnswer) ? rawAnswer : null;
        const attempted = userAnswerIndex !== null;
        const timedOut = Boolean(timedOutQuestions[index]);
        const correct = attempted && userAnswerIndex === question.a;
        let statusLabel = 'Not Attempted';
        let pointsLabel = 'No cash earned.';
        let pointsColor = 'var(--text-secondary)';

        if (correct) {
            score++;
            attemptedCount++;
            statusLabel = 'Correct';
            runningCashBalance += POINTS_PER_QUESTION;
            runningReviewPoints += POINTS_PER_QUESTION;
            pointsLabel = '+' + POINTS_PER_QUESTION + ' cash earned.';
            pointsColor = 'var(--success)';
        } else if (attempted) {
            attemptedCount++;
            incorrectCount++;
            statusLabel = 'Incorrect';
            const deduction = Math.min(INCORRECT_POINTS_PENALTY, runningCashBalance);
            if (deduction > 0) {
                runningCashBalance -= deduction;
                runningReviewPoints -= deduction;
                pointsColor = 'var(--danger)';
                pointsLabel = '-' + deduction + ' cash deducted.';
            } else {
                pointsLabel = 'No cash deducted because balance is 0.';
            }
        } else if (timedOut) {
            timedOutCount++;
            statusLabel = 'Timed Out';
            pointsLabel = 'Time expired. This question was locked and could not be attempted again.';
        } else {
            unattemptedCount++;
        }

        return {
            q: question.q,
            o: Array.isArray(question.o) ? [...question.o] : [],
            userAnswerIndex,
            userAnswer: attempted ? question.o[userAnswerIndex] : timedOut ? 'Time expired' : 'Not attempted',
            correctAnswerIndex: question.a,
            correctAnswer: question.o[question.a],
            correct,
            attempted,
            timedOut,
            marked: Boolean(marked[index]),
            statusLabel,
            pointsLabel,
            pointsColor,
            runningReviewPoints,
            runningCashBalance,
            solution: question.s
        };
    });

    const total = questions.length;
    const accuracy = total ? Math.round((score / total) * 100) : 0;

    return {
        score,
        total,
        accuracy,
        points: runningReviewPoints,
        attemptedCount,
        incorrectCount,
        timedOutCount,
        unattemptedCount,
        review
    };
}

function getChapterNames() {
    return Object.keys(chapters);
}

