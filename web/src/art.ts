import type { Story } from './types';
// Existing generated sepia photos plus original SVG scenes. No hotlinks.
let uid = 0;

const defs = (id: string) => `
<defs>
  <linearGradient id="sky${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8a6a45"/><stop offset=".55" stop-color="#d1b184"/><stop offset="1" stop-color="#e8d3a8"/>
  </linearGradient>
  <radialGradient id="sun${id}" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#fff1cf" stop-opacity=".95"/><stop offset="1" stop-color="#fff1cf" stop-opacity="0"/>
  </radialGradient>
  <filter id="grain${id}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/>
    <feColorMatrix values="0 0 0 0 .25  0 0 0 0 .16  0 0 0 0 .08  0 0 0 .22 0"/>
  </filter>
  <radialGradient id="vig${id}" cx=".5" cy=".5" r=".75">
    <stop offset=".55" stop-color="#2b1a0c" stop-opacity="0"/><stop offset="1" stop-color="#2b1a0c" stop-opacity=".55"/>
  </radialGradient>
</defs>`;

const finish = (id: string) => `
<rect width="400" height="300" filter="url(#grain${id})"/>
<rect width="400" height="300" fill="url(#vig${id})"/>`;

function waterworks(id: string) {
  return `${defs(id)}
<rect width="400" height="300" fill="url(#sky${id})"/>
<circle cx="290" cy="95" r="90" fill="url(#sun${id})"/>
<g fill="#4a3320" opacity=".55"><rect x="20" y="150" width="60" height="150"/><rect x="95" y="120" width="40" height="180"/><rect x="330" y="140" width="50" height="160"/></g>
<g fill="#3a2716">
  <rect x="150" y="110" width="22" height="190"/>
  <path d="M138 110h46l-6-26h-34z"/>
  <rect x="146" y="84" width="30" height="6"/>
  <path d="M0 238c60-14 120 12 200 0s140-14 200 0v62H0z" opacity=".9"/>
</g>
<g stroke="#2b1a0c" stroke-width="2" fill="none" opacity=".8">
  <path d="M172 150h150M172 170h150"/><path d="M322 150v90M322 170v70"/>
</g>
<g fill="#f2e2bd" opacity=".35"><path d="M0 262c50-6 100 6 160 0s120-6 240 2v10H0z"/></g>
${finish(id)}`;
}

function workshop(id: string) {
  return `${defs(id)}
<rect width="400" height="300" fill="url(#sky${id})"/>
<rect y="190" width="400" height="110" fill="#3c2815"/>
<rect y="186" width="400" height="8" fill="#5a3f22"/>
<circle cx="90" cy="70" r="80" fill="url(#sun${id})"/>
<g fill="#2b1a0c">
  <rect x="60" y="130" width="110" height="60" rx="8"/>
  <rect x="76" y="118" width="20" height="14" rx="2"/><rect x="134" y="118" width="20" height="14" rx="2"/>
  <rect x="210" y="150" width="130" height="40" rx="6"/>
  <rect x="226" y="140" width="26" height="12" rx="2"/>
</g>
<g fill="#d7b98a" opacity=".7"><rect x="70" y="142" width="40" height="6" rx="3"/><rect x="220" y="160" width="60" height="5" rx="2"/></g>
<g stroke="#1e1209" stroke-width="3" fill="none"><path d="M170 160c20 0 20 12 40 12"/><path d="M340 170c20 0 30 20 40 40"/></g>
<g fill="#6b4a28" opacity=".6"><rect x="20" y="40" width="360" height="4"/><rect x="20" y="56" width="360" height="2"/></g>
${finish(id)}`;
}

function press(id: string) {
  return `${defs(id)}
<rect width="400" height="300" fill="url(#sky${id})"/>
<circle cx="320" cy="60" r="90" fill="url(#sun${id})"/>
<g fill="#2f1f10">
  <rect x="40" y="120" width="320" height="30" rx="4"/>
  <rect x="70" y="150" width="14" height="110"/><rect x="316" y="150" width="14" height="110"/>
  <rect x="110" y="84" width="180" height="40" rx="4"/>
</g>
<g fill="#e9d6ad" opacity=".8">
  <rect x="124" y="94" width="152" height="6"/><rect x="124" y="106" width="110" height="4"/>
  <path d="M60 126h280v6H60z"/>
</g>
<g stroke="#1e1209" stroke-width="2" opacity=".7"><path d="M150 40v44M200 30v54M250 40v44"/></g>
<rect y="262" width="400" height="38" fill="#3c2815"/>
${finish(id)}`;
}

const scenes: Record<string, (id: string) => string> = { waterworks, workshop, press };

const PHOTOS = ['waterworks', 'workshop', 'press', 'street', 'typewriter', 'joan'];
// Editorial picture selection is presentation only: never mutate persisted reports.
// Existing photo generation needs a credential; the extended pool reuses our offline SVG etchings.
const EDITION_ART = ['street', 'waterworks', 'workshop', 'press', 'typewriter', 'etch-waterworks', 'etch-workshop', 'etch-press'];
export function editionArt(reports: Story[]): Story[] {
  const used = new Set<string>();
  return reports.map((s, i) => {
    const key = EDITION_ART.includes(s.art) && !used.has(s.art) ? s.art : EDITION_ART.find(k => !used.has(k)) || `etch-press-${i}`;
    used.add(key);
    return { ...s, art: key };
  });
}
export function art(key: string, label = 'Archive photograph'): string {
  if (key.startsWith('etch-')) {
    const id = `edition${uid++}`;
    const scene = scenes[key.split('-')[1]] || press;
    return `<svg class="art" viewBox="0 0 400 300" role="img" aria-label="Sepia newsroom illustration">${scene(id)}</svg>`;
  }
  const k = PHOTOS.includes(key) ? key : 'street';
  return `<img class="art" src="/img/${k}.webp" alt="${label}" loading="lazy" decoding="async" />`;
}

export function sealArt(): string {
  return `<svg viewBox="0 0 320 400" class="seal-paper" role="img" aria-label="A folded, sealed newspaper">
  <defs>
    <linearGradient id="pp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3ead7"/><stop offset="1" stop-color="#dcc9a2"/></linearGradient>
    <radialGradient id="wax" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#b8472a"/><stop offset="1" stop-color="#6e1f12"/></radialGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#000" flood-opacity=".7"/></filter>
  </defs>
  <g filter="url(#sh)">
    <path d="M40 30l240-8 12 350-250 14z" fill="url(#pp)"/>
    <path d="M40 30l240-8" stroke="#a88f64" stroke-width="1"/>
  </g>
  <path d="M160 26l4 353" stroke="#b79d70" stroke-width="1.2" opacity=".7"/>
  <path d="M42 205l243-6" stroke="#b79d70" stroke-width="1.2" opacity=".7"/>
  <g fill="#3b2614" font-family="'Playfair Display',Georgia,'Times New Roman',serif" text-anchor="middle">
    <text x="165" y="86" font-size="38" font-weight="700" letter-spacing="6">JOAN</text>
    <text x="165" y="108" font-size="10" letter-spacing="3">AN AI JOURNALIST</text>
  </g>
  <path d="M70 120h192M70 124h192" stroke="#3b2614" stroke-width="1"/>
  <g stroke="#8a7350" stroke-width="3" opacity=".6"><path d="M70 150h192M70 162h160M70 174h176M70 232h192M70 244h150M70 256h180M70 268h170"/></g>
  <circle cx="168" cy="205" r="30" fill="url(#wax)"/>
  <circle cx="168" cy="205" r="22" fill="none" stroke="#e7b9a6" stroke-width="1.2" opacity=".6"/>
  <text x="168" y="214" text-anchor="middle" font-family="'Playfair Display',Georgia,serif" font-size="26" font-weight="700" fill="#e9c5b4" opacity=".85">J</text>
</svg>`;
}
