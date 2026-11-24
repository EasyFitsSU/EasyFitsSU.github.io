/* EasyFits M5: lead generation campaign.
 *
 * ALL NUMBERS FOR THE M5 TAB LIVE IN `LEADS` BELOW. Edit them and the page updates itself:
 * stat boxes, funnel, traffic chart, channel comparison table and the "best channel" pick.
 *
 * Any value left as null shows up on the page as a yellow "?" so nothing is forgotten.
 *
 * js/main.js calls initLeadsPage() every time a tab is loaded. It does nothing
 * unless the M5 tab is on screen, so it is safe to call many times.
 */

const LEADS = {
	/* Dates the campaign ran, as shown on the page */
	period: { from: '17 Nov 2026', to: '24 Nov 2026' },

	/* PostHog > Web analytics, date range = campaign period (internal traffic excluded) */
	web: {
		visitors:   53,
		pageviews:  null,      // not used on the page
		sessionDuration: '1m 51s',
		bounceRate: 32.1
	},

	/* Unique visitors per event, whole period, all sources.
	 * These are counted per event, so signup can be higher than cta (people can sign up
	 * without clicking the button). The page therefore shows each step as a share of all visitors. */
	funnel: {
		pageview: 53,
		cta:      12,
		signup:   15
	},

	/* Extra events */
	demoInteract: 28,       // PostHog: unique users who played with the 3D demo
	formLeads:    15,       // TODO: check against the number of emails in the Google Form and change if it differs

	/* Visitors per day. Not available yet: while labels is empty the chart is hidden. */
	daily: {
		labels:   [],       // e.g. ['17 Nov', '18 Nov', ...]
		visitors: []        // e.g. [3, 41, 18, ...]
	},

	/* One entry per channel (PostHog, broken down by UTM source).
	 * Reddit combines the two mistyped tags "redditl" and "reddits". */
	channels: [
		{ name: 'WhatsApp',       visitors: 32, demo: 23, cta: 8, signups: 11 },
		{ name: 'Discord',        visitors: 5,  demo: 3,  cta: 1, signups: 3  },
		{ name: 'Reddit',         visitors: 2,  demo: 0,  cta: 0, signups: 0  },
		{ name: 'Direct / other', visitors: 11, demo: 0,  cta: 1, signups: 1  }
	]
};

/* ---------------------------------------------------------------------------------------- */

let leadsChart = null;

const has = v => v !== null && v !== undefined && v !== '';
const missing = () => '<span class="m5-missing" title="Fill this in in components/m5/m5.js">?</span>';
const show = v => has(v) ? String(v) : missing();
const rate = (part, whole) => (has(part) && has(whole) && whole > 0) ? Math.round(part / whole * 1000) / 10 : null;
const showRate = (part, whole) => { const r = rate(part, whole); return r === null ? missing() : r + '%'; };

function fillSlots(root) {
	const f = LEADS.funnel;
	const values = {
		from: LEADS.period.from,
		to: LEADS.period.to,
		visitors: LEADS.web.visitors,
		pageviews: LEADS.web.pageviews,
		sessionDuration: LEADS.web.sessionDuration,
		bounceRate: has(LEADS.web.bounceRate) ? LEADS.web.bounceRate + '%' : null,
		demoInteract: LEADS.demoInteract,
		formLeads: LEADS.formLeads,
		signups: f.signup,
		conversion: rate(f.signup, f.pageview) === null ? null : rate(f.signup, f.pageview) + '%',
		ctaRate: rate(f.cta, f.pageview) === null ? null : rate(f.cta, f.pageview) + '%'
	};
	root.querySelectorAll('[data-m5]').forEach(el => { el.innerHTML = show(values[el.dataset.m5]); });
}

function renderFunnel(root) {
	const box = root.querySelector('#m5-funnel');
	if (!box) return;
	const f = LEADS.funnel;
	const steps = [
		{ label: 'Visited the landing page', n: f.pageview },
		{ label: 'Played with the 3D demo', n: LEADS.demoInteract },
		{ label: 'Clicked the call to action', n: f.cta },
		{ label: 'Left their email', n: f.signup }
	];
	box.innerHTML = steps.map((s, i) => {
		const width = (has(s.n) && has(f.pageview) && f.pageview > 0) ? Math.max(2, s.n / f.pageview * 100) : 100;
		const share = i === 0 ? '' :
			`<span class="m5-step-rate">${showRate(s.n, f.pageview)} of all visitors</span>`;
		return `<div class="m5-step${has(s.n) ? '' : ' empty'}">
            <div class="m5-step-head"><b>${s.label}</b></div>
            <div class="m5-bar"><span style="width:${width}%"></span><em>${show(s.n)}</em></div>
            ${share}
        </div>`;
	}).join('');
}

function bestChannel() {
	const scored = LEADS.channels.filter(c => has(c.signups) && c.name !== 'Direct / other');
	if (!scored.length) return null;
	return scored.slice().sort((a, b) =>
		(b.signups - a.signups) || ((rate(b.signups, b.visitors) || 0) - (rate(a.signups, a.visitors) || 0)))[0];
}

function renderTable(root) {
	const body = root.querySelector('#m5-channels tbody');
	if (!body) return;
	const best = bestChannel();
	const rows = LEADS.channels.map(c => `
        <tr${c === best ? ' class="m5-best"' : ''}>
            <td>${c.name}${c === best ? ' <span class="m5-tag">Best</span>' : ''}</td>
            <td>${show(c.visitors)}</td>
            <td>${show(c.demo)}</td>
            <td>${show(c.cta)}</td>
            <td>${show(c.signups)}</td>
            <td>${showRate(c.signups, c.visitors)}</td>
        </tr>`).join('');
	const f = LEADS.funnel;
	const total = `
        <tr class="m5-total">
            <td>Total</td>
            <td>${show(f.pageview)}</td>
            <td>${show(LEADS.demoInteract)}</td>
            <td>${show(f.cta)}</td>
            <td>${show(f.signup)}</td>
            <td>${showRate(f.signup, f.pageview)}</td>
        </tr>`;
	body.innerHTML = rows + total;
	root.querySelectorAll('[data-m5-best]').forEach(el => { el.innerHTML = best ? best.name : missing(); });
}

function renderTraffic(root) {
	const canvas = root.querySelector('#m5-traffic');
	if (!canvas) return;
	const block = canvas.closest('.m5-chart');
	const d = LEADS.daily;
	if (!d.labels.length || typeof Chart === 'undefined') { block.hidden = true; return; }
	block.hidden = false;
	if (leadsChart && leadsChart.canvas === canvas) return;
	if (leadsChart) leadsChart.destroy();
	const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
	leadsChart = new Chart(canvas, {
		type: 'line',
		data: { labels: d.labels, datasets: [{
				label: 'Visitors', data: d.visitors, tension: .3, fill: true,
				borderColor: css('--sage'), backgroundColor: 'rgba(85,115,98,.15)',
				pointBackgroundColor: css('--tape'), pointBorderColor: css('--sage'), pointRadius: 4
			}] },
		options: {
			maintainAspectRatio: false,
			plugins: { legend: { display: false } },
			scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } }
		}
	});
}

function initLeadsPage() {
	const root = document.querySelector('.m5');
	if (!root) return;
	fillSlots(root);
	renderFunnel(root);
	renderTable(root);
	renderTraffic(root);
}