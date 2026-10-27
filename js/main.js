/* EasyFits: tiny tab router.
 * Each tab lives in components/<name>/<name>.html + <name>.css
 *
 * To add a tab (e.g. M3):
 *   1. add  <a href="#m3" data-tab="m3" role="tab">M3</a>  in index.html
 *   2. create components/m3/m3.html and components/m3/m3.css
 *   3. add  'm3'  to the TABS array below
 */
const TABS = ['m1', 'm2'];
const DEFAULT_TAB = 'm1';

const htmlUrl = t => `components/${t}/${t}.html`;
const cssUrl = t => `components/${t}/${t}.css`;

document.documentElement.classList.add('js');

const view = document.getElementById('view');
const tabsEl = document.getElementById('tabs');
const tabLinks = tabsEl.querySelectorAll('[data-tab]');
const htmlCache = {};
const styleLinks = {}; // tab -> <link>, kept in <head> and toggled with .disabled
let current = null;
let observer = null;

/* Keep sticky in-tab menus positioned right under the tab bar */
function syncTabsHeight() {
    document.documentElement.style.setProperty('--tabs-h', tabsEl.offsetHeight + 'px');
}
window.addEventListener('resize', syncTabsHeight);
syncTabsHeight();

/* Scroll-reveal animation for whatever was just injected */
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

async function fetchHtml(tab) {
    if (htmlCache[tab]) return htmlCache[tab];
    const res = await fetch(htmlUrl(tab));
    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
    return (htmlCache[tab] = await res.text());
}

/* Resolves once the tab's stylesheet is applied (so there's no unstyled flash) */
function loadStyle(tab) {
    if (styleLinks[tab]) return Promise.resolve();
    return new Promise(resolve => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssUrl(tab);
        link.onload = link.onerror = resolve; // a missing css file shouldn't block the page
        styleLinks[tab] = link;
        document.head.appendChild(link);
    });
}

/* Only the active tab's stylesheet is enabled, so tab styles never leak into each other */
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
        a.setAttribute('aria-selected', on);
    });

    try {
        const [html] = await Promise.all([fetchHtml(tab), loadStyle(tab)]);
        if (current !== tab) return; // user switched again while loading
        activateStyle(tab);
        view.innerHTML = html;
        initReveal(view);
        syncTabsHeight();
        // When switching tabs, jump back up to the top of the content
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
        // Not a tab: it's an in-page anchor (e.g. #team) inside the current tab
        await showTab(current || DEFAULT_TAB);
        const el = id && document.getElementById(id);
        if (el) el.scrollIntoView();
    }
}

/* Sub-tabs inside a component (see .subtabs in components/m2/m2.html).
   Delegated on #view so it keeps working whenever a tab's HTML is injected. */
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
});

window.addEventListener('hashchange', route);
route();