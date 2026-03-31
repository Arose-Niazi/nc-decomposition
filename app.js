/* ===== NC Decomposition — App Engine ===== */
(function () {
    'use strict';

    // ===== Theme =====
    const themeBtn = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('nc-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

    themeBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('nc-theme', next);
        themeBtn.textContent = next === 'dark' ? '☀️' : '🌙';
    });

    // ===== Matrix Grid =====
    const sizeEl = document.getElementById('matSize');
    const methodEl = document.getElementById('method');
    const solveEl = document.getElementById('solveLinear');
    const gridEl = document.getElementById('matrixGrid');
    const bVecEl = document.getElementById('bVector');
    const bSection = document.getElementById('bMatrixSection');
    const outputSection = document.getElementById('outputSection');
    const outputEl = document.getElementById('output');
    const errorEl = document.getElementById('errorMsg');

    function getSize() { return parseInt(sizeEl.value); }

    function buildGrid() {
        const n = getSize();
        gridEl.innerHTML = '';
        gridEl.style.gridTemplateColumns = `repeat(${n}, 70px)`;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const inp = document.createElement('input');
                inp.type = 'number';
                inp.step = 'any';
                inp.id = `a_${i}_${j}`;
                inp.placeholder = `[${i + 1},${j + 1}]`;
                inp.value = i === j ? '1' : '0';
                inp.setAttribute('aria-label', `Matrix element row ${i + 1} column ${j + 1}`);
                gridEl.appendChild(inp);
            }
        }
        buildBVector();
    }

    function buildBVector() {
        const n = getSize();
        bVecEl.innerHTML = '';
        for (let i = 0; i < n; i++) {
            const inp = document.createElement('input');
            inp.type = 'number';
            inp.step = 'any';
            inp.id = `b_${i}`;
            inp.placeholder = `b${i + 1}`;
            inp.value = '0';
            inp.setAttribute('aria-label', `Vector b element ${i + 1}`);
            bVecEl.appendChild(inp);
        }
        updateBVisibility();
    }

    function updateBVisibility() {
        bSection.style.display = solveEl.value === '1' ? '' : 'none';
    }

    sizeEl.addEventListener('change', buildGrid);
    solveEl.addEventListener('change', updateBVisibility);
    buildGrid();

    // ===== Read Matrix =====
    function readMatrix() {
        const n = getSize();
        const A = [];
        for (let i = 0; i < n; i++) {
            A[i] = [];
            for (let j = 0; j < n; j++) {
                const v = document.getElementById(`a_${i}_${j}`).value.trim();
                if (v === '' || isNaN(Number(v))) throw new Error(`Invalid value at [${i + 1},${j + 1}]`);
                A[i][j] = math.fraction(v);
            }
        }
        return A;
    }

    function readB() {
        const n = getSize();
        const b = [];
        for (let i = 0; i < n; i++) {
            const v = document.getElementById(`b_${i}`).value.trim();
            if (v === '' || isNaN(Number(v))) throw new Error(`Invalid value in b[${i + 1}]`);
            b[i] = math.fraction(v);
        }
        return b;
    }

    // ===== Fraction Display =====
    function fmtFrac(f) {
        if (typeof f === 'number') f = math.fraction(f);
        try {
            const fr = math.fraction(f);
            if (fr.d === 1) return fr.s * fr.n + '';
            return (fr.s < 0 ? '-' : '') + fr.n + '/' + fr.d;
        } catch { return String(f); }
    }

    // ===== Matrix Clone =====
    function cloneMatrix(M) { return M.map(r => r.map(v => math.fraction(v))); }

    // ===== HTML Builders =====
    function matrixHTML(label, M, n) {
        let h = `<span class="matrix-label">${label} =</span>`;
        h += `<div class="matrix-display" style="grid-template-columns:repeat(${n}, 1fr);">`;
        for (let i = 0; i < n; i++)
            for (let j = 0; j < n; j++)
                h += `<div class="cell">${fmtFrac(M[i][j])}</div>`;
        h += '</div>';
        return h;
    }

    function vectorHTML(label, v, n) {
        let h = `<span class="matrix-label">${label} =</span>`;
        h += `<div class="matrix-display" style="grid-template-columns:1fr;">`;
        for (let i = 0; i < n; i++) h += `<div class="cell">${fmtFrac(v[i])}</div>`;
        h += '</div>';
        return h;
    }

    function stepHTML(text) { return `<div class="step">${text}</div>`; }

    function blockStart(title) { return `<div class="result-block"><h3>${title}</h3>`; }
    function blockEnd() { return '</div>'; }

    // ===== Decomposition Base =====
    function identity(n) {
        const I = [];
        for (let i = 0; i < n; i++) {
            I[i] = [];
            for (let j = 0; j < n; j++) I[i][j] = math.fraction(i === j ? 1 : 0);
        }
        return I;
    }

    function zeros(n) {
        const Z = [];
        for (let i = 0; i < n; i++) {
            Z[i] = [];
            for (let j = 0; j < n; j++) Z[i][j] = math.fraction(0);
        }
        return Z;
    }

    // ===== Doolittle =====
    function doolittle(A, n) {
        const L = identity(n);
        const U = zeros(n);
        const steps = [];

        steps.push('<b>Doolittle\'s Method:</b> L has 1s on diagonal, U is upper triangular.');

        for (let j = 0; j < n; j++) {
            // U row
            for (let i = 0; i <= j; i++) {
                let sum = math.fraction(0);
                for (let k = 0; k < i; k++) sum = math.add(sum, math.multiply(L[i][k], U[k][j]));
                U[i][j] = math.subtract(A[i][j], sum);
                steps.push(`U<sub>${i + 1}${j + 1}</sub> = A<sub>${i + 1}${j + 1}</sub> − Σ L<sub>${i + 1}k</sub>U<sub>k${j + 1}</sub> = ${fmtFrac(A[i][j])} − ${fmtFrac(sum)} = <b>${fmtFrac(U[i][j])}</b>`);
            }
            // L column
            for (let i = j + 1; i < n; i++) {
                let sum = math.fraction(0);
                for (let k = 0; k < j; k++) sum = math.add(sum, math.multiply(L[i][k], U[k][j]));
                if (math.equal(U[j][j], 0)) throw new Error(`Zero pivot at U[${j + 1},${j + 1}]. Matrix may be singular. Try PLU method.`);
                L[i][j] = math.divide(math.subtract(A[i][j], sum), U[j][j]);
                steps.push(`L<sub>${i + 1}${j + 1}</sub> = (A<sub>${i + 1}${j + 1}</sub> − Σ L<sub>${i + 1}k</sub>U<sub>k${j + 1}</sub>) / U<sub>${j + 1}${j + 1}</sub> = (${fmtFrac(A[i][j])} − ${fmtFrac(sum)}) / ${fmtFrac(U[j][j])} = <b>${fmtFrac(L[i][j])}</b>`);
            }
        }
        return { L, U, steps, P: null };
    }

    // ===== Crout =====
    function crout(A, n) {
        const L = zeros(n);
        const U = identity(n);
        const steps = [];

        steps.push('<b>Crout\'s Method:</b> U has 1s on diagonal, L is lower triangular.');

        for (let j = 0; j < n; j++) {
            // L column
            for (let i = j; i < n; i++) {
                let sum = math.fraction(0);
                for (let k = 0; k < j; k++) sum = math.add(sum, math.multiply(L[i][k], U[k][j]));
                L[i][j] = math.subtract(A[i][j], sum);
                steps.push(`L<sub>${i + 1}${j + 1}</sub> = A<sub>${i + 1}${j + 1}</sub> − Σ L<sub>${i + 1}k</sub>U<sub>k${j + 1}</sub> = ${fmtFrac(A[i][j])} − ${fmtFrac(sum)} = <b>${fmtFrac(L[i][j])}</b>`);
            }
            // U row
            for (let i = j + 1; i < n; i++) {
                let sum = math.fraction(0);
                for (let k = 0; k < j; k++) sum = math.add(sum, math.multiply(L[j][k], U[k][i]));
                if (math.equal(L[j][j], 0)) throw new Error(`Zero pivot at L[${j + 1},${j + 1}]. Matrix may be singular.`);
                U[j][i] = math.divide(math.subtract(A[j][i], sum), L[j][j]);
                steps.push(`U<sub>${j + 1}${i + 1}</sub> = (A<sub>${j + 1}${i + 1}</sub> − Σ L<sub>${j + 1}k</sub>U<sub>k${i + 1}</sub>) / L<sub>${j + 1}${j + 1}</sub> = (${fmtFrac(A[j][i])} − ${fmtFrac(sum)}) / ${fmtFrac(L[j][j])} = <b>${fmtFrac(U[j][i])}</b>`);
            }
        }
        return { L, U, steps, P: null };
    }

    // ===== Cholesky =====
    function cholesky(A, n) {
        const L = zeros(n);
        const steps = [];

        steps.push('<b>Cholesky Decomposition:</b> A = LLᵀ where L is lower triangular. Requires A to be symmetric positive definite.');

        // Check symmetry
        for (let i = 0; i < n; i++)
            for (let j = 0; j < n; j++)
                if (!math.equal(A[i][j], A[j][i]))
                    throw new Error('Matrix is not symmetric. Cholesky requires a symmetric positive definite matrix.');

        for (let j = 0; j < n; j++) {
            let sum = math.fraction(0);
            for (let k = 0; k < j; k++) sum = math.add(sum, math.multiply(L[j][k], L[j][k]));
            const diag = math.subtract(A[j][j], sum);
            if (math.smaller(diag, 0) || math.equal(diag, 0))
                throw new Error('Matrix is not positive definite. Cannot compute Cholesky decomposition.');
            L[j][j] = math.fraction(Math.sqrt(math.number(diag)));
            steps.push(`L<sub>${j + 1}${j + 1}</sub> = √(A<sub>${j + 1}${j + 1}</sub> − Σ L<sub>${j + 1}k</sub>²) = √(${fmtFrac(A[j][j])} − ${fmtFrac(sum)}) = <b>${fmtFrac(L[j][j])}</b>`);

            for (let i = j + 1; i < n; i++) {
                let s = math.fraction(0);
                for (let k = 0; k < j; k++) s = math.add(s, math.multiply(L[i][k], L[j][k]));
                L[i][j] = math.divide(math.subtract(A[i][j], s), L[j][j]);
                steps.push(`L<sub>${i + 1}${j + 1}</sub> = (A<sub>${i + 1}${j + 1}</sub> − Σ L<sub>${i + 1}k</sub>L<sub>${j + 1}k</sub>) / L<sub>${j + 1}${j + 1}</sub> = <b>${fmtFrac(L[i][j])}</b>`);
            }
        }

        // U = L^T
        const U = zeros(n);
        for (let i = 0; i < n; i++)
            for (let j = 0; j < n; j++)
                U[i][j] = L[j][i];

        return { L, U, steps, P: null, isCholesky: true };
    }

    // ===== PLU (Partial Pivoting) =====
    function plu(A, n) {
        const M = cloneMatrix(A);
        const P = identity(n);
        const L = zeros(n);
        const steps = [];

        steps.push('<b>PLU Decomposition:</b> PA = LU with partial pivoting for numerical stability.');

        for (let j = 0; j < n; j++) {
            // Find pivot
            let maxVal = math.abs(M[j][j]);
            let maxRow = j;
            for (let i = j + 1; i < n; i++) {
                const v = math.abs(M[i][j]);
                if (math.larger(v, maxVal)) { maxVal = v; maxRow = i; }
            }
            if (math.equal(maxVal, 0)) throw new Error(`Zero column at position ${j + 1}. Matrix is singular.`);

            if (maxRow !== j) {
                [M[j], M[maxRow]] = [M[maxRow], M[j]];
                [P[j], P[maxRow]] = [P[maxRow], P[j]];
                [L[j], L[maxRow]] = [L[maxRow], L[j]];
                steps.push(`Swap rows ${j + 1} and ${maxRow + 1} (pivot = ${fmtFrac(M[j][j])})`);
            }

            L[j][j] = math.fraction(1);
            for (let i = j + 1; i < n; i++) {
                L[i][j] = math.divide(M[i][j], M[j][j]);
                steps.push(`L<sub>${i + 1}${j + 1}</sub> = ${fmtFrac(M[i][j])} / ${fmtFrac(M[j][j])} = <b>${fmtFrac(L[i][j])}</b>`);
                for (let k = j; k < n; k++) {
                    M[i][k] = math.subtract(M[i][k], math.multiply(L[i][j], M[j][k]));
                }
            }
        }

        return { L, U: M, steps, P };
    }

    // ===== Forward Substitution (Ly = b) =====
    function forwardSub(L, b, n) {
        const y = [];
        const steps = [];
        steps.push('<b>Forward Substitution (Ly = b):</b>');
        for (let i = 0; i < n; i++) {
            let sum = math.fraction(0);
            for (let k = 0; k < i; k++) sum = math.add(sum, math.multiply(L[i][k], y[k]));
            y[i] = math.divide(math.subtract(b[i], sum), L[i][i]);
            steps.push(`y<sub>${i + 1}</sub> = (b<sub>${i + 1}</sub> − Σ L<sub>${i + 1}k</sub>y<sub>k</sub>) / L<sub>${i + 1}${i + 1}</sub> = (${fmtFrac(b[i])} − ${fmtFrac(sum)}) / ${fmtFrac(L[i][i])} = <b>${fmtFrac(y[i])}</b>`);
        }
        return { y, steps };
    }

    // ===== Backward Substitution (Ux = y) =====
    function backwardSub(U, y, n) {
        const x = new Array(n);
        const steps = [];
        steps.push('<b>Backward Substitution (Ux = y):</b>');
        for (let i = n - 1; i >= 0; i--) {
            let sum = math.fraction(0);
            for (let k = i + 1; k < n; k++) sum = math.add(sum, math.multiply(U[i][k], x[k]));
            x[i] = math.divide(math.subtract(y[i], sum), U[i][i]);
            steps.push(`x<sub>${i + 1}</sub> = (y<sub>${i + 1}</sub> − Σ U<sub>${i + 1}k</sub>x<sub>k</sub>) / U<sub>${i + 1}${i + 1}</sub> = (${fmtFrac(y[i])} − ${fmtFrac(sum)}) / ${fmtFrac(U[i][i])} = <b>${fmtFrac(x[i])}</b>`);
        }
        return { x, steps };
    }

    // ===== Determinant =====
    function determinant(L, U, n, P) {
        let det = math.fraction(1);
        for (let i = 0; i < n; i++) det = math.multiply(det, math.multiply(L[i][i], U[i][i]));
        if (P) {
            // Count row swaps in P
            let swaps = 0;
            const perm = [];
            for (let i = 0; i < n; i++)
                for (let j = 0; j < n; j++)
                    if (math.equal(P[i][j], 1)) { perm[i] = j; break; }
            const visited = new Array(n).fill(false);
            for (let i = 0; i < n; i++) {
                if (visited[i]) continue;
                let j = i, len = 0;
                while (!visited[j]) { visited[j] = true; j = perm[j]; len++; }
                if (len > 1) swaps += len - 1;
            }
            if (swaps % 2 === 1) det = math.multiply(det, -1);
        }
        return det;
    }

    // ===== Matrix Inverse via LU =====
    function matrixInverse(L, U, n, P) {
        const inv = zeros(n);
        for (let col = 0; col < n; col++) {
            const e = [];
            for (let i = 0; i < n; i++) e[i] = math.fraction(0);
            if (P) {
                // Solve PA = LU, so inv column from P * e_col
                for (let i = 0; i < n; i++)
                    for (let j = 0; j < n; j++)
                        if (math.equal(P[i][j], 1) && j === col) { e[i] = math.fraction(1); break; }
            } else {
                e[col] = math.fraction(1);
            }
            const { y } = forwardSub(L, e, n);
            const { x } = backwardSub(U, y, n);
            for (let i = 0; i < n; i++) inv[i][col] = x[i];
        }
        return inv;
    }

    // ===== Condition Number (1-norm) =====
    function norm1(M, n) {
        let maxCol = math.fraction(0);
        for (let j = 0; j < n; j++) {
            let colSum = math.fraction(0);
            for (let i = 0; i < n; i++) colSum = math.add(colSum, math.abs(M[i][j]));
            if (math.larger(colSum, maxCol)) maxCol = colSum;
        }
        return maxCol;
    }

    // ===== Main Calculate =====
    window.calculate = function () {
        hideError();
        try {
            math.config({ number: 'Fraction' });
            const n = getSize();
            const A = readMatrix();
            const method = methodEl.value;
            const solve = solveEl.value === '1';
            const calcDet = document.getElementById('calcDeterminant').checked;
            const calcInv = document.getElementById('calcInverse').checked;
            const calcCond = document.getElementById('calcCondition').checked;
            const compare = document.getElementById('compareMode').checked;

            let html = '';

            // Run decomposition(s)
            const methods = compare
                ? ['doolittle', 'crout', ...(method === 'cholesky' ? ['cholesky'] : []), ...(method === 'plu' ? ['plu'] : [])]
                : [method];

            // Deduplicate
            const unique = [...new Set(methods)];
            if (compare && unique.length < 2) {
                // Add the other basic method
                if (!unique.includes('doolittle')) unique.push('doolittle');
                if (!unique.includes('crout')) unique.push('crout');
            }

            for (const m of unique) {
                const result = runMethod(m, A, n);
                html += blockStart(`${methodName(m)}`);
                html += '<div class="step-group">';
                result.steps.forEach(s => html += stepHTML(s));
                html += '</div>';
                if (result.P) html += matrixHTML('P', result.P, n);
                html += '<div class="flex-row mt-1">';
                html += matrixHTML('L', result.L, n);
                html += matrixHTML(result.isCholesky ? 'Lᵀ' : 'U', result.U, n);
                html += '</div>';

                // Determinant
                if (calcDet) {
                    const det = determinant(result.L, result.U, n, result.P);
                    html += `<h4>Determinant</h4><div class="result-value">det(A) = ${fmtFrac(det)}</div>`;
                    if (math.equal(det, 0)) html += '<div class="info-box warning">⚠ Matrix is singular (det = 0)</div>';
                }

                // Solve Ax = b
                if (solve) {
                    let b = readB();
                    if (result.P) {
                        // Apply P to b
                        const pb = [];
                        for (let i = 0; i < n; i++) {
                            pb[i] = math.fraction(0);
                            for (let j = 0; j < n; j++) pb[i] = math.add(pb[i], math.multiply(result.P[i][j], b[j]));
                        }
                        b = pb;
                        html += '<h4>Permuted b (Pb)</h4>' + vectorHTML('Pb', b, n);
                    }
                    html += '<hr class="separator">';
                    const fwd = forwardSub(result.L, b, n);
                    html += '<div class="step-group">';
                    fwd.steps.forEach(s => html += stepHTML(s));
                    html += '</div>';
                    html += vectorHTML('y', fwd.y, n);

                    const bwd = backwardSub(result.U, fwd.y, n);
                    html += '<div class="step-group">';
                    bwd.steps.forEach(s => html += stepHTML(s));
                    html += '</div>';
                    html += vectorHTML('x', bwd.x, n);

                    html += '<div class="info-box success">✅ Solution: x = [' + bwd.x.map(fmtFrac).join(', ') + ']</div>';
                }

                // Inverse
                if (calcInv) {
                    html += '<hr class="separator"><h4>Matrix Inverse (A⁻¹)</h4>';
                    try {
                        const inv = matrixInverse(result.L, result.U, n, result.P);
                        html += matrixHTML('A⁻¹', inv, n);
                    } catch (e) {
                        html += '<div class="info-box warning">⚠ Cannot compute inverse: ' + e.message + '</div>';
                    }
                }

                // Condition Number
                if (calcCond) {
                    html += '<h4>Condition Number (1-norm)</h4>';
                    try {
                        const inv = matrixInverse(result.L, result.U, n, result.P);
                        const normA = norm1(A, n);
                        const normInv = norm1(inv, n);
                        const cond = math.multiply(normA, normInv);
                        const condNum = math.number(cond);
                        html += `<div class="result-value">κ(A) = ${condNum.toFixed(4)}</div>`;
                        if (condNum > 1000) html += '<div class="info-box warning">⚠ Matrix is ill-conditioned (κ > 1000). Results may be inaccurate.</div>';
                        else html += `<div class="info-box success">✅ Well-conditioned matrix</div>`;
                    } catch (e) {
                        html += '<div class="info-box warning">⚠ Cannot compute: ' + e.message + '</div>';
                    }
                }

                html += blockEnd();
            }

            outputEl.innerHTML = html;
            outputSection.style.display = '';
            addToHistory(A, n, method);
        } catch (e) {
            showError(e.message);
        }
    };

    function runMethod(m, A, n) {
        switch (m) {
            case 'doolittle': return doolittle(cloneMatrix(A), n);
            case 'crout': return crout(cloneMatrix(A), n);
            case 'cholesky': return cholesky(cloneMatrix(A), n);
            case 'plu': return plu(cloneMatrix(A), n);
            default: throw new Error('Unknown method: ' + m);
        }
    }

    function methodName(m) {
        const names = { doolittle: "Doolittle's Method", crout: "Crout's Method", cholesky: "Cholesky Decomposition", plu: "PLU (Partial Pivoting)" };
        return names[m] || m;
    }

    // ===== Error Handling =====
    function showError(msg) { errorEl.textContent = '⚠ ' + msg; errorEl.classList.add('visible'); }
    function hideError() { errorEl.classList.remove('visible'); }

    // ===== Quick Actions =====
    window.fillIdentity = function () {
        const n = getSize();
        for (let i = 0; i < n; i++)
            for (let j = 0; j < n; j++)
                document.getElementById(`a_${i}_${j}`).value = i === j ? 1 : 0;
    };

    window.fillRandom = function () {
        const n = getSize();
        for (let i = 0; i < n; i++)
            for (let j = 0; j < n; j++)
                document.getElementById(`a_${i}_${j}`).value = Math.floor(Math.random() * 19) - 9;
        for (let i = 0; i < n; i++)
            if (document.getElementById(`b_${i}`))
                document.getElementById(`b_${i}`).value = Math.floor(Math.random() * 19) - 9;
    };

    window.clearAll = function () {
        const n = getSize();
        for (let i = 0; i < n; i++)
            for (let j = 0; j < n; j++)
                document.getElementById(`a_${i}_${j}`).value = '';
        for (let i = 0; i < n; i++)
            if (document.getElementById(`b_${i}`))
                document.getElementById(`b_${i}`).value = '';
        clearOutput();
    };

    window.clearOutput = function () {
        outputEl.innerHTML = '';
        outputSection.style.display = 'none';
    };

    // ===== Import Matrix =====
    window.importMatrix = function () {
        const text = document.getElementById('importText').value.trim();
        if (!text) return;
        const rows = text.split('\n').map(r => r.trim().split(/[\s,]+/).map(Number));
        const n = rows.length;
        if (n < 2 || n > 6) { showError('Matrix must be 2×2 to 6×6'); return; }
        for (const r of rows) if (r.length !== n) { showError('Matrix must be square (same number of rows and columns)'); return; }
        for (const r of rows) for (const v of r) if (isNaN(v)) { showError('All values must be numbers'); return; }
        sizeEl.value = n;
        buildGrid();
        for (let i = 0; i < n; i++)
            for (let j = 0; j < n; j++)
                document.getElementById(`a_${i}_${j}`).value = rows[i][j];
        hideError();
    };

    // ===== Export LaTeX =====
    window.exportLatex = function () {
        const n = getSize();
        try {
            const A = readMatrix();
            let latex = '\\begin{bmatrix}\n';
            for (let i = 0; i < n; i++) {
                latex += A[i].map(fmtFrac).join(' & ');
                if (i < n - 1) latex += ' \\\\\n';
            }
            latex += '\n\\end{bmatrix}';
            navigator.clipboard.writeText(latex).then(() => {
                alert('LaTeX copied to clipboard!');
            }).catch(() => {
                prompt('Copy this LaTeX:', latex);
            });
        } catch (e) { showError(e.message); }
    };

    // ===== Share Link =====
    window.shareLink = function () {
        const n = getSize();
        const params = new URLSearchParams();
        params.set('n', n);
        params.set('m', methodEl.value);
        const vals = [];
        for (let i = 0; i < n; i++)
            for (let j = 0; j < n; j++)
                vals.push(document.getElementById(`a_${i}_${j}`).value || '0');
        params.set('a', vals.join(','));
        if (solveEl.value === '1') {
            const bvals = [];
            for (let i = 0; i < n; i++) bvals.push(document.getElementById(`b_${i}`).value || '0');
            params.set('b', bvals.join(','));
            params.set('s', '1');
        }
        const url = window.location.origin + window.location.pathname + '?' + params.toString();
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard!');
        }).catch(() => {
            prompt('Copy this link:', url);
        });
    };

    // ===== Load from URL =====
    function loadFromURL() {
        const params = new URLSearchParams(window.location.search);
        if (!params.has('n')) return;
        const n = parseInt(params.get('n'));
        if (n < 2 || n > 6) return;
        sizeEl.value = n;
        buildGrid();
        if (params.has('m')) methodEl.value = params.get('m');
        if (params.has('a')) {
            const vals = params.get('a').split(',');
            let idx = 0;
            for (let i = 0; i < n; i++)
                for (let j = 0; j < n; j++)
                    if (idx < vals.length) document.getElementById(`a_${i}_${j}`).value = vals[idx++];
        }
        if (params.has('s') && params.get('s') === '1') {
            solveEl.value = '1';
            updateBVisibility();
            if (params.has('b')) {
                const bvals = params.get('b').split(',');
                for (let i = 0; i < n && i < bvals.length; i++)
                    document.getElementById(`b_${i}`).value = bvals[i];
            }
        }
        // Auto-calculate
        setTimeout(() => window.calculate(), 100);
    }
    loadFromURL();

    // ===== History =====
    function getHistory() {
        try { return JSON.parse(localStorage.getItem('nc-history') || '[]'); }
        catch { return []; }
    }

    function addToHistory(A, n, method) {
        const hist = getHistory();
        const entry = {
            n, method,
            matrix: A.map(r => r.map(v => math.number(v))),
            time: new Date().toLocaleString(),
            ts: Date.now()
        };
        hist.unshift(entry);
        if (hist.length > 20) hist.length = 20;
        localStorage.setItem('nc-history', JSON.stringify(hist));
        renderHistory();
    }

    function renderHistory() {
        const hist = getHistory();
        const el = document.getElementById('historyList');
        if (hist.length === 0) {
            el.innerHTML = '<p class="empty-history">No calculations yet.</p>';
            return;
        }
        el.innerHTML = hist.map((h, i) => `
            <div class="history-item" onclick="loadHistory(${i})">
                <span><span class="method-tag">${h.method}</span> ${h.n}×${h.n}</span>
                <span class="time">${h.time}</span>
            </div>
        `).join('');
    }

    window.loadHistory = function (idx) {
        const hist = getHistory();
        const h = hist[idx];
        if (!h) return;
        sizeEl.value = h.n;
        buildGrid();
        methodEl.value = h.method;
        for (let i = 0; i < h.n; i++)
            for (let j = 0; j < h.n; j++)
                document.getElementById(`a_${i}_${j}`).value = h.matrix[i][j];
    };

    window.clearHistory = function () {
        localStorage.removeItem('nc-history');
        renderHistory();
    };

    renderHistory();
})();
