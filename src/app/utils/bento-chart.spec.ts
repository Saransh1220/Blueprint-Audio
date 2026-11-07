import {
  areaPath,
  bandPath,
  bucketSum,
  formatPercent,
  linePoints,
  peakIndex,
  percentChange,
  smoothPath,
  streamLayers,
  tickOwners,
  weekdayTotals,
} from './bento-chart';

describe('bento-chart', () => {
  it('builds smooth paths', () => {
    expect(smoothPath([])).toBe('');
    expect(smoothPath([{ x: 1, y: 2 }])).toBe('M 1 2');
    const d = smoothPath([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ]);
    expect(d.startsWith('M 0 0 C')).toBe(true);
    expect(d.match(/C/g)?.length).toBe(2);
  });

  it('builds bands and areas', () => {
    const top = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    const bottom = [
      { x: 0, y: 5 },
      { x: 10, y: 5 },
    ];
    expect(bandPath(top, bottom).endsWith('Z')).toBe(true);
    expect(bandPath([], [])).toBe('');
    expect(bandPath(top, [])).toBe('');
    expect(areaPath(top, 20)).toContain('L 10 20 L 0 20 Z');
    expect(areaPath([], 20)).toBe('');
  });

  it('maps values to points', () => {
    const pts = linePoints([0, 5, 10], 100, 50);
    expect(pts[0]).toEqual({ x: 0, y: 50 });
    expect(pts[2]).toEqual({ x: 100, y: 0 });
    expect(linePoints([4], 100, 50)[0].x).toBe(50);
    expect(linePoints([0, 0], 10, 10, { pad: 2 })[0].y).toBe(10);
    expect(linePoints([2, 4], 10, 10, { max: 8 })[1].y).toBe(5);
  });

  it('stacks symmetrically around the centre line', () => {
    expect(streamLayers([], 100, 100)).toEqual([]);
    expect(streamLayers([[]], 100, 100)).toEqual([]);
    const layers = streamLayers(
      [
        [2, 2],
        [2, 0],
      ],
      100,
      100,
    );
    expect(layers).toHaveLength(2);
    expect(layers[0].top[0].y).toBe(0);
    expect(layers[1].bottom[0].y).toBe(100);
    expect(layers[0].top[1].y).toBe(25);
    expect(layers[0].bottom[1].y).toBe(75);
    expect(streamLayers([[1]], 100, 10, 5)[0].top[0].x).toBe(50);
    expect(streamLayers([[-1, 0]], 100, 10)[0].top).toHaveLength(2);
  });

  it('totals values per weekday, Monday first', () => {
    // 2026-11-02 is a Monday, 2026-11-08 a Sunday
    const totals = weekdayTotals([
      { date: '2026-11-02', count: 3 },
      { date: '2026-11-09', count: 2 },
      { date: '2026-11-08', count: 4 },
      { date: 'nope', count: 9 },
    ]);
    expect(totals).toEqual([5, 0, 0, 0, 0, 0, 4]);
    expect(weekdayTotals(undefined)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('finds the peak', () => {
    expect(peakIndex([1, 5, 2])).toBe(1);
    expect(peakIndex([0, 0])).toBe(-1);
  });

  it('computes and formats change', () => {
    expect(percentChange(5, 0)).toBeNull();
    expect(percentChange(150, 100)).toBe(50);
    expect(formatPercent(null)).toBe('');
    expect(formatPercent(12.34)).toBe('+12.3%');
    expect(formatPercent(-5)).toBe('−5.0%');
  });

  it('assigns ticks to shares', () => {
    expect(tickOwners([0, 0], 10)).toEqual([]);
    expect(tickOwners([75, 25], 8)).toEqual([0, 0, 0, 0, 0, 0, 1, 1]);
  });

  it('buckets long series', () => {
    expect(bucketSum([1, 2], 5)).toEqual([1, 2]);
    expect(bucketSum([1, 1, 1, 1, 1], 2)).toEqual([3, 2]);
  });
});
