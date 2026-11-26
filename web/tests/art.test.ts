import { describe, expect, it } from 'vitest';
import { editionArt, art } from '../src/art';
import { draftStory } from '../src/adapters/research';

describe('edition illustrations', () => {
  it('gives repeated incoming art distinct pictures without changing reports', () => {
    const reports = Array.from({ length: 8 }, (_, i) => ({ ...draftStory({ id: String(i), text: `claim ${i}`, budget: .05, createdAt: '2026-11-26' }, '2026-11-26'), art: 'press' }));
    const edition = editionArt(reports);
    expect(new Set(edition.map(s => s.art)).size).toBe(8);
    expect(edition.map(s => s.id)).toEqual(reports.map(s => s.id));
    expect(reports.every(s => s.art === 'press')).toBe(true);
    expect(edition.map(s => art(s.art)).every(s => s.includes('<img') || s.includes('<svg'))).toBe(true);
  });
});
