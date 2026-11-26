import data from './data/stories.json';
import type { Story, Commission } from './types';
import { icons } from './icons';
import { art, editionArt } from './art';
import { startIntro, toggleMute, isMuted, reducedMotion, playTypewriter } from './audio';
import { readEnv } from './adapters/env';
import { createResearch } from './adapters/research';
import { createDesk, DeskError, type WalletState, type Session, type LedgerEntry } from './adapters/desk';
import { createWallet } from './adapters/wallet';
import { createWire, wireWindow } from './adapters/wire';
import { money, storyTotal as total, ledgerSummary } from './logic/ledger';
import { addCommission, loadCommissions, loadDispatches, mergeStories, publishDispatch, updateCommission, validateCommission } from './logic/store';
import type { WireItem } from './types';
import './style.css';
import archiveEmpty from './views/archive-empty.html?raw';

const SAMPLES = data.stories as Story[];
let stories: Story[] = mergeStories(SAMPLES, loadDispatches(localStorage));
const app = document.getElementById('app') as HTMLElement;
const env = readEnv();
const research = createResearch(env);
const wallet = createWallet(env);
const wire = createWire(env);
let wireItems: WireItem[] = [];
let wireTick = 0;
let wireTimer: number | undefined;
let serverStories: Story[] = [];
let apiState: 'loading' | 'online' | 'offline' = 'loading';
let deskWallet: WalletState | undefined;
let permissions: Session | undefined;
let ledgerEntries: LedgerEntry[] = [];
let deskMessage = '';
let deskBusy = false;
const desk = createDesk(env.VITE_JOAN_API_URL!);
const refreshStories = () => { stories = editionArt(apiState === 'online' ? serverStories : apiState === 'offline' ? mergeStories(SAMPLES, loadDispatches(localStorage)) : []); };
async function syncDesk(): Promise<void> {
  try {
    serverStories = await Promise.all((await desk.reports()).map(async s => ({
      ...s, sample: false, origin: s.demoData || s.origin !== 'live' ? 'mock' as const : 'live' as const,
      commissionedAt: (await desk.assignment(s.id)).createdAt?.slice(0, 10)
    })));
    apiState = 'online';
    wireItems = serverStories.slice(0, 8).map(s => ({ id: s.id, text: s.headline, status: s.demoData || s.origin === 'mock' ? 'pending' : 'ok', at: s.date }));
    [deskWallet, permissions, { entries: ledgerEntries }] = await Promise.all([desk.wallet(), desk.permissions(), desk.ledger()]);
  } catch (e) { if (apiState !== 'online') apiState = 'offline'; deskMessage = e instanceof Error ? e.message : 'Desk unavailable'; }
  refreshStories();
}
const demoTag = (m: string) => (m === 'mock' ? `<span class="sample-tag" title="Mock adapter: realistic but invented data. Set the env var in KEYS-NEEDED.md to go live.">Demo data</span>` : '');

/* ---------- helpers ---------- */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

function roman(n: number): string {
  const map: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
function romanDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${roman(d)}, ${roman(y)}`;
}
function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}, ${y}`;
}
/* The visitor's own calendar day, not UTC: toISOString() flips to tomorrow/yesterday near midnight. */
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/* Issue number: days since the first sample edition (1 Nov 2026), counted on local calendar days. */
const issueNo = () => {
  const [y, m, d] = todayIso().split('-').map(Number);
  return Math.max(1, Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 10, 1)) / 864e5) + 1);
};
const leadIn = (t: string) => {
  const w = t.split(' ');
  return `<span class="lead-in">${esc(w.slice(0, 4).join(' '))}</span> ${esc(w.slice(4).join(' '))}`;
};

const sampleTag = `<span class="sample-tag" title="Invented demonstration data">Demo data</span>`;
const tagFor = (s: Story) => (s.sample ? sampleTag : demoTag(s.origin || 'mock'));
const safeUrl = (value: string): string => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
// Every API string inserted into markup is escaped; source links reject executable schemes.
const photo = (s: Story) => `<span class="photo-tag">${esc(s.credit)}</span>`;
const bookmark = `<svg viewBox="0 0 24 24" class="bm" aria-hidden="true"><path d="M7 3h10a1 1 0 0 1 1 1v17l-6-4-6 4V4a1 1 0 0 1 1-1z" fill="currentColor"/></svg>`;
const byline = (s: Story) => `<p class="byline">${icons.pen}<span>By Joan</span><i>/</i><span>${esc(s.section)}</span></p>`;

/* ---------- state ---------- */
let section = 'All';
let activeIndex = 0;
let archiveFilter = 'All';

/* ---------- chrome ---------- */
function topbar(current: string): string {
  const link = (hash: string, label: string, key: string) =>
    `<a href="${hash}" data-go class="${current === key ? 'on' : ''}">${label}</a>`;
  return `<nav class="topbar" aria-label="Primary">
    <span class="topbar-date">Edition &middot; ${romanDate(todayIso())}</span>
    <div class="topbar-links">
      ${link('#/front', 'Front Page', 'front')}
      ${link(`#/story/${stories[activeIndex]?.id || ''}`, 'Dispatch', 'story')}
      ${link('#/archives', 'Archives', 'archives')}
      ${link('#/dashboard', 'Research Desk', 'dashboard')}
      ${link('#/about', 'About Joan', 'about')}
    </div>
    <button class="icon-btn" data-action="mute" aria-label="Toggle sound">${isMuted() ? icons.muted : icons.speaker}</button>
  </nav>`;
}

function tabbar(current: string): string {
  const t = (hash: string, label: string, key: string, icon: string) =>
    `<a href="${hash}" data-go class="${current === key ? 'on' : ''}" ${current === key ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></a>`;
  return `<nav class="tabbar" aria-label="Primary">
    ${t('#/front', 'Front', 'front', icons.front)}
    ${t(`#/story/${stories[activeIndex]?.id || ''}`, 'Dispatch', 'story', icons.dispatch)}
    ${t('#/archives', 'Archives', 'archives', icons.archive)}
    ${t('#/dashboard', 'Desk', 'dashboard', icons.receipt)}
    ${t('#/about', 'About', 'about', icons.about)}
  </nav>`;
}

function shell(current: string, inner: string, cls = ''): string {
  return `<div class="app ${cls}">${topbar(current)}<main class="screen" id="screen" tabindex="-1">${inner}</main>${tabbar(current)}</div><dialog id="receiptDlg" class="dlg receipt-dlg" aria-labelledby="rcTitle"></dialog>`;
}

const label = `<p class="ai-label"><span>AI-generated report.</span> Prepared by Joan.</p>`;

/* editorial furniture: custom SVG, no glyph ornaments */
const pullQuote = (t: string) => `<blockquote class="pull"><svg viewBox="0 0 40 28" class="pq-mark" aria-hidden="true"><path d="M0 28V16C0 7 5 1.500 14 0v5.500C9.500 6.500 8 9.500 8 13h6v15zm22 0V16C22 7 27 1.500 36 0v5.500C31.500 6.500 30 9.500 30 13h6v15z" fill="currentColor"/></svg><p>${esc(t)}</p><footer>Joan, from this dispatch</footer></blockquote>`;
const ornament = `<div class="orn" aria-hidden="true"><svg viewBox="0 0 120 16"><path d="M2 8h42M76 8h42" stroke="currentColor" stroke-width="1"/><path d="M60 1.500l5.500 6.500-5.500 6.500-5.500-6.500z" fill="none" stroke="currentColor" stroke-width="1.200"/><circle cx="50" cy="8" r="1.600" fill="currentColor"/><circle cx="70" cy="8" r="1.600" fill="currentColor"/></svg></div>`;
const endMark = `<svg viewBox="0 0 60 18" class="end-svg" aria-hidden="true"><path d="M2 9h14M44 9h14" stroke="currentColor" stroke-width="1"/><path d="M30 2l7 7-7 7-7-7z" fill="currentColor"/></svg>`;

/* ---------- screens ---------- */
function entrance(): string {
  return `<section class="entrance" id="entrance" aria-label="Entrance">
    <div class="ent-photo" aria-hidden="true"><img src="/img/joan.webp" alt="" /></div>
    <div class="ent-grain" aria-hidden="true"></div>
    <div class="entrance-inner">
      <p class="entrance-eyebrow">Vol. I &middot; No. ${roman(issueNo())} &middot; ${romanDate(todayIso())}</p>
      <h1 class="ent-logo">JOAN</h1>
      <p class="ent-tag">The AI journalist who shows her receipts.</p>
      <button class="open-btn" data-action="open">Open today's edition</button>
      <p class="typed" id="typed" aria-live="polite"></p>
      <div class="entrance-sound"><button class="snd-btn" data-action="mute" aria-label="Toggle sound">${isMuted() ? icons.muted : icons.speaker}<span>Typewriter and paper sounds</span></button></div>
    </div>
  </section>`;
}

function leadCard(s: Story): string {
  return `<article class="lead card reveal" style="--i:0">
    <a href="#/story/${s.id}" data-go class="plain">
      <figure class="figure">${art(s.art, s.credit)}${photo(s)}</figure>
      <div class="card-body">
        <p class="kicker"><span>${esc(s.kicker)}</span></p>
        <h2 class="lead-title">${esc(s.headline)}</h2>
        <p class="deck">${esc(s.summary)}</p>
        <p class="meta">${icons.pen}<span>By Joan</span><i>/</i><span>${esc(s.section)}</span> ${tagFor(s)}</p>
      </div>
    </a>
  </article>`;
}

function smallCard(s: Story, i = 0): string {
  return `<article class="mini card reveal" style="--i:${i + 1}">
    <a href="#/story/${s.id}" data-go class="plain">
      <figure class="figure">${art(s.art, s.credit)}${photo(s)}</figure>
      <p class="kicker left"><span>${esc(s.kicker)}</span></p>
      <h3>${esc(s.headline)}</h3>
      <p class="deck sm">${esc(s.summary)}</p>
      <p class="meta">${shortDate(s.date)} ${tagFor(s)}</p>
    </a>
  </article>`;
}

function aboutBand(): string {
  return `<aside class="about-band card reveal" style="--i:3">
    <p class="kicker"><span>About Joan</span></p>
    <p>Joan is an AI journalist. Each report separates what is known from what is claimed, links every claim to its original source, and lists what was spent on research.</p>
    <a href="#/about" data-go class="text-link">How Joan works ${icons.arrow}</a>
  </aside>`;
}

function ledgerBox(): string {
  const L = ledgerSummary(stories);
  const tag = !stories.length ? '' : stories.every((s) => s.sample) ? sampleTag : stories.some(s => s.demoData || s.origin === 'mock') ? demoTag('mock') : '';
  const bars = L.bySection.map((b) => `<li><span class="lb-name">${esc(b.section)}</span><span class="lb-bar" aria-hidden="true"><i style="width:${Math.max(6, Math.round(b.share * 100))}%"></i></span><span class="lb-amt">${money(b.amount)}</span></li>`).join('');
  return `<aside class="ledger card reveal" style="--i:2" aria-label="Joan's ledger">
    <p class="kicker"><span>Joan's Ledger</span></p>
    <p class="big">${money(L.total)}</p>
    <p class="small">Research spend across ${L.dispatches} dispatches and ${L.receipts} receipts. ${tag}</p>
    <ul class="lb">${bars}</ul>
    <p class="lb-foot"><span>Average per dispatch</span><b>${money(L.average)}</b></p>
  </aside>`;
}

const wireIcon = { ok: icons.check, flag: icons.flag, pending: icons.clock } as const;
const wireLabel = { ok: 'Verified', flag: 'Flagged', pending: 'Checking' } as const;
function wireRows(): string {
  if (!wireItems.length) return '<li class="w-pending"><span class="w-ic">' + icons.clock + '</span><span class="w-text">The wire is quiet right now.</span><time></time></li>';
  return wireWindow(wireItems, wireTick, 5).map((w) => `<li class="w-${w.status}"><span class="w-ic" title="${wireLabel[w.status]}">${wireIcon[w.status]}<span class="sr">${wireLabel[w.status]}</span></span><span class="w-text">${esc(w.text)}</span><time>${esc(w.at)}</time></li>`).join('');
}
function wireBox(): string {
  return `<aside class="wire card reveal" style="--i:3" aria-label="The wire, live checks">
    <p class="kicker"><span>The Wire</span></p>
    <p class="small wire-sub"><span class="pulse" aria-hidden="true"></span>Checks from the desk ${demoTag(apiState === 'online' ? (serverStories.some(s => s.demoData || s.origin === 'mock') ? 'mock' : 'live') : wire.mode)}</p>
    <ul class="wire-list" id="wireList" aria-live="off">${wireRows()}</ul>
  </aside>`;
}

function teaserCard(): string {
  return `<aside class="teaser card reveal" style="--i:4">
    <a href="#/90s" data-go class="plain">
      <figure class="figure"><img class="art bw" src="/img/joan-90s.jpg" alt="Joan at a desk, imagined as a 1990s newsroom reporter" loading="lazy" decoding="async" /><span class="photo-tag">Special feature</span></figure>
      <div class="t-body">
        <p class="kicker left"><span>Coming Back</span></p>
        <h3>Joan, back in the 90s</h3>
        <p class="deck sm">If the newsroom still ran on fax machines and pagers, what would she have filed?</p>
        <span class="text-link">Read the feature ${icons.arrow}</span>
      </div>
    </a>
  </aside>`;
}

function front(): string {
  const sections = ['All', ...Array.from(new Set(stories.map((s) => s.section)))];
  if (!sections.includes(section)) section = 'All';
  const list = section === 'All' ? stories : stories.filter((s) => s.section === section);
  const lead = list[0];
  const rest = list.slice(1);
  const tabs = sections.map((x) => `<button class="tab ${x === section ? 'on' : ''}" data-section="${esc(x)}">${x === 'All' ? 'Front Page' : esc(x)}</button>`).join('');
  return shell('front', `
    <header class="masthead">
      <div class="mast-row">
        <button class="icon-btn only-mobile" data-go-hash="#/about" aria-label="About Joan">${icons.menu}</button>
        <div class="mast-title">
          <p class="vol"><span>VOL. ${roman(1)} &middot; NO. ${roman(issueNo())}</span><span class="vol-sep"> &middot; </span><span>${romanDate(todayIso())}</span></p>
          <h1 class="logo">JOAN</h1>
          <p class="tagline">Sourced. Receipted. Prepared by an AI journalist.</p>
        </div>
        <button class="icon-btn only-mobile" data-action="mute" aria-label="Toggle sound">${isMuted() ? icons.muted : icons.speaker}</button>
      </div>
      <div class="tabs" role="tablist" aria-label="Sections">${tabs}</div>
    </header>
    <div class="edition-note"><p class="sample-banner">${apiState === 'online' ? 'From the research desk. Mock reports retain their demo labels. No live payments.' : apiState === 'loading' ? 'Opening the research desk…' : 'API unavailable. Sample edition shown as a labelled fallback.'}</p><a class="text-link" href="#/archives" data-go>Add clipping ${icons.plus}</a></div>
    <div class="front-grid">
      <div class="col-left">${rest.map((s, i) => smallCard(s, i)).join('') || ''}</div>
      <div class="col-center">${lead ? leadCard(lead) : `<div class="empty ${apiState === 'loading' ? 'skeleton' : ''}"><h2>No dispatches yet</h2><p>Give Joan an assignment to open this edition.</p><a class="btn" href="#/archives" data-go>Add clipping</a></div>`}<div class="rule-orn" aria-hidden="true"><span></span></div><section class="editor-note"><p class="kicker"><span>The editorial standard</span></p><h3>A claim is not a finding.</h3><p>Read the original. Name the uncertainty. Keep the receipt.</p>${ornament}</section></div>
      <div class="col-right">${ledgerBox()}${wireBox()}${teaserCard()}${aboutBand()}</div>
    </div>
    ${label}
  `);
}

function panel(s: Story, i: number): string {
  const n = stories.length;
  const prev = stories[i - 1];
  const next = stories[i + 1];
  const [first, ...others] = s.body;
  const commissioned = s.commissionedAt || loadCommissions(localStorage).find(c => c.storyId === s.id)?.createdAt;
  const badge: Record<string, string> = { high: 'High', medium: 'Medium', low: 'Low' };
  return `<article class="panel ${i === activeIndex ? 'active-desk' : ''}" data-index="${i}" data-id="${s.id}" aria-label="${esc(s.headline)}">
    <div class="panel-inner">
      <header class="d-head">
        <p class="kicker"><span>${esc(s.kicker)}</span></p>
        <h1 class="d-title">${esc(s.headline)}</h1>
        <div class="d-rule"></div>
        <p class="d-by">BY JOAN &middot; ${esc(s.section.toUpperCase())}</p>
        <p class="d-date">Filed ${romanDate(s.date)}<br>Commissioned ${commissioned ? romanDate(commissioned) : 'date not recorded'} &middot; ${s.readMinutes} MIN READ ${tagFor(s)}</p>
      </header>
      <figure class="figure wide">${art(s.art, s.credit)}${photo(s)}</figure>
      <p class="caption"><span>Fig. ${i + 1}</span>${esc(s.caption || 'Archive illustration. Not evidence of this assignment.')}</p>
      <p class="d-deck">${esc(s.summary)}</p>
      <div class="d-layout">
        <div class="d-text">
          <p class="dropcap">${leadIn(first)}</p>
          ${others.map((p, k) => `<p>${esc(p)}</p>${k === 0 ? pullQuote(s.pullQuote || s.summary) : ''}`).join('')}
          ${ornament}
          <section class="sec">
            <h2><span>What We Know</span></h2>
            <ul class="know">${s.know.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>
          </section>
          <section class="sec">
            <h2><span>What Remains Unclear</span></h2>
            <ul class="unclear">${s.unclear.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>
          </section>
          <p class="endmark" aria-label="End of story">${endMark}</p>
        </div>
        <aside class="d-aside">
          <section class="stamp-box conf-${s.confidence.level}">
            <p class="stamp-label">Confidence</p>
            <p class="stamp">${badge[s.confidence.level]}</p>
            <p class="stamp-reason">${esc(s.confidence.reason)}</p>
          </section>
          <section class="sec foot">
            <h2><span>Sources</span></h2>
            <ol class="footnotes">
              ${s.sources.map((r) => `<li>${safeUrl(r.url) ? `<a href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener noreferrer">${esc(r.label)}</a>` : `<span class="src-plain">${esc(r.label)}</span>`}<span class="src-kind">${esc(r.kind)}</span><em>${esc(r.note)}</em></li>`).join('')}
            </ol>
            ${s.sample ? '<p class="small">Source links point to placeholder addresses in this sample.</p>' : ''}
          </section>
          <section class="sec receipts">
            <h2><span>Research Spending</span></h2>
            <ul class="receipt-list">
              ${s.spending.map((r, k) => `<li><span class="r-item">${esc(r.item)}</span><span class="r-amt">${money(r.amount)}</span><button type="button" class="r-tx" data-receipt="${s.id}:${k}">${icons.receipt}<span>Receipt ${esc(r.tx)}</span></button></li>`).join('')}
            </ul>
            <p class="r-total"><span>Total</span><b>${money(total(s))}</b></p>
            <p class="small">${s.spending.some(r => !!wallet.txUrl(r.tx)) ? 'Genuine transaction references can be viewed on the explorer.' : 'Receipts open a demo slip. No transaction was made.'}</p>
          </section>
        </aside>
      </div>
      ${label}
      <nav class="pager-links" aria-label="Neighbouring dispatches">
        ${prev ? `<a href="#/story/${prev.id}" data-go>${icons.back}<span>${esc(prev.section)}</span></a>` : '<span></span>'}
        <span class="pager-count">${i + 1} / ${n}</span>
        ${next ? `<a href="#/story/${next.id}" data-go><span>${esc(next.section)}</span>${icons.arrow}</a>` : '<span></span>'}
      </nav>
    </div>
  </article>`;
}

function story(): string {
  const dots = stories.map((_, i) => `<i class="${i === activeIndex ? 'on' : ''}"></i>`).join('');
  return shell('story', `
    <div class="d-bar">
      <a href="#/front" data-go class="d-back">${icons.back}<span>Dispatch</span></a>
      <div class="dots" aria-hidden="true">${dots}</div>
      <button class="share-btn" data-action="share" aria-label="Copy link to this dispatch">${icons.share}</button>
    </div>
    <div class="ruler" aria-hidden="true"></div><div class="track" id="track" aria-live="polite">${stories.map(panel).join('')}</div>
    
  `, 'story-view');
}

function clip(s: Story, i: number): string {
  const tilt = [-1.6, 1.2, -0.8, 1.6][i % 4];
  return `<a class="clip reveal" href="#/story/${s.id}" data-go style="--tilt:${tilt}deg;--i:${i}">
    <figure class="figure clip-photo">${art(s.art, s.credit)}</figure>
    <span class="clip-top"><span class="clip-sec">${esc(s.section)}</span>${bookmark}</span>
    <h3>${esc(s.headline.length > 70 ? s.headline.slice(0, 67).replace(/\s+\S*$/, '') + '...' : s.headline)}</h3>
    <span class="clip-meta"><span>${shortDate(s.date)}</span>${tagFor(s)}</span>
  </a>`;
}

function archives(): string {
  const commissions = loadCommissions(localStorage);
  const filters = ['All', ...Array.from(new Set(stories.map((s) => s.section))), 'Commissions'];
  if (!filters.includes(archiveFilter)) archiveFilter = 'All';
  const chips = filters.map((f) => `<button class="chip ${f === archiveFilter ? 'on' : ''}" data-filter="${esc(f)}">${esc(f)}</button>`).join('');
  const showStories = archiveFilter === 'Commissions' ? [] : stories.filter((s) => archiveFilter === 'All' || s.section === archiveFilter);
  const showComm = archiveFilter === 'All' || archiveFilter === 'Commissions' ? commissions.filter((c) => c.status !== 'published' || archiveFilter === 'Commissions') : [];
  const commCards = showComm.map((c, i) => {
    const done = c.status === 'published' && c.storyId ? stories.find((x) => x.id === c.storyId) : undefined;
    const status = c.status === 'published' && c.storyId
      ? `<span class="clip-status ok">Published. <b>Read the dispatch</b> ${done ? tagFor(done) : ''}</span>`
      : c.status === 'failed'
        ? `<span class="clip-status bad">${esc(c.error || 'Joan could not finish this one.')}</span><button type="button" class="retry" data-retry="${esc(c.id)}">${icons.retry}<span>Try again</span></button>`
        : `<span class="clip-status working"><i class="spin" aria-hidden="true"></i>Joan is researching. ${demoTag(research.mode)}</span>`;
    const spentTxt = done ? `Spent ${money(done.spending.reduce((a, r) => a + r.amount, 0))} of ` : '';
    const inner = `<span class="clip-top">${icons.pen}${bookmark}</span>
      <h3>${esc(c.text.length > 70 ? c.text.slice(0, 67) + '...' : c.text)}</h3>
      <span class="clip-meta"><span>${shortDate(c.createdAt)}</span><span class="pill">${spentTxt}Max ${money(c.budget)}</span></span>
      ${status}`;
    const tilt = [1.4, -1.1][i % 2];
    return c.status === 'published' && c.storyId
      ? `<a class="clip pending" href="#/story/${esc(c.storyId)}" data-go style="--tilt:${tilt}deg">${inner}</a>`
      : `<div class="clip pending" data-commission="${esc(c.id)}" style="--tilt:${tilt}deg">${inner}</div>`;
  }).join('');
  return shell('archives', `
    <header class="arch-head">
      <h1>THE ARCHIVES</h1>
      <p class="sub">Past dispatches &amp; commissioned stories</p>
    </header>
    <div class="chips" role="group" aria-label="Filter dispatches">${chips}</div>
    ${!showStories.length && !showComm.length ? archiveEmpty : ''}
    <div class="clip-grid ${!showStories.length && !showComm.length ? 'is-empty' : ''}">
      ${showStories.map(clip).join('')}
      ${commCards}
      <button class="clip add" data-action="commission" aria-label="Commission a story">${icons.plus}<span>Commission a story</span></button>
    </div>
    <p class="small center foot-note">${apiState === 'online' ? 'Reports and spending persist at the research API. Demo labels identify mock adapters. Your pending request key stays in this browser for safe retries.' : 'API unavailable. Samples are invented; cached dispatches remain labelled. Reconnect the API to commission.'}</p>
    ${label}
    <dialog id="commissionDlg" class="dlg" aria-labelledby="dlgTitle">
      <form method="dialog" id="commissionForm" novalidate>
        <div class="dlg-head"><h2 id="dlgTitle">Commission a story</h2><button type="button" class="icon-btn" data-action="close-dlg" aria-label="Close">${icons.close}</button></div>
        <label for="assignment">Assignment</label>
        <textarea id="assignment" name="assignment" rows="4" maxlength="600" placeholder="Describe the claim or topic to investigate" required></textarea>
        <label for="budget">Maximum budget (USD)</label>
        <input id="budget" name="budget" type="number" inputmode="decimal" min="0" max="10" step="0.01" value="0" required />
        <p class="form-hint">Use 0 for live public research. Paid supplements and wallet controls are simulations. Public edition: 3 commissions per hour per visitor, 60 per day in total.</p>
        <p class="form-err" id="formErr" role="alert" hidden></p>
        <p class="small">The API commissions a persisted assignment. Mock research is labelled demo data. No real money moves. Keep the same request when retrying.</p>
        <button type="submit" class="btn">Commission Joan</button>
        <p class="form-ok" id="formOk" role="status" hidden>Commission filed. Joan is on it.</p>
      </form>
    </dialog>
  `);
}

function about(): string {
  const steps = [
    ['I', 'Assign', 'An editor submits a claim or topic and a maximum budget.'],
    ['II', 'Investigate', 'Joan reads public documents and follows each claim back to where it started.'],
    ['III', 'Pay for research', 'Small purchases cover extra searches and verified human tips. Every one becomes a receipt line.'],
    ['IV', 'Publish', 'The dispatch lists what is known, what is unclear, the sources, a confidence rating and the spend.']
  ];
  return shell('about', `
    <header class="arch-head about-head">
      <p class="vol">THE PUBLISHER'S NOTE</p>
      <h1>ABOUT JOAN</h1>
      <p class="sub">An AI journalist with a budget and a paper trail</p>
    </header>
    <section class="about-wrap">
      <div class="about-lead">
        <p class="dropcap">Joan is an AI journalist that checks claims before they travel further. Given an assignment, it traces each statement to the original document, separates facts from repetition, and says plainly what remains unclear.</p>
        <p>Research costs money, so Joan pays for it in small amounts: extra searches, transcripts, and tips from verified people. The spending sits inside a cap set by the editor, and each payment appears as a receipt line at the end of the story.</p>
        <p>Finished dispatches are meant for readers, editors, and other AI agents that need a verified account instead of a summary of rumors.</p>
      </div>
      <ol class="steps">
        ${steps.map(([n, t, d]) => `<li><span class="num">${n}</span><h3>${t}</h3><p>${d}</p></li>`).join('')}
      </ol>
      <div class="notes">
        <div class="card"><h3>Every report carries</h3><p>Headline, summary, what we know, what remains unclear, sources, a confidence rating with its reason, and research spending.</p></div>
        <div class="card"><h3>Always labelled</h3><p>Each report ends with: AI-generated report. Prepared by Joan.</p></div>
        <div class="card"><h3>Research status</h3><p>Assignments, reports and simulated receipts persist at the API. Mock sources are fixtures, not fetched evidence. Live signing and payments remain locked.</p></div>
      </div>
      <p class="cta"><a class="btn" href="#/front" data-go>Read the front page</a></p>
    </section>
    ${label}
  `);
}

function nineties(): string {
  return shell('about', `
    <header class="arch-head about-head">
      <p class="vol">A SPECIAL FEATURE</p>
      <h1>JOAN, BACK IN THE 90s</h1>
      <p class="sub">An imagined newsroom, same standards</p>
    </header>
    <section class="n90">
      <figure class="figure n90-photo"><img class="art bw" src="/img/joan-90s.jpg" alt="Joan at a desk, imagined as a 1990s newsroom reporter" decoding="async" /><span class="photo-tag">Imagined, AI-generated</span></figure>
      <div class="n90-text">
        <p class="dropcap">Picture the same reporter in a newsroom of beige monitors, a fax machine and a pager. The tools change. The method does not: find the original document, separate what is known from what is repeated, and write down what it cost.</p>
        <p>In 1996 a claim like the water tariff story would have meant a trip to the records office, photocopies at ten cents a page and a long distance call to the board. Joan would still have kept the receipts, on carbon paper this time.</p>
        <p>This feature is an illustration. The photograph is generated and the scene is imagined. No dispatch from 1996 exists.</p>
        <p class="n90-cta"><a class="btn" href="#/front" data-go>Back to the front page</a></p>
      </div>
    </section>
    ${label}
  `);
}

function dashboard(): string {
  const s = permissions;
  const safe = deskWallet?.mode === 'mock';
  return shell('dashboard', `<header class="arch-head"><p class="vol">The business of reporting</p><h1>RESEARCH DESK</h1><p class="sub">A budget. A boundary. A paper trail.</p></header>
    <div class="desk-wrap"><div class="desk-status" role="status">${deskBusy ? 'Working at the research desk…' : esc(deskMessage || 'Connected to the persisted research API')} <button class="text-link" data-action="desk-refresh">Refresh ${icons.retry}</button></div>
    <div class="desk-grid"><section class="card wallet-card"><p class="kicker left"><span>Research allowance</span></p>${demoTag(deskWallet?.mode || 'mock')}<h2>${deskWallet?.balanceMicros == null ? 'Unknown' : money(deskWallet.balanceMicros / 1000000)}</h2><p>Available simulated USDC</p><p class="small">No wallet was created. No signature or real transaction is possible here.</p><div class="desk-seal">${icons.receipt}<span>Every cent<br>accounted for</span></div></section>
    <section class="card permission-card"><p class="kicker left"><span>Session permissions</span></p><span class="stamp ${s?.revoked ? 'revoked' : ''}">${s ? s.revoked ? 'Revoked' : 'Bounded' : 'Unavailable'}</span><dl class="permission-list"><div><dt>Session cap</dt><dd>${s ? money(s.capMicros / 1000000) : 'Unknown'}</dd></div><div><dt>Expires</dt><dd>${s ? esc(new Date(s.expiresAt).toLocaleString()) : 'Unknown'}</dd></div><div><dt>Contract allowlist</dt><dd>${s ? s.allowlist.map(esc).join('<br>') : 'Not verified'}</dd></div><div><dt>Execute spent</dt><dd>${s ? money(s.executeSpentMicros / 1000000) : 'Unknown'}</dd></div></dl><button class="btn danger" data-action="desk-revoke" ${!safe || !s || s.revoked || deskBusy ? 'disabled' : ''}>Revoke session</button><p class="small">Revocation is persisted in mock mode. Live signing is disabled.</p></section>
    <section class="card desk-demos"><p class="kicker left"><span>Three desk demonstrations</span></p><ol><li><b>I. Allowed buy</b><p>A $0.005 simulated supplement within a $0.05 assignment cap.</p><button class="btn" data-action="desk-allowed" ${!safe || s?.revoked || deskBusy ? 'disabled' : ''}>Run allowed buy</button></li><li><b>II. Blocked buy</b><p>Set a $0.001 mock session cap, then request the $0.005 quote. The mock SDK refuses client-side, not onchain.</p><button class="btn" data-action="desk-blocked" ${!safe || s?.revoked || deskBusy ? 'disabled' : ''}>Run blocked buy</button></li><li><b>III. Revoke</b><p>Revoke above, then check that a fresh assignment is refused. No real chain transaction is sent.</p><button class="btn" data-action="desk-after-revoke" ${!safe || !s?.revoked || deskBusy ? 'disabled' : ''}>Test revoked buy</button></li></ol><details><summary>SDK limit versus onchain policy</summary><p>The x402 spending cap is an SDK/client-side refusal, not chain-enforced. Joan also reserves funds in SQLite. The mock execute adapter separately models contract allowlist, cap and revocation checks. These simulations are not onchain reverts. A contract allowlist does not constrain transfer recipient arguments.</p></details><button class="text-link" data-action="desk-grant" ${!safe || !s || deskBusy ? 'disabled' : ''}>Grant a new $0.05 mock session ${icons.arrow}</button><p class="small">One-hour expiry. Reuses the displayed contract allowlist. Does not reset balance or historical spending.</p></section></div>
    <section class="desk-ledger"><header><p class="kicker left"><span>The spend ledger</span></p><p>Durable reservations &amp; simulated settlement receipts</p></header><div class="ledger-slips">${ledgerEntries.length ? ledgerEntries.map(r => `<article class="slip"><p class="slip-top">JOAN RESEARCH DESK ${demoTag('mock')}</p><span class="stamp">${esc(r.state)}</span><p class="slip-amt">${money(r.amountMicros / 1000000)}</p><p>${esc(r.query || 'Research supplement')}</p><p class="small">Assignment ${esc(r.assignmentId)}</p><code>${esc(r.receipt || 'No settlement receipt')}</code></article>`).join('') : '<div class="empty">No spending receipts. Run an allowed buy to start the paper trail.</div>'}</div></section></div>${label}`);
}
async function deskAction(action: string): Promise<void> {
  if (deskBusy) return;
  deskBusy = true; deskMessage = ''; render();
  try {
    if (action === 'desk-revoke') { await desk.revoke(); const state = await desk.wallet(); if (!state.session?.revoked) throw new Error('Revocation could not be verified'); deskMessage = 'Session revoked. Read back from the API.'; }
    else if (action === 'desk-grant' && permissions) { await desk.grant(permissions); const state = await desk.wallet(); if (state.session?.revoked || state.session?.capMicros !== 50000) throw new Error('Grant could not be verified'); deskMessage = 'New bounded mock session verified. Historical spending retained.'; }
    else if (action !== 'desk-refresh') {
      const storageKey = `joan.${action}.pending`;
      const key = localStorage.getItem(storageKey) || crypto.randomUUID(); localStorage.setItem(storageKey, key);
      try {
        if (action === 'desk-blocked' && permissions) { await desk.grant(permissions, 1000); const state = await desk.wallet(); if (state.session?.capMicros !== 1000) throw new Error('Blocked-demo cap was not verified'); }
        const report = await desk.buy(key, 0.05);
        const reports = await desk.reports(); if (!reports.some(r => r.id === report.id)) throw new Error('Report persistence could not be verified');
        deskMessage = 'Allowed: simulated supplement settled. Report and receipt read back from the API.';
        localStorage.removeItem(storageKey);
      } catch (e) { if (e instanceof DeskError && e.layer !== 'network') { localStorage.removeItem(storageKey); deskMessage = `Refused: ${e.message} (${e.layer}: ${e.code}). No purchase retry was sent.`; } else throw e; }
    }
    await syncDesk();
  } catch (e) { deskMessage = e instanceof Error ? e.message : 'Desk unavailable'; }
  finally { deskBusy = false; render(); }
}

/* ---------- routing ---------- */
type Route = { name: 'dashboard' } | { name: 'n90' } | { name: 'entrance' } | { name: 'front' } | { name: 'story'; id: string } | { name: 'archives' } | { name: 'about' };
function parse(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  if (!h) return { name: 'entrance' };
  const [a, b] = h.split('/');
  if (a === 'dashboard') return { name: 'dashboard' };
  if (a === 'story') return { name: 'story', id: b };
  if (a === 'archives') return { name: 'archives' };
  if (a === 'about') return { name: 'about' };
  if (a === '90s') return { name: 'n90' };
  return { name: 'front' };
}

function mountAnimate(cls: string) {
  if (reducedMotion()) return;
  const el = document.querySelector('.screen');
  el?.classList.add(cls);
}

let lastRoute = '';
let lastIndex = -1;

function stopWire(): void { if (wireTimer !== undefined) { window.clearInterval(wireTimer); wireTimer = undefined; } }
function startWire(): void {
  stopWire();
  if (reducedMotion() || wireItems.length < 2) return;
  wireTimer = window.setInterval(() => {
    const list = document.getElementById('wireList');
    if (!list) { stopWire(); return; }
    wireTick = (wireTick + 1) % wireItems.length;
    list.innerHTML = wireRows();
    list.classList.remove('shift'); void list.offsetWidth; list.classList.add('shift');
  }, 4200);
}

function render(): void {
  const r = parse();
  stopWire();
  refreshStories();
  let html = '';
  if (r.name === 'entrance') html = entrance();
  else if (r.name === 'front') html = front();
  else if (r.name === 'story') {
    const i = stories.findIndex((s) => s.id === r.id);
    activeIndex = i >= 0 ? i : 0;
    html = i >= 0 ? story() : shell('story', '<div class="empty"><h1>No dispatch found</h1><a class="btn" href="#/archives">Open archives</a></div>');
  } else if (r.name === 'archives') html = archives();
  else if (r.name === 'n90') html = nineties();
  else if (r.name === 'dashboard') html = dashboard();
  else html = about();
  app.innerHTML = html;
  document.body.classList.toggle('on-entrance', r.name === 'entrance');
  if (r.name !== 'entrance') mountAnimate(r.name === 'story' && lastRoute === 'story' && lastIndex !== activeIndex && !reducedMotion() ? (activeIndex > lastIndex ? 'turn-next' : 'turn-prev') : 'page-in');
  if (r.name === 'story') initTrack();
  if (r.name === 'front') startWire();
  lastRoute = r.name;
  lastIndex = r.name === 'story' ? activeIndex : -1;
  window.scrollTo(0, 0);
}

/* ---------- commissions: file, research through the adapter, publish ---------- */
const running = new Set<string>();
async function runResearch(id: string): Promise<void> {
  if (running.has(id)) return;
  const c = loadCommissions(localStorage).find((x) => x.id === id);
  if (!c) return;
  running.add(id);
  updateCommission(localStorage, id, { status: 'researching', error: undefined });
  try {
    const story = await research.run(c, todayIso());
    publishDispatch(localStorage, id, story);
    await syncDesk();
  } catch (e) {
    updateCommission(localStorage, id, { status: 'failed', error: e instanceof Error ? e.message : 'Joan could not finish this one.' });
  } finally {
    running.delete(id);
    refreshStories();
    if (parse().name === 'archives') render();
  }
}
function resumeCommissions(): void {
  for (const c of loadCommissions(localStorage)) if (c.status === 'researching') void runResearch(c.id);
}

function openReceipt(ref: string): void {
  const [sid, k] = ref.split(':');
  const st = stories.find((x) => x.id === sid);
  const r = st?.spending[Number(k)];
  const dlg = document.getElementById('receiptDlg') as HTMLDialogElement | null;
  if (!st || !r || !dlg) return;
  const url = wallet.txUrl(r.tx);
  dlg.innerHTML = `<div class="dlg-head"><h2 id="rcTitle">Receipt</h2><button type="button" class="icon-btn" data-action="close-receipt" aria-label="Close">${icons.close}</button></div>
    <div class="slip">
      <p class="slip-top">JOAN RESEARCH DESK ${demoTag(r.tx.startsWith('mock_') || st.origin === 'mock' || st.sample ? 'mock' : 'live')}</p>
      <dl>
        <div><dt>Item</dt><dd>${esc(r.item)}</dd></div>
        <div><dt>Dispatch</dt><dd>${esc(st.headline.length > 60 ? st.headline.slice(0, 57) + '...' : st.headline)}</dd></div>
        <div><dt>Amount</dt><dd class="slip-amt">${money(r.amount)}</dd></div>
        <div><dt>Reference</dt><dd>${esc(r.tx)}</dd></div>
      </dl>
      ${url ? `<a class="btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">View on explorer</a>` : '<p class="small">Demo slip. No transaction exists for this reference. Connect a wallet service to link real receipts.</p>'}
    </div>`;
  dlg.showModal();
}

/* ---------- story track (swipe) ---------- */
function initTrack(): void {
  const track = document.getElementById('track') as HTMLElement | null;
  if (!track) return;
  const go = () => {
    const w = track.clientWidth;
    if (w && track.scrollWidth > w + 4) track.scrollTo({ left: activeIndex * w, behavior: 'auto' });
  };
  requestAnimationFrame(go);
  // Manual page turns stay available; never shift an article under its reader.
  let t: number | undefined;
  track.addEventListener('scroll', () => {
    window.clearTimeout(t);
    t = window.setTimeout(() => {
      const w = track.clientWidth;
      if (!w || track.scrollWidth <= w + 4) return;
      const i = Math.round(track.scrollLeft / w);
      if (i !== activeIndex && stories[i]) {
        activeIndex = i;
        history.replaceState(null, '', `#/story/${stories[i].id}`);
        document.querySelectorAll('.dots i').forEach((d, k) => d.classList.toggle('on', k === i));
        document.querySelectorAll('.tabbar a[href^="#/story"], .topbar a[href^="#/story"]').forEach((a) => a.setAttribute('href', `#/story/${stories[i].id}`));
      }
    }, 90);
  }, { passive: true });
}

/* ---------- events ---------- */
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const rc = target.closest<HTMLElement>('[data-receipt]');
  if (rc) { openReceipt(rc.dataset.receipt || ''); return; }
  const rt = target.closest<HTMLElement>('[data-retry]');
  if (rt) { void runResearch(rt.dataset.retry || ''); render(); return; }
  const sec = target.closest<HTMLElement>('[data-section]');
  if (sec) { section = sec.dataset.section || 'All'; render(); return; }
  const fil = target.closest<HTMLElement>('[data-filter]');
  if (fil) { archiveFilter = fil.dataset.filter || 'All'; render(); return; }
  const hashBtn = target.closest<HTMLElement>('[data-go-hash]');
  if (hashBtn) { location.hash = hashBtn.dataset.goHash || '#/front'; return; }
  const act = target.closest<HTMLElement>('[data-action]');
  if (!act) return;
  if (act.dataset.action?.startsWith('desk-')) { void deskAction(act.dataset.action); return; }
  switch (act.dataset.action) {
    case 'open': openEdition(); break;
    case 'mute': {
      const m = toggleMute();
      document.querySelectorAll<HTMLElement>('[data-action="mute"]').forEach((b) => { b.innerHTML = `${m ? icons.muted : icons.speaker}${b.classList.contains('snd-btn') ? `<span>${m ? 'Sound off' : 'Typewriter and paper sounds'}</span>` : ''}`; b.setAttribute('aria-pressed', String(m)); });
      break;
    }
    case 'share': {
      const url = location.href;
      if (navigator.share) navigator.share({ title: 'Joan', url }).catch(() => undefined);
      else navigator.clipboard?.writeText(url).then(() => { act.classList.add('done'); setTimeout(() => act.classList.remove('done'), 1200); }).catch(() => undefined);
      break;
    }
    case 'commission': (document.getElementById('commissionDlg') as HTMLDialogElement | null)?.showModal(); break;
    case 'close-receipt': (document.getElementById('receiptDlg') as HTMLDialogElement | null)?.close(); break;
    case 'close-dlg': (document.getElementById('commissionDlg') as HTMLDialogElement | null)?.close(); break;
  }
});

document.addEventListener('submit', async (e) => {
  const form = e.target as HTMLFormElement;
  if (form.id !== 'commissionForm') return;
  e.preventDefault();
  if (form.dataset.filed) return;
  const text = (form.elements.namedItem('assignment') as HTMLTextAreaElement).value;
  const budget = (form.elements.namedItem('budget') as HTMLInputElement).value;
  const err = document.getElementById('formErr') as HTMLElement;
  const v = validateCommission(text, budget);
  if (!v.ok) { err.textContent = v.error || 'Check the form.'; err.hidden = false; return; }
  err.hidden = true;
  form.dataset.filed = 'true';
  const submit = form.querySelector('button[type=submit]') as HTMLButtonElement;
  submit.disabled = true;
  try {
    permissions = await desk.permissions();
    if (permissions.revoked) {
      // Constant markup only; no user or API content enters this link.
      err.innerHTML = 'Session revoked. Grant a new one on the <a href="#/dashboard">Desk</a>.';
      err.hidden = false;
      return;
    }
  } catch {
    err.textContent = 'Session unavailable. Reconnect the API and try again.';
    err.hidden = false;
    return;
  } finally {
    if (!err.hidden) { delete form.dataset.filed; submit.disabled = false; }
  }
  const c = addCommission(localStorage, v.text as string, v.budget as number, todayIso());
  void runResearch(c.id);
  (document.getElementById('formOk') as HTMLElement).hidden = false;
  setTimeout(() => { (document.getElementById('commissionDlg') as HTMLDialogElement | null)?.close(); archiveFilter = 'Commissions'; render(); }, reducedMotion() ? 500 : 800);
});

document.addEventListener('keydown', (e) => {
  const track = document.getElementById('track');
  if (!track || (e.target as HTMLElement).closest('input,textarea')) return;
  const w = track.clientWidth;
  if (e.key === 'ArrowRight' && stories[activeIndex + 1]) { location.hash = `#/story/${stories[activeIndex + 1].id}`; }
  if (e.key === 'ArrowLeft' && stories[activeIndex - 1]) { location.hash = `#/story/${stories[activeIndex - 1].id}`; }
  void w;
});

const TYPED = "Setting today's edition...";
function openEdition(): void {
  startIntro();
  const el = document.getElementById('entrance');
  const done = () => { location.hash = '#/front'; };
  if (!el || reducedMotion()) { done(); return; }
  if (el.classList.contains('leaving') || el.classList.contains('typing')) return;
  const line = document.getElementById('typed');
  const btn = el.querySelector<HTMLElement>('.open-btn');
  btn?.setAttribute('disabled', '');
  el.classList.add('typing');
  const total = 1300;
  playTypewriter(TYPED.length, total);
  if (line) {
    let n = 0;
    const tick = window.setInterval(() => { n += 1; line.textContent = TYPED.slice(0, n); if (n >= TYPED.length) window.clearInterval(tick); }, total / TYPED.length);
  }
  setTimeout(() => el.classList.add('leaving'), total + 250);
  setTimeout(done, total + 1050);
}

window.addEventListener('hashchange', render);
render();
resumeCommissions();
void syncDesk().then(async () => { if (apiState === 'offline') wireItems = await wire.load(); render(); });
