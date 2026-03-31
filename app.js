/* ============================================================
   NC Decomposition — LU Decomposition Calculator
   Complete rewrite: modern architecture, NxN support, multiple methods
   ============================================================ */

(function () {
  'use strict';

  // ===== FRACTION ARITHMETIC =====
  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { [a, b] = [b, a % b]; }
    return a || 1;
  }

  class Frac {
    constructor(num, den = 1) {
      if (den === 0) throw new Error('Division by zero');
      if (den < 0) { num = -num; den = -den; }
      const g = gcd(Math.abs(num), Math.abs(den));
      this.n = num / g;
      this.d = den / g;
    }
    add(o) { return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
    sub(o) { return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
    mul(o) { return new Frac(this.n * o.n, this.d * o.d); }
    div(o) {
      if (o.n === 0) throw new Error('Division by zero — matrix may be singular');
      return new Frac(this.n * o.d, this.d * o.n);
    }
    neg() { return new Frac(-this.n, this.d); }
    abs() { return new Frac(Math.abs(this.n), this.d); }
    isZero() { return this.n === 0; }
    eq(o) { return this.n === o.n && this.d === o.d; }
    toNumber() { return this.n / this.d; }
    toString() { return this.d === 1 ? '' + this.n : this.n + '/' + this.d; }
    toHTML() {
      if (this.d === 1) return '<span class="num-int">' + this.n + '</span>';
      var sign = this.n < 0 ? '<span class="num-neg">\u2212</span>' : '';
      return sign + '<span class="frac"><span class="frac-num">' + Math.abs(this.n) + '</span><span class="frac-den">' + this.d + '</span></span>';
    }
    static zero() { return new Frac(0); }
    static one() { return new Frac(1); }
    static from(val) {
      if (val instanceof Frac) return new Frac(val.n, val.d);
      if (Number.isInteger(val)) return new Frac(val);
      return Frac._fromFloat(val);
    }
    static _fromFloat(x) {
      if (Math.abs(x - Math.round(x)) < 1e-10) return new Frac(Math.round(x));
      var neg = x < 0;
      x = Math.abs(x);
      var h1 = 1, h2 = 0, k1 = 0, k2 = 1, b = x;
      for (var i = 0; i < 25; i++) {
        var a = Math.floor(b);
        var h = a * h1 + h2, k = a * k1 + k2;
        if (k > 10000) break;
        h2 = h1; h1 = h; k2 = k1; k1 = k;
        if (Math.abs(b - a) < 1e-10) break;
        b = 1 / (b - a);
      }
      return new Frac(neg ? -h1 : h1, k1);
    }
  }

  // ===== HELPERS =====
  var SUB = '\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089';
  function sub(n) { return String(n).split('').map(function(c) { return SUB[c] || c; }).join(''); }
  function elName(letter, i, j) { return letter + sub(i) + sub(j); }

  function createZeroFracMatrix(n) {
    var M = [];
    for (var i = 0; i < n; i++) {
      M[i] = [];
      for (var j = 0; j < n; j++) M[i][j] = Frac.zero();
    }
    return M;
  }
  function createIdentityFracMatrix(n) {
    var M = createZeroFracMatrix(n);
    for (var i = 0; i < n; i++) M[i][i] = Frac.one();
    return M;
  }
  function cloneFracMatrix(M) {
    return M.map(function(row) { return row.map(function(v) { return new Frac(v.n, v.d); }); });
  }

  // ===== DECOMPOSITION ALGORITHMS =====
  function doolittle(A, n) {
    var L = createIdentityFracMatrix(n);
    var U = createZeroFracMatrix(n);
    var steps = [];

    steps.push({ type: 'info', html: '<p>In Doolittle\'s method, <strong>L</strong> has 1s on the diagonal and <strong>U</strong> is upper triangular.</p>' });

    for (var k = 0; k < n; k++) {
      steps.push({ type: 'heading', text: 'Column ' + (k + 1) });

      steps.push({ type: 'subheading', text: 'Row ' + (k + 1) + ' of U' });
      for (var j = k; j < n; j++) {
        var substeps = [];
        var sum = Frac.zero();
        var terms = [];
        for (var p = 0; p < k; p++) {
          var t = L[k][p].mul(U[p][j]);
          terms.push({ l: L[k][p], u: U[p][j], val: t });
          sum = sum.add(t);
        }
        U[k][j] = A[k][j].sub(sum);

        var el = elName('U', k + 1, j + 1);
        var aEl = 'a' + sub(k + 1) + sub(j + 1);

        if (k === 0) {
          substeps.push(el + ' = ' + aEl + ' = <strong>' + U[k][j] + '</strong>');
        } else {
          var formula = el + ' = ' + aEl + ' \u2212 ';
          var sumParts = terms.map(function(_, i) { return elName('L', k + 1, i + 1) + '\u00b7' + elName('U', i + 1, j + 1); });
          formula += sumParts.length === 1 ? sumParts[0] : '(' + sumParts.join(' + ') + ')';
          substeps.push(formula);

          var subst = el + ' = ' + A[k][j] + ' \u2212 ';
          var valParts = terms.map(function(t) { return '(' + t.l + ')\u00b7(' + t.u + ')'; });
          subst += valParts.length === 1 ? valParts[0] : '(' + valParts.join(' + ') + ')';
          substeps.push(subst);
          substeps.push(el + ' = ' + A[k][j] + ' \u2212 ' + sum + ' = <strong>' + U[k][j] + '</strong>');
        }
        steps.push({ type: 'step', substeps: substeps });
      }

      if (k < n - 1) {
        steps.push({ type: 'subheading', text: 'Column ' + (k + 1) + ' of L' });
        for (var i = k + 1; i < n; i++) {
          var substeps2 = [];
          var sum2 = Frac.zero();
          var terms2 = [];
          for (var p2 = 0; p2 < k; p2++) {
            var t2 = L[i][p2].mul(U[p2][k]);
            terms2.push({ l: L[i][p2], u: U[p2][k], val: t2 });
            sum2 = sum2.add(t2);
          }
          var num = A[i][k].sub(sum2);
          L[i][k] = num.div(U[k][k]);

          var el2 = elName('L', i + 1, k + 1);
          var aEl2 = 'a' + sub(i + 1) + sub(k + 1);
          var uDiag = elName('U', k + 1, k + 1);

          if (k === 0) {
            substeps2.push(el2 + ' = ' + aEl2 + ' / ' + uDiag + ' = ' + A[i][k] + ' / ' + U[k][k] + ' = <strong>' + L[i][k] + '</strong>');
          } else {
            var formula2 = el2 + ' = (' + aEl2 + ' \u2212 ';
            var sp2 = terms2.map(function(_, p) { return elName('L', i + 1, p + 1) + '\u00b7' + elName('U', p + 1, k + 1); });
            formula2 += (sp2.length === 1 ? sp2[0] : sp2.join(' + ')) + ') / ' + uDiag;
            substeps2.push(formula2);

            var subst2 = el2 + ' = (' + A[i][k] + ' \u2212 ';
            var vp2 = terms2.map(function(t) { return '(' + t.l + ')\u00b7(' + t.u + ')'; });
            subst2 += (vp2.length === 1 ? vp2[0] : vp2.join(' + ')) + ') / ' + U[k][k];
            substeps2.push(subst2);
            substeps2.push(el2 + ' = ' + num + ' / ' + U[k][k] + ' = <strong>' + L[i][k] + '</strong>');
          }
          steps.push({ type: 'step', substeps: substeps2 });
        }
      }
    }
    return { L: L, U: U, P: null, steps: steps, method: 'Doolittle' };
  }

  function crout(A, n) {
    var L = createZeroFracMatrix(n);
    var U = createIdentityFracMatrix(n);
    var steps = [];

    steps.push({ type: 'info', html: '<p>In Crout\'s method, <strong>U</strong> has 1s on the diagonal and <strong>L</strong> is lower triangular.</p>' });

    for (var k = 0; k < n; k++) {
      steps.push({ type: 'heading', text: 'Column ' + (k + 1) });

      steps.push({ type: 'subheading', text: 'Column ' + (k + 1) + ' of L' });
      for (var i = k; i < n; i++) {
        var substeps = [];
        var sum = Frac.zero();
        var terms = [];
        for (var p = 0; p < k; p++) {
          var t = L[i][p].mul(U[p][k]);
          terms.push({ l: L[i][p], u: U[p][k], val: t });
          sum = sum.add(t);
        }
        L[i][k] = A[i][k].sub(sum);

        var el = elName('L', i + 1, k + 1);
        var aEl = 'a' + sub(i + 1) + sub(k + 1);

        if (k === 0) {
          substeps.push(el + ' = ' + aEl + ' = <strong>' + L[i][k] + '</strong>');
        } else {
          var formula = el + ' = ' + aEl + ' \u2212 ';
          var sumParts = terms.map(function(_, p) { return elName('L', i + 1, p + 1) + '\u00b7' + elName('U', p + 1, k + 1); });
          formula += sumParts.length === 1 ? sumParts[0] : '(' + sumParts.join(' + ') + ')';
          substeps.push(formula);

          var subst = el + ' = ' + A[i][k] + ' \u2212 ';
          var valParts = terms.map(function(t) { return '(' + t.l + ')\u00b7(' + t.u + ')'; });
          subst += valParts.length === 1 ? valParts[0] : '(' + valParts.join(' + ') + ')';
          substeps.push(subst);
          substeps.push(el + ' = ' + A[i][k] + ' \u2212 ' + sum + ' = <strong>' + L[i][k] + '</strong>');
        }
        steps.push({ type: 'step', substeps: substeps });
      }

      if (k < n - 1) {
        steps.push({ type: 'subheading', text: 'Row ' + (k + 1) + ' of U' });
        for (var j = k + 1; j < n; j++) {
          var substeps2 = [];
          var sum2 = Frac.zero();
          var terms2 = [];
          for (var p2 = 0; p2 < k; p2++) {
            var t2 = L[k][p2].mul(U[p2][j]);
            terms2.push({ l: L[k][p2], u: U[p2][j], val: t2 });
            sum2 = sum2.add(t2);
          }
          var num = A[k][j].sub(sum2);
          U[k][j] = num.div(L[k][k]);

          var el2 = elName('U', k + 1, j + 1);
          var aEl2 = 'a' + sub(k + 1) + sub(j + 1);
          var lDiag = elName('L', k + 1, k + 1);

          if (k === 0) {
            substeps2.push(el2 + ' = ' + aEl2 + ' / ' + lDiag + ' = ' + A[k][j] + ' / ' + L[k][k] + ' = <strong>' + U[k][j] + '</strong>');
          } else {
            var formula2 = el2 + ' = (' + aEl2 + ' \u2212 ';
            var sp2 = terms2.map(function(_, p) { return elName('L', k + 1, p + 1) + '\u00b7' + elName('U', p + 1, j + 1); });
            formula2 += (sp2.length === 1 ? sp2[0] : sp2.join(' + ')) + ') / ' + lDiag;
            substeps2.push(formula2);

            var subst2 = el2 + ' = (' + A[k][j] + ' \u2212 ';
            var vp2 = terms2.map(function(t) { return '(' + t.l + ')\u00b7(' + t.u + ')'; });
            subst2 += (vp2.length === 1 ? vp2[0] : vp2.join(' + ')) + ') / ' + L[k][k];
            substeps2.push(subst2);
            substeps2.push(el2 + ' = ' + num + ' / ' + L[k][k] + ' = <strong>' + U[k][j] + '</strong>');
          }
          steps.push({ type: 'step', substeps: substeps2 });
        }
      }
    }
    return { L: L, U: U, P: null, steps: steps, method: 'Crout' };
  }

  function cholesky(A, n) {
    for (var i = 0; i < n; i++)
      for (var j = 0; j < n; j++)
        if (!A[i][j].eq(A[j][i]))
          throw new Error('Matrix must be symmetric for Cholesky decomposition');

    var L = createZeroFracMatrix(n);
    var steps = [];
    steps.push({ type: 'info', html: '<p>Cholesky decomposition: <strong>A = LL\u1d40</strong> where <strong>L</strong> is lower triangular. Matrix must be symmetric positive definite.</p>' });
    steps.push({ type: 'info', html: '<p><em>Note: Results may be shown as decimals when square roots produce irrational numbers.</em></p>' });

    for (var j = 0; j < n; j++) {
      steps.push({ type: 'heading', text: 'Column ' + (j + 1) });

      // Diagonal element
      var substepsD = [];
      var sumD = Frac.zero();
      for (var p = 0; p < j; p++) {
        sumD = sumD.add(L[j][p].mul(L[j][p]));
      }
      var innerVal = A[j][j].sub(sumD).toNumber();
      if (innerVal < -1e-10)
        throw new Error('Matrix is not positive definite \u2014 cannot compute Cholesky decomposition');

      var sqrtVal = Math.sqrt(Math.max(0, innerVal));
      L[j][j] = Frac.from(sqrtVal);

      var elD = elName('L', j + 1, j + 1);
      if (j === 0) {
        substepsD.push(elD + ' = \u221a(a' + sub(j + 1) + sub(j + 1) + ') = \u221a(' + A[j][j] + ') = <strong>' + L[j][j] + '</strong>');
      } else {
        substepsD.push(elD + ' = \u221a(' + A[j][j] + ' \u2212 ' + sumD + ') = \u221a(' + A[j][j].sub(sumD) + ') = <strong>' + L[j][j] + '</strong>');
      }
      steps.push({ type: 'step', substeps: substepsD });

      for (var i2 = j + 1; i2 < n; i2++) {
        var substepsO = [];
        var sumO = Frac.zero();
        var termsO = [];
        for (var p2 = 0; p2 < j; p2++) {
          var tO = L[i2][p2].mul(L[j][p2]);
          termsO.push({ li: L[i2][p2], lj: L[j][p2], val: tO });
          sumO = sumO.add(tO);
        }
        var numO = A[i2][j].sub(sumO);
        L[i2][j] = numO.div(L[j][j]);

        var elO = elName('L', i2 + 1, j + 1);
        if (j === 0) {
          substepsO.push(elO + ' = a' + sub(i2 + 1) + sub(j + 1) + ' / ' + elName('L', j + 1, j + 1) + ' = ' + A[i2][j] + ' / ' + L[j][j] + ' = <strong>' + L[i2][j] + '</strong>');
        } else {
          substepsO.push(elO + ' = (' + A[i2][j] + ' \u2212 ' + sumO + ') / ' + L[j][j] + ' = ' + numO + ' / ' + L[j][j] + ' = <strong>' + L[i2][j] + '</strong>');
        }
        steps.push({ type: 'step', substeps: substepsO });
      }
    }

    var UT = createZeroFracMatrix(n);
    for (var ii = 0; ii < n; ii++)
      for (var jj = 0; jj < n; jj++)
        UT[ii][jj] = new Frac(L[jj][ii].n, L[jj][ii].d);

    return { L: L, U: UT, P: null, steps: steps, method: 'Cholesky', isCholesky: true };
  }

  function plu(A, n) {
    var L = createZeroFracMatrix(n);
    var U = cloneFracMatrix(A);
    var P = createIdentityFracMatrix(n);
    var perm = [];
    for (var idx = 0; idx < n; idx++) perm[idx] = idx;
    var steps = [];

    steps.push({ type: 'info', html: '<p>PLU decomposition: <strong>PA = LU</strong> with partial pivoting for numerical stability.</p>' });

    for (var k = 0; k < n; k++) {
      steps.push({ type: 'heading', text: 'Step ' + (k + 1) + ': Column ' + (k + 1) });

      var maxVal = U[k][k].abs().toNumber();
      var maxRow = k;
      for (var i = k + 1; i < n; i++) {
        var v = U[i][k].abs().toNumber();
        if (v > maxVal) { maxVal = v; maxRow = i; }
      }

      if (maxVal < 1e-12) throw new Error('Matrix is singular \u2014 PLU decomposition not possible');

      if (maxRow !== k) {
        steps.push({ type: 'step', substeps: ['Pivot: swap row ' + (k + 1) + ' \u2194 row ' + (maxRow + 1) + ' (largest element in column: ' + U[maxRow][k] + ')'] });
        var tmpU = U[k]; U[k] = U[maxRow]; U[maxRow] = tmpU;
        var tmpP = P[k]; P[k] = P[maxRow]; P[maxRow] = tmpP;
        var tmpPerm = perm[k]; perm[k] = perm[maxRow]; perm[maxRow] = tmpPerm;
        for (var jj = 0; jj < k; jj++) {
          var tmpL = L[k][jj]; L[k][jj] = L[maxRow][jj]; L[maxRow][jj] = tmpL;
        }
      } else {
        steps.push({ type: 'step', substeps: ['No row swap needed (pivot element ' + U[k][k] + ' is already the largest)'] });
      }

      L[k][k] = Frac.one();

      steps.push({ type: 'subheading', text: 'Elimination for column ' + (k + 1) });
      for (var i2 = k + 1; i2 < n; i2++) {
        var substeps = [];
        var factor = U[i2][k].div(U[k][k]);
        L[i2][k] = factor;
        substeps.push(elName('L', i2 + 1, k + 1) + ' = ' + U[i2][k] + ' / ' + U[k][k] + ' = <strong>' + factor + '</strong>');

        for (var j = k; j < n; j++) {
          U[i2][j] = U[i2][j].sub(factor.mul(U[k][j]));
        }
        substeps.push('Row ' + (i2 + 1) + ' \u2190 Row ' + (i2 + 1) + ' \u2212 (' + factor + ') \u00d7 Row ' + (k + 1));
        steps.push({ type: 'step', substeps: substeps });
      }
    }

    return { L: L, U: U, P: P, steps: steps, method: 'PLU', perm: perm };
  }

  // ===== SOLVER =====
  function forwardSub(L, b, n, isUnitDiag) {
    var y = [];
    var steps = [];
    steps.push({ type: 'heading', text: 'Forward Substitution (Ly = b)' });

    for (var i = 0; i < n; i++) {
      var substeps = [];
      var sum = Frac.zero();
      var terms = [];
      for (var j = 0; j < i; j++) {
        var t = L[i][j].mul(y[j]);
        terms.push({ l: L[i][j], y: y[j], val: t });
        sum = sum.add(t);
      }

      var num = b[i].sub(sum);
      y[i] = isUnitDiag ? num : num.div(L[i][i]);

      var el = 'y' + sub(i + 1);
      if (i === 0 && isUnitDiag) {
        substeps.push(el + ' = b' + sub(1) + ' = <strong>' + y[i] + '</strong>');
      } else if (i === 0) {
        substeps.push(el + ' = b' + sub(1) + ' / ' + elName('L', 1, 1) + ' = ' + b[i] + ' / ' + L[i][i] + ' = <strong>' + y[i] + '</strong>');
      } else {
        var formula = el + ' = (b' + sub(i + 1) + ' \u2212 ';
        var parts = terms.map(function(_, j) { return elName('L', i + 1, j + 1) + '\u00b7y' + sub(j + 1); });
        formula += parts.join(' \u2212 ') + ')';
        if (!isUnitDiag) formula += ' / ' + elName('L', i + 1, i + 1);
        substeps.push(formula);
        substeps.push(el + ' = (' + b[i] + ' \u2212 ' + sum + ')' + (isUnitDiag ? '' : ' / ' + L[i][i]) + ' = <strong>' + y[i] + '</strong>');
      }
      steps.push({ type: 'step', substeps: substeps });
    }
    return { y: y, steps: steps };
  }

  function backwardSub(U, y, n, isUnitDiag) {
    var x = new Array(n);
    var steps = [];
    steps.push({ type: 'heading', text: 'Backward Substitution (Ux = y)' });

    for (var i = n - 1; i >= 0; i--) {
      var substeps = [];
      var sum = Frac.zero();
      var terms = [];
      for (var j = i + 1; j < n; j++) {
        var t = U[i][j].mul(x[j]);
        terms.push({ u: U[i][j], x: x[j], val: t, j: j });
        sum = sum.add(t);
      }

      var num = y[i].sub(sum);
      x[i] = isUnitDiag ? num : num.div(U[i][i]);

      var el = 'x' + sub(i + 1);
      if (i === n - 1 && !isUnitDiag) {
        substeps.push(el + ' = y' + sub(i + 1) + ' / ' + elName('U', i + 1, i + 1) + ' = ' + y[i] + ' / ' + U[i][i] + ' = <strong>' + x[i] + '</strong>');
      } else if (i === n - 1) {
        substeps.push(el + ' = y' + sub(i + 1) + ' = <strong>' + x[i] + '</strong>');
      } else {
        var formula = el + ' = (y' + sub(i + 1) + ' \u2212 ';
        var parts = terms.map(function(t) { return elName('U', i + 1, t.j + 1) + '\u00b7x' + sub(t.j + 1); });
        formula += parts.join(' \u2212 ') + ')';
        if (!isUnitDiag) formula += ' / ' + elName('U', i + 1, i + 1);
        substeps.push(formula);
        substeps.push(el + ' = (' + y[i] + ' \u2212 ' + sum + ')' + (isUnitDiag ? '' : ' / ' + U[i][i]) + ' = <strong>' + x[i] + '</strong>');
      }
      steps.push({ type: 'step', substeps: substeps });
    }
    return { x: x, steps: steps };
  }

  // ===== ANALYSIS =====
  function computeDeterminant(result, n) {
    var det = Frac.one();
    for (var i = 0; i < n; i++) det = det.mul(result.L[i][i]);
    for (var i2 = 0; i2 < n; i2++) det = det.mul(result.U[i2][i2]);
    if (result.P && result.perm) {
      var visited = new Array(n).fill(false);
      var swaps = 0;
      for (var i3 = 0; i3 < n; i3++) {
        if (!visited[i3]) {
          var j = i3, cycleLen = 0;
          while (!visited[j]) { visited[j] = true; j = result.perm[j]; cycleLen++; }
          swaps += cycleLen - 1;
        }
      }
      if (swaps % 2 === 1) det = det.neg();
    }
    return det;
  }

  function computeInverse(result, n) {
    var isLUnit = result.method === 'Doolittle' || result.method === 'PLU';
    var isUUnit = result.method === 'Crout';
    var inv = createZeroFracMatrix(n);

    for (var col = 0; col < n; col++) {
      var e = [];
      for (var i = 0; i < n; i++) e[i] = i === col ? Frac.one() : Frac.zero();

      var b = e;
      if (result.P) {
        b = new Array(n);
        for (var i2 = 0; i2 < n; i2++) {
          var s = Frac.zero();
          for (var j = 0; j < n; j++) s = s.add(result.P[i2][j].mul(e[j]));
          b[i2] = s;
        }
      }

      var fwd = forwardSub(result.L, b, n, isLUnit);
      var bwd = backwardSub(result.U, fwd.y, n, isUUnit);
      for (var i3 = 0; i3 < n; i3++) inv[i3][col] = bwd.x[i3];
    }
    return inv;
  }

  function matInfNorm(M) {
    var maxSum = 0;
    for (var i = 0; i < M.length; i++) {
      var sum = 0;
      for (var j = 0; j < M[i].length; j++) {
        var v = M[i][j];
        sum += Math.abs(v instanceof Frac ? v.toNumber() : v);
      }
      if (sum > maxSum) maxSum = sum;
    }
    return maxSum;
  }

  // ===== UI RENDERING =====
  function renderMatrixHTML(M, n, label) {
    var html = '<div class="matrix-labeled">';
    if (label) html += '<span class="matrix-label">' + label + ' = </span>';
    html += '<div class="matrix-bracket"><div class="matrix-grid" style="grid-template-columns: repeat(' + n + ', 1fr);">';
    for (var i = 0; i < n; i++)
      for (var j = 0; j < n; j++)
        html += '<div class="matrix-cell">' + (M[i][j] instanceof Frac ? M[i][j].toHTML() : (Number.isInteger(M[i][j]) ? M[i][j] : M[i][j].toFixed(4))) + '</div>';
    html += '</div></div></div>';
    return html;
  }

  function renderVectorHTML(v, n, label) {
    var html = '<div class="matrix-labeled">';
    if (label) html += '<span class="matrix-label">' + label + ' = </span>';
    html += '<div class="matrix-bracket"><div class="matrix-grid" style="grid-template-columns: 1fr;">';
    for (var i = 0; i < n; i++)
      html += '<div class="matrix-cell">' + (v[i] instanceof Frac ? v[i].toHTML() : v[i]) + '</div>';
    html += '</div></div></div>';
    return html;
  }

  function renderStepsHTML(steps) {
    var html = '';
    for (var s = 0; s < steps.length; s++) {
      var step = steps[s];
      if (step.type === 'heading') html += '<h3 class="step-heading">' + step.text + '</h3>';
      else if (step.type === 'subheading') html += '<h4 class="step-subheading">' + step.text + '</h4>';
      else if (step.type === 'info') html += step.html;
      else if (step.type === 'step') {
        html += '<div class="step-block">';
        for (var ss = 0; ss < step.substeps.length; ss++) html += '<div class="step-line">' + step.substeps[ss] + '</div>';
        html += '</div>';
      }
    }
    return html;
  }

  // ===== LATEX EXPORT =====
  function matrixToLaTeX(M, n) {
    var tex = '\\begin{bmatrix}\n';
    for (var i = 0; i < n; i++) {
      var row = [];
      for (var j = 0; j < n; j++) {
        var v = M[i][j];
        if (v instanceof Frac) row.push(v.d === 1 ? '' + v.n : '\\frac{' + v.n + '}{' + v.d + '}');
        else row.push(Number.isInteger(v) ? '' + v : v.toFixed(4));
      }
      tex += row.join(' & ') + (i < n - 1 ? ' \\\\\n' : '\n');
    }
    tex += '\\end{bmatrix}';
    return tex;
  }

  function generateLaTeX(result, n) {
    var tex = '';
    if (result.P) { tex += 'P = ' + matrixToLaTeX(result.P, n) + '\n\nPA = LU\n\n'; }
    else if (result.isCholesky) { tex += 'A = LL^T\n\n'; }
    else { tex += 'A = LU\n\n'; }
    tex += 'L = ' + matrixToLaTeX(result.L, n) + '\n\n';
    tex += 'U = ' + matrixToLaTeX(result.U, n);
    return tex;
  }

  // ===== HISTORY =====
  var HISTORY_KEY = 'nc_decomp_history';

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch(e) { return []; }
  }

  function saveHistory(entry) {
    var history = loadHistory();
    history.unshift(entry);
    if (history.length > 50) history.length = 50;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistoryPanel();
  }

  function renderHistoryPanel() {
    var list = document.getElementById('history-list');
    var history = loadHistory();
    if (history.length === 0) {
      list.innerHTML = '<p class="history-empty">No calculations yet</p>';
      return;
    }
    var html = '';
    for (var i = 0; i < history.length; i++) {
      var h = history[i];
      html += '<div class="history-item" data-index="' + i + '">' +
        '<div class="history-meta">' +
        '<span class="history-method">' + h.method + '</span>' +
        '<span class="history-size">' + h.size + '\u00d7' + h.size + '</span>' +
        '<span class="history-date">' + new Date(h.date).toLocaleDateString() + '</span>' +
        '</div>' +
        '<div class="history-preview">[' + h.matrix[0].join(', ') + '; ...]</div>' +
        '</div>';
    }
    list.innerHTML = html;

    var items = list.querySelectorAll('.history-item');
    for (var j = 0; j < items.length; j++) {
      items[j].addEventListener('click', (function(idx) {
        return function() { loadFromHistory(history[idx]); };
      })(j));
    }
  }

  function loadFromHistory(h) {
    document.getElementById('matrix-size').value = h.size;
    generateGrid(h.size);
    document.getElementById('method-select').value = h.method.toLowerCase();
    for (var i = 0; i < h.size; i++)
      for (var j = 0; j < h.size; j++)
        document.getElementById('m-' + i + '-' + j).value = h.matrix[i][j];
    if (h.bVector) {
      document.getElementById('solve-toggle').checked = true;
      toggleBVector();
      for (var i2 = 0; i2 < h.size; i2++)
        document.getElementById('b-' + i2).value = h.bVector[i2];
    }
  }

  // ===== URL SHARING =====
  function encodeToURL(size, matrix, method, bVector) {
    var params = new URLSearchParams();
    params.set('n', size);
    params.set('m', matrix.flat().join(','));
    params.set('method', method);
    if (bVector) params.set('b', bVector.join(','));
    return window.location.origin + window.location.pathname + '?' + params.toString();
  }

  function decodeFromURL() {
    var params = new URLSearchParams(window.location.search);
    if (!params.has('n') || !params.has('m')) return null;
    var n = parseInt(params.get('n'));
    var flat = params.get('m').split(',').map(Number);
    if (flat.length !== n * n || flat.some(isNaN)) return null;
    var matrix = [];
    for (var i = 0; i < n; i++) matrix.push(flat.slice(i * n, (i + 1) * n));
    var method = params.get('method') || 'doolittle';
    var bVector = null;
    if (params.has('b')) {
      bVector = params.get('b').split(',').map(Number);
      if (bVector.length !== n || bVector.some(isNaN)) bVector = null;
    }
    return { n: n, matrix: matrix, method: method, bVector: bVector };
  }

  // ===== THEME =====
  function initTheme() {
    var saved = localStorage.getItem('nc_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('nc_theme', next);
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    var btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '\u2600\ufe0f' : '\ud83c\udf19';
  }

  // ===== DYNAMIC GRID =====
  var currentSize = 3;

  function generateGrid(n) {
    currentSize = n;
    var grid = document.getElementById('matrix-grid');
    var html = '';
    for (var i = 0; i < n; i++) {
      html += '<div class="matrix-input-row">';
      for (var j = 0; j < n; j++) {
        html += '<input type="number" id="m-' + i + '-' + j + '" class="matrix-input" step="any" placeholder="a' + sub(i + 1) + sub(j + 1) + '" value="' + (i === j ? 1 : 0) + '" aria-label="Matrix element row ' + (i + 1) + ' column ' + (j + 1) + '">';
      }
      html += '</div>';
    }
    grid.innerHTML = html;
    generateBVectorInputs(n);
  }

  function generateBVectorInputs(n) {
    var container = document.getElementById('b-vector-inputs');
    var html = '';
    for (var i = 0; i < n; i++) {
      html += '<input type="number" id="b-' + i + '" class="matrix-input b-input" step="any" placeholder="b' + sub(i + 1) + '" value="0" aria-label="b vector element ' + (i + 1) + '">';
    }
    container.innerHTML = html;
  }

  function toggleBVector() {
    var show = document.getElementById('solve-toggle').checked;
    document.getElementById('b-vector-section').style.display = show ? 'block' : 'none';
  }

  function toggleCompareMethod() {
    var show = document.getElementById('compare-toggle').checked;
    document.getElementById('compare-method-wrapper').style.display = show ? 'inline-block' : 'none';
  }

  function toggleImportArea() {
    var area = document.getElementById('import-section');
    area.style.display = area.style.display === 'none' ? 'block' : 'none';
  }

  function importMatrix() {
    var text = document.getElementById('import-text').value.trim();
    if (!text) return;
    var rows = text.split(/[;\n]+/).map(function(r) { return r.trim(); }).filter(function(r) { return r; });
    var matrix = rows.map(function(r) { return r.split(/[\s,\t]+/).map(Number); });
    var n = matrix.length;
    if (n < 2 || n > 10) { showError('Matrix size must be between 2 and 10'); return; }
    if (matrix.some(function(r) { return r.length !== n; })) { showError('Matrix must be square (NxN)'); return; }
    if (matrix.some(function(r) { return r.some(isNaN); })) { showError('Invalid number in matrix'); return; }
    var sizeVal = Math.min(Math.max(n, 2), 10);
    document.getElementById('matrix-size').value = sizeVal;
    generateGrid(sizeVal);
    for (var i = 0; i < n; i++)
      for (var j = 0; j < n; j++)
        document.getElementById('m-' + i + '-' + j).value = matrix[i][j];
    document.getElementById('import-section').style.display = 'none';
  }

  function randomMatrix() {
    var n = currentSize;
    for (var i = 0; i < n; i++)
      for (var j = 0; j < n; j++)
        document.getElementById('m-' + i + '-' + j).value = Math.floor(Math.random() * 19) - 9;
    if (document.getElementById('solve-toggle').checked)
      for (var i2 = 0; i2 < n; i2++)
        document.getElementById('b-' + i2).value = Math.floor(Math.random() * 19) - 9;
  }

  // ===== VALIDATION =====
  function readMatrix() {
    var n = currentSize;
    var A = [];
    for (var i = 0; i < n; i++) {
      A[i] = [];
      for (var j = 0; j < n; j++) {
        var el = document.getElementById('m-' + i + '-' + j);
        var val = el.value.trim();
        if (val === '' || isNaN(Number(val))) {
          el.classList.add('input-error');
          throw new Error('Invalid input at position (' + (i + 1) + ', ' + (j + 1) + ')');
        }
        el.classList.remove('input-error');
        A[i][j] = Frac.from(Number(val));
      }
    }
    return A;
  }

  function readBVector() {
    var n = currentSize;
    var b = [];
    for (var i = 0; i < n; i++) {
      var el = document.getElementById('b-' + i);
      var val = el.value.trim();
      if (val === '' || isNaN(Number(val))) {
        el.classList.add('input-error');
        throw new Error('Invalid b vector value at position ' + (i + 1));
      }
      el.classList.remove('input-error');
      b[i] = Frac.from(Number(val));
    }
    return b;
  }

  function showError(msg) {
    var output = document.getElementById('output');
    output.innerHTML = '<div class="error-message"><strong>Error:</strong> ' + msg + '</div>';
  }

  function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ===== MAIN CALCULATION =====
  function calculate() {
    var errorEls = document.querySelectorAll('.input-error');
    for (var e = 0; e < errorEls.length; e++) errorEls[e].classList.remove('input-error');

    var n = currentSize;
    var A;
    try { A = readMatrix(); }
    catch (err) { showError(err.message); return; }

    var method = document.getElementById('method-select').value;
    var compareMode = document.getElementById('compare-toggle').checked;
    var compareMethod = document.getElementById('compare-method-select').value;
    var solveEq = document.getElementById('solve-toggle').checked;

    var bVector = null;
    if (solveEq) {
      try { bVector = readBVector(); }
      catch (err) { showError(err.message); return; }
    }

    var output = document.getElementById('output');
    output.innerHTML = '';

    var methods = [method];
    if (compareMode && compareMethod !== method) methods.push(compareMethod);

    var results = [];
    for (var mi = 0; mi < methods.length; mi++) {
      try {
        var ACopy = cloneFracMatrix(A);
        var result;
        switch (methods[mi]) {
          case 'doolittle': result = doolittle(ACopy, n); break;
          case 'crout': result = crout(ACopy, n); break;
          case 'cholesky': result = cholesky(ACopy, n); break;
          case 'plu': result = plu(ACopy, n); break;
          default: throw new Error('Unknown method');
        }
        results.push(result);
      } catch (err) {
        showError(methods[mi].charAt(0).toUpperCase() + methods[mi].slice(1) + ': ' + err.message);
        return;
      }
    }

    var wrapper = compareMode && results.length === 2 ? '<div class="compare-wrapper">' : '';
    var wrapperEnd = compareMode && results.length === 2 ? '</div>' : '';

    var html = wrapper;

    for (var ri = 0; ri < results.length; ri++) {
      var result = results[ri];
      var isLUnit = result.method === 'Doolittle' || result.method === 'PLU';
      var isUUnit = result.method === 'Crout';

      html += '<div class="result-panel">';
      html += '<h2 class="result-title">' + result.method + ' Decomposition</h2>';

      html += '<div class="result-matrices">';
      if (result.P) html += renderMatrixHTML(result.P, n, 'P');
      html += renderMatrixHTML(result.L, n, 'L');
      html += renderMatrixHTML(result.U, n, result.isCholesky ? 'L\u1d40' : 'U');
      html += '</div>';

      try {
        var det = computeDeterminant(result, n);
        html += '<div class="result-info"><strong>Determinant:</strong> ' + det.toHTML() + '</div>';

        if (!det.isZero()) {
          try {
            var inv = computeInverse(result, n);
            html += '<div class="result-section"><h3>Matrix Inverse (A\u207b\u00b9)</h3>';
            html += '<div class="result-matrices">' + renderMatrixHTML(inv, n, 'A\u207b\u00b9') + '</div></div>';

            var floatA = A.map(function(r) { return r.map(function(v) { return v.toNumber(); }); });
            var cond = matInfNorm(floatA) * matInfNorm(inv);
            var condClass = '', condNote = '';
            if (cond > 1e10) { condClass = 'cond-bad'; condNote = ' (severely ill-conditioned!)'; }
            else if (cond > 1000) { condClass = 'cond-warn'; condNote = ' (ill-conditioned \u2014 results may be inaccurate)'; }
            else { condClass = 'cond-good'; }
            html += '<div class="result-info ' + condClass + '"><strong>Condition Number (\u221e-norm):</strong> ' + cond.toFixed(4) + condNote + '</div>';
          } catch(e) { /* skip */ }
        } else {
          html += '<div class="result-info cond-warn"><strong>Matrix is singular</strong> \u2014 no inverse exists</div>';
        }
      } catch(e) { /* skip */ }

      html += '<details class="steps-details"><summary>Step-by-Step Solution</summary>';
      html += '<div class="steps-content">' + renderStepsHTML(result.steps) + '</div>';
      html += '</details>';

      if (solveEq && bVector) {
        html += '<div class="result-section"><h2 class="result-title">Solving Ax = b</h2>';

        var b = bVector.map(function(v) { return new Frac(v.n, v.d); });
        if (result.P) {
          var pb = new Array(n);
          for (var pi = 0; pi < n; pi++) {
            var s = Frac.zero();
            for (var pj = 0; pj < n; pj++) s = s.add(result.P[pi][pj].mul(bVector[pj]));
            pb[pi] = s;
          }
          b = pb;
          html += '<div class="result-info">Applied permutation matrix P to b vector.</div>';
        }

        var fwd = forwardSub(result.L, b, n, isLUnit);
        html += renderVectorHTML(fwd.y, n, 'y');
        html += '<details class="steps-details"><summary>Forward Substitution Steps</summary>';
        html += '<div class="steps-content">' + renderStepsHTML(fwd.steps) + '</div></details>';

        var bwd = backwardSub(result.U, fwd.y, n, isUUnit);
        html += renderVectorHTML(bwd.x, n, 'x');
        html += '<details class="steps-details"><summary>Backward Substitution Steps</summary>';
        html += '<div class="steps-content">' + renderStepsHTML(bwd.steps) + '</div></details>';

        html += '<div class="solution-summary"><strong>Solution:</strong> ';
        var parts = bwd.x.map(function(v, i) { return 'x' + sub(i + 1) + ' = ' + v; });
        html += parts.join(', ');
        html += '</div></div>';
      }

      var latex = generateLaTeX(result, n);
      html += '<details class="latex-details"><summary>LaTeX Export</summary>';
      html += '<div class="latex-content"><pre class="latex-code">' + escapeHTML(latex) + '</pre>';
      html += '<button class="btn btn-small btn-copy" onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent).then(function(){var b=event.target;b.textContent=\'Copied!\';setTimeout(function(){b.textContent=\'Copy LaTeX\'},1500)})">Copy LaTeX</button>';
      html += '</div></details>';

      html += '</div>';
    }

    html += wrapperEnd;

    var matrixRaw = [];
    for (var ri2 = 0; ri2 < n; ri2++) {
      matrixRaw[ri2] = [];
      for (var ci = 0; ci < n; ci++) matrixRaw[ri2][ci] = A[ri2][ci].toNumber();
    }
    var bRaw = bVector ? bVector.map(function(v) { return v.toNumber(); }) : null;
    var shareURL = encodeToURL(n, matrixRaw, method, bRaw);
    html += '<div class="share-section">';
    html += '<button class="btn btn-small btn-share" id="share-btn">Share Link</button>';
    html += '<input type="text" class="share-url" id="share-url" value="' + escapeHTML(shareURL) + '" readonly>';
    html += '</div>';

    output.innerHTML = html;

    document.getElementById('share-btn').addEventListener('click', function() {
      var urlInput = document.getElementById('share-url');
      navigator.clipboard.writeText(urlInput.value).then(function() {
        var btn = document.getElementById('share-btn');
        btn.textContent = 'Copied!';
        setTimeout(function() { btn.textContent = 'Share Link'; }, 1500);
      }).catch(function() {
        document.getElementById('share-url').select();
      });
    });

    saveHistory({
      date: Date.now(),
      size: n,
      method: method,
      matrix: matrixRaw,
      bVector: bRaw
    });
    renderHistoryPanel();
  }

  // ===== INITIALIZATION =====
  function init() {
    initTheme();

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    var sizeSelect = document.getElementById('matrix-size');
    sizeSelect.addEventListener('change', function() { generateGrid(parseInt(sizeSelect.value)); });

    document.getElementById('method-select').addEventListener('change', function() {
      var m = document.getElementById('method-select').value;
      document.getElementById('cholesky-note').style.display = m === 'cholesky' ? 'block' : 'none';
    });

    document.getElementById('solve-toggle').addEventListener('change', toggleBVector);
    document.getElementById('compare-toggle').addEventListener('change', toggleCompareMethod);
    document.getElementById('calculate-btn').addEventListener('click', calculate);

    document.getElementById('clear-btn').addEventListener('click', function() {
      document.getElementById('output').innerHTML = '';
      var errorEls = document.querySelectorAll('.input-error');
      for (var i = 0; i < errorEls.length; i++) errorEls[i].classList.remove('input-error');
    });

    document.getElementById('random-btn').addEventListener('click', randomMatrix);
    document.getElementById('import-toggle-btn').addEventListener('click', toggleImportArea);
    document.getElementById('import-btn').addEventListener('click', importMatrix);
    document.getElementById('clear-history-btn').addEventListener('click', clearHistory);

    document.getElementById('history-toggle-btn').addEventListener('click', function() {
      document.getElementById('history-panel').classList.toggle('open');
    });

    generateGrid(3);
    renderHistoryPanel();

    var urlData = decodeFromURL();
    if (urlData) {
      var sizeVal = Math.min(Math.max(urlData.n, 2), 10);
      sizeSelect.value = sizeVal;
      generateGrid(sizeVal);
      document.getElementById('method-select').value = urlData.method;
      for (var i = 0; i < urlData.n; i++)
        for (var j = 0; j < urlData.n; j++)
          document.getElementById('m-' + i + '-' + j).value = urlData.matrix[i][j];
      if (urlData.bVector) {
        document.getElementById('solve-toggle').checked = true;
        toggleBVector();
        for (var i2 = 0; i2 < urlData.n; i2++)
          document.getElementById('b-' + i2).value = urlData.bVector[i2];
      }
      setTimeout(calculate, 100);
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && e.ctrlKey) calculate();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
