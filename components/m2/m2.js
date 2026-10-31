/* EasyFits M2: charts for Validation > Forms.
 *
 * js/main.js calls initFormsCharts() after the tab loads and after every sub-tab click,
 * so this function is safe to call many times (it only draws what is missing and visible).
 *
 * To add a chart:
 *   1. put <canvas id="chart-something"> in the HTML (inside .vf-chart-block for a pie,
 *      inside .vf-bar-block for a bar chart)
 *   2. add an entry to CHARTS below
 *
 * Values are COUNTS of people. Percentages are calculated from `base`, so the numbers
 * on the page always come from one place.
 */

const PIE_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#8e7cc3'];
const HIGHLIGHT  = '#eda100'; // bars for problems EasyFits aims to address

const CHARTS = {
    /* ---------- 1. Who answered ---------- */
    'chart-gender': { type: 'pie', base: 64,
        labels: ['Female', 'Male', 'Prefer not to say'],
        counts: [34, 29, 1] },
    'chart-age': { type: 'pie', base: 64,
        labels: ['18-24', '25-34', '35-44', '45+'],
        counts: [34, 16, 4, 10] },

    /* ---------- 2A. Owning clothes ---------- */
    'chart-organise': { type: 'pie', base: 64,
        labels: ['By category', 'By season', 'Not at all', 'By colour'],
        counts: [31, 23, 7, 3] },
    'chart-forgotten': { type: 'pie', base: 64,
        labels: ['Yes', 'No'],
        counts: [53, 11] },
    'chart-plan': { type: 'pie', base: 64,
        labels: ['Rarely', 'Sometimes', 'Often', 'Always'],
        counts: [12, 31, 17, 4] },
    'chart-dress-time': { type: 'pie', base: 64,
        labels: ['Under 2 min', '2-5 min', '5-10 min', '10-20 min', 'Over 20 min'],
        counts: [10, 23, 23, 7, 1] },
    'chart-multi-outfit': { type: 'bar', base: 64, highlight: [2, 3, 4],
        labels: [['1', 'never'], '2', '3', '4', ['5', 'always']],
        counts: [8, 27, 19, 8, 2] },
    'chart-combine': { type: 'bar', base: 63, highlight: [2, 3, 4],
        labels: [['1', 'very easy'], '2', '3', '4', ['5', 'very hard']],
        counts: [14, 20, 22, 6, 1] },

    /* ---------- 2B. Buying online ---------- */
    'chart-channel': { type: 'pie', base: 64,
        labels: ['Only in-store', 'Mostly in-store', 'Equally both', 'Mostly online', 'Only online'],
        counts: [8, 28, 15, 12, 1] },
    'chart-match': { type: 'pie', base: 64,
        labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
        counts: [4, 3, 16, 31, 10] },
    'chart-duplicate': { type: 'pie', base: 63,
        labels: ['No', 'Yes', 'Not sure'],
        counts: [36, 23, 4] },
    'chart-two-sizes': { type: 'pie', base: 64,
        labels: ['Never', 'A few times', 'Once', 'Always when unsure'],
        counts: [42, 12, 6, 4] },
    'chart-returns-count': { type: 'pie', base: 64,
        labels: ['None', '1-2', '3-5', 'Over 6', "Don't buy online"],
        counts: [26, 15, 7, 2, 14] },
    'chart-fitting': { type: 'bar', base: 63,
        labels: [['1', 'dislike'], '2', '3', '4', ['5', 'love']],
        counts: [7, 16, 18, 16, 6] },
    'chart-delay': { type: 'bar', base: 64, highlight: [0, 1, 4],
        labels: [['Size', 'doubts'], ['Look on', 'my body'], ['Material', 'differs'], ['Shipping', 'cost'], ['Fit with', 'my clothes']],
        counts: [46, 42, 27, 9, 8] },
    'chart-return': { type: 'bar', base: 39, highlight: [0, 1, 3],
        labels: [["Size", "didn't fit"], ['Looked', 'different', 'on me'], ['Quality', 'not as', 'expected'], ["Didn't", 'match my', 'clothes']],
        counts: [30, 16, 16, 2] },

    /* ---------- 3. Opinions on the app ---------- */
    'chart-3d-interest': { type: 'pie', base: 64,
        labels: ['Very unlikely', 'Unlikely', 'Neutral', 'Likely', 'Very likely'],
        counts: [7, 5, 9, 29, 14] },
    'chart-scan-share': { type: 'pie', base: 64,
        labels: ['Over 75%', '50-75%', '25-50%', '10-25%', 'Under 10%', 'None'],
        counts: [15, 9, 17, 9, 7, 7] },
    'chart-pricing': { type: 'pie', base: 64,
        labels: ['Free, limited features', 'One-time payment', 'Monthly or yearly'],
        counts: [42, 15, 7] },
    'chart-discourage': { type: 'bar', base: 64, highlight: [0, 1],
        labels: [['Scan', 'time'], ['Privacy'], ['Would use', 'it once'], ['Not', 'discouraged'], ['Model', 'quality'], ["Don't", 'need it']],
        counts: [39, 26, 7, 7, 5, 5] },
    'chart-features': { type: 'bar', base: 64,
        labels: [['Try-on with', 'store clothes'], ['Try-on with', 'my clothes'], ['Outfit', 'suggestions'], ['360° view'], ['Wardrobe', 'organisation']],
        counts: [40, 37, 34, 18, 15] },

    /* ---------- 4. Existing apps ---------- */
    'chart-prior-app': { type: 'pie', base: 45,
        labels: ['Never used a similar app', 'Used a wardrobe app'],
        counts: [44, 1] }
};

const charts = {}; // id -> { chart, canvas }

const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const pct = (n, base) => Math.round(n / base * 100);

/* Writes the legend under a pie, unless the HTML already has a hand-written one. */
function fillLegend(canvas, cfg) {
    const legend = canvas.closest('.vf-chart-block')?.querySelector('.vf-legend');
    if (!legend || legend.children.length) return;
    cfg.labels.forEach((label, i) => {
        const row = document.createElement('span');
        const sw = document.createElement('span');
        sw.className = 'vf-swatch';
        sw.style.setProperty('--vf-sw', PIE_COLORS[i % PIE_COLORS.length]);
        row.append(sw, `${label} ${pct(cfg.counts[i], cfg.base)}%`);
        legend.appendChild(row);
    });
}

/* Draws the percentage above every bar (no plugin needed). */
const barValueLabels = {
    id: 'barValueLabels',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        ctx.save();
        ctx.fillStyle = cssVar('--ink');
        ctx.font = '700 14px ' + cssVar('--body');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        chart.getDatasetMeta(0).data.forEach((bar, i) => {
            ctx.fillText(chart.data.datasets[0].data[i] + '%', bar.x, bar.y - 5);
        });
        ctx.restore();
    }
};

function plainLabel(l) { return Array.isArray(l) ? l.join(' ') : l; }

function buildPie(canvas, cfg) {
    fillLegend(canvas, cfg);
    return new Chart(canvas, {
        type: 'pie',
        data: {
            labels: cfg.labels,
            datasets: [{
                data: cfg.counts,
                backgroundColor: cfg.counts.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => ` ${c.label}: ${pct(c.raw, cfg.base)}% (${c.raw} people)` } }
            }
        }
    });
}

function buildBar(canvas, cfg) {
    const values = cfg.counts.map(n => pct(n, cfg.base));
    const hi = cfg.highlight || [];
    const sage = cssVar('--sage');
    return new Chart(canvas, {
        type: 'bar',
        data: {
            labels: cfg.labels,
            datasets: [{
                data: values,
                backgroundColor: values.map((_, i) => hi.includes(i) ? HIGHLIGHT : sage),
                borderRadius: 6,
                maxBarThickness: 56
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 22 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: items => plainLabel(items[0].label),
                        label: c => ` ${c.raw}% (${cfg.counts[c.dataIndex]} people)`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { color: cssVar('--line') },
                    ticks: { color: cssVar('--ink'), autoSkip: false, maxRotation: 0, font: { size: 11 } }
                },
                y: { display: false, beginAtZero: true, suggestedMax: Math.max(...values) * 1.15 }
            }
        },
        plugins: [barValueLabels]
    });
}

function destroyCharts() {
    Object.values(charts).forEach(({ chart }) => chart.destroy());
    Object.keys(charts).forEach(id => delete charts[id]);
}

function initFormsCharts() {
    if (typeof Chart === 'undefined') return;
    for (const [id, cfg] of Object.entries(CHARTS)) {
        const canvas = document.getElementById(id);
        const existing = charts[id];

        // The tab was reloaded: the old canvas is gone, drop its chart.
        if (existing && existing.canvas !== canvas) {
            existing.chart.destroy();
            delete charts[id];
        }
        if (!canvas) continue;
        if (canvas.closest('[hidden]')) continue;   // panel not visible yet (e.g. Interviews tab)

        if (charts[id]) { charts[id].chart.resize(); continue; }
        charts[id] = { canvas, chart: cfg.type === 'pie' ? buildPie(canvas, cfg) : buildBar(canvas, cfg) };
    }
}

// Redraw with the right colours when the visitor's light/dark mode changes.
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    destroyCharts();
    initFormsCharts();
});