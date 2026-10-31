/* EasyFits: tiny tab router + side navigation.
 * Each tab lives in components/<name>/<name>.html + <name>.css
 *
 * To add a tab (e.g. M3):
 *   1. add a badge link and an empty  <div class="sn-sections" data-for="m3"></div>  in index.html
 *      (copy the M2 pair in the side navigation)
 *   2. create components/m3/m3.html and components/m3/m3.css
 *   3. add  'm3'  to the TABS array below
 *
 * The section links shown under the active tab in the side navigation are copied
 * automatically from the <nav class="subnav"> inside that tab's HTML.
 */
const TABS = ['m1', 'm2'];
const DEFAULT_TAB = 'm1';

const htmlUrl = t => `components/${t}/${t}.html`;
const cssUrl  = t => `components/${t}/${t}.css`;

document.documentElement.classList.add('js');

const view     = document.getElementById('view');
const sideNav  = document.getElementById('tabs');
const fab      = document.getElementById('sn-fab');
const tabLinks = sideNav.querySelectorAll('[data-tab]');
const htmlCache  = {};
const styleLinks = {};
let current  = null;
let observer = null;
let spy      = null;

/* ---------- Side navigation ---------- */

// Copies the tab's .subnav links under the active tab in the side navigation
function buildSideSections(tab) {
    sideNav.querySelectorAll('.sn-sections').forEach(box => {
        box.innerHTML = '';
        if (box.dataset.for !== tab) return;
        view.querySelectorAll('.subnav a').forEach(a => {
            const link = document.createElement('a');
            link.href = a.getAttribute('href');
            link.textContent = a.textContent;
            box.appendChild(link);
        });
    });
    setupScrollSpy();
}

// Highlights the section that is currently on screen
function setupScrollSpy() {
    if (spy) spy.disconnect();
    const links = [...sideNav.querySelectorAll('.sn-sections a')];
    if (!links.length) return;
    spy = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            links.forEach(l => l.classList.toggle('current', l.getAttribute('href') === '#' + e.target.id));
        });
    }, { rootMargin: '-30% 0px -60% 0px' });
    view.querySelectorAll('section[id]').forEach(s => spy.observe(s));
}

// Drawer for touch screens (on desktop the rail opens on hover)
function setOpen(open) {
    sideNav.classList.toggle('open', open);
    fab.setAttribute('aria-expanded', open);
}
fab.addEventListener('click', () => setOpen(!sideNav.classList.contains('open')));
sideNav.addEventListener('click', e => {
    if (e.target.closest('a') && window.matchMedia('(max-width:720px)').matches) setOpen(false);
});
document.addEventListener('click', e => {
    if (!sideNav.contains(e.target) && !fab.contains(e.target)) setOpen(false);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });

/* ---------- Scroll reveal ---------- */

function initReveal(root) {
    if (observer) observer.disconnect();
    const items = root.querySelectorAll('section h2, .lead, .card, .member');
    items.forEach((el, i) => {
        el.classList.add('reveal');
        el.style.setProperty('--d', (i % 4) * 0.08 + 's');
    });
    observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('in');
                observer.unobserve(e.target);
            }
        });
    }, { threshold: .15 });
    items.forEach(el => observer.observe(el));
}

/* ---------- Tab loading ---------- */

async function fetchHtml(tab) {
    if (htmlCache[tab]) return htmlCache[tab];
    const res = await fetch(htmlUrl(tab));
    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
    return (htmlCache[tab] = await res.text());
}

function loadStyle(tab) {
    if (styleLinks[tab]) return Promise.resolve();
    return new Promise(resolve => {
        const link = document.createElement('link');
        link.rel  = 'stylesheet';
        link.href = cssUrl(tab);
        link.onload = link.onerror = resolve;
        styleLinks[tab] = link;
        document.head.appendChild(link);
    });
}

function activateStyle(tab) {
    for (const [name, link] of Object.entries(styleLinks)) link.disabled = name !== tab;
}

async function showTab(tab) {
    if (tab === current) return;
    const previous = current;
    current = tab;

    tabLinks.forEach(a => {
        const on = a.dataset.tab === tab;
        a.classList.toggle('active', on);
        a.setAttribute('aria-current', on ? 'page' : 'false');
    });

    try {
        const [html] = await Promise.all([fetchHtml(tab), loadStyle(tab)]);
        if (current !== tab) return;
        activateStyle(tab);
        view.innerHTML = html;
        initReveal(view);
        buildSideSections(tab);
        if (typeof initFormsCharts === 'function') initFormsCharts();
        if (previous !== null) {
            const tape = document.querySelector('.tape');
            window.scrollTo({ top: tape.offsetTop + tape.offsetHeight });
        }
    } catch (err) {
        current = null;
        view.innerHTML = '<div class="wrap"><p>Could not load this tab (' + err.message + '). ' +
            'If you opened the file directly, run a local server instead, e.g. <code>python -m http.server</code>.</p></div>';
    }
}

async function route() {
    const id = location.hash.slice(1);
    if (TABS.includes(id)) {
        await showTab(id);
    } else {
        await showTab(current || DEFAULT_TAB);
        const el = id && document.getElementById(id);
        if (el) el.scrollIntoView();
    }
}

view.addEventListener('click', e => {
    const btn = e.target.closest('.subtabs [role="tab"]');
    if (!btn) return;
    const root = btn.closest('.subtabs');
    root.querySelectorAll('[role="tab"]').forEach(b => {
        const on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on);
    });
    root.querySelectorAll('[role="tabpanel"]').forEach(p => { p.hidden = p.id !== btn.dataset.panel; });
    // Charts need the panel to be visible before they can measure canvas dimensions
    if (typeof initFormsCharts === 'function') initFormsCharts();
});

window.addEventListener('hashchange', route);
route();