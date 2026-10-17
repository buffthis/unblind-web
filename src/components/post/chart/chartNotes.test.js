import { describe, expect, it } from 'vitest';

import { noteText, placeNotes } from './chartNotes';

describe('placeNotes', () => {
  it('keeps a lone note level with its point and turns it left near the right edge', () => {
    expect(placeNotes([{ x: 50, y: 40 }])).toEqual([
      { x: 50, y: 40, labelY: 40, flip: false },
    ]);
    expect(placeNotes([{ x: 90, y: 40 }])[0].flip).toBe(true);
  });

  it('pushes a note down when it would sit on the label above it', () => {
    const [upper, lower] = placeNotes([
      { x: 50, y: 40 },
      { x: 50, y: 43 },
    ]);
    expect(upper.labelY).toBe(40);
    expect(lower.labelY).toBe(49);
    expect(lower.y).toBe(43);
  });

  it('stacks a chain of notes one gap apart', () => {
    const placed = placeNotes([
      { x: 50, y: 30 },
      { x: 50, y: 32 },
      { x: 50, y: 34 },
    ]);
    expect(placed.map((note) => note.labelY)).toEqual([30, 39, 48]);
  });

  it('leaves notes far apart across the plot where they are', () => {
    const placed = placeNotes([
      { x: 10, y: 40 },
      { x: 60, y: 40 },
    ]);
    expect(placed.map((note) => note.labelY)).toEqual([40, 40]);
  });

  it('answers in the order the notes were given, whichever sits higher', () => {
    const placed = placeNotes([
      { x: 50, y: 60 },
      { x: 50, y: 58 },
    ]);
    expect(placed[0].labelY).toBe(67);
    expect(placed[1].labelY).toBe(58);
  });

  it('never moves a label below the plot', () => {
    const placed = placeNotes([
      { x: 50, y: 90 },
      { x: 50, y: 92 },
      { x: 50, y: 94 },
    ]);
    expect(Math.max(...placed.map((note) => note.labelY))).toBeLessThanOrEqual(
      96
    );
  });
});

describe('noteText', () => {
  const chart = {
    unit: 'm',
    series: [{ values: [0, 835] }],
  };

  it('fills {value} with the value of the point, with its unit', () => {
    expect(
      noteText({ index: 1, seriesIndex: 0, text: 'B 도착 · {value}' }, chart)
    ).toBe('B 도착 · 835m');
  });

  it('leaves a text without {value} as written', () => {
    expect(
      noteText({ index: 1, seriesIndex: 0, text: '아직 375m' }, chart)
    ).toBe('아직 375m');
  });
});
