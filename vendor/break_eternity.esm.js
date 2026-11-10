var B = Object.defineProperty;
var R = (c, t, e) => t in c ? B(c, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : c[t] = e;
var C = (c, t, e) => (R(c, typeof t != "symbol" ? t + "" : t, e), e);
class v {
  /**
   * @param maxSize The maximum size for this cache. We recommend setting this
   * to be one less than a power of 2, as most hashtables - including V8's
   * Object hashtable (https://crsrc.org/c/v8/src/objects/ordered-hash-table.cc)
   * - uses powers of two for hashtable sizes. It can't exactly be a power of
   * two, as a .set() call could temporarily set the size of the map to be
   * maxSize + 1.
   */
  constructor(t) {
    C(this, "map", /* @__PURE__ */ new Map());
    // Invariant: Exactly one of the below is true before and after calling a
    // LRUCache method:
    // - first and last are both undefined, and map.size() is 0.
    // - first and last are the same object, and map.size() is 1.
    // - first and last are different objects, and map.size() is greater than 1.
    C(this, "first");
    C(this, "last");
    C(this, "maxSize");
    this.maxSize = t;
  }
  get size() {
    return this.map.size;
  }
  /**
   * Gets the specified key from the cache, or undefined if it is not in the
   * cache.
   * @param key The key to get.
   * @returns The cached value, or undefined if key is not in the cache.
   */
  get(t) {
    const e = this.map.get(t);
    if (e !== void 0)
      return e !== this.first && (e === this.last ? (this.last = e.prev, this.last.next = void 0) : (e.prev.next = e.next, e.next.prev = e.prev), e.next = this.first, this.first.prev = e, this.first = e), e.value;
  }
  /**
   * Sets an entry in the cache.
   *
   * @param key The key of the entry.
   * @param value The value of the entry.
   * @throws Error, if the map already contains the key.
   */
  set(t, e) {
    if (this.maxSize < 1)
      return;
    if (this.map.has(t))
      throw new Error("Cannot update existing keys in the cache");
    const i = new W(t, e);
    for (this.first === void 0 ? (this.first = i, this.last = i) : (i.next = this.first, this.first.prev = i, this.first = i), this.map.set(t, i); this.map.size > this.maxSize; ) {
      const s = this.last;
      this.map.delete(s.key), this.last = s.prev, this.last.next = void 0;
    }
  }
}
class W {
  constructor(t, e) {
    C(this, "key");
    C(this, "value");
    C(this, "next");
    C(this, "prev");
    this.key = t, this.value = e;
  }
}
const z = 17, O = 9e15, $ = Math.log10(9e15), L = 1 / 9e15, j = 308, H = -324, D = 5, J = (1 << 10) - 1, K = function() {
  const c = [];
  for (let e = H + 1; e <= j; e++)
    c.push(Number("1e" + e));
  const t = 323;
  return function(e) {
    return c[e + t];
  };
}(), k = [2, Math.E, 3, 4, 5, 6, 7, 8, 9, 10], Q = [
  [
    // Base 2 (using http://myweb.astate.edu/wpaulsen/tetcalc/tetcalc.html )
    1,
    1.0891180521811203,
    1.1789767925673957,
    1.2701455431742086,
    1.3632090180450092,
    1.4587818160364217,
    1.5575237916251419,
    1.6601571006859253,
    1.767485818836978,
    1.8804192098842727,
    2
  ],
  [
    // Base E (using http://myweb.astate.edu/wpaulsen/tetcalc/tetcalc.html )
    1,
    //0.0
    1.1121114330934079,
    //0.1
    1.231038924931609,
    //0.2
    1.3583836963111375,
    //0.3
    1.4960519303993531,
    //0.4
    1.6463542337511945,
    //0.5
    1.8121385357018724,
    //0.6
    1.996971324618307,
    //0.7
    2.2053895545527546,
    //0.8
    2.4432574483385254,
    //0.9
    Math.E
    //1.0
  ],
  [
    // Base 3
    1,
    1.1187738849693603,
    1.2464963939368214,
    1.38527004705667,
    1.5376664685821402,
    1.7068895236551784,
    1.897001227148399,
    2.1132403089001035,
    2.362480153784171,
    2.6539010333870774,
    3
  ],
  [
    // Base 4
    1,
    1.1367350847096405,
    1.2889510672956703,
    1.4606478703324786,
    1.6570295196661111,
    1.8850062585672889,
    2.1539465047453485,
    2.476829779693097,
    2.872061932789197,
    3.3664204535587183,
    4
  ],
  [
    // Base 5
    1,
    1.1494592900767588,
    1.319708228183931,
    1.5166291280087583,
    1.748171114438024,
    2.0253263297298045,
    2.3636668498288547,
    2.7858359149579424,
    3.3257226212448145,
    4.035730287722532,
    5
  ],
  [
    // Base 6
    1,
    1.159225940787673,
    1.343712473580932,
    1.5611293155111927,
    1.8221199554561318,
    2.14183924486326,
    2.542468319282638,
    3.0574682501653316,
    3.7390572020926873,
    4.6719550537360774,
    6
  ],
  [
    // Base 7
    1,
    1.1670905356972596,
    1.3632807444991446,
    1.5979222279405536,
    1.8842640123816674,
    2.2416069644878687,
    2.69893426559423,
    3.3012632110403577,
    4.121250340630164,
    5.281493033448316,
    7
  ],
  [
    // Base 8
    1,
    1.1736630594087796,
    1.379783782386201,
    1.6292821855668218,
    1.9378971836180754,
    2.3289975651071977,
    2.8384347394720835,
    3.5232708454565906,
    4.478242031114584,
    5.868592169644505,
    8
  ],
  [
    // Base 9
    1,
    1.1793017514670474,
    1.394054150657457,
    1.65664127441059,
    1.985170999970283,
    2.4069682290577457,
    2.9647310119960752,
    3.7278665320924946,
    4.814462547283592,
    6.436522247411611,
    9
  ],
  [
    // Base 10 (using http://myweb.astate.edu/wpaulsen/tetcalc/tetcalc.html )
    1,
    1.1840100246247336,
    1.4061375836156955,
    1.6802272208863964,
    2.026757028388619,
    2.4770056063449646,
    3.080525271755482,
    3.9191964192627284,
    5.135152840833187,
    6.989961179534715,
    10
  ]
], X = [
  [
    // Base 2
    -1,
    -0.9194161097107025,
    -0.8335625019330468,
    -0.7425599821143978,
    -0.6466611521029437,
    -0.5462617907227869,
    -0.4419033816638769,
    -0.3342645487554494,
    -0.224140440909962,
    -0.11241087890006762,
    0
  ],
  [
    // Base E
    -1,
    //0.0
    -0.90603157029014,
    //0.1
    -0.80786507256596,
    //0.2
    -0.7064666939634,
    //0.3
    -0.60294836853664,
    //0.4
    -0.49849837513117,
    //0.5
    -0.39430303318768,
    //0.6
    -0.29147201034755,
    //0.7
    -0.19097820800866,
    //0.8
    -0.09361896280296,
    //0.9
    0
    //1.0
  ],
  [
    // Base 3
    -1,
    -0.9021579584316141,
    -0.8005762598234203,
    -0.6964780623319391,
    -0.5911906810998454,
    -0.486050182576545,
    -0.3823089430815083,
    -0.28106046722897615,
    -0.1831906535795894,
    -0.08935809204418144,
    0
  ],
  [
    // Base 4
    -1,
    -0.8917227442365535,
    -0.781258746326964,
    -0.6705130326902455,
    -0.5612813129406509,
    -0.4551067709033134,
    -0.35319256652135966,
    -0.2563741554088552,
    -0.1651412821106526,
    -0.0796919581982668,
    0
  ],
  [
    // Base 5
    -1,
    -0.8843387974366064,
    -0.7678744063886243,
    -0.6529563724510552,
    -0.5415870994657841,
    -0.4352842206588936,
    -0.33504449124791424,
    -0.24138853420685147,
    -0.15445285440944467,
    -0.07409659641336663,
    0
  ],
  [
    // Base 6
    -1,
    -0.8786709358426346,
    -0.7577735191184886,
    -0.6399546189952064,
    -0.527284921869926,
    -0.4211627631006314,
    -0.3223479611761232,
    -0.23107655627789858,
    -0.1472057700818259,
    -0.07035171210706326,
    0
  ],
  [
    // Base 7
    -1,
    -0.8740862815291583,
    -0.7497032990976209,
    -0.6297119746181752,
    -0.5161838335958787,
    -0.41036238255751956,
    -0.31277212146489963,
    -0.2233976621705518,
    -0.1418697367979619,
    -0.06762117662323441,
    0
  ],
  [
    // Base 8
    -1,
    -0.8702632331800649,
    -0.7430366914122081,
    -0.6213373075161548,
    -0.5072025698095242,
    -0.40171437727184167,
    -0.30517930701410456,
    -0.21736343968190863,
    -0.137710238299109,
    -0.06550774483471955,
    0
  ],
  [
    // Base 9
    -1,
    -0.8670016295947213,
    -0.7373984232432306,
    -0.6143173985094293,
    -0.49973884395492807,
    -0.394584953527678,
    -0.2989649949848695,
    -0.21245647317021688,
    -0.13434688362382652,
    -0.0638072667348083,
    0
  ],
  [
    // Base 10
    -1,
    -0.8641642839543857,
    -0.732534623168535,
    -0.6083127477059322,
    -0.4934049257184696,
    -0.3885773075899922,
    -0.29376029055315767,
    -0.2083678561173622,
    -0.13155653399373268,
    -0.062401588652553186,
    0
  ]
];
let h = function(t) {
  return y.fromValue_noAlloc(t);
}, g = function(c, t, e) {
  return y.fromComponents(c, t, e);
}, N = function(t, e, i) {
  return y.fromComponents_noNormalize(t, e, i);
};
const P = function(t, e) {
  const i = e + 1, s = Math.ceil(Math.log10(Math.abs(t))), a = Math.round(t * Math.pow(10, i - s)) * Math.pow(10, s - i);
  return parseFloat(a.toFixed(Math.max(i - s, 0)));
}, Z = function(c) {
  return Math.sign(c) * Math.log10(Math.abs(c));
}, _ = function(c) {
  if (!isFinite(c))
    return c;
  if (c < -50)
    return c === Math.trunc(c) ? Number.NEGATIVE_INFINITY : 0;
  let t = 1;
  for (; c < 10; )
    t = t * c, ++c;
  c -= 1;
  let e = 0.9189385332046727;
  e = e + (c + 0.5) * Math.log(c), e = e - c;
  const i = c * c;
  let s = c;
  return e = e + 1 / (12 * s), s = s * i, e = e - 1 / (360 * s), s = s * i, e = e + 1 / (1260 * s), s = s * i, e = e - 1 / (1680 * s), s = s * i, e = e + 1 / (1188 * s), s = s * i, e = e - 691 / (360360 * s), s = s * i, e = e + 7 / (1092 * s), s = s * i, e = e - 3617 / (122400 * s), Math.exp(e) / t;
}, tt = 0.36787944117144233, U = 0.5671432904097838, Y = function(c, t = 1e-10, e = !0) {
  let i, s;
  if (!Number.isFinite(c))
    return c;
  if (e) {
    if (c === 0)
      return c;
    if (c === 1)
      return U;
    c < 10 ? i = 0 : i = Math.log(c) - Math.log(Math.log(c));
  } else {
    if (c === 0)
      return -1 / 0;
    c <= -0.1 ? i = -2 : i = Math.log(-c) - Math.log(-Math.log(-c));
  }
  for (let a = 0; a < 100; ++a) {
    if (s = (c * Math.exp(-i) + i * i) / (i + 1), Math.abs(s - i) < t * Math.abs(s))
      return s;
    i = s;
  }
  throw Error(`Iteration failed to converge: ${c.toString()}`);
};
function G(c, t = 1e-10, e = !0) {
  let i, s, a, l;
  if (!Number.isFinite(c.mag))
    return new y(c);
  if (e) {
    if (c.eq(y.dZero))
      return N(0, 0, 0);
    if (c.eq(y.dOne))
      return y.fromNumber(U);
    i = y.ln(c);
  } else {
    if (c.eq(y.dZero))
      return new y(y.dNegInf);
    i = y.ln(c.neg());
  }
  for (let u = 0; u < 100; ++u) {
    if (s = i.neg().exp(), a = i.sub(c.mul(s)), l = i.sub(a.div(i.add(1).sub(i.add(2).mul(a).div(y.mul(2, i).add(2))))), y.abs(l.sub(i)).lt(y.abs(l).mul(t)))
      return l;
    i = l;
  }
  throw Error(`Iteration failed to converge: ${c.toString()}`);
}
const r = class {
  constructor(t) {
    C(this, "sign", 0);
    C(this, "mag", 0);
    C(this, "layer", 0);
    t instanceof r ? this.fromDecimal(t) : typeof t == "number" ? this.fromNumber(t) : typeof t == "string" && this.fromString(t);
  }
  get m() {
    if (this.sign === 0)
      return 0;
    if (this.layer === 0) {
      const t = Math.floor(Math.log10(this.mag));
      let e;
      return this.mag === 5e-324 ? e = 5 : e = this.mag / K(t), this.sign * e;
    } else if (this.layer === 1) {
      const t = this.mag - Math.floor(this.mag);
      return this.sign * Math.pow(10, t);
    } else
      return this.sign;
  }
  set m(t) {
    this.layer <= 2 ? this.fromMantissaExponent(t, this.e) : (this.sign = Math.sign(t), this.sign === 0 && (this.layer = 0, this.exponent = 0));
  }
  get e() {
    return this.sign === 0 ? 0 : this.layer === 0 ? Math.floor(Math.log10(this.mag)) : this.layer === 1 ? Math.floor(this.mag) : this.layer === 2 ? Math.floor(Math.sign(this.mag) * Math.pow(10, Math.abs(this.mag))) : this.mag * Number.POSITIVE_INFINITY;
  }
  set e(t) {
    this.fromMantissaExponent(this.m, t);
  }
  get s() {
    return this.sign;
  }
  set s(t) {
    t === 0 ? (this.sign = 0, this.layer = 0, this.mag = 0) : this.sign = t;
  }
  // Object.defineProperty(Decimal.prototype, "mantissa", {
  get mantissa() {
    return this.m;
  }
  set mantissa(t) {
    this.m = t;
  }
  get exponent() {
    return this.e;
  }
  set exponent(t) {
    this.e = t;
  }
  /**
   * Turns the given components into a valid Decimal.
   */
  static fromComponents(t, e, i) {
    return new r().fromComponents(t, e, i);
  }
  /**
   * Turns the given components into a Decimal, but not necessarily a valid one (it's only valid if the components would already create a valid Decimal without normalization). Users of this library should not use this function.
   */
  static fromComponents_noNormalize(t, e, i) {
    return new r().fromComponents_noNormalize(t, e, i);
  }
  /**
   * Turns the mantissa and exponent into a valid Decimal with value mantissa * 10^exponent.
   */
  static fromMantissaExponent(t, e) {
    return new r().fromMantissaExponent(t, e);
  }
  /**
   * Turns the mantissa and exponent into a Decimal, but not necessarily a valid one. Users of this library should not use this function.
   */
  static fromMantissaExponent_noNormalize(t, e) {
    return new r().fromMantissaExponent_noNormalize(t, e);
  }
  /**
   * Creates a deep copy of the provided value.
   */
  static fromDecimal(t) {
    return new r().fromDecimal(t);
  }
  /**
   * Converts a floating-point number into a Decimal.
   */
  static fromNumber(t) {
    return new r().fromNumber(t);
  }
  /**
   * Converts a string into a Decimal.
   * 
   * If linearhyper4 is true, then strings like "10^^8.5" will use the linear approximation of tetration even for bases <= 10.
   */
  static fromString(t, e = !1) {
    return new r().fromString(t, e);
  }
  /**
   * The function used by new Decimal() to create a new Decimal. Accepts a DecimalSource: uses fromNumber if given a number, uses fromString if given a string, and uses fromDecimal if given a Decimal.
   */
  static fromValue(t) {
    return new r().fromValue(t);
  }
  /**
   * Converts a DecimalSource to a Decimal, without constructing a new Decimal
   * if the provided value is already a Decimal.
   *
   * As the return value could be the provided value itself, this function
   * returns a read-only Decimal to prevent accidental mutations of the value.
   * Use `new Decimal(value)` to explicitly create a writeable copy if mutation
   * is required.
   */
  static fromValue_noAlloc(t) {
    if (t instanceof r)
      return t;
    if (typeof t == "string") {
      const e = r.fromStringCache.get(t);
      return e !== void 0 ? e : r.fromString(t);
    } else
      return typeof t == "number" ? r.fromNumber(t) : N(0, 0, 0);
  }
  /**
   * Absolute value function: returns 'value' if 'value' >= 0, returns the negative of 'value' if 'value' < 0.
   */
  static abs(t) {
    return h(t).abs();
  }
  /**
   * Returns the negative of the given value.
   */
  static neg(t) {
    return h(t).neg();
  }
  /**
   * Returns the negative of the given value.
   */
  static negate(t) {
    return h(t).neg();
  }
  /**
   * Returns the negative of the given value.
   */
  static negated(t) {
    return h(t).neg();
  }
  /**
   * Returns the sign of the given value.
   */
  static sign(t) {
    return h(t).sign;
  }
  /**
   * Returns the sign of the given value.
   */
  static sgn(t) {
    return h(t).sign;
  }
  /**
   * Rounds the value to the nearest integer.
   */
  static round(t) {
    return h(t).round();
  }
  /**
   * "Rounds" the value to the nearest integer that's less than or equal to it.
   */
  static floor(t) {
    return h(t).floor();
  }
  /**
   * "Rounds" the value to the nearest integer that's greater than or equal to it.
   */
  static ceil(t) {
    return h(t).ceil();
  }
  /**
   * Extracts the integer part of the Decimal and returns it. Behaves like floor on positive numbers, but behaves like ceiling on negative numbers.
   */
  static trunc(t) {
    return h(t).trunc();
  }
  /**
   * Addition: returns the sum of the two Decimals.
   */
  static add(t, e) {
    return h(t).add(e);
  }
  /**
   * Addition: returns the sum of the two Decimals.
   */
  static plus(t, e) {
    return h(t).add(e);
  }
  /**
   * Subtraction: returns the difference between 'value' and 'other'.
   */
  static sub(t, e) {
    return h(t).sub(e);
  }
  /**
   * Subtraction: returns the difference between 'value' and 'other'.
   */
  static subtract(t, e) {
    return h(t).sub(e);
  }
  /**
   * Subtraction: returns the difference between 'value' and 'other'.
   */
  static minus(t, e) {
    return h(t).sub(e);
  }
  /**
   * Multiplication: returns the product of the two Decimals.
   */
  static mul(t, e) {
    return h(t).mul(e);
  }
  /**
   * Multiplication: returns the product of the two Decimals.
   */
  static multiply(t, e) {
    return h(t).mul(e);
  }
  /**
   * Multiplication: returns the product of the two Decimals.
   */
  static times(t, e) {
    return h(t).mul(e);
  }
  /**
   * Division: returns the quotient of 'value' and 'other'.
   */
  static div(t, e) {
    return h(t).div(e);
  }
  /**
   * Division: returns the quotient of 'value' and 'other'.
   */
  static divide(t, e) {
    return h(t).div(e);
  }
  /**
   * Returns the reciprocal (1 / X) of the given value.
   */
  static recip(t) {
    return h(t).recip();
  }
  /**
   * Returns the reciprocal (1 / X) of the given value.
   */
  static reciprocal(t) {
    return h(t).recip();
  }
  /**
   * Returns the reciprocal (1 / X) of the given value.
   */
  static reciprocate(t) {
    return h(t).reciprocate();
  }
  /**
   * Returns the remainder of 'this' divided by 'value': for example, 5 mod 2 = 1, because the remainder of 5 / 2 is 1.
   * Uses the "truncated division" modulo, which is the same as JavaScript's native modulo operator (%)...
   * unless 'floored' is true, in which case it uses the "floored" modulo, which is closer to how modulo works in number theory.
   * These two forms of modulo are the same when only positive numbers are involved, but differ in how they work with negative numbers.
   */
  static mod(t, e, i = !1) {
    return h(t).mod(e, i);
  }
  /**
   * Returns the remainder of 'this' divided by 'value': for example, 5 mod 2 = 1, because the remainder of 5 / 2 is 1.
   * Uses the "truncated division" modulo, which is the same as JavaScript's native modulo operator (%)...
   * unless 'floored' is true, in which case it uses the "floored" modulo, which is closer to how modulo works in number theory.
   * These two forms of modulo are the same when only positive numbers are involved, but differ in how they work with negative numbers.
   */
  static modulo(t, e, i = !1) {
    return h(t).modulo(e, i);
  }
  /**
   * Returns the remainder of 'this' divided by 'value': for example, 5 mod 2 = 1, because the remainder of 5 / 2 is 1.
   * Uses the "truncated division" modulo, which is the same as JavaScript's native modulo operator (%)...
   * unless 'floored' is true, in which case it uses the "floored" modulo, which is closer to how modulo works in number theory.
   * These two forms of modulo are the same when only positive numbers are involved, but differ in how they work with negative numbers.
   */
  static modular(t, e, i = !1) {
    return h(t).modular(e, i);
  }
  /**
   * Returns 1 if 'value' > 'other', returns -1 if 'value' < 'other', returns 0 if 'value' == 'other'.
   */
  static cmp(t, e) {
    return h(t).cmp(e);
  }
  /**
   * Compares the absolute values of this and value.
   * Returns 1 if |'value'| > |'other'|, returns -1 if |'value'| < |'other'|, returns 0 if |'value'| == |'other'|.
   */
  static cmpabs(t, e) {
    return h(t).cmpabs(e);
  }
  /**
   * Returns 1 if 'value' > 'other', returns -1 if 'value' < 'other', returns 0 if 'value' == 'other'.
   */
  static compare(t, e) {
    return h(t).cmp(e);
  }
  /**
   * Returns true if the given value is an NaN value.
   */
  static isNaN(t) {
    return t = h(t), isNaN(t.sign) || isNaN(t.layer) || isNaN(t.mag);
  }
  /**
   * Returns true if the given value is finite (by Decimal standards, not by floating point standards - a humongous Decimal like 10^^10^100 is still finite!)
   */
  static isFinite(t) {
    return t = h(t), isFinite(t.sign) && isFinite(t.layer) && isFinite(t.mag);
  }
  /**
   * The Decimal equivalent of ==. Returns true if 'value' and 'other' have equal values.
   */
  static eq(t, e) {
    return h(t).eq(e);
  }
  /**
   * Returns true if 'value' and 'other' have equal values.
   */
  static equals(t, e) {
    return h(t).eq(e);
  }
  /**
   * The Decimal equivalent of !=. Returns true if 'value' and 'other' do not have equal values.
   */
  static neq(t, e) {
    return h(t).neq(e);
  }
  /**
   * Returns true if 'value' and 'other' do not have equal values.
   */
  static notEquals(t, e) {
    return h(t).notEquals(e);
  }
  /**
   * The Decimal equivalent of <. Returns true if 'value' is less than 'other'.
   */
  static lt(t, e) {
    return h(t).lt(e);
  }
  /**
   * The Decimal equivalent of <=. Returns true if 'value' is less than or equal to 'other'.
   */
  static lte(t, e) {
    return h(t).lte(e);
  }
  /**
   * The Decimal equivalent of >. Returns true if 'value' is greater than 'other'.
   */
  static gt(t, e) {
    return h(t).gt(e);
  }
  /**
   * The Decimal equivalent of >=. Returns true if 'value' is greater than or equal to 'other'.
   */
  static gte(t, e) {
    return h(t).gte(e);
  }
  /**
   * Returns whichever of 'value' and 'other' is higher.
   */
  static max(t, e) {
    return h(t).max(e);
  }
  /**
   * Returns whichever of 'value' and 'other' is lower.
   */
  static min(t, e) {
    return h(t).min(e);
  }
  /**
   * Returns whichever of 'value' and 'other' has a larger absolute value.
   */
  static minabs(t, e) {
    return h(t).minabs(e);
  }
  /**
   * Returns whichever of 'value' and 'other' has a smaller absolute value.
   */
  static maxabs(t, e) {
    return h(t).maxabs(e);
  }
  /**
   * A combination of minimum and maximum: the value returned by clamp is normally 'value', but it won't go below 'min' and it won't go above 'max'.
   * Therefore, if 'value' < 'min', then 'min' is returned, and if 'value' > 'max', then 'max' is returned.
   */
  static clamp(t, e, i) {
    return h(t).clamp(e, i);
  }
  /**
   * Returns 'value', unless 'value' is less than 'min', in which case 'min' is returned.
   */
  static clampMin(t, e) {
    return h(t).clampMin(e);
  }
  /**
   * Returns 'value', unless 'value' is greater than 'max', in which case 'max' is returned.
   */
  static clampMax(t, e) {
    return h(t).clampMax(e);
  }
  /**
   * Returns 1 if 'value' is greater than 'other', returns -1 if 'value' is less than 'other', returns 0 if 'value' is equal to 'other'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  static cmp_tolerance(t, e, i) {
    return h(t).cmp_tolerance(e, i);
  }
  /**
   * Returns 1 if 'value' is greater than 'other', returns -1 if 'value' is less than 'other', returns 0 if 'value' is equal to 'other'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  static compare_tolerance(t, e, i) {
    return h(t).cmp_tolerance(e, i);
  }
  /**
   * Tests whether two Decimals are approximately equal, up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  static eq_tolerance(t, e, i) {
    return h(t).eq_tolerance(e, i);
  }
  /**
   * Tests whether two Decimals are approximately equal, up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  static equals_tolerance(t, e, i) {
    return h(t).eq_tolerance(e, i);
  }
  /**
   * Tests whether two Decimals are not approximately equal, up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  static neq_tolerance(t, e, i) {
    return h(t).neq_tolerance(e, i);
  }
  /**
   * Tests whether two Decimals are not approximately equal, up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  static notEquals_tolerance(t, e, i) {
    return h(t).notEquals_tolerance(e, i);
  }
  /**
   * Returns true if 'value' is less than 'other'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  static lt_tolerance(t, e, i) {
    return h(t).lt_tolerance(e, i);
  }
  /**
   * Returns true if 'value' is less than or equal to 'other'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  static lte_tolerance(t, e, i) {
    return h(t).lte_tolerance(e, i);
  }
  /**
   * Returns true if 'value' is greater than 'other'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  static gt_tolerance(t, e, i) {
    return h(t).gt_tolerance(e, i);
  }
  /**
   * Returns true if 'value' is greater than or equal to 'other'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  static gte_tolerance(t, e, i) {
    return h(t).gte_tolerance(e, i);
  }
  /**
   * "Positive log10": Returns the base-10 logarithm of nonnegative Decimals, but returns 0 for negative Decimals. 
   */
  static pLog10(t) {
    return h(t).pLog10();
  }
  /**
   * Returns the base-10 logarithm of abs('value').
   */
  static absLog10(t) {
    return h(t).absLog10();
  }
  /**
   * Base-10 logarithm: returns the Decimal X such that 10^X = 'value'.
   * For numbers above layer 0, this is equivalent to subtracting 1 from layer and normalizing.
   */
  static log10(t) {
    return h(t).log10();
  }
  /**
   * Logarithms are one of the inverses of exponentiation: this function finds the Decimal X such that base^X = 'value'.
   */
  static log(t, e) {
    return h(t).log(e);
  }
  /**
   * Base-2 logarithm: returns the Decimal X such that 2^X = 'value'.
   */
  static log2(t) {
    return h(t).log2();
  }
  /**
   * Base-e logarithm, also known as the "natural" logarithm: returns the Decimal X such that e^X = 'value'.
   */
  static ln(t) {
    return h(t).ln();
  }
  /**
   * Logarithms are one of the inverses of exponentiation: this function finds the Decimal X such that base^X = 'value'.
   */
  static logarithm(t, e) {
    return h(t).logarithm(e);
  }
  /**
   * Exponentiation: Returns the result of 'value' ^ 'other' (often written as 'value' ** 'other' in programming languages).
   */
  static pow(t, e) {
    return h(t).pow(e);
  }
  /**
   * Raises 10 to the power of 'value', i.e. (10^'value'). For positive numbers above 1, this is equivalent to adding 1 to the value's layer and normalizing.
   */
  static pow10(t) {
    return h(t).pow10();
  }
  /**
   * Roots are one of the inverses of exponentiation: this function finds the Decimal X such that X ^ 'other' = 'value'.
   * Equivalent to 'value' ^ (1 / 'other'), which is written here as value.pow(other.recip()).
   */
  static root(t, e) {
    return h(t).root(e);
  }
  /**
   * For positive integers, X factorial (written as X!) equals X * (X - 1) * (X - 2) *... * 3 * 2 * 1. 0! equals 1.
   * This can be extended to real numbers (except for negative integers) via the gamma function, which is what this function does.
   */
  static factorial(t, e) {
    return h(t).factorial();
  }
  /**
   * The gamma function extends the idea of factorials to non-whole numbers using some calculus.
   * Gamma(x) is defined as the integral of t^(x-1) * e^-t dt from t = 0 to t = infinity,
   * and gamma(x) = (x - 1)! for nonnegative integer x, so the factorial for non-whole numbers is defined using the gamma function.
   */
  static gamma(t, e) {
    return h(t).gamma();
  }
  /**
   * Returns the natural (base-e) logarithm of Gamma('value').
   */
  static lngamma(t, e) {
    return h(t).lngamma();
  }
  /**
   * Base-e exponentiation: returns e^'value'.
   */
  static exp(t) {
    return h(t).exp();
  }
  /**
   * Squaring a number means multiplying it by itself, a.k.a. raising it to the second power.
   */
  static sqr(t) {
    return h(t).sqr();
  }
  /**
   * Square root: finds the Decimal X such that X * X, a.k.a X^2, equals 'value'. Equivalent to X^(1/2).
   */
  static sqrt(t) {
    return h(t).sqrt();
  }
  /**
   * Cubing a number means raising it to the third power.
   */
  static cube(t) {
    return h(t).cube();
  }
  /**
   * Cube root: finds the Decimal X such that X^3 equals 'value'. Equivalent to X^(1/3).
   */
  static cbrt(t) {
    return h(t).cbrt();
  }
  /**
   *
   * Tetration: The result of exponentiating 'value' to 'value' 'height' times in a row.  https://en.wikipedia.org/wiki/Tetration
   * 
   * If payload != 1, then this is 'iterated exponentiation', the result of exping 'payload' to base 'value' 'height' times. https://andydude.github.io/tetration/archives/tetration2/ident.html
   * 
   * Works with negative and positive real heights. Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  static tetrate(t, e = 2, i = N(1, 0, 1), s = !1) {
    return h(t).tetrate(e, i, s);
  }
  /**
   * Iterated exponentiation, the result of exping 'payload' to base 'value' 'height' times. https://andydude.github.io/tetration/archives/tetration2/ident.html
   * 
   * Works with negative and positive real heights. Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   * 
   * Identical to tetrate.
   */
  static iteratedexp(t, e = 2, i = N(1, 0, 1), s = !1) {
    return h(t).iteratedexp(e, i, s);
  }
  /**
   * iterated log/repeated log: The result of applying log(base) 'times' times in a row. Approximately equal to subtracting 'times' from the number's slog representation. Equivalent to tetrating to a negative height.
   * 
   * Works with negative and positive real heights. Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  static iteratedlog(t, e = 10, i = 1, s = !1) {
    return h(t).iteratedlog(e, i, s);
  }
  /**
   * Adds/removes layers from a Decimal, even fractional layers (e.g. its slog10 representation). Very similar to tetrate base 10 and iterated log base 10.
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  static layeradd10(t, e, i = !1) {
    return h(t).layeradd10(e, i);
  }
  /**
   * layeradd: like adding 'diff' to the number's slog(base) representation. Very similar to tetrate base 'base' and iterated log base 'base'.
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  static layeradd(t, e, i = 10, s = !1) {
    return h(t).layeradd(e, i, s);
  }
  /**
   * Super-logarithm, one of tetration's inverses, tells you what size power tower you'd have to tetrate 'base' to to get 'value'. https://en.wikipedia.org/wiki/Super-logarithm
   * 
   * By definition, will never be higher than 1.8e308 in break_eternity.js, since a power tower 1.8e308 numbers tall is the largest representable number.
   * 
   * Accepts a number of iterations (default is 100), and use binary search to, after making an initial guess, hone in on the true value, assuming tetration as the ground truth.
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  static slog(t, e = 10, i = !1) {
    return h(t).slog(e, 100, i);
  }
  /**
   * The Lambert W function, also called the omega function or product logarithm, is the solution W(x) === x*e^x.
   * https://en.wikipedia.org/wiki/Lambert_W_function
   * 
   * This is a multi-valued function in the complex plane, but only two branches matter for real numbers: the "principal branch" W0, and the "non-principal branch" W_-1.
   * W_0 works for any number >= -1/e, but W_-1 only works for negative numbers >= -1/e.
   * The "principal" parameter, which is true by default, decides which branch we're looking for: W_0 is used if principal is true, W_-1 is used if principal is false.
   */
  static lambertw(t, e) {
    return h(t).lambertw(e);
  }
  /**
   * The super square-root function - what number, tetrated to height 2, equals 'value'? https://en.wikipedia.org/wiki/Tetration#Super-root
   */
  static ssqrt(t) {
    return h(t).ssqrt();
  }
  /**
   * Super-root, one of tetration's inverses - what number, tetrated to height 'degree', equals 'value'? https://en.wikipedia.org/wiki/Tetration#Super-root
   * 
   * Only works with the linear approximation of tetration, as starting with analytic and then switching to linear would result in inconsistent behavior for super-roots.
   * This only matters for non-integer degrees.
   */
  static linear_sroot(t, e) {
    return h(t).linear_sroot(e);
  }
  /**
   * Pentation/pentate: The result of tetrating 'height' times in a row. An absurdly strong operator - Decimal.pentate(2, 4.28) and Decimal.pentate(10, 2.37) are already too huge for break_eternity.js!
   * https://en.wikipedia.org/wiki/Pentation
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   * 
   * For non-whole pentation heights, the linear approximation of pentation is always used, as there is no defined analytic approximation of pentation.
   */
  static pentate(t, e = 2, i = N(1, 0, 1), s = !1) {
    return h(t).pentate(e, i, s);
  }
  /**
   * Penta-logarithm, one of pentation's inverses, tells you what height you'd have to pentate 'base' to to get 'value'.
   * 
   * Grows incredibly slowly. For bases above 2, you won't be seeing a result greater than 5 out of this function.
   * 
   * Accepts a number of iterations (default is 100), and use binary search to, after making an initial guess, hone in on the true value, assuming pentation as the ground truth.
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   * 
   * For non-whole pentation heights, the linear approximation of pentation is always used, as there is no defined analytic approximation of pentation.
   */
  static penta_log(t, e = 10, i = !1) {
    return h(t).penta_log(e, 100, i);
  }
  /**
   * Penta-root, one of pentation's inverses - what number, pentated to height 'degree', equals 'value'?
   * 
   * Only works with the linear approximation of tetration, as starting with analytic and then switching to linear would result in inconsistent behavior for super-roots.
   */
  static linear_penta_root(t, e) {
    return h(t).linear_penta_root(e);
  }
  /**
   * The sine function, one of the main two trigonometric functions. Behaves periodically with period 2*pi.
   */
  static sin(t) {
    return h(t).sin();
  }
  /**
   * The cosine function, one of the main two trigonometric functions. Behaves periodically with period 2*pi.
   */
  static cos(t) {
    return h(t).cos();
  }
  /**
   * The tangent function, equal to sine divided by cosine. Behaves periodically with period pi.
   */
  static tan(t) {
    return h(t).tan();
  }
  /**
   * The arcsine function, the inverse of the sine function.
   */
  static asin(t) {
    return h(t).asin();
  }
  /**
   * The arccosine function, the inverse of the cosine function.
   */
  static acos(t) {
    return h(t).acos();
  }
  /**
   * The arctangent function, the inverse of the tangent function.
   */
  static atan(t) {
    return h(t).atan();
  }
  /**
   * Hyperbolic sine: sinh(X) = (e^x - e^-x)/2.
   */
  static sinh(t) {
    return h(t).sinh();
  }
  /**
   * Hyperbolic cosine: cosh(x) = (e^x + e^-x)/2.
   */
  static cosh(t) {
    return h(t).cosh();
  }
  /**
   * Hyperbolic tangent: tanh(x) = sinh(x)/cosh(x).
   */
  static tanh(t) {
    return h(t).tanh();
  }
  /**
   * Hyperbolic arcsine, the inverse of hyperbolic sine.
   */
  static asinh(t) {
    return h(t).asinh();
  }
  /**
   * Hyperbolic arccosine, the inverse of hyperbolic cosine.
   */
  static acosh(t) {
    return h(t).acosh();
  }
  /**
   * Hyperbolic arcctangent, the inverse of hyperbolic tangent.
   */
  static atanh(t) {
    return h(t).atanh();
  }
  /**
   * If you're willing to spend 'resourcesAvailable' and want to buy something
   * with exponentially increasing cost each purchase (start at priceStart,
   * multiply by priceRatio, already own currentOwned), how much of it can you buy?
   * Adapted from Trimps source code.
   */
  static affordGeometricSeries(t, e, i, s) {
    return this.affordGeometricSeries_core(
      h(t),
      h(e),
      h(i),
      s
    );
  }
  /**
   * How much resource would it cost to buy (numItems) items if you already have currentOwned,
   * the initial price is priceStart and it multiplies by priceRatio each purchase?
   */
  static sumGeometricSeries(t, e, i, s) {
    return this.sumGeometricSeries_core(t, h(e), h(i), s);
  }
  /**
   * If you're willing to spend 'resourcesAvailable' and want to buy something with additively
   * increasing cost each purchase (start at priceStart, add by priceAdd, already own currentOwned),
   * how much of it can you buy?
   */
  static affordArithmeticSeries(t, e, i, s) {
    return this.affordArithmeticSeries_core(
      h(t),
      h(e),
      h(i),
      h(s)
    );
  }
  /**
   * How much resource would it cost to buy (numItems) items if you already have currentOwned,
   * the initial price is priceStart and it adds priceAdd each purchase?
   * Adapted from http://www.mathwords.com/a/arithmetic_series.htm
   */
  static sumArithmeticSeries(t, e, i, s) {
    return this.sumArithmeticSeries_core(h(t), h(e), h(i), h(s));
  }
  /**
   * When comparing two purchases that cost (resource) and increase your resource/sec by (deltaRpS),
   * the lowest efficiency score is the better one to purchase.
   * From Frozen Cookies:
   * http://cookieclicker.wikia.com/wiki/Frozen_Cookies_(JavaScript_Add-on)#Efficiency.3F_What.27s_that.3F
   */
  static efficiencyOfPurchase(t, e, i) {
    return this.efficiencyOfPurchase_core(h(t), h(e), h(i));
  }
  static randomDecimalForTesting(t) {
    if (Math.random() * 20 < 1)
      return N(0, 0, 0);
    const e = Math.random() > 0.5 ? 1 : -1;
    if (Math.random() * 20 < 1)
      return N(e, 0, 1);
    const i = Math.floor(Math.random() * (t + 1));
    let s = i === 0 ? Math.random() * 616 - 308 : Math.random() * 16;
    Math.random() > 0.9 && (s = Math.trunc(s));
    let a = Math.pow(10, s);
    return Math.random() > 0.9 && (a = Math.trunc(a)), g(e, i, a);
  }
  static affordGeometricSeries_core(t, e, i, s) {
    const a = e.mul(i.pow(s));
    return r.floor(
      t.div(a).mul(i.sub(1)).add(1).log10().div(i.log10())
    );
  }
  static sumGeometricSeries_core(t, e, i, s) {
    return e.mul(i.pow(s)).mul(r.sub(1, i.pow(t))).div(r.sub(1, i));
  }
  static affordArithmeticSeries_core(t, e, i, s) {
    const l = e.add(s.mul(i)).sub(i.div(2)), u = l.pow(2);
    return l.neg().add(u.add(i.mul(t).mul(2)).sqrt()).div(i).floor();
  }
  static sumArithmeticSeries_core(t, e, i, s) {
    const a = e.add(s.mul(i));
    return t.div(2).mul(a.mul(2).plus(t.sub(1).mul(i)));
  }
  static efficiencyOfPurchase_core(t, e, i) {
    return t.div(e).add(t.div(i));
  }
  /**
   * Turns the Decimal into a valid Decimal. This function is meant for internal purposes - users of this library should not need to use normalize.
   * 
   * Note: this function mutates the Decimal it is called on.
   */
  normalize() {
    if (this.sign === 0 || this.mag === 0 && this.layer === 0 || this.mag === Number.NEGATIVE_INFINITY && this.layer > 0 && Number.isFinite(this.layer))
      return this.sign = 0, this.mag = 0, this.layer = 0, this;
    if (this.layer === 0 && this.mag < 0 && (this.mag = -this.mag, this.sign = -this.sign), this.mag === Number.POSITIVE_INFINITY || this.layer === Number.POSITIVE_INFINITY || this.mag === Number.NEGATIVE_INFINITY || this.layer === Number.NEGATIVE_INFINITY)
      return this.mag = Number.POSITIVE_INFINITY, this.layer = Number.POSITIVE_INFINITY, this;
    if (this.layer === 0 && this.mag < L)
      return this.layer += 1, this.mag = Math.log10(this.mag), this;
    let t = Math.abs(this.mag), e = Math.sign(this.mag);
    if (t >= O)
      return this.layer += 1, this.mag = e * Math.log10(t), this;
    for (; t < $ && this.layer > 0; )
      this.layer -= 1, this.layer === 0 ? this.mag = Math.pow(10, this.mag) : (this.mag = e * Math.pow(10, t), t = Math.abs(this.mag), e = Math.sign(this.mag));
    return this.layer === 0 && (this.mag < 0 ? (this.mag = -this.mag, this.sign = -this.sign) : this.mag === 0 && (this.sign = 0)), (Number.isNaN(this.sign) || Number.isNaN(this.layer) || Number.isNaN(this.mag)) && (this.sign = Number.NaN, this.layer = Number.NaN, this.mag = Number.NaN), this;
  }
  /**
   * Turns the given components into a valid Decimal.
   * 
   * Note: this function mutates the Decimal it is called on.
   */
  fromComponents(t, e, i) {
    return this.sign = t, this.layer = e, this.mag = i, this.normalize(), this;
  }
  /**
   * Turns the given components into a Decimal, but not necessarily a valid one (it's only valid if the components would already create a valid Decimal without normalization). Users of this library should not use this function.
   * 
   * Note: this function mutates the Decimal it is called on.
   */
  fromComponents_noNormalize(t, e, i) {
    return this.sign = t, this.layer = e, this.mag = i, this;
  }
  /**
   * Turns the mantissa and exponent into a valid Decimal with value mantissa * 10^exponent.
   * 
   * Note: this function mutates the Decimal it is called on.
   */
  fromMantissaExponent(t, e) {
    return this.layer = 1, this.sign = Math.sign(t), t = Math.abs(t), this.mag = e + Math.log10(t), this.normalize(), this;
  }
  /**
   * Turns the mantissa and exponent into a Decimal, but not necessarily a valid one. Users of this library should not use this function.
   * 
   * Note: this function mutates the Decimal it is called on.
   */
  fromMantissaExponent_noNormalize(t, e) {
    return this.fromMantissaExponent(t, e), this;
  }
  /**
   * Turns the Decimal that this function is called on into a deep copy of the provided value.
   * 
   * Note: this function mutates the Decimal it is called on.
   */
  fromDecimal(t) {
    return this.sign = t.sign, this.layer = t.layer, this.mag = t.mag, this;
  }
  /**
   * Converts a floating-point number into a Decimal.
   * 
   * Note: this function mutates the Decimal it is called on.
   */
  fromNumber(t) {
    return this.mag = Math.abs(t), this.sign = Math.sign(t), this.layer = 0, this.normalize(), this;
  }
  /**
   * Converts a string into a Decimal.
   * 
   * If linearhyper4 is true, then strings like "10^^8.5" will use the linear approximation of tetration even for bases <= 10.
   * 
   * Note: this function mutates the Decimal it is called on.
   */
  fromString(t, e = !1) {
    const i = t, s = r.fromStringCache.get(i);
    if (s !== void 0)
      return this.fromDecimal(s);
    if (t = t.replace(",", ""), t.toLowerCase() === "nan")
      return this.fromDecimal(r.dNaN);
    if (t.toLowerCase() === "infinity")
      return this.fromDecimal(r.dInf);
    if (t.toLowerCase() === "-infinity")
      return this.fromDecimal(r.dNegInf);
    const a = t.split("^^^");
    if (a.length === 2) {
      const m = parseFloat(a[0]), b = parseFloat(a[1]), q = a[1].split(";");
      let x = 1;
      if (q.length === 2 && (x = parseFloat(q[1]), isFinite(x) || (x = 1)), isFinite(m) && isFinite(b)) {
        const S = r.pentate(m, b, x, e);
        return this.sign = S.sign, this.layer = S.layer, this.mag = S.mag, r.fromStringCache.maxSize >= 1 && r.fromStringCache.set(i, r.fromDecimal(this)), this;
      }
    }
    const l = t.split("^^");
    if (l.length === 2) {
      const m = parseFloat(l[0]), b = parseFloat(l[1]), q = l[1].split(";");
      let x = 1;
      if (q.length === 2 && (x = parseFloat(q[1]), isFinite(x) || (x = 1)), isFinite(m) && isFinite(b)) {
        const S = r.tetrate(m, b, x, e);
        return this.sign = S.sign, this.layer = S.layer, this.mag = S.mag, r.fromStringCache.maxSize >= 1 && r.fromStringCache.set(i, r.fromDecimal(this)), this;
      }
    }
    const u = t.split("^");
    if (u.length === 2) {
      const m = parseFloat(u[0]), b = parseFloat(u[1]);
      if (isFinite(m) && isFinite(b)) {
        const q = r.pow(m, b);
        return this.sign = q.sign, this.layer = q.layer, this.mag = q.mag, r.fromStringCache.maxSize >= 1 && r.fromStringCache.set(i, r.fromDecimal(this)), this;
      }
    }
    t = t.trim().toLowerCase();
    let o, f, n = t.split("pt");
    if (n.length === 2) {
      o = 10;
      let m = !1;
      n[0][0] == "-" && (m = !0, n[0] = n[0].slice(1)), f = parseFloat(n[0]), n[1] = n[1].replace("(", ""), n[1] = n[1].replace(")", "");
      let b = parseFloat(n[1]);
      if (isFinite(b) || (b = 1), isFinite(o) && isFinite(f)) {
        const q = r.tetrate(o, f, b, e);
        return this.sign = q.sign, this.layer = q.layer, this.mag = q.mag, r.fromStringCache.maxSize >= 1 && r.fromStringCache.set(i, r.fromDecimal(this)), m && (this.sign *= -1), this;
      }
    }
    if (n = t.split("p"), n.length === 2) {
      o = 10;
      let m = !1;
      n[0][0] == "-" && (m = !0, n[0] = n[0].slice(1)), f = parseFloat(n[0]), n[1] = n[1].replace("(", ""), n[1] = n[1].replace(")", "");
      let b = parseFloat(n[1]);
      if (isFinite(b) || (b = 1), isFinite(o) && isFinite(f)) {
        const q = r.tetrate(o, f, b, e);
        return this.sign = q.sign, this.layer = q.layer, this.mag = q.mag, r.fromStringCache.maxSize >= 1 && r.fromStringCache.set(i, r.fromDecimal(this)), m && (this.sign *= -1), this;
      }
    }
    if (n = t.split("f"), n.length === 2) {
      o = 10;
      let m = !1;
      n[0][0] == "-" && (m = !0, n[0] = n[0].slice(1)), n[0] = n[0].replace("(", ""), n[0] = n[0].replace(")", "");
      let b = parseFloat(n[0]);
      if (n[1] = n[1].replace("(", ""), n[1] = n[1].replace(")", ""), f = parseFloat(n[1]), isFinite(b) || (b = 1), isFinite(o) && isFinite(f)) {
        const q = r.tetrate(o, f, b, e);
        return this.sign = q.sign, this.layer = q.layer, this.mag = q.mag, r.fromStringCache.maxSize >= 1 && r.fromStringCache.set(i, r.fromDecimal(this)), m && (this.sign *= -1), this;
      }
    }
    const d = t.split("e"), w = d.length - 1;
    if (w === 0) {
      const m = parseFloat(t);
      if (isFinite(m))
        return this.fromNumber(m), r.fromStringCache.size >= 1 && r.fromStringCache.set(i, r.fromDecimal(this)), this;
    } else if (w === 1) {
      const m = parseFloat(t);
      if (isFinite(m) && Math.abs(m) > 1e-307)
        return this.fromNumber(m), r.fromStringCache.maxSize >= 1 && r.fromStringCache.set(i, r.fromDecimal(this)), this;
    }
    const E = t.split("e^");
    if (E.length === 2) {
      this.sign = 1, E[0].charAt(0) == "-" && (this.sign = -1);
      let m = "";
      for (let b = 0; b < E[1].length; ++b) {
        const q = E[1].charCodeAt(b);
        if (q >= 43 && q <= 57 || q === 101)
          m += E[1].charAt(b);
        else {
          if (this.layer = parseFloat(m), this.mag = parseFloat(E[1].substr(b + 1)), this.layer < 0 || this.layer % 1 != 0) {
            const x = r.tetrate(10, this.layer, this.mag, e);
            this.sign = x.sign, this.layer = x.layer, this.mag = x.mag;
          }
          return this.normalize(), r.fromStringCache.maxSize >= 1 && r.fromStringCache.set(i, r.fromDecimal(this)), this;
        }
      }
    }
    if (w < 1)
      return this.sign = 0, this.layer = 0, this.mag = 0, r.fromStringCache.maxSize >= 1 && r.fromStringCache.set(i, r.fromDecimal(this)), this;
    const I = parseFloat(d[0]);
    if (I === 0)
      return this.sign = 0, this.layer = 0, this.mag = 0, r.fromStringCache.maxSize >= 1 && r.fromStringCache.set(i, r.fromDecimal(this)), this;
    let F = parseFloat(d[d.length - 1]);
    if (w >= 2) {
      const m = parseFloat(d[d.length - 2]);
      isFinite(m) && (F *= Math.sign(m), F += Z(m));
    }
    if (!isFinite(I))
      this.sign = d[0] === "-" ? -1 : 1, this.layer = w, this.mag = F;
    else if (w === 1)
      this.sign = Math.sign(I), this.layer = 1, this.mag = F + Math.log10(Math.abs(I));
    else if (this.sign = Math.sign(I), this.layer = w, w === 2) {
      const m = r.mul(g(1, 2, F), h(I));
      return this.sign = m.sign, this.layer = m.layer, this.mag = m.mag, r.fromStringCache.maxSize >= 1 && r.fromStringCache.set(i, r.fromDecimal(this)), this;
    } else
      this.mag = F;
    return this.normalize(), r.fromStringCache.maxSize >= 1 && r.fromStringCache.set(i, r.fromDecimal(this)), this;
  }
  /**
   * The function used by new Decimal() to create a new Decimal. Accepts a DecimalSource: uses fromNumber if given a number, uses fromString if given a string, and uses fromDecimal if given a Decimal.
   * 
   * Note: this function mutates the Decimal it is called on.
   */
  fromValue(t) {
    return t instanceof r ? this.fromDecimal(t) : typeof t == "number" ? this.fromNumber(t) : typeof t == "string" ? this.fromString(t) : (this.sign = 0, this.layer = 0, this.mag = 0, this);
  }
  /**
   * Returns the numeric value of the Decimal it's called on. Will return Infinity (or -Infinity for negatives) for Decimals that are larger than Number.MAX_VALUE.
   */
  toNumber() {
    return this.mag === Number.POSITIVE_INFINITY && this.layer === Number.POSITIVE_INFINITY && this.sign === 1 ? Number.POSITIVE_INFINITY : this.mag === Number.POSITIVE_INFINITY && this.layer === Number.POSITIVE_INFINITY && this.sign === -1 ? Number.NEGATIVE_INFINITY : Number.isFinite(this.layer) ? this.layer === 0 ? this.sign * this.mag : this.layer === 1 ? this.sign * Math.pow(10, this.mag) : this.mag > 0 ? this.sign > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY : 0 : Number.NaN;
  }
  mantissaWithDecimalPlaces(t) {
    return isNaN(this.m) ? Number.NaN : this.m === 0 ? 0 : P(this.m, t);
  }
  magnitudeWithDecimalPlaces(t) {
    return isNaN(this.mag) ? Number.NaN : this.mag === 0 ? 0 : P(this.mag, t);
  }
  /**
   * Returns a string representation of the Decimal it's called on.
   * This string is written as a plain number for most layer 0 numbers, in scientific notation for layer 1 numbers (and layer 0 numbers below 1e-6),
   * in "ee...X" form for numbers from layers 2 to 5, and in (e^N)X form for layer > 5.
   */
  toString() {
    return isNaN(this.layer) || isNaN(this.sign) || isNaN(this.mag) ? "NaN" : this.mag === Number.POSITIVE_INFINITY || this.layer === Number.POSITIVE_INFINITY ? this.sign === 1 ? "Infinity" : "-Infinity" : this.layer === 0 ? this.mag < 1e21 && this.mag > 1e-7 || this.mag === 0 ? (this.sign * this.mag).toString() : this.m + "e" + this.e : this.layer === 1 ? this.m + "e" + this.e : this.layer <= D ? (this.sign === -1 ? "-" : "") + "e".repeat(this.layer) + this.mag : (this.sign === -1 ? "-" : "") + "(e^" + this.layer + ")" + this.mag;
  }
  toExponential(t) {
    return this.layer === 0 ? (this.sign * this.mag).toExponential(t) : this.toStringWithDecimalPlaces(t);
  }
  toFixed(t) {
    return this.layer === 0 ? (this.sign * this.mag).toFixed(t) : this.toStringWithDecimalPlaces(t);
  }
  toPrecision(t) {
    return this.e <= -7 ? this.toExponential(t - 1) : t > this.e ? this.toFixed(t - this.exponent - 1) : this.toExponential(t - 1);
  }
  valueOf() {
    return this.toString();
  }
  toJSON() {
    return this.toString();
  }
  toStringWithDecimalPlaces(t) {
    return this.layer === 0 ? this.mag < 1e21 && this.mag > 1e-7 || this.mag === 0 ? (this.sign * this.mag).toFixed(t) : P(this.m, t) + "e" + P(this.e, t) : this.layer === 1 ? P(this.m, t) + "e" + P(this.e, t) : this.layer <= D ? (this.sign === -1 ? "-" : "") + "e".repeat(this.layer) + P(this.mag, t) : (this.sign === -1 ? "-" : "") + "(e^" + this.layer + ")" + P(this.mag, t);
  }
  /**
   * Absolute value function: returns 'this' if 'this' >= 0, returns the negative of 'this' if this < 0.
   */
  abs() {
    return N(this.sign === 0 ? 0 : 1, this.layer, this.mag);
  }
  /**
   * Negates the Decimal it's called on: in other words, when given X, returns -X.
   */
  neg() {
    return N(-this.sign, this.layer, this.mag);
  }
  /**
   * Negates the Decimal it's called on: in other words, when given X, returns -X.
   */
  negate() {
    return this.neg();
  }
  /**
   * Negates the Decimal it's called on: in other words, when given X, returns -X.
   */
  negated() {
    return this.neg();
  }
  // public sign () {
  //     return this.sign;
  //   }
  /**
   * Returns the sign of the Decimal it's called on. (Though, since sign is a public data member of Decimal, you might as well just call .sign instead of .sgn())
   */
  sgn() {
    return this.sign;
  }
  /**
   * Rounds the Decimal it's called on to the nearest integer.
   */
  round() {
    return this.mag < 0 ? N(0, 0, 0) : this.layer === 0 ? g(this.sign, 0, Math.round(this.mag)) : new r(this);
  }
  /**
   * "Rounds" the Decimal it's called on to the nearest integer that's less than or equal to it.
   */
  floor() {
    return this.mag < 0 ? this.sign === -1 ? N(-1, 0, 1) : N(0, 0, 0) : this.sign === -1 ? this.neg().ceil().neg() : this.layer === 0 ? g(this.sign, 0, Math.floor(this.mag)) : new r(this);
  }
  /**
   * "Rounds" the Decimal it's called on to the nearest integer that's greater than or equal to it.
   */
  ceil() {
    return this.mag < 0 ? this.sign === 1 ? N(1, 0, 1) : N(0, 0, 0) : this.sign === -1 ? this.neg().floor().neg() : this.layer === 0 ? g(this.sign, 0, Math.ceil(this.mag)) : new r(this);
  }
  /**
   * Extracts the integer part of the Decimal and returns it. Behaves like floor on positive numbers, but behaves like ceiling on negative numbers.
   */
  trunc() {
    return this.mag < 0 ? N(0, 0, 0) : this.layer === 0 ? g(this.sign, 0, Math.trunc(this.mag)) : new r(this);
  }
  /**
   * Addition: returns the sum of 'this' and 'value'.
   */
  add(t) {
    const e = h(t);
    if (this.eq(r.dInf) && e.eq(r.dNegInf) || this.eq(r.dNegInf) && e.eq(r.dInf))
      return new r(r.dNaN);
    if (!Number.isFinite(this.layer))
      return new r(this);
    if (!Number.isFinite(e.layer))
      return new r(e);
    if (this.sign === 0)
      return new r(e);
    if (e.sign === 0)
      return new r(this);
    if (this.sign === -e.sign && this.layer === e.layer && this.mag === e.mag)
      return N(0, 0, 0);
    let i, s;
    if (this.layer >= 2 || e.layer >= 2)
      return this.maxabs(e);
    if (r.cmpabs(this, e) > 0 ? (i = new r(this), s = new r(e)) : (i = new r(e), s = new r(this)), i.layer === 0 && s.layer === 0)
      return r.fromNumber(i.sign * i.mag + s.sign * s.mag);
    const a = i.layer * Math.sign(i.mag), l = s.layer * Math.sign(s.mag);
    if (a - l >= 2)
      return i;
    if (a === 0 && l === -1) {
      if (Math.abs(s.mag - Math.log10(i.mag)) > z)
        return i;
      {
        const u = Math.pow(10, Math.log10(i.mag) - s.mag), o = s.sign + i.sign * u;
        return g(Math.sign(o), 1, s.mag + Math.log10(Math.abs(o)));
      }
    }
    if (a === 1 && l === 0) {
      if (Math.abs(i.mag - Math.log10(s.mag)) > z)
        return i;
      {
        const u = Math.pow(10, i.mag - Math.log10(s.mag)), o = s.sign + i.sign * u;
        return g(Math.sign(o), 1, Math.log10(s.mag) + Math.log10(Math.abs(o)));
      }
    }
    if (Math.abs(i.mag - s.mag) > z)
      return i;
    {
      const u = Math.pow(10, i.mag - s.mag), o = s.sign + i.sign * u;
      return g(Math.sign(o), 1, s.mag + Math.log10(Math.abs(o)));
    }
  }
  /**
   * Addition: returns the sum of 'this' and 'value'.
   */
  plus(t) {
    return this.add(t);
  }
  /**
   * Subtraction: returns the difference between 'this' and 'value'.
   */
  sub(t) {
    return this.add(h(t).neg());
  }
  /**
   * Subtraction: returns the difference between 'this' and 'value'.
   */
  subtract(t) {
    return this.sub(t);
  }
  /**
   * Subtraction: returns the difference between 'this' and 'value'.
   */
  minus(t) {
    return this.sub(t);
  }
  /**
   * Multiplication: returns the product of 'this' and 'value'.
   */
  mul(t) {
    const e = h(t);
    if (this.eq(r.dInf) && e.eq(r.dNegInf) || this.eq(r.dNegInf) && e.eq(r.dInf))
      return new r(r.dNegInf);
    if (this.mag == Number.POSITIVE_INFINITY && e.eq(r.dZero) || this.eq(r.dZero) && this.mag == Number.POSITIVE_INFINITY)
      return new r(r.dNaN);
    if (this.eq(r.dNegInf) && e.eq(r.dNegInf))
      return new r(r.dInf);
    if (!Number.isFinite(this.layer))
      return new r(this);
    if (!Number.isFinite(e.layer))
      return new r(e);
    if (this.sign === 0 || e.sign === 0)
      return N(0, 0, 0);
    if (this.layer === 0 && e.layer === 0) {
      let a = this.sign * this.mag * e.sign * e.mag;
      if (Number.isFinite(a))
        return new r(a);
    }
    if (this.layer === e.layer && this.mag === -e.mag)
      return N(this.sign * e.sign, 0, 1);
    let i, s;
    if (this.layer > e.layer || this.layer == e.layer && Math.abs(this.mag) > Math.abs(e.mag) ? (i = new r(this), s = new r(e)) : (i = new r(e), s = new r(this)), i.layer === 0 && s.layer === 0)
      return r.fromNumber(i.sign * s.sign * i.mag * s.mag);
    if (i.layer >= 3 || i.layer - s.layer >= 2)
      return g(i.sign * s.sign, i.layer, i.mag);
    if (i.layer === 1 && s.layer === 0)
      return g(i.sign * s.sign, 1, i.mag + Math.log10(s.mag));
    if (i.layer === 1 && s.layer === 1)
      return g(i.sign * s.sign, 1, i.mag + s.mag);
    if (i.layer === 2 && s.layer === 1) {
      const a = g(Math.sign(i.mag), i.layer - 1, Math.abs(i.mag)).add(
        g(Math.sign(s.mag), s.layer - 1, Math.abs(s.mag))
      );
      return g(i.sign * s.sign, a.layer + 1, a.sign * a.mag);
    }
    if (i.layer === 2 && s.layer === 2) {
      const a = g(Math.sign(i.mag), i.layer - 1, Math.abs(i.mag)).add(
        g(Math.sign(s.mag), s.layer - 1, Math.abs(s.mag))
      );
      return g(i.sign * s.sign, a.layer + 1, a.sign * a.mag);
    }
    throw Error("Bad arguments to mul: " + this + ", " + t);
  }
  /**
   * Multiplication: returns the product of 'this' and 'value'.
   */
  multiply(t) {
    return this.mul(t);
  }
  /**
   * Multiplication: returns the product of 'this' and 'value'.
   */
  times(t) {
    return this.mul(t);
  }
  /**
   * Division: returns the quotient of 'this' and 'value'.
   */
  div(t) {
    const e = h(t);
    if (this.layer === 0 && e.layer === 0) {
      let i = this.sign * this.mag / (e.sign * e.mag);
      if (Number.isFinite(i))
        return new r(i);
    }
    return this.mul(e.recip());
  }
  /**
   * Division: returns the quotient of 'this' and 'value'.
   */
  divide(t) {
    return this.div(t);
  }
  /**
   * Division: returns the quotient of 'this' and 'value'.
   */
  divideBy(t) {
    return this.div(t);
  }
  /**
   * Division: returns the quotient of 'this' and 'value'.
   */
  dividedBy(t) {
    return this.div(t);
  }
  /**
   * Returns the reciprocal (1 / X) of the Decimal it's called on.
   */
  recip() {
    return this.mag === 0 ? new r(r.dNaN) : this.mag === Number.POSITIVE_INFINITY ? N(0, 0, 0) : this.layer === 0 ? g(this.sign, 0, 1 / this.mag) : g(this.sign, this.layer, -this.mag);
  }
  /**
   * Returns the reciprocal (1 / X) of the Decimal it's called on.
   */
  reciprocal() {
    return this.recip();
  }
  /**
   * Returns the reciprocal (1 / X) of the Decimal it's called on.
   */
  reciprocate() {
    return this.recip();
  }
  /**
   * Returns the remainder of 'this' divided by 'value': for example, 5 mod 2 = 1, because the remainder of 5 / 2 is 1.
   * Uses the "truncated division" modulo, which is the same as JavaScript's native modulo operator (%)...
   * unless 'floored' is true, in which case it uses the "floored" modulo, which is closer to how modulo works in number theory.
   * These two forms of modulo are the same when only positive numbers are involved, but differ in how they work with negative numbers.
   */
  //Taken from OmegaNum.js, with a couple touch-ups
  mod(t, e = !1) {
    const i = h(t), s = i.abs();
    if (this.eq(r.dZero) || s.eq(r.dZero))
      return N(0, 0, 0);
    if (e) {
      let u = this.abs().mod(s);
      return this.sign == -1 != (i.sign == -1) && (u = i.abs().sub(u)), u.mul(i.sign);
    }
    const a = this.toNumber(), l = s.toNumber();
    return isFinite(a) && isFinite(l) && a != 0 && l != 0 ? new r(a % l) : this.sub(s).eq(this) ? N(0, 0, 0) : s.sub(this).eq(s) ? new r(this) : this.sign == -1 ? this.abs().mod(s).neg() : this.sub(this.div(s).floor().mul(s));
  }
  /**
   * Returns the remainder of 'this' divided by 'value': for example, 5 mod 2 = 1, because the remainder of 5 / 2 is 1.
   * Uses the "truncated division" modulo, which is the same as JavaScript's native modulo operator (%)...
   * unless 'floored' is true, in which case it uses the "floored" modulo, which is closer to how modulo works in number theory.
   * These two forms of modulo are the same when only positive numbers are involved, but differ in how they work with negative numbers.
   */
  modulo(t, e = !1) {
    return this.mod(t, e);
  }
  /**
   * Returns the remainder of 'this' divided by 'value': for example, 5 mod 2 = 1, because the remainder of 5 / 2 is 1.
   * Uses the "truncated division" modulo, which is the same as JavaScript's native modulo operator (%)...
   * unless 'floored' is true, in which case it uses the "floored" modulo, which is closer to how modulo works in number theory.
   * These two forms of modulo are the same when only positive numbers are involved, but differ in how they work with negative numbers.
   */
  modular(t, e = !1) {
    return this.mod(t, e);
  }
  /**
   * Returns 1 if 'this' > 'value', returns -1 if 'this' < 'value', returns 0 if 'this' == 'value'.
   */
  cmp(t) {
    const e = h(t);
    return this.sign > e.sign ? 1 : this.sign < e.sign ? -1 : this.sign * this.cmpabs(t);
  }
  /**
   * Compares the absolute values of this and value.
   * Returns 1 if |'this'| > |'value'|, returns -1 if |'this'| < |'value'|, returns 0 if |'this'| == |'value'|.
   */
  cmpabs(t) {
    const e = h(t), i = this.mag > 0 ? this.layer : -this.layer, s = e.mag > 0 ? e.layer : -e.layer;
    return i > s ? 1 : i < s ? -1 : this.mag > e.mag ? 1 : this.mag < e.mag ? -1 : 0;
  }
  /**
   * Returns 1 if 'this' > 'value', returns -1 if 'this' < 'value', returns 0 if 'this' == 'value'.
   */
  compare(t) {
    return this.cmp(t);
  }
  /**
   * Returns true if the Decimal is an NaN value.
   */
  isNan() {
    return isNaN(this.sign) || isNaN(this.layer) || isNaN(this.mag);
  }
  /**
   * Returns true if the Decimal is finite (by Decimal standards, not by floating point standards - a humongous Decimal like 10^^10^100 is still finite!)
   */
  isFinite() {
    return isFinite(this.sign) && isFinite(this.layer) && isFinite(this.mag);
  }
  /**
   * The Decimal equivalent of ==. Returns true if 'this' and 'value' have equal values.
   */
  eq(t) {
    const e = h(t);
    return this.sign === e.sign && this.layer === e.layer && this.mag === e.mag;
  }
  /**
   * Returns true if 'this' and 'value' have equal values.
   */
  equals(t) {
    return this.eq(t);
  }
  /**
   * The Decimal equivalent of !=. Returns true if 'this' and 'value' do not have equal values.
   */
  neq(t) {
    return !this.eq(t);
  }
  /**
   * Returns true if 'this' and 'value' do not have equal values.
   */
  notEquals(t) {
    return this.neq(t);
  }
  /**
   * The Decimal equivalent of <. Returns true if 'this' is less than 'value'.
   */
  lt(t) {
    return this.cmp(t) === -1;
  }
  /**
   * The Decimal equivalent of <=. Returns true if 'this' is less than or equal to 'value'.
   */
  lte(t) {
    return !this.gt(t);
  }
  /**
   * The Decimal equivalent of >. Returns true if 'this' is greater than 'value'.
   */
  gt(t) {
    return this.cmp(t) === 1;
  }
  /**
   * The Decimal equivalent of >=. Returns true if 'this' is greater than or equal to 'value'.
   */
  gte(t) {
    return !this.lt(t);
  }
  /**
   * Returns whichever of 'this' and 'value' is higher.
   */
  max(t) {
    const e = h(t);
    return this.lt(e) ? new r(e) : new r(this);
  }
  /**
   * Returns whichever of 'this' and 'value' is lower.
   */
  min(t) {
    const e = h(t);
    return this.gt(e) ? new r(e) : new r(this);
  }
  /**
   * Returns whichever of 'this' and 'value' has a larger absolute value.
   */
  maxabs(t) {
    const e = h(t);
    return this.cmpabs(e) < 0 ? new r(e) : new r(this);
  }
  /**
   * Returns whichever of 'this' and 'value' has a smaller absolute value.
   */
  minabs(t) {
    const e = h(t);
    return this.cmpabs(e) > 0 ? new r(e) : new r(this);
  }
  /**
   * A combination of minimum and maximum: the value returned by clamp is normally 'this', but it won't go below 'min' and it won't go above 'max'.
   * Therefore, if 'this' < 'min', then 'min' is returned, and if 'this' > 'max', then 'max' is returned.
   */
  clamp(t, e) {
    return this.max(t).min(e);
  }
  /**
   * Returns 'this', unless 'this' is less than 'min', in which case 'min' is returned.
   */
  clampMin(t) {
    return this.max(t);
  }
  /**
   * Returns 'this', unless 'this' is greater than 'max', in which case 'max' is returned.
   */
  clampMax(t) {
    return this.min(t);
  }
  /**
   * Returns 1 if 'this' is greater than 'value', returns -1 if 'this' is less than 'value', returns 0 if 'this' is equal to 'value'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  cmp_tolerance(t, e) {
    const i = h(t);
    return this.eq_tolerance(i, e) ? 0 : this.cmp(i);
  }
  /**
   * Returns 1 if 'this' is greater than 'value', returns -1 if 'this' is less than 'value', returns 0 if 'this' is equal to 'value'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  compare_tolerance(t, e) {
    return this.cmp_tolerance(t, e);
  }
  /**
   * Tests whether two Decimals are approximately equal, up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  eq_tolerance(t, e) {
    const i = h(t);
    if (e == null && (e = 1e-7), this.sign !== i.sign || Math.abs(this.layer - i.layer) > 1)
      return !1;
    let s = this.mag, a = i.mag;
    return this.layer > i.layer && (a = Z(a)), this.layer < i.layer && (s = Z(s)), Math.abs(s - a) <= e * Math.max(Math.abs(s), Math.abs(a));
  }
  /**
   * Tests whether two Decimals are approximately equal, up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  equals_tolerance(t, e) {
    return this.eq_tolerance(t, e);
  }
  /**
   * Tests whether two Decimals are not approximately equal, up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  neq_tolerance(t, e) {
    return !this.eq_tolerance(t, e);
  }
  /**
   * Tests whether two Decimals are not approximately equal, up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  notEquals_tolerance(t, e) {
    return this.neq_tolerance(t, e);
  }
  /**
   * Returns true if 'this' is less than 'value'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  lt_tolerance(t, e) {
    const i = h(t);
    return !this.eq_tolerance(i, e) && this.lt(i);
  }
  /**
   * Returns true if 'this' is less than or equal to 'value'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  lte_tolerance(t, e) {
    const i = h(t);
    return this.eq_tolerance(i, e) || this.lt(i);
  }
  /**
   * Returns true if 'this' is greater than 'value'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  gt_tolerance(t, e) {
    const i = h(t);
    return !this.eq_tolerance(i, e) && this.gt(i);
  }
  /**
   * Returns true if 'this' is greater than or equal to 'value'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  gte_tolerance(t, e) {
    const i = h(t);
    return this.eq_tolerance(i, e) || this.gt(i);
  }
  /**
   * "Positive log10": Returns the base-10 logarithm of nonnegative Decimals, but returns 0 for negative Decimals. 
   */
  pLog10() {
    return this.lt(r.dZero) ? N(0, 0, 0) : this.log10();
  }
  /**
   * Returns the base-10 logarithm of abs('this').
   */
  absLog10() {
    return this.sign === 0 ? new r(r.dNaN) : this.layer > 0 ? g(Math.sign(this.mag), this.layer - 1, Math.abs(this.mag)) : g(1, 0, Math.log10(this.mag));
  }
  /**
   * Base-10 logarithm: returns the Decimal X such that 10^X = 'this'.
   * For numbers above layer 0, this is equivalent to subtracting 1 from layer and normalizing.
   */
  log10() {
    return this.sign <= 0 ? new r(r.dNaN) : this.layer > 0 ? g(Math.sign(this.mag), this.layer - 1, Math.abs(this.mag)) : g(this.sign, 0, Math.log10(this.mag));
  }
  /**
   * Logarithms are one of the inverses of exponentiation: this function finds the Decimal X such that base^X = 'this'.
   */
  log(t) {
    return t = h(t), this.sign <= 0 ? new r(r.dNaN) : t.sign <= 0 ? new r(r.dNaN) : t.sign === 1 && t.layer === 0 && t.mag === 1 ? new r(r.dNaN) : this.layer === 0 && t.layer === 0 ? g(this.sign, 0, Math.log(this.mag) / Math.log(t.mag)) : r.div(this.log10(), t.log10());
  }
  /**
   * Base-2 logarithm: returns the Decimal X such that 2^X = 'this'.
   */
  log2() {
    return this.sign <= 0 ? new r(r.dNaN) : this.layer === 0 ? g(this.sign, 0, Math.log2(this.mag)) : this.layer === 1 ? g(Math.sign(this.mag), 0, Math.abs(this.mag) * 3.321928094887362) : this.layer === 2 ? g(Math.sign(this.mag), 1, Math.abs(this.mag) + 0.5213902276543247) : g(Math.sign(this.mag), this.layer - 1, Math.abs(this.mag));
  }
  /**
   * Base-e logarithm, also known as the "natural" logarithm: returns the Decimal X such that e^X = 'this'.
   */
  ln() {
    return this.sign <= 0 ? new r(r.dNaN) : this.layer === 0 ? g(this.sign, 0, Math.log(this.mag)) : this.layer === 1 ? g(Math.sign(this.mag), 0, Math.abs(this.mag) * 2.302585092994046) : this.layer === 2 ? g(Math.sign(this.mag), 1, Math.abs(this.mag) + 0.36221568869946325) : g(Math.sign(this.mag), this.layer - 1, Math.abs(this.mag));
  }
  /**
   * Logarithms are one of the inverses of exponentiation: this function finds the Decimal X such that base^X = 'this'.
   */
  logarithm(t) {
    return this.log(t);
  }
  /**
   * Exponentiation: Returns the result of 'this' ^ 'value' (often written as 'this' ** 'value' in programming languages).
   */
  pow(t) {
    const e = h(t), i = new r(this), s = new r(e);
    if (i.sign === 0)
      return s.eq(0) ? N(1, 0, 1) : i;
    if (i.sign === 1 && i.layer === 0 && i.mag === 1)
      return i;
    if (s.sign === 0)
      return N(1, 0, 1);
    if (s.sign === 1 && s.layer === 0 && s.mag === 1)
      return i;
    const a = i.absLog10().mul(s).pow10();
    return this.sign === -1 ? Math.abs(s.toNumber() % 2) % 2 === 1 ? a.neg() : Math.abs(s.toNumber() % 2) % 2 === 0 ? a : new r(r.dNaN) : a;
  }
  /**
   * Raises 10 to the power of 'this', i.e. (10^'this'). For positive numbers above 1, this is equivalent to adding 1 to layer and normalizing.
   */
  pow10() {
    if (this.eq(r.dInf))
      return new r(r.dInf);
    if (this.eq(r.dNegInf))
      return N(0, 0, 0);
    if (!Number.isFinite(this.layer) || !Number.isFinite(this.mag))
      return new r(r.dNaN);
    let t = new r(this);
    if (t.layer === 0) {
      const e = Math.pow(10, t.sign * t.mag);
      if (Number.isFinite(e) && Math.abs(e) >= 0.1)
        return g(1, 0, e);
      if (t.sign === 0)
        return N(1, 0, 1);
      t = N(t.sign, t.layer + 1, Math.log10(t.mag));
    }
    return t.sign > 0 && t.mag >= 0 ? g(t.sign, t.layer + 1, t.mag) : t.sign < 0 && t.mag >= 0 ? g(-t.sign, t.layer + 1, -t.mag) : N(1, 0, 1);
  }
  /**
   * Exponentiation: Returns the result of 'value' ^ 'this' (often written as 'value' ** 'this' in programming languages).
   */
  pow_base(t) {
    return h(t).pow(this);
  }
  /**
   * Roots are one of the inverses of exponentiation: this function finds the Decimal X such that X ^ 'value' = 'this'.
   * Equivalent to 'this' ^ (1 / 'value'), which is written here as this.pow(value.recip()).
   */
  root(t) {
    const e = h(t);
    return this.lt(0) && e.mod(2, !0).eq(1) ? this.neg().root(e).neg() : this.pow(e.recip());
  }
  /**
   * For positive integers, X factorial (written as X!) equals X * (X - 1) * (X - 2) *... * 3 * 2 * 1. 0! equals 1.
   * This can be extended to real numbers (except for negative integers) via the gamma function, which is what this function does.
   */
  factorial() {
    return this.mag < 0 ? this.add(1).gamma() : this.layer === 0 ? this.add(1).gamma() : this.layer === 1 ? r.exp(r.mul(this, r.ln(this).sub(1))) : r.exp(this);
  }
  /**
   * The gamma function extends the idea of factorials to non-whole numbers using some calculus.
   * Gamma(x) is defined as the integral of t^(x-1) * e^-t dt from t = 0 to t = infinity,
   * and gamma(x) = (x - 1)! for nonnegative integer x, so the factorial for non-whole numbers is defined using the gamma function.
   */
  //from HyperCalc source code
  gamma() {
    if (this.mag < 0)
      return this.recip();
    if (this.layer === 0) {
      if (this.lt(N(1, 0, 24)))
        return r.fromNumber(_(this.sign * this.mag));
      const t = this.mag - 1;
      let e = 0.9189385332046727;
      e = e + (t + 0.5) * Math.log(t), e = e - t;
      const i = t * t;
      let s = t, a = 12 * s, l = 1 / a, u = e + l;
      if (u === e || (e = u, s = s * i, a = 360 * s, l = 1 / a, u = e - l, u === e))
        return r.exp(e);
      e = u, s = s * i, a = 1260 * s;
      let o = 1 / a;
      return e = e + o, s = s * i, a = 1680 * s, o = 1 / a, e = e - o, r.exp(e);
    } else
      return this.layer === 1 ? r.exp(r.mul(this, r.ln(this).sub(1))) : r.exp(this);
  }
  /**
   * Returns the natural logarithm of Gamma('this').
   */
  lngamma() {
    return this.gamma().ln();
  }
  /**
   * Base-e exponentiation: returns e^'this'.
   */
  exp() {
    return this.mag < 0 ? N(1, 0, 1) : this.layer === 0 && this.mag <= 709.7 ? r.fromNumber(Math.exp(this.sign * this.mag)) : this.layer === 0 ? g(1, 1, this.sign * Math.log10(Math.E) * this.mag) : this.layer === 1 ? g(1, 2, this.sign * (Math.log10(0.4342944819032518) + this.mag)) : g(1, this.layer + 1, this.sign * this.mag);
  }
  /**
   * Squaring a number means multiplying it by itself, a.k.a. raising it to the second power.
   */
  sqr() {
    return this.pow(2);
  }
  /**
   * Square root: finds the Decimal X such that X * X, a.k.a X^2, equals 'this'. Equivalent to X^(1/2).
   */
  sqrt() {
    if (this.layer === 0)
      return r.fromNumber(Math.sqrt(this.sign * this.mag));
    if (this.layer === 1)
      return g(1, 2, Math.log10(this.mag) - 0.3010299956639812);
    {
      const t = r.div(N(this.sign, this.layer - 1, this.mag), N(1, 0, 2));
      return t.layer += 1, t.normalize(), t;
    }
  }
  /**
   * Cubing a number means raising it to the third power.
   */
  cube() {
    return this.pow(3);
  }
  /**
   * Cube root: finds the Decimal X such that X^3 equals 'this'. Equivalent to X^(1/3).
   */
  cbrt() {
    return this.lt(0) ? this.neg().pow(1 / 3).neg() : this.pow(1 / 3);
  }
  /**
   *
   * Tetration: The result of exponentiating 'this' to 'this' 'height' times in a row.  https://en.wikipedia.org/wiki/Tetration
   * 
   * If payload != 1, then this is 'iterated exponentiation', the result of exping 'payload' to base 'this' 'height' times. https://andydude.github.io/tetration/archives/tetration2/ident.html
   * 
   * Works with negative and positive real heights. Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  tetrate(t = 2, e = N(1, 0, 1), i = !1) {
    if (t === 1)
      return r.pow(this, e);
    if (t === 0)
      return new r(e);
    if (this.eq(r.dOne))
      return N(1, 0, 1);
    if (this.eq(-1))
      return r.pow(this, e);
    if (t === Number.POSITIVE_INFINITY) {
      const l = this.toNumber();
      if (l <= 1.444667861009766 && l >= 0.06598803584531254) {
        const u = r.ln(this).neg();
        let o = u.lambertw().div(u);
        if (l < 1)
          return o;
        let f = u.lambertw(!1).div(u);
        return l > 1.444667861009099 && (o = f = r.fromNumber(Math.E)), e = h(e), e.eq(f) ? f : e.lt(f) ? o : new r(r.dInf);
      } else
        return l > 1.444667861009766 ? new r(r.dInf) : new r(r.dNaN);
    }
    if (this.eq(r.dZero)) {
      let l = Math.abs((t + 1) % 2);
      return l > 1 && (l = 2 - l), r.fromNumber(l);
    }
    if (t < 0)
      return r.iteratedlog(e, this, -t, i);
    e = new r(e);
    const s = t;
    t = Math.trunc(t);
    const a = s - t;
    if (this.gt(r.dZero) && (this.lt(1) || this.lte(1.444667861009766) && e.lte(r.ln(this).neg().lambertw(!1).div(r.ln(this).neg()))) && (s > 1e4 || !i)) {
      const l = Math.min(1e4, t);
      e.eq(r.dOne) ? e = this.pow(a) : this.lt(1) ? e = e.pow(1 - a).mul(this.pow(e).pow(a)) : e = e.layeradd(a, this);
      for (let u = 0; u < l; ++u) {
        const o = e;
        if (e = this.pow(e), o.eq(e))
          return e;
      }
      return s > 1e4 && Math.ceil(s) % 2 == 1 ? this.pow(e) : e;
    }
    a !== 0 && (e.eq(r.dOne) ? this.gt(10) || i ? e = this.pow(a) : (e = r.fromNumber(r.tetrate_critical(this.toNumber(), a)), this.lt(2) && (e = e.sub(1).mul(this.minus(1)).plus(1))) : this.eq(10) ? e = e.layeradd10(a, i) : this.lt(1) ? e = e.pow(1 - a).mul(this.pow(e).pow(a)) : e = e.layeradd(a, this, i));
    for (let l = 0; l < t; ++l) {
      if (e = this.pow(e), !isFinite(e.layer) || !isFinite(e.mag))
        return e.normalize();
      if (e.layer - this.layer > 3)
        return N(e.sign, e.layer + (t - l - 1), e.mag);
      if (l > 1e4)
        return e;
    }
    return e;
  }
  /**
   * Iterated exponentiation, the result of exping 'payload' to base 'this' 'height' times. https://andydude.github.io/tetration/archives/tetration2/ident.html
   * 
   * Works with negative and positive real heights. Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   * 
   * Identical to tetrate.
   */
  iteratedexp(t = 2, e = N(1, 0, 1), i = !1) {
    return this.tetrate(t, e, i);
  }
  /**
   * iterated log/repeated log: The result of applying log(base) 'times' times in a row. Approximately equal to subtracting 'times' from the number's slog representation. Equivalent to tetrating to a negative height.
   * 
   * Works with negative and positive real heights. Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  iteratedlog(t = 10, e = 1, i = !1) {
    if (e < 0)
      return r.tetrate(t, -e, this, i);
    t = h(t);
    let s = r.fromDecimal(this);
    const a = e;
    e = Math.trunc(e);
    const l = a - e;
    if (s.layer - t.layer > 3) {
      const u = Math.min(e, s.layer - t.layer - 3);
      e -= u, s.layer -= u;
    }
    for (let u = 0; u < e; ++u) {
      if (s = s.log(t), !isFinite(s.layer) || !isFinite(s.mag))
        return s.normalize();
      if (u > 1e4)
        return s;
    }
    return l > 0 && l < 1 && (t.eq(10) ? s = s.layeradd10(-l, i) : s = s.layeradd(-l, t, i)), s;
  }
  /**
   * Super-logarithm, one of tetration's inverses, tells you what size power tower you'd have to tetrate 'base' to to get 'this'. https://en.wikipedia.org/wiki/Super-logarithm
   * 
   * By definition, will never be higher than 1.8e308 in break_eternity.js, since a power tower 1.8e308 numbers tall is the largest representable number.
   * 
   * Accepts a number of iterations (default is 100), and use binary search to, after making an initial guess, hone in on the true value, assuming tetration as the ground truth.
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  slog(t = 10, e = 100, i = !1) {
    let s = 1e-3, a = !1, l = !1, u = this.slog_internal(t, i).toNumber();
    for (var o = 1; o < e; ++o) {
      let n = new r(t).tetrate(u, r.dOne, i).gt(this);
      if (o > 1 && l != n && (a = !0), l = n, a ? s /= 2 : s *= 2, s = Math.abs(s) * (n ? -1 : 1), u += s, s === 0)
        break;
    }
    return r.fromNumber(u);
  }
  slog_internal(t = 10, e = !1) {
    if (t = h(t), t.lte(r.dZero))
      return new r(r.dNaN);
    if (t.eq(r.dOne))
      return new r(r.dNaN);
    if (t.lt(r.dOne))
      return this.eq(r.dOne) ? N(0, 0, 0) : this.eq(r.dZero) ? N(-1, 0, 1) : new r(r.dNaN);
    if (this.mag < 0 || this.eq(r.dZero))
      return N(-1, 0, 1);
    if (t.lt(1.444667861009766)) {
      const a = r.ln(t).neg();
      let l = a.lambertw().div(a);
      if (this.eq(l))
        return new r(r.dInf);
      if (this.gt(l))
        return new r(r.dNaN);
    }
    let i = 0, s = r.fromDecimal(this);
    if (s.layer - t.layer > 3) {
      const a = s.layer - t.layer - 3;
      i += a, s.layer -= a;
    }
    for (let a = 0; a < 100; ++a)
      if (s.lt(r.dZero))
        s = r.pow(t, s), i -= 1;
      else {
        if (s.lte(r.dOne))
          return e ? r.fromNumber(i + s.toNumber() - 1) : r.fromNumber(i + r.slog_critical(t.toNumber(), s.toNumber()));
        i += 1, s = r.log(s, t);
      }
    return r.fromNumber(i);
  }
  //background info and tables of values for critical functions taken here: https://github.com/Patashu/break_eternity.js/issues/22
  static slog_critical(t, e) {
    return t > 10 ? e - 1 : r.critical_section(t, e, X);
  }
  static tetrate_critical(t, e) {
    return r.critical_section(t, e, Q);
  }
  static critical_section(t, e, i, s = !1) {
    e *= 10, e < 0 && (e = 0), e > 10 && (e = 10), t < 2 && (t = 2), t > 10 && (t = 10);
    let a = 0, l = 0;
    for (let o = 0; o < k.length; ++o)
      if (k[o] == t) {
        a = i[o][Math.floor(e)], l = i[o][Math.ceil(e)];
        break;
      } else if (k[o] < t && k[o + 1] > t) {
        const f = (t - k[o]) / (k[o + 1] - k[o]);
        a = i[o][Math.floor(e)] * (1 - f) + i[o + 1][Math.floor(e)] * f, l = i[o][Math.ceil(e)] * (1 - f) + i[o + 1][Math.ceil(e)] * f;
        break;
      }
    const u = e - Math.floor(e);
    return a <= 0 || l <= 0 ? a * (1 - u) + l * u : Math.pow(t, Math.log(a) / Math.log(t) * (1 - u) + Math.log(l) / Math.log(t) * u);
  }
  /**
   * Adds/removes layers from a Decimal, even fractional layers (e.g. its slog10 representation). Very similar to tetrate base 10 and iterated log base 10.
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  //Moved this over to use the same critical section as tetrate/slog.
  layeradd10(t, e = !1) {
    t = r.fromValue_noAlloc(t).toNumber();
    const i = r.fromDecimal(this);
    if (t >= 1) {
      i.mag < 0 && i.layer > 0 ? (i.sign = 0, i.mag = 0, i.layer = 0) : i.sign === -1 && i.layer == 0 && (i.sign = 1, i.mag = -i.mag);
      const s = Math.trunc(t);
      t -= s, i.layer += s;
    }
    if (t <= -1) {
      const s = Math.trunc(t);
      if (t -= s, i.layer += s, i.layer < 0)
        for (let a = 0; a < 100; ++a) {
          if (i.layer++, i.mag = Math.log10(i.mag), !isFinite(i.mag))
            return i.sign === 0 && (i.sign = 1), i.layer < 0 && (i.layer = 0), i.normalize();
          if (i.layer >= 0)
            break;
        }
    }
    for (; i.layer < 0; )
      i.layer++, i.mag = Math.log10(i.mag);
    return i.sign === 0 && (i.sign = 1, i.mag === 0 && i.layer >= 1 && (i.layer -= 1, i.mag = 1)), i.normalize(), t !== 0 ? i.layeradd(t, 10, e) : i;
  }
  /**
   * layeradd: like adding 'diff' to the number's slog(base) representation. Very similar to tetrate base 'base' and iterated log base 'base'.
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  layeradd(t, e, i = !1) {
    let s = h(e);
    if (s.gt(1) && s.lte(1.444667861009766)) {
      const u = r.excess_slog(this, e, i), o = u[0].toNumber(), f = u[1], n = o + t, d = r.ln(e).neg();
      let w = d.lambertw().div(d), E = d.lambertw(!1).div(d), I = r.dOne;
      f == 1 ? I = w.mul(E).sqrt() : f == 2 && (I = E.mul(2));
      let F = s.pow(I), m = Math.floor(n), b = n - m, q = I.pow(1 - b).mul(F.pow(b));
      return r.tetrate(s, m, q, i);
    }
    const l = this.slog(e, 100, i).toNumber() + t;
    return l >= 0 ? r.tetrate(e, l, r.dOne, i) : Number.isFinite(l) ? l >= -1 ? r.log(r.tetrate(e, l + 1, r.dOne, i), e) : r.log(r.log(r.tetrate(e, l + 2, r.dOne, i), e), e) : new r(r.dNaN);
  }
  //Apparently having something be private but not static breaks everything
  /**
   * A strange version of slog for bases between 1 and e^1/e which can handle values above base^^Infinity.
   * Returns a pair of a Decimal and a number, with the number always being 0, 1, or 2. The number indicates what range we're in:
   * 0 means we're below the lower solution of b^x = x, and so the normal slog is used.
   * 1 means we're between the two solutions of b^x = x, with the geometric mean of the two solutions arbitrarily chosen to be the value with a slog of 0.
   * 2 means we're above the upper solution of b^x = x, with (upper solution * 2) arbitrarily chosen to be the value with a slog of 0.
   * 
   * The values returned by this function don't really have much mathematical meaning, but the difference between two values does.
   * Therefore, this function is kept private, but it's used for layeradd on these small bases.
   */
  static excess_slog(t, e, i = !1) {
    t = h(t), e = h(e);
    let s = e;
    if (e = e.toNumber(), e == 1 || e <= 0)
      return [new r(r.dNaN), 0];
    if (e > 1.444667861009766)
      return [t.slog(e, 100, i), 0];
    const a = r.ln(e).neg();
    let l = a.lambertw().div(a), u = r.dInf;
    if (e > 1 && (u = a.lambertw(!1).div(a)), e > 1.444667861009099 && (l = u = r.fromNumber(Math.E)), t.lt(l))
      return [t.slog(e, 100, i), 0];
    if (t.eq(l))
      return [new r(r.dInf), 0];
    if (t.eq(u))
      return [new r(r.dNegInf), 2];
    if (t.gt(u)) {
      let o = u.mul(2), f = s.pow(o), n = 0;
      if (t.gte(o) && t.lt(f))
        n = 0;
      else if (t.gte(f)) {
        let m = f;
        for (n = 1; m.lt(t); )
          if (m = s.pow(m), n = n + 1, m.layer > 3) {
            let b = Math.floor(t.layer - m.layer + 1);
            m = s.iteratedexp(b, m, i), n = n + b;
          }
        m.gt(t) && (m = m.log(e), n = n - 1);
      } else if (t.lt(o)) {
        let m = o;
        for (n = 0; m.gt(t); )
          m = m.log(e), n = n - 1;
      }
      let d = 0, w = 0, E = 0.5, I = o, F = r.dZero;
      for (; E > 1e-16; ) {
        if (w = d + E, I = o.pow(1 - w).mul(f.pow(w)), F = r.iteratedexp(e, n, I), F.eq(t))
          return [new r(n + w), 2];
        F.lt(t) && (d += E), E /= 2;
      }
      return F.neq_tolerance(t, 1e-7) ? [new r(r.dNaN), 0] : [new r(n + d), 2];
    }
    if (t.lt(u) && t.gt(l)) {
      let o = l.mul(u).sqrt(), f = s.pow(o), n = 0;
      if (t.lte(o) && t.gt(f))
        n = 0;
      else if (t.lte(f)) {
        let m = f;
        for (n = 1; m.gt(t); )
          m = s.pow(m), n = n + 1;
        m.lt(t) && (m = m.log(e), n = n - 1);
      } else if (t.gt(o)) {
        let m = o;
        for (n = 0; m.lt(t); )
          m = m.log(e), n = n - 1;
      }
      let d = 0, w = 0, E = 0.5, I = o, F = r.dZero;
      for (; E > 1e-16; ) {
        if (w = d + E, I = o.pow(1 - w).mul(f.pow(w)), F = r.iteratedexp(e, n, I), F.eq(t))
          return [new r(n + w), 1];
        F.gt(t) && (d += E), E /= 2;
      }
      return F.neq_tolerance(t, 1e-7) ? [new r(r.dNaN), 0] : [new r(n + d), 1];
    }
    throw new Error("Unhandled behavior in excess_slog");
  }
  /**
   * The Lambert W function, also called the omega function or product logarithm, is the solution W(x) === x*e^x.
   * https://en.wikipedia.org/wiki/Lambert_W_function
   * 
   * This is a multi-valued function in the complex plane, but only two branches matter for real numbers: the "principal branch" W0, and the "non-principal branch" W_-1.
   * W_0 works for any number >= -1/e, but W_-1 only works for nonpositive numbers >= -1/e.
   * The "principal" parameter, which is true by default, decides which branch we're looking for: W_0 is used if principal is true, W_-1 is used if principal is false.
   */
  //Some special values, for testing: https://en.wikipedia.org/wiki/Lambert_W_function#Special_values
  lambertw(t = !0) {
    return this.lt(-0.3678794411710499) ? new r(r.dNaN) : t ? this.abs().lt("1e-300") ? new r(this) : this.mag < 0 ? r.fromNumber(Y(this.toNumber())) : this.layer === 0 ? r.fromNumber(Y(this.sign * this.mag)) : this.lt("eee15") ? G(this) : this.ln() : this.sign === 1 ? new r(r.dNaN) : this.layer === 0 ? r.fromNumber(Y(this.sign * this.mag, 1e-10, !1)) : this.layer == 1 ? G(this, 1e-10, !1) : this.neg().recip().lambertw().neg();
  }
  /**
   * The super square-root function - what number, tetrated to height 2, equals 'this'? https://en.wikipedia.org/wiki/Tetration#Super-root
   */
  ssqrt() {
    return this.linear_sroot(2);
  }
  /**
   * Super-root, one of tetration's inverses - what number, tetrated to height 'degree', equals 'this'? https://en.wikipedia.org/wiki/Tetration#Super-root
   * 
   * Only works with the linear approximation of tetration, as starting with analytic and then switching to linear would result in inconsistent behavior for super-roots.
   * This only matters for non-integer degrees.
   */
  //Another reason this doesn't support analytic approximation because I don't know the structure of non-linear tetrations for inputs < 1
  //TODO: Optimize this like how slog is optimized (if it isn't already)
  linear_sroot(t) {
    if (t == 1)
      return this;
    if (this.eq(r.dInf))
      return new r(r.dInf);
    if (!this.isFinite())
      return new r(r.dNaN);
    if (t > 0 && t < 1)
      return this.root(t);
    if (t > -2 && t < -1)
      return r.fromNumber(t).add(2).pow(this.recip());
    if (t <= 0)
      return new r(r.dNaN);
    if (t == Number.POSITIVE_INFINITY) {
      const e = this.toNumber();
      return e < Math.E && e > tt ? this.pow(this.recip()) : new r(r.dNaN);
    }
    if (this.eq(1))
      return N(1, 0, 1);
    if (this.lt(0))
      return new r(r.dNaN);
    if (this.lte("1ee-16"))
      return t % 2 == 1 ? new r(this) : new r(r.dNaN);
    if (this.gt(1)) {
      let e = r.dTen;
      this.gte(r.tetrate(10, t, 1, !0)) && (e = this.iteratedlog(10, t - 1, !0)), t <= 1 && (e = this.root(t));
      let i = r.dZero, s = e.layer, a = e.iteratedlog(10, s, !0), l = a, u = a.div(2), o = !0;
      for (; o; )
        u = i.add(a).div(2), r.iteratedexp(10, s, u, !0).tetrate(t, 1, !0).gt(this) ? a = u : i = u, u.eq(l) ? o = !1 : l = u;
      return r.iteratedexp(10, s, u, !0);
    } else {
      let e = 1, i = g(1, 10, 1), s = g(1, 10, 1), a = g(1, 10, 1), l = g(1, 1, -16), u = r.dZero, o = g(1, 10, 1), f = l.pow10().recip(), n = r.dZero, d = f, w = f, E = Math.ceil(t) % 2 == 0, I = 0, F = g(1, 10, 1), m = !1, b = r.dZero, q = !1;
      for (; e < 4; ) {
        if (e == 2) {
          if (E)
            break;
          a = g(1, 10, 1), l = i, e = 3, o = g(1, 10, 1), F = g(1, 10, 1);
        }
        for (m = !1; l.neq(a); ) {
          if (b = l, l.pow10().recip().tetrate(t, 1, !0).eq(1) && l.pow10().recip().lt(0.4))
            f = l.pow10().recip(), d = l.pow10().recip(), w = l.pow10().recip(), n = r.dZero, I = -1, e == 3 && (F = l);
          else if (l.pow10().recip().tetrate(t, 1, !0).eq(l.pow10().recip()) && !E && l.pow10().recip().lt(0.4))
            f = l.pow10().recip(), d = l.pow10().recip(), w = l.pow10().recip(), n = r.dZero, I = 0;
          else if (l.pow10().recip().tetrate(t, 1, !0).eq(l.pow10().recip().mul(2).tetrate(t, 1, !0)))
            f = l.pow10().recip(), d = r.dZero, w = f.mul(2), n = f, E ? I = -1 : I = 0;
          else {
            for (u = l.mul(12e-17), f = l.pow10().recip(), d = l.add(u).pow10().recip(), n = f.sub(d), w = f.add(n); d.tetrate(t, 1, !0).eq(f.tetrate(t, 1, !0)) || w.tetrate(t, 1, !0).eq(f.tetrate(t, 1, !0)) || d.gte(f) || w.lte(f); )
              u = u.mul(2), d = l.add(u).pow10().recip(), n = f.sub(d), w = f.add(n);
            if ((e == 1 && w.tetrate(t, 1, !0).gt(f.tetrate(t, 1, !0)) && d.tetrate(t, 1, !0).gt(f.tetrate(t, 1, !0)) || e == 3 && w.tetrate(t, 1, !0).lt(f.tetrate(t, 1, !0)) && d.tetrate(t, 1, !0).lt(f.tetrate(t, 1, !0))) && (F = l), w.tetrate(t, 1, !0).lt(f.tetrate(t, 1, !0)))
              I = -1;
            else if (E)
              I = 1;
            else if (e == 3 && l.gt_tolerance(i, 1e-8))
              I = 0;
            else {
              for (; d.tetrate(t, 1, !0).eq_tolerance(f.tetrate(t, 1, !0), 1e-8) || w.tetrate(t, 1, !0).eq_tolerance(f.tetrate(t, 1, !0), 1e-8) || d.gte(f) || w.lte(f); )
                u = u.mul(2), d = l.add(u).pow10().recip(), n = f.sub(d), w = f.add(n);
              w.tetrate(t, 1, !0).sub(f.tetrate(t, 1, !0)).lt(f.tetrate(t, 1, !0).sub(d.tetrate(t, 1, !0))) ? I = 0 : I = 1;
            }
          }
          if (I == -1 && (q = !0), e == 1 && I == 1 || e == 3 && I != 0)
            if (a.eq(g(1, 10, 1)))
              l = l.mul(2);
            else {
              let V = !1;
              if (m && (I == 1 && e == 1 || I == -1 && e == 3) && (V = !0), l = l.add(a).div(2), V)
                break;
            }
          else if (a.eq(g(1, 10, 1)))
            a = l, l = l.div(2);
          else {
            let V = !1;
            if (m && (I == 1 && e == 1 || I == -1 && e == 3) && (V = !0), a = a.sub(o), l = l.sub(o), V)
              break;
          }
          if (a.sub(l).div(2).abs().gt(o.mul(1.5)) && (m = !0), o = a.sub(l).div(2).abs(), l.gt("1e18") || l.eq(b))
            break;
        }
        if (l.gt("1e18") || !q || F == g(1, 10, 1))
          break;
        e == 1 ? i = F : e == 3 && (s = F), e++;
      }
      a = i, l = g(1, 1, -18);
      let x = l, S = r.dZero, A = !0;
      for (; A; )
        if (a.eq(g(1, 10, 1)) ? S = l.mul(2) : S = a.add(l).div(2), r.pow(10, S).recip().tetrate(t, 1, !0).gt(this) ? l = S : a = S, S.eq(x) ? A = !1 : x = S, l.gt("1e18"))
          return new r(r.dNaN);
      if (S.eq_tolerance(i, 1e-15)) {
        if (s.eq(g(1, 10, 1)))
          return new r(r.dNaN);
        for (a = g(1, 10, 1), l = s, x = l, S = r.dZero, A = !0; A; )
          if (a.eq(g(1, 10, 1)) ? S = l.mul(2) : S = a.add(l).div(2), r.pow(10, S).recip().tetrate(t, 1, !0).gt(this) ? l = S : a = S, S.eq(x) ? A = !1 : x = S, l.gt("1e18"))
            return new r(r.dNaN);
        return S.pow10().recip();
      } else
        return S.pow10().recip();
    }
  }
  /**
   * This function takes a Decimal => Decimal function as its argument (or DecimalSource => Decimal, that's fine too),
   * and it returns a DecimalSource => Decimal function that's an inverse of the first one, which uses binary search to find its target.
   * The resulting function will call the original many times, so it may be noticably slower than the original.
   * 
   * This function is only intended to be used on continuous, strictly increasing (or, using the decreasing parameter, strictly decreasing) functions.
   * Its resulting function may output erroneous results if the original function was not strictly increasing.
   * If the function is increasing but not strictly increasing, the inverse will, in ranges where the original function is constant, try to return the value closest to 0 out of the multiple correct values.
   * If the function is not continuous, the inverse should return the correct answer in cases where the given value is returned by some input to the original function, but it will return an erroneous result otherwise (the correct result would be to return NaN, but checking to ensure continuity is not implemented)
   * 
   * @param func The Decimal => Decimal function to create an inverse function of.
   * @param decreasing This parameter is false by default. If this parameter is true, the original function should be strictly decreasing instead of strictly increasing.
   * @param iterations The amount of iterations that the inverse function runs before it gives up and returns whatever value it's found thus far. Default is 120, which should be enough to always be as precise as floating point allows.
   * @param minX The original function is assumed to have this value as the lowest value in its domain. Is Decimal.dLayerMax.neg() by default, which means all negative finite values are allowed but infinity is not.
   * @param maxX The original function is assumed to have this value as the highest value in its domain. Is Decimal.dLayerMax by default, which means all positive finite values are allowed but infinity is not.
   * @param minY If the input to the inverse function is below this value, the inverse function assumes the input is not in the range and returns NaN. Is Decimal.dLayerMax.neg() by default, which means all negative finite values are allowed but infinity is not.
   * @param maxY If the input to the inverse function is above this value, the inverse function assumes the input is not in the range and returns NaN. Is Decimal.dLayerMax by default, which means all positive finite values are allowed but infinity is not.
   */
  static increasingInverse(t, e = !1, i = 120, s = r.dLayerMax.neg(), a = r.dLayerMax, l = r.dLayerMax.neg(), u = r.dLayerMax) {
    return function(o) {
      if (o = new r(o), s = new r(s), a = new r(a), l = new r(l), u = new r(u), o.isNan() || a.lt(s) || o.lt(l) || o.gt(u))
        return new r(r.dNaN);
      let f = function(M) {
        return new r(M);
      }, n = !0;
      if (a.lt(0))
        n = !1;
      else if (s.gt(0))
        n = !0;
      else {
        let M = t(r.dZero);
        if (M.eq(o))
          return N(0, 0, 0);
        n = o.gt(M), e && (n = !n);
      }
      let d = n, w;
      if (n) {
        if (a.lt(L))
          n = !0;
        else if (s.gt(L))
          n = !1;
        else {
          let M = t(new r(L));
          n = o.lt(M), e && (n = !n);
        }
        if (n) {
          w = !0;
          let M = r.pow(10, O).recip();
          if (a.lt(M))
            n = !1;
          else if (s.gt(M))
            n = !0;
          else {
            let p = t(new r(M));
            n = o.gt(p), e && (n = !n);
          }
          if (n)
            f = function(p) {
              return r.pow(10, p).recip();
            };
          else {
            let p = r.tetrate(10, O);
            if (a.lt(p))
              n = !1;
            else if (s.gt(p))
              n = !0;
            else {
              let T = t(new r(p));
              n = o.gt(T), e && (n = !n);
            }
            n ? f = function(T) {
              return r.tetrate(10, new r(T).toNumber()).recip();
            } : f = function(T) {
              return new r(T).gt(Math.log10(Number.MAX_VALUE)) ? r.dZero : r.tetrate(10, r.pow(10, T).toNumber()).recip();
            };
          }
        } else {
          if (w = !1, a.lt(O))
            n = !0;
          else if (s.gt(O))
            n = !1;
          else {
            let M = t(new r(O));
            n = o.lt(M), e && (n = !n);
          }
          if (n)
            f = function(M) {
              return new r(M);
            };
          else {
            let M = r.pow(10, O);
            if (a.lt(M))
              n = !0;
            else if (s.gt(M))
              n = !1;
            else {
              let p = t(new r(M));
              n = o.lt(p), e && (n = !n);
            }
            if (n)
              f = function(p) {
                return r.pow(10, p);
              };
            else {
              let p = r.tetrate(10, O);
              if (a.lt(p))
                n = !0;
              else if (s.gt(p))
                n = !1;
              else {
                let T = t(new r(p));
                n = o.lt(T), e && (n = !n);
              }
              n ? f = function(T) {
                return r.tetrate(10, new r(T).toNumber());
              } : f = function(T) {
                return new r(T).gt(Math.log10(Number.MAX_VALUE)) ? r.dInf : r.tetrate(10, r.pow(10, T).toNumber());
              };
            }
          }
        }
      } else {
        if (w = !0, a.lt(-L))
          n = !1;
        else if (s.gt(-L))
          n = !0;
        else {
          let M = t(new r(-L));
          n = o.gt(M), e && (n = !n);
        }
        if (n) {
          let M = r.pow(10, O).recip().neg();
          if (a.lt(M))
            n = !0;
          else if (s.gt(M))
            n = !1;
          else {
            let p = t(new r(M));
            n = o.lt(p), e && (n = !n);
          }
          if (n)
            f = function(p) {
              return r.pow(10, p).recip().neg();
            };
          else {
            let p = r.tetrate(10, O).neg();
            if (a.lt(p))
              n = !0;
            else if (s.gt(p))
              n = !1;
            else {
              let T = t(new r(p));
              n = o.lt(T), e && (n = !n);
            }
            n ? f = function(T) {
              return r.tetrate(10, new r(T).toNumber()).recip().neg();
            } : f = function(T) {
              return new r(T).gt(Math.log10(Number.MAX_VALUE)) ? r.dZero : r.tetrate(10, r.pow(10, T).toNumber()).recip().neg();
            };
          }
        } else {
          if (w = !1, a.lt(-O))
            n = !1;
          else if (s.gt(-O))
            n = !0;
          else {
            let M = t(new r(-O));
            n = o.gt(M), e && (n = !n);
          }
          if (n)
            f = function(M) {
              return r.neg(M);
            };
          else {
            let M = r.pow(10, O).neg();
            if (a.lt(M))
              n = !1;
            else if (s.gt(M))
              n = !0;
            else {
              let p = t(new r(M));
              n = o.gt(p), e && (n = !n);
            }
            if (n)
              f = function(p) {
                return r.pow(10, p).neg();
              };
            else {
              let p = r.tetrate(10, O).neg();
              if (a.lt(p))
                n = !1;
              else if (s.gt(p))
                n = !0;
              else {
                let T = t(new r(p));
                n = o.gt(T), e && (n = !n);
              }
              n ? f = function(T) {
                return r.tetrate(10, new r(T).toNumber()).neg();
              } : f = function(T) {
                return new r(T).gt(Math.log10(Number.MAX_VALUE)) ? r.dNegInf : r.tetrate(10, r.pow(10, T).toNumber()).neg();
              };
            }
          }
        }
      }
      let E = d != w != e, I = E ? function(M, p) {
        return r.gt(M, p);
      } : function(M, p) {
        return r.lt(M, p);
      }, F = 1e-3, m = !1, b = !1, q = 1, x = r.dOne, S = 0, A = !1;
      for (var V = 1; V < i; ++V) {
        A = !1, S = q, x = f(q), x.gt(a) && (x = a, A = !0), x.lt(s) && (x = s, A = !0);
        let M = t(x);
        if (M.eq(o) && !A)
          break;
        let p = I(M, o);
        if (V > 1 && b != p && (m = !0), b = p, m ? F /= 2 : F *= 2, p != E && x.eq(a) || p == E && x.eq(s))
          return new r(r.dNaN);
        if (F = Math.abs(F) * (p ? -1 : 1), q += F, F === 0 || S == q)
          break;
      }
      return f(q);
    };
  }
  /**
   * Pentation/pentate: The result of tetrating 'height' times in a row. An absurdly strong operator - Decimal.pentate(2, 4.28) and Decimal.pentate(10, 2.37) are already too huge for break_eternity.js!
   * https://en.wikipedia.org/wiki/Pentation
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   * 
   * For non-whole pentation heights, the linear approximation of pentation is always used, as there is no defined analytic approximation of pentation.
   */
  pentate(t = 2, e = N(1, 0, 1), i = !1) {
    e = new r(e);
    const s = t;
    t = Math.floor(t);
    const a = s - t;
    let l = r.dZero, u = r.dZero;
    if (a !== 0)
      if (e.eq(r.dOne))
        ++t, e = r.fromNumber(a);
      else
        return this.pentate(e.penta_log(this, void 0, i).plus(s).toNumber(), 1, i);
    if (t > 0)
      for (let o = 0; o < t; ) {
        if (u = l, l = e, e = this.tetrate(e.toNumber(), r.dOne, i), ++o, this.gt(0) && this.lte(1) && e.gt(0) && e.lte(1))
          return this.tetrate(t - o, e, i);
        if (e.eq(l) || e.eq(u) && o % 2 == t % 2 || !isFinite(e.layer) || !isFinite(e.mag))
          return e.normalize();
        if (o > 1e4)
          return e;
      }
    else
      for (let o = 0; o < -t; ++o) {
        if (l = e, e = e.slog(this, void 0, i), e.eq(l) || !isFinite(e.layer) || !isFinite(e.mag))
          return e.normalize();
        if (o > 100)
          return e;
      }
    return e;
  }
  /**
   * Penta-logarithm, one of pentation's inverses, tells you what height you'd have to pentate 'base' to to get 'this'.
   * 
   * Grows incredibly slowly. For bases above 2, you won't be seeing a result greater than 5 out of this function.
   * 
   * Accepts a number of iterations (default is 100), and use binary search to, after making an initial guess, hone in on the true value, assuming pentation as the ground truth.
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   * 
   * For non-whole pentation heights, the linear approximation of pentation is always used, as there is no defined analytic approximation of pentation.
   */
  // INCREDIBLY slow on numbers <= -1. Probably don't call it on those.
  // If you're here looking to port penta_log to OmegaNum, ExpantaNum, or something similar, then know that this implementation isn't sufficient for that purpose. The pentation functions here run loops without shortcuts, because in break_eternity the numbers don't get large enough to need those shortcuts.
  penta_log(t = 10, e = 100, i = !1) {
    if (t = new r(t), t.lte(1))
      return new r(r.dNaN);
    if (this.eq(1))
      return N(0, 0, 0);
    if (this.eq(r.dInf))
      return new r(r.dInf);
    let s = new r(1), a = 0, l = 1;
    if (this.lt(-1)) {
      if (this.lte(-2))
        return new r(r.dNaN);
      let o = t.tetrate(this.toNumber(), 1, i);
      if (this.eq(o))
        return new r(r.dNegInf);
      if (this.gt(o))
        return new r(r.dNaN);
    }
    if (this.gt(1)) {
      for (; s.lt(this); )
        if (a++, s = r.tetrate(t, s.toNumber(), 1, i), a > 1e3)
          return new r(r.dNaN);
    } else
      for (; s.gt(this); )
        if (a--, s = r.slog(s, t, i), a > 100)
          return new r(r.dNaN);
    for (var u = 1; u < e; ++u) {
      let o = t.pentate(a, r.dOne, i);
      if (o.eq(this))
        break;
      let f = o.gt(this);
      if (l = Math.abs(l) * (f ? -1 : 1), a += l, l /= 2, l === 0)
        break;
    }
    return r.fromNumber(a);
  }
  /**
   * Penta-root, one of pentation's inverses - what number, pentated to height 'degree', equals 'this'?
   * 
   * Only works with the linear approximation of tetration, as starting with analytic and then switching to linear would result in inconsistent behavior for super-roots.
   */
  linear_penta_root(t) {
    return t == 1 ? this : t < 0 ? new r(r.dNaN) : this.eq(r.dInf) ? new r(r.dInf) : this.isFinite() ? t > 0 && t < 1 ? this.root(t) : this.eq(1) ? N(1, 0, 1) : this.lt(0) ? new r(r.dNaN) : this.lt(1) ? this.linear_sroot(t) : r.increasingInverse(function(e) {
      return r.pentate(e, t, 1, !0);
    })(this) : new r(r.dNaN);
  }
  // trig functions!
  /**
   * The sine function, one of the main two trigonometric functions. Behaves periodically with period 2*pi.
   */
  sin() {
    return this.mag < 0 ? new r(this) : this.layer === 0 ? r.fromNumber(Math.sin(this.sign * this.mag)) : N(0, 0, 0);
  }
  /**
   * The cosine function, one of the main two trigonometric functions. Behaves periodically with period 2*pi.
   */
  cos() {
    return this.mag < 0 ? N(1, 0, 1) : this.layer === 0 ? r.fromNumber(Math.cos(this.sign * this.mag)) : N(0, 0, 0);
  }
  /**
   * The tangent function, equal to sine divided by cosine. Behaves periodically with period pi.
   */
  tan() {
    return this.mag < 0 ? new r(this) : this.layer === 0 ? r.fromNumber(Math.tan(this.sign * this.mag)) : N(0, 0, 0);
  }
  /**
   * The arcsine function, the inverse of the sine function.
   */
  asin() {
    return this.mag < 0 ? new r(this) : this.layer === 0 ? r.fromNumber(Math.asin(this.sign * this.mag)) : new r(r.dNaN);
  }
  /**
   * The arccosine function, the inverse of the cosine function.
   */
  acos() {
    return this.mag < 0 ? r.fromNumber(Math.acos(this.toNumber())) : this.layer === 0 ? r.fromNumber(Math.acos(this.sign * this.mag)) : new r(r.dNaN);
  }
  /**
   * The arctangent function, the inverse of the tangent function.
   */
  atan() {
    return this.mag < 0 ? new r(this) : this.layer === 0 ? r.fromNumber(Math.atan(this.sign * this.mag)) : r.fromNumber(Math.atan(this.sign * (1 / 0)));
  }
  /**
   * Hyperbolic sine: sinh(X) = (e^x - e^-x)/2.
   */
  sinh() {
    return this.exp().sub(this.negate().exp()).div(2);
  }
  /**
   * Hyperbolic cosine: cosh(x) = (e^x + e^-x)/2.
   */
  cosh() {
    return this.exp().add(this.negate().exp()).div(2);
  }
  /**
   * Hyperbolic tangent: tanh(x) = sinh(x)/cosh(x).
   */
  tanh() {
    return this.sinh().div(this.cosh());
  }
  /**
   * Hyperbolic arcsine, the inverse of hyperbolic sine.
   */
  asinh() {
    return r.ln(this.add(this.sqr().add(1).sqrt()));
  }
  /**
   * Hyperbolic arccosine, the inverse of hyperbolic cosine.
   */
  acosh() {
    return r.ln(this.add(this.sqr().sub(1).sqrt()));
  }
  /**
   * Hyperbolic arcctangent, the inverse of hyperbolic tangent.
   */
  atanh() {
    return this.abs().gte(1) ? new r(r.dNaN) : r.ln(this.add(1).div(r.fromNumber(1).sub(this))).div(2);
  }
  /**
   * Joke function from Realm Grinder
   */
  ascensionPenalty(t) {
    return t === 0 ? new r(this) : this.root(r.pow(10, t));
  }
  /**
   * Joke function from Cookie Clicker. It's 'egg'
   */
  egg() {
    return this.add(9);
  }
  lessThanOrEqualTo(t) {
    return this.cmp(t) < 1;
  }
  lessThan(t) {
    return this.cmp(t) < 0;
  }
  greaterThanOrEqualTo(t) {
    return this.cmp(t) > -1;
  }
  greaterThan(t) {
    return this.cmp(t) > 0;
  }
  // return Decimal;
};
let y = r;
/**
 * Represents the number 0.
 */
C(y, "dZero", N(0, 0, 0)), /**
 * Represents the number 1.
 */
C(y, "dOne", N(1, 0, 1)), /**
 * Represents the number -1.
 */
C(y, "dNegOne", N(-1, 0, 1)), /**
 * Represents the number 2.
 */
C(y, "dTwo", N(1, 0, 2)), /**
 * Represents the number 10.
 */
C(y, "dTen", N(1, 0, 10)), /**
 * Represents a NaN (Not A Number) value.
 */
C(y, "dNaN", N(Number.NaN, Number.NaN, Number.NaN)), /**
 * Represents positive infinity.
 */
C(y, "dInf", N(1, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)), /**
 * Represents negative infinity.
 */
C(y, "dNegInf", N(-1, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)), /**
 * Represents the largest value a JavaScript number can have, which is approximately 1.79 * 10^308.
 */
C(y, "dNumberMax", g(1, 0, Number.MAX_VALUE)), /**
 * Represents the smallest value a JavaScript number can have, which is approximately 5 * 10^-324.
 */
C(y, "dNumberMin", g(1, 0, Number.MIN_VALUE)), /**
 * Represents the largest Decimal where adding 1 to the layer is a safe operation
 * (Decimals larger than this are too big for pow/exp/log to affect, but tetrate/iteratedlog/slog can still affect them).
 * Approximately 10^^(9.007 * 10^15).
 */
C(y, "dLayerSafeMax", g(1, Number.MAX_SAFE_INTEGER, O - 1)), /**
 * Represents the smallest Decimal where adding 1 to the layer is a safe operation. Approximately 1 / (10^^(9.007 * 10^15)).
 */
C(y, "dLayerSafeMin", g(1, Number.MAX_SAFE_INTEGER, -(O - 1))), /**
 * Represents the largest finite value a Decimal can represent. Approximately 10^^(1.79 * 10^308).
 */
C(y, "dLayerMax", g(1, Number.MAX_VALUE, O - 1)), /**
 * Represents the smallest non-zero value a Decimal can represent. Approximately 1 / (10^^(1.79 * 10^308)).
 */
C(y, "dLayerMin", g(1, Number.MAX_VALUE, -(O - 1))), C(y, "fromStringCache", new v(J));
h = y.fromValue_noAlloc;
g = y.fromComponents;
N = y.fromComponents_noNormalize;
y.fromMantissaExponent;
y.fromMantissaExponent_noNormalize;
export {
  y as default
};
//# sourceMappingURL=break_eternity.esm.js.map
