let showSteps = {binomial: false, normal: false, descriptiva: false};
let currentProbType = {binomial: 'exact', normal: 'less'};
let binomialChart = null;
let normalChart = null;
let descriptivaChart = null;
const STORAGE_KEY = 'preparapau_probstat_state_v1';

document.addEventListener('DOMContentLoaded', function() {
    setupTabs();
    setupProbabilityTypeSelectors();
    loadState();
    attachInputPersistence();
});

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab + '-tab').classList.add('active');
            saveState();
        });
    });
}

function setupProbabilityTypeSelectors() {
    // Binomial
    const binomialBtns = document.querySelectorAll('#binomial-tab .prob-type-btn');
    binomialBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            binomialBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentProbType.binomial = btn.dataset.type;
            document.getElementById('between-inputs').style.display =
                btn.dataset.type === 'between' ? 'block' : 'none';
            saveState();
        });
    });

    // Normal
    const normalBtns = document.querySelectorAll('#normal-tab .prob-type-btn');
    normalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            normalBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentProbType.normal = btn.dataset.type;
            document.getElementById('normal-between-inputs').style.display =
                btn.dataset.type === 'between' ? 'block' : 'none';
            saveState();
        });
    });
}

function toggleSteps(type) {
    showSteps[type] = !showSteps[type];
    const stepsContainer = document.getElementById(type + '-steps');
    const btn = document.querySelector(`#${type}-tab .toggle-steps`);
    stepsContainer.style.display = showSteps[type] ? 'block' : 'none';
    btn.textContent = showSteps[type] ? '🙈 Ocultar Pasos' : '📝 Mostrar Pasos';
    saveState();
}

// ------------------------------------
// Funciones auxiliares matemáticas
// ------------------------------------
// Precompute log-factorials up to certain n (grow on-demand)
const logFact = [0];
function ensureLogFactorialsUpTo(n) {
    for (let i = logFact.length; i <= n; i++) {
        logFact[i] = logFact[i - 1] + Math.log(i);
    }
}
function logBinomialPMF(n, p, k) {
    if (k < 0 || k > n) return -Infinity;
    if (p === 0) return k === 0 ? 0 : -Infinity;
    if (p === 1) return k === n ? 0 : -Infinity;
    const q = 1 - p;
    ensureLogFactorialsUpTo(n);
    const logC = logFact[n] - logFact[k] - logFact[n - k];
    return logC + k * Math.log(p) + (n - k) * Math.log(q);
}
function binomialProbability(n, p, k) {
    const lp = logBinomialPMF(n, p, k);
    return Math.exp(lp);
}
function logSumExp(arr) {
    const m = Math.max(...arr);
    if (!isFinite(m)) return -Infinity;
    let s = 0;
    for (const v of arr) s += Math.exp(v - m);
    return m + Math.log(s);
}
function cumulativeBinomial(n, p, k, type) {
    // type: 'le' (<=k), 'ge' (>=k), 'between' needs a,b (use separate helper)
    if (p === 0) {
        if (type === 'le') return k >= 0 ? 1 : 0;
        if (type === 'ge') return k <= 0 ? 1 : 0;
    }
    if (p === 1) {
        if (type === 'le') return k >= n ? 1 : (k < n ? 0 : 1);
        if (type === 'ge') return k <= n ? 1 : 0;
    }
    if (type === 'le') {
        const logs = [];
        for (let i = 0; i <= Math.min(k, n); i++) logs.push(logBinomialPMF(n, p, i));
        return Math.exp(logSumExp(logs));
    } else if (type === 'ge') {
        const logs = [];
        for (let i = Math.max(0, k); i <= n; i++) logs.push(logBinomialPMF(n, p, i));
        return Math.exp(logSumExp(logs));
    } else {
        return 0;
    }
}
function cumulativeBetween(n, p, a, b) {
    const lo = Math.max(0, Math.min(a, b));
    const hi = Math.min(n, Math.max(a, b));
    if (hi < 0 || lo > n || lo > hi) return 0;
    const logs = [];
    for (let i = lo; i <= hi; i++) logs.push(logBinomialPMF(n, p, i));
    return Math.exp(logSumExp(logs));
}

// Normal helpers
function erf(x) {
    // Abramowitz-Stegun approximation
    const sign = x < 0 ? -1 : 1;
    const a1=0.254829592, a2=-0.284496736, a3=1.421413741, a4=-1.453152027, a5=1.061405429, p=0.3275911;
    x = Math.abs(x);
    const t = 1/(1+p*x);
    const y = 1-((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
    return sign*y;
}
function normalCDF(x, mu, sigma) {
    const z = (x - mu) / (Math.sqrt(2) * sigma);
    return 0.5 * (1 + erf(z));
}
function normalPDF(x, mu, sigma) {
    const z = (x - mu) / sigma;
    return Math.exp(-0.5*z*z) / (sigma * Math.sqrt(2*Math.PI));
}
function findPercentile(p, mu, sigma) {
    // p in [0,1], inverse CDF via binary search
    let lo = mu - 10*sigma, hi = mu + 10*sigma;
    for (let i=0;i<60;i++){
        const mid = (lo+hi)/2;
        if (normalCDF(mid, mu, sigma) < p) lo = mid; else hi = mid;
    }
    return (lo+hi)/2;
}

// ------------------------------------
// Ejemplos
// ------------------------------------
function loadBinomialExample(id){
    if (id===1){ // Moneda
        document.getElementById('binomial-n').value = 10;
        document.getElementById('binomial-p').value = 0.5;
        document.getElementById('binomial-k').value = 5;
        applyProbType('binomial','exact');
    } else if (id===2){ // Dados
        document.getElementById('binomial-n').value = 60;
        document.getElementById('binomial-p').value = (1/6).toFixed(4);
        document.getElementById('binomial-k').value = 10;
        applyProbType('binomial','exact');
    } else if (id===3){ // Defectuos
        document.getElementById('binomial-n').value = 100;
        document.getElementById('binomial-p').value = 0.02;
        document.getElementById('binomial-k').value = 2;
        applyProbType('binomial','less');
    } else if (id===4){ // Examen
        document.getElementById('binomial-n').value = 20;
        document.getElementById('binomial-p').value = 0.25;
        document.getElementById('binomial-k').value = 5;
        applyProbType('binomial','greater');
    }
    saveState();
}
function loadNormalExample(id){
    if (id===1){ // Alturas
        document.getElementById('normal-mean').value = 175;
        document.getElementById('normal-std').value = 6;
        document.getElementById('normal-x').value = 180;
        applyProbType('normal','less');
    } else if (id===2){ // Pesos
        document.getElementById('normal-mean').value = 70;
        document.getElementById('normal-std').value = 4;
        document.getElementById('normal-x').value = 65;
        applyProbType('normal','greater');
    } else if (id===3){ // Notas
        document.getElementById('normal-mean').value = 7.5;
        document.getElementById('normal-std').value = 1.2;
        document.getElementById('normal-a').value = 6;
        document.getElementById('normal-b').value = 8;
        applyProbType('normal','between');
    } else if (id===4){ // Tiempo
        document.getElementById('normal-mean').value = 60;
        document.getElementById('normal-std').value = 5;
        document.getElementById('normal-x').value = 70;
        applyProbType('normal', 'less');
    }
    saveState();
}
function loadDescriptivaExample(id){
    if (id===1){ // Notas clase
        document.getElementById('descriptiva-data').value = "5, 7, 3, 9, 2, 8, 6, 4, 1, 10";
    } else if (id===2){ // Ventas mes
        document.getElementById('descriptiva-data').value = "120, 150, 130, 160, 140, 180, 170";
    } else if (id===3){ // Temperaturas
        document.getElementById('descriptiva-data').value = "22, 25, 19, 21, 24, 26, 23";
    } else if (id===4){ // Edades grupo
        document.getElementById('descriptiva-data').value = "25, 30, 28, 32, 29, 35, 31";
    }
    saveState();
}

function applyProbType(calc, type) {
    const btns = document.querySelectorAll(`#${calc}-tab .prob-type-btn`);
    btns.forEach(btn => {
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    if (calc === 'binomial' || calc === 'normal') {
        currentProbType[calc] = type;
        const betweenInputs = document.getElementById(calc === 'binomial' ? 'between-inputs' : 'normal-between-inputs');
        if (betweenInputs) {
            betweenInputs.style.display = type === 'between' ? 'block' : 'none';
        }
    }
}

// ------------------------------------
// BINOMIAL
// ------------------------------------
function calculateBinomial() {
    console.log('calculateBinomial iniciada');
    
    const n = parseInt(document.getElementById('binomial-n').value);
    const p = parseFloat(document.getElementById('binomial-p').value);
    const k = parseInt(document.getElementById('binomial-k').value);
    const a = parseInt(document.getElementById('binomial-a').value);
    const b = parseInt(document.getElementById('binomial-b').value);
    const type = currentProbType.binomial;

    console.log('Valores obtenidos:', {n, p, k, a, b, type});

    if (isNaN(n) || isNaN(p) || n <= 0 || p < 0 || p > 1) {
        alert('Por favor, introduce valores válidos para n y p.');
        return;
    }
    if ((type === 'exact' || type === 'less' || type === 'greater') && (!Number.isFinite(k) || k < 0)) {
        alert('Revisa el valor de k (debe ser ≥ 0).');
        return;
    }

    console.log('Validaciones pasadas');

    let prob = 0;
    let range = {};

    if (type === 'exact') {
        prob = binomialProbability(n, p, k);
        range.k = k;
    } else if (type === 'less') {
        prob = cumulativeBinomial(n, p, k, 'le');
        range.k = k;
    } else if (type === 'greater') {
        prob = cumulativeBinomial(n, p, k, 'ge');
        range.k = k;
    } else if (type === 'between') {
        if (isNaN(a) || isNaN(b)) {
            alert('Para el rango, introduce valores válidos para a y b.');
            return;
        }
        prob = cumulativeBetween(n, p, a, b);
        range.a = a;
        range.b = b;
    }

    console.log('Probabilidad calculada:', prob);

    const stats = {
        mean: n * p,
        var: n * p * (1 - p),
        sd: Math.sqrt(n * p * (1 - p))
    };

    console.log('Estadísticas:', stats);

    const conditions = checkBinomialConditions(n, p);
    const stepsArray = calculateBinomialSteps(n, p, k, type, range, prob, stats, conditions);
    const steps = stepsArray.join('<br>');
    
    console.log('Pasos generados:', steps);
    
    displayBinomialResult(prob, stats, steps);
    createBinomialChart(n, p, range, type);
    
    console.log('calculateBinomial completada');
}

function calculateBinomialSteps(n, p, k, type, range, prob, stats, cond) {
    const steps = [];
    const q = 1 - p;

    // Datos generales
    steps.push(`<strong>Datos:</strong> n = ${n}, p = ${p}, q = ${q.toFixed(3)}`);

    if (type === 'exact') {
        steps.push(`<strong>Tipo:</strong> P(X = ${k})`);
        steps.push(`<strong>Fórmula:</strong> P(X = k) = C(n,k) × p^k × q^(n-k)`);
        ensureLogFactorialsUpTo(n);
        const comb = Math.exp(logFact[n] - logFact[k] - logFact[n - k]);
        steps.push(`<strong>Combinaciones:</strong> C(${n},${k}) = ${comb.toFixed(0)}`);
        steps.push(`<strong>Cálculo:</strong> ${comb.toFixed(0)} × ${p}^${k} × ${q.toFixed(3)}^${n-k} = ${prob.toFixed(6)}`);
    } else if (type === 'less') {
        steps.push(`<strong>Tipo:</strong> P(X ≤ ${k})`);
        steps.push(`<strong>Método:</strong> Suma de P(X = i) para i = 0, 1, ..., ${k}`);
        steps.push(`<strong>Resultado:</strong> ${prob.toFixed(6)}`);
    } else if (type === 'greater') {
        steps.push(`<strong>Tipo:</strong> P(X ≥ ${k})`);
        steps.push(`<strong>Método:</strong> 1 - P(X ≤ ${k - 1}) o suma directa`);
        steps.push(`<strong>Resultado:</strong> ${prob.toFixed(6)}`);
    } else if (type === 'between') {
        const a = Math.min(range.a, range.b);
        const b = Math.max(range.a, range.b);
        steps.push(`<strong>Tipo:</strong> P(${a} ≤ X ≤ ${b})`);
        steps.push(`<strong>Método:</strong> P(X ≤ ${b}) - P(X ≤ ${a - 1})`);
        steps.push(`<strong>Resultado:</strong> ${prob.toFixed(6)}`);
    }

    return steps;
}

function checkBinomialConditions(n, p) {
    // Comentar o eliminar esta línea que causa el error
    // const contentDiv = document.getElementById('binomial-conditions-content');
    const q = 1 - p;
    const np = n * p;
    const nq = n * q;

    const items = [];
    items.push(`<div>Ensayos independientes y con dos resultados (éxito/fracaso): <span class="ok">Asumido</span></div>`);
    items.push(`<div>Probabilidad constante p: <span class="ok">Asumido</span></div>`);
    const approxOk = (np >= 5 && nq >= 5);
    items.push(`<div>Validez aproximación Normal: np = ${np.toFixed(2)}, nq = ${nq.toFixed(2)} → ${approxOk ? '<span class="ok">Válida</span>' : '<span class="warn">No recomendada</span>'}</div>`);

    // Comentar esta línea también ya que contentDiv no existe
    // contentDiv.innerHTML = items.join('');
    return {normalOk: approxOk};
}

function displayBinomialResult(prob, stats, steps) {
    const content =
        `<div><strong>Probabilidad:</strong> ${prob.toLocaleString('es-ES', {maximumFractionDigits: 10})}</div>` +
        `<div><strong>Media (np):</strong> ${stats.mean.toLocaleString('es-ES', {maximumFractionDigits: 4})}</div>` +
        `<div><strong>Varianza (npq):</strong> ${stats.var.toLocaleString('es-ES', {maximumFractionDigits: 4})}</div>` +
        `<div><strong>Desviación típica (σ):</strong> ${stats.sd.toLocaleString('es-ES', {maximumFractionDigits: 4})}</div>`;
    
    document.getElementById('binomial-output').innerHTML = content;
    document.getElementById('binomial-result').style.display = 'block';

    document.getElementById('binomial-steps').innerHTML = steps;
    document.getElementById('binomial-steps').style.display = showSteps.binomial ? 'block' : 'none';
}

function createBinomialChart(n, p, rng, type) {
    // Validación de parámetros
    if (!Number.isInteger(n) || n <= 0 || !Number.isFinite(p) || p < 0 || p > 1) {
        console.error('Parámetros inválidos para createBinomialChart:', { n, p });
        return;
    }
    
    const canvas = document.getElementById('binomial-chart');
    if (!canvas) {
        console.error('Canvas binomial-chart no encontrado');
        return;
    }
    
    // Mostrar el contenedor del gráfico antes de crear el gráfico
    const chartContainer = document.getElementById('binomial-chart-container');
    if (chartContainer) {
        chartContainer.style.display = 'block';
    }
    
    const ctx = canvas.getContext('2d');
    if (binomialChart) binomialChart.destroy();

    // limitar barras para legibilidad si n grande (downsampling de etiquetas)
    const maxBars = 101;
    const step = n > maxBars ? Math.ceil(n / (maxBars-1)) : 1;

    const labels = [];
    const data = [];
    const bg = [];
    const border = [];
    const isInEvent = (x) => {
        if (!rng) return false;
        if (type === 'exact') return x === rng.k;
        if (type === 'less') return x <= rng.k;
        if (type === 'greater') return x >= rng.k;
        if (type === 'between') {
            const a = Math.min(rng.a || 0, rng.b || 0);
            const b = Math.max(rng.a || 0, rng.b || 0);
            return x >= a && x <= b;
        }
        return false;
    };

    for (let k = 0; k <= n; k += step) {
        labels.push(String(k));
        const pk = binomialProbability(n, p, k);
        data.push(pk);
        const highlight = isInEvent(k);
        bg.push(highlight ? 'rgba(48,196,141,0.8)' : 'rgba(0,80,157,0.35)');
        border.push(highlight ? 'rgba(16,120,90,1)' : 'rgba(0,80,157,0.9)');
    }

    binomialChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'P(X = k)',
                data,
                backgroundColor: bg,
                borderColor: border,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: 'k' } },
                y: { title: { display: true, text: 'Probabilidad' }, beginAtZero: true }
            },
            plugins: {
                legend: { display: false },
                title: { display: false }
            }
        }
    });

    document.getElementById('binomial-chart').style.display = 'block';
}

// ------------------------------------\n// NORMAL\n// ------------------------------------
function calculateNormal() {
    console.log('calculateNormal() iniciada');
    
    const mu = parseFloat(document.getElementById('normal-mean').value);
    const sigma = parseFloat(document.getElementById('normal-std').value);
    const type = currentProbType.normal;
    
    console.log('Parámetros:', { mu, sigma, type });

    if (!Number.isFinite(mu) || !Number.isFinite(sigma) || sigma <= 0) {
        console.log('Error en validación de parámetros');
        alert('Revisa μ y σ (σ debe ser > 0).');
        return;
    }

    const steps = [];
    let prob = 0;
    let values = []; // umbrales para pintar (x) o (a,b) o (percentil x_p)

    const fmt = (x) => x.toLocaleString('es-ES', {maximumFractionDigits: 6});

    console.log('Procesando tipo:', type);

    if (type === 'less' || type === 'greater') {
        console.log('Procesando less/greater');
        const x = parseFloat(document.getElementById('normal-x').value);
        console.log('Valor x:', x);
        if (!Number.isFinite(x)) { 
            console.log('Error: x no es finito');
            alert('Revisa el valor de X.'); 
            return; 
        }
        const z = (x - mu) / sigma;
        if (type === 'less') {
            prob = normalCDF(x, mu, sigma);
            steps.push(`Estandarización: z = (x - μ)/σ = ${fmt(z)}`);
            steps.push(`P(X < ${fmt(x)}) = Φ(${fmt(z)}) = ${fmt(prob)}`);
        } else {
            prob = 1 - normalCDF(x, mu, sigma);
            steps.push(`Estandarización: z = (x - μ)/σ = ${fmt(z)}`);
            steps.push(`P(X > ${fmt(x)}) = 1 - Φ(${fmt(z)}) = ${fmt(prob)}`);
        }
        values = [x];
    } else if (type === 'between') {
        console.log('Procesando between');
        const a = parseFloat(document.getElementById('normal-a').value);
        const b = parseFloat(document.getElementById('normal-b').value);
        console.log('Valores a, b:', a, b);
        if (!Number.isFinite(a) || !Number.isFinite(b)) { 
            console.log('Error: a o b no son finitos');
            alert('Revisa a y b.'); 
            return; 
        }
        const lo = Math.min(a,b), hi=Math.max(a,b);
        const za = (lo - mu)/sigma, zb = (hi - mu)/sigma;
        prob = normalCDF(hi, mu, sigma) - normalCDF(lo, mu, sigma);
        steps.push(`Estandarización: z_a=${fmt(za)}, z_b=${fmt(zb)}`);
        steps.push(`P(${fmt(lo)} < X < ${fmt(hi)}) = Φ(z_b) - Φ(z_a) = ${fmt(prob)}`);
        values = [lo, hi];
    } else if (type === 'percentile') {
        console.log('Procesando percentile');
        const p = parseFloat(document.getElementById('percentile-value').value);
        if (!Number.isFinite(p) || p < 0 || p > 100) { 
            console.log('Error: percentil inválido');
            alert('Revisa el percentil (0-100).'); 
            return; 
        }
        const x = findPercentile(p/100, mu, sigma);
        steps.push(`x_${fmt(p)}: Φ((x-μ)/σ) = ${p/100}`);
        steps.push(`x = ${fmt(x)}`);
        prob = x; // mostramos x como "resultado" en contenido
        values = [x];
    }

    console.log('Resultado calculado:', { prob, steps, values });

    // Mostrar resultados
    let content = '';
    if (type === 'percentile') {
        content = `<div><strong>Percentil:</strong> x${document.getElementById('percentile-value').value}% = ${prob.toLocaleString('es-ES', {maximumFractionDigits: 6})}</div>`;
    } else {
        content = `<div><strong>Probabilidad:</strong> ${prob.toLocaleString('es-ES', {maximumFractionDigits: 10})}</div>`;
    }
    
    console.log('Contenido a mostrar:', content);
    
    document.getElementById('normal-output').innerHTML = content;
    document.getElementById('normal-result').style.display = 'block';

    document.getElementById('normal-steps').innerHTML =
        steps.map(s => `<div class="step">${s}</div>`).join('');
    document.getElementById('normal-steps').style.display = showSteps.normal ? 'block' : 'none';

    console.log('Llamando a createNormalChart');
    createNormalChart(mu, sigma, values);
    
    console.log('calculateNormal() completada');
}

function createNormalChart(mu, sigma, values) {
    // Mostrar el contenedor del gráfico
    document.getElementById('normal-chart-container').style.display = 'block';
    
    const canvas = document.getElementById('normal-chart');
    const ctx = canvas.getContext('2d');
    if (normalChart) normalChart.destroy();

    const xMin = mu - 4 * sigma;
    const xMax = mu + 4 * sigma;
    const points = 200;
    const step = (xMax - xMin) / points;

    const labels = [];
    const data = [];
    for (let i = 0; i <= points; i++) {
        const x = xMin + i * step;
        labels.push(x.toFixed(2));
        data.push(normalPDF(x, mu, sigma));
    }

    const type = currentProbType.normal;
    const lo = values.length > 1 ? Math.min(values[0], values[1]) : (values[0] ?? null);
    const hi = values.length > 1 ? Math.max(values[0], values[1]) : (values[0] ?? null);

    const dataHighlight = [];
    for (let i = 0; i <= points; i++) {
        const x = xMin + i * step;
        let highlight = false;
        if (type === 'less' && x <= values[0]) highlight = true;
        else if (type === 'greater' && x >= values[0]) highlight = true;
        else if (type === 'between' && x >= lo && x <= hi) highlight = true;
        else if (type === 'percentile' && x <= values[0]) highlight = true;
        dataHighlight.push(highlight ? data[i] : null);
    }

    const markersPlugin = {
        id: 'normalMarkers',
        afterDraw(chart) {
            const { ctx } = chart;
            const xScale = chart.scales.x;
            const yScale = chart.scales.y;
            const top = yScale.top;
            const bottom = yScale.bottom;
            const idxForX = (xVal) => {
                const idx = Math.round((xVal - xMin) / step);
                return Math.max(0, Math.min(points, idx));
            };
            const drawLine = (xVal, color, label) => {
                const xp = xScale.getPixelForValue(idxForX(xVal));
                ctx.save();
                ctx.strokeStyle = color;
                ctx.setLineDash([5,4]);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(xp, top);
                ctx.lineTo(xp, bottom);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = color;
                ctx.font = '12px Lato, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(label, xp, top + 12);
                ctx.restore();
            };
            // μ y μ±σ
            drawLine(mu, '#e67e22', 'μ');
            drawLine(mu - sigma, '#9b59b6', 'μ-σ');
            drawLine(mu + sigma, '#9b59b6', 'μ+σ');

            // líneas del evento
            const eventColor = '#16a085';
            if ((type === 'less' || type === 'greater') && Array.isArray(values) && values.length > 0 && isFinite(values[0])) {
                drawLine(values[0], eventColor, 'x');
            }
            if (type === 'between' && Array.isArray(values) && values.length > 1 && isFinite(lo) && isFinite(hi)) {
                drawLine(lo, eventColor, 'a');
                drawLine(hi, eventColor, 'b');
            }
            if (type === 'percentile' && Array.isArray(values) && values.length > 0 && isFinite(values[0])) {
                const pInput = document.getElementById('percentile-value');
                const pLabel = pInput ? `${parseFloat(pInput.value)}%` : 'p%';
                drawLine(values[0], eventColor, pLabel);
            }
        }
    };

    normalChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Densidad',
                    data,
                    borderColor: '#00509D',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                },
                {
                    label: 'Área del evento',
                    data: dataHighlight,
                    borderColor: 'rgba(48, 196, 141, 0.8)',
                    backgroundColor: 'rgba(48, 196, 141, 0.35)',
                    borderWidth: 0,
                    fill: true,
                    pointRadius: 0,
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: `Distribución Normal N(${mu}, ${sigma}²)` },
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Densidad de probabilidad' } },
                x: { title: { display: true, text: 'Valor de X' }, ticks: { maxTicksLimit: 8 } }
            }
        },
        plugins: [markersPlugin]
    });
    document.getElementById('normal-chart').style.display = 'block';
}

// ------------------------------------
// DESCRIPTIVA
// ------------------------------------
function calculateDescriptiva() {
    const raw = document.getElementById('descriptiva-data').value || '';
    const nums = raw.split(/[\s,;]+/).map(x => parseFloat(x)).filter(x => Number.isFinite(x));
    if (!nums.length) {
        alert('Introduce al menos un número.');
        return;
    }
    const stats = calculateDescriptiveStats(nums);
    const content =
        `<div><strong>N:</strong> ${nums.length}</div>` +
        `<div><strong>Media:</strong> ${stats.mean.toLocaleString('es-ES', {maximumFractionDigits: 6})}</div>` +
        `<div><strong>Mediana:</strong> ${stats.median.toLocaleString('es-ES', {maximumFractionDigits: 6})}</div>` +
        `<div><strong>Moda(s):</strong> ${stats.modes.length ? stats.modes.join(', ') : '—'}</div>` +
        `<div><strong>Varianza:</strong> ${stats.variance.toLocaleString('es-ES', {maximumFractionDigits: 6})}</div>` +
        `<div><strong>Desviación típica:</strong> ${stats.sd.toLocaleString('es-ES', {maximumFractionDigits: 6})}</div>`;
    document.getElementById('descriptiva-output').innerHTML = content;
    document.getElementById('descriptiva-result').style.display = 'block';

    const steps = [];
    steps.push(`Ordenar datos y calcular frecuencias para la moda.`);
    steps.push(`Media = (Σ xi)/n.`);
    steps.push(`Varianza = (Σ (xi - media)^2)/n. Desviación típica = √Varianza.`);
    document.getElementById('descriptiva-steps').innerHTML =
        steps.map(s => `<div class="step">${s}</div>`).join('');
    document.getElementById('descriptiva-steps').style.display = showSteps.descriptiva ? 'block' : 'none';

    // Crear gráfico
    createDescriptivaChart(nums, stats);
    saveState();
}
function calculateDescriptiveStats(arr) {
    const n = arr.length;
    const sorted = [...arr].sort((a,b)=>a-b);
    const sum = arr.reduce((a,b)=>a+b,0);
    const mean = sum / n;
    const median = n%2 ? sorted[(n-1)/2] : (sorted[n/2-1]+sorted[n/2])/2;
    const freq = new Map();
    for (const x of arr) freq.set(x, (freq.get(x)||0)+1);
    const maxf = Math.max(...freq.values());
    const modes = [...freq.entries()].filter(([k,v])=>v===maxf && maxf>1).map(([k])=>k);
    const variance = arr.reduce((a,x)=>a+(x-mean)*(x-mean),0)/n;
    const sd = Math.sqrt(variance);
    return {mean, median, modes, variance, sd};
}

// Nueva función para crear el gráfico de estadística descriptiva
function createDescriptivaChart(data, stats) {
    const canvas = document.getElementById('descriptiva-chart');
    const ctx = canvas.getContext('2d');
    if (descriptivaChart) descriptivaChart.destroy();

    // Crear histograma con frecuencias
    const sorted = [...data].sort((a, b) => a - b);
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;
    const numBins = Math.min(10, Math.max(3, Math.ceil(Math.sqrt(data.length))));
    const binWidth = range / numBins;

    const bins = [];
    const binLabels = [];
    const frequencies = [];

    for (let i = 0; i < numBins; i++) {
        const binStart = min + i * binWidth;
        const binEnd = min + (i + 1) * binWidth;
        const binCenter = (binStart + binEnd) / 2;
        
        let count = 0;
        for (const value of data) {
            if (i === numBins - 1) {
                // Último bin incluye el valor máximo
                if (value >= binStart && value <= binEnd) count++;
            } else {
                if (value >= binStart && value < binEnd) count++;
            }
        }
        
        bins.push({ start: binStart, end: binEnd, center: binCenter, count });
        binLabels.push(`${binStart.toFixed(1)}-${binEnd.toFixed(1)}`);
        frequencies.push(count);
    }

    // Crear datasets para el gráfico
    const datasets = [
        {
            label: 'Frecuencia',
            data: frequencies,
            backgroundColor: 'rgba(0, 80, 157, 0.6)',
            borderColor: 'rgba(0, 80, 157, 1)',
            borderWidth: 1
        }
    ];

    // Plugin para marcar estadísticas
    const statsPlugin = {
        id: 'descriptivaStats',
        afterDraw(chart) {
            const { ctx } = chart;
            const xScale = chart.scales.x;
            const yScale = chart.scales.y;
            const top = yScale.top;
            const bottom = yScale.bottom;

            // Función para convertir valor a posición x
            const getXPosition = (value) => {
                // Encontrar en qué bin está el valor
                for (let i = 0; i < bins.length; i++) {
                    if (value >= bins[i].start && (i === bins.length - 1 ? value <= bins[i].end : value < bins[i].end)) {
                        return xScale.getPixelForValue(i);
                    }
                }
                return xScale.getPixelForValue(0);
            };

            ctx.save();
            
            // Línea de la media
            const meanX = getXPosition(stats.mean);
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(meanX, top);
            ctx.lineTo(meanX, bottom);
            ctx.stroke();
            
            // Etiqueta de la media
            ctx.fillStyle = '#e74c3c';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Media: ${stats.mean.toFixed(2)}`, meanX, top - 5);
            
            // Línea de la mediana
            const medianX = getXPosition(stats.median);
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.moveTo(medianX, top);
            ctx.lineTo(medianX, bottom);
            ctx.stroke();
            
            // Etiqueta de la mediana
            ctx.fillStyle = '#27ae60';
            ctx.fillText(`Mediana: ${stats.median.toFixed(2)}`, medianX, top - 20);
            
            ctx.restore();
        }
    };

    descriptivaChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: binLabels,
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Histograma de Frecuencias'
                },
                legend: {
                    display: true
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Intervalos de valores'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Frecuencia'
                    },
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        },
        plugins: [statsPlugin]
    });

    document.getElementById('descriptiva-chart-container').style.display = 'block';
}

// ------------------------------------
// Funciones auxiliares para exportar resultados
// ------------------------------------
function copyResults(section) {
    const res = document.getElementById(`${section}-output`);
    const steps = document.getElementById(`${section}-steps`);
    let text = '';

    if (res && res.innerText.trim()) {
        text += `Resultados - ${section.toUpperCase()}\n\n${res.innerText.trim()}\n`;
    }
    if (steps && steps.innerText.trim()) {
        text += `\nPasos:\n${steps.innerText.trim()}\n`;
    }
    if (!text) text = `No hay resultados para copiar en la sección "${section}".`;

    const doCopy = async (t) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(t);
            } else {
                const ta = document.createElement('textarea');
                ta.value = t;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            alert('Contenido copiado al portapapeles ✅');
        } catch (e) {
            alert('No se pudo copiar el contenido.');
            console.error(e);
        }
    };
    doCopy(text);
}

function exportResults(section) {
    const res = document.getElementById(`${section}-output`);
    const steps = document.getElementById(`${section}-steps`);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
    
    let content = `=== ${section.toUpperCase()} - Resultados ===\nGenerado: ${stamp}\n\n`;
    if (res && res.innerText.trim()) {
        content += res.innerText.trim() + '\n\n';
    } else {
        content += '(Sin resultados)\n\n';
    }
    if (steps && steps.innerText.trim()) {
        content += '=== Pasos ===\n' + steps.innerText.trim() + '\n';
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${section}_resultados_${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadChartPNG(canvasId, filename) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        alert('No se encontró el gráfico.');
        return;
    }
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const tctx = tmp.getContext('2d');
    tctx.fillStyle = '#ffffff';
    tctx.fillRect(0, 0, tmp.width, tmp.height);
    tctx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = filename || 'chart.png';
    link.href = tmp.toDataURL('image/png');
    link.click();
}

// ------------------------------------
// Persistencia (localStorage)
// ------------------------------------
function saveState() {
    try {
        const activeTabBtn = document.querySelector('.tab-btn.active');
        const state = {
            activeTab: activeTabBtn ? activeTabBtn.dataset.tab : 'binomial',
            currentProbType: { ...currentProbType },
            showSteps: { ...showSteps },
            inputs: {
                binomial: {
                    n: document.getElementById('n-binomial')?.value,
                    p: document.getElementById('p-binomial')?.value,
                    k: document.getElementById('k-binomial')?.value,
                    a: document.getElementById('a-binomial')?.value,
                    b: document.getElementById('b-binomial')?.value
                },
                normal: {
                    mu: document.getElementById('normal-mean')?.value,
                    sigma: document.getElementById('normal-std')?.value,
                    x: document.getElementById('normal-x')?.value,
                    a: document.getElementById('normal-a')?.value,
                    b: document.getElementById('normal-b')?.value,
                    percentile: document.getElementById('percentile-value')?.value
                },
                descriptiva: {
                    data: document.getElementById('descriptiva-data')?.value
                }
            }
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn('No se pudo guardar el estado:', e);
    }
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const state = JSON.parse(raw);

        if (state.activeTab) applyActiveTab(state.activeTab);

        const B = state.inputs?.binomial || {};
        const N = state.inputs?.normal || {};
        const D = state.inputs?.descriptiva || {};
        if (B) {
            const n = document.getElementById('binomial-n'); if (n) n.value = B.n ?? n.value;
            const p = document.getElementById('binomial-p'); if (p) p.value = B.p ?? p.value;
            const k = document.getElementById('binomial-k'); if (k) k.value = B.k ?? k.value;
            const a = document.getElementById('binomial-a'); if (a) a.value = B.a ?? a.value;
            const b = document.getElementById('binomial-b'); if (b) b.value = B.b ?? b.value;
        }
        if (N) {
            const mu = document.getElementById('normal-mean'); if (mu) mu.value = N.mu ?? mu.value;
            const s = document.getElementById('normal-std'); if (s) s.value = N.sigma ?? s.value;
            const x = document.getElementById('normal-x'); if (x) x.value = N.x ?? x.value;
            const a = document.getElementById('normal-a'); if (a) a.value = N.a ?? a.value;
            const b = document.getElementById('normal-b'); if (b) b.value = N.b ?? b.value;
            const per = document.getElementById('percentile-value'); if (per) per.value = N.percentile ?? per.value;
        }
        if (D) {
            const di = document.getElementById('descriptiva-data'); if (di) di.value = D.data ?? di.value;
        }

        if (state.currentProbType?.binomial) applyProbType('binomial', state.currentProbType.binomial);
        if (state.currentProbType?.normal) applyProbType('normal', state.currentProbType.normal);

        if (state.showSteps) {
            showSteps = { ...showSteps, ...state.showSteps };
            applyShowSteps('binomial');
            applyShowSteps('normal');
            applyShowSteps('descriptiva');
        }
    } catch (e) {
        console.warn('No se pudo cargar el estado:', e);
    }
}

// Funciones auxiliares para aplicar estado
function applyActiveTab(tabName) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const targetContent = document.getElementById(`${tabName}-tab`);
    if (targetBtn) targetBtn.classList.add('active');
    if (targetContent) targetContent.classList.add('active');
}

function applyProbType(section, type) {
    const buttons = document.querySelectorAll(`#${section}-tab .prob-type-btn`);
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        }
    });
    
    if (section === 'binomial') {
        document.getElementById('between-inputs').style.display = type === 'between' ? 'block' : 'none';
    } else if (section === 'normal') {
        const normalBetweenInputs = document.getElementById('normal-between-inputs');
        if (normalBetweenInputs) {
            normalBetweenInputs.style.display = type === 'between' ? 'block' : 'none';
        }
    }
}

function applyShowSteps(section) {
    const stepsContainer = document.getElementById(`${section}-steps`);
    const btn = document.querySelector(`#${section}-tab .toggle-steps`);
    if (stepsContainer) stepsContainer.style.display = showSteps[section] ? 'block' : 'none';
    if (btn) btn.textContent = showSteps[section] ? '🙈 Ocultar Pasos' : '📝 Mostrar Pasos';
}

function attachInputPersistence() {
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', saveState);
        input.addEventListener('change', saveState);
    });
}