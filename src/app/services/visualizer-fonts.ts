export type VisualizerFontCategory = 'Display' | 'Serif' | 'Script' | 'Tech' | 'Retro';

export interface VisualizerFont {
  family: string;
  category: VisualizerFontCategory;
  weights: number[];
  italic: boolean;
  /** Everything after `family=` in the Google Fonts css2 URL. */
  spec: string;
}

const font = (
  family: string,
  category: VisualizerFontCategory,
  weights: number[] = [400],
  italic = false,
  axes = '',
): VisualizerFont => ({
  family,
  category,
  weights,
  italic,
  spec: family.replace(/ /g, '+') + axes,
});

export const VISUALIZER_FONTS: VisualizerFont[] = [
  font('Bebas Neue', 'Display'),
  font('Anton', 'Display'),
  font('Archivo Black', 'Display'),
  font('Abril Fatface', 'Display'),
  font('Bungee', 'Display'),
  font('Unbounded', 'Display', [400, 700, 900], false, ':wght@400;700;900'),
  font('Syne', 'Display', [400, 700, 800], false, ':wght@400;700;800'),
  font('Space Grotesk', 'Display', [400, 700], false, ':wght@400;700'),
  font('Righteous', 'Display'),
  font('Playfair Display', 'Serif', [400, 700, 900], true, ':ital,wght@0,400;0,700;0,900;1,400;1,700'),
  font('DM Serif Display', 'Serif', [400], true, ':ital@0;1'),
  font('Cormorant Garamond', 'Serif', [400, 700], true, ':ital,wght@0,400;0,700;1,400;1,700'),
  font('Bodoni Moda', 'Serif', [400, 700], true, ':ital,wght@0,400;0,700;1,400;1,700'),
  font('Yeseva One', 'Serif'),
  font('Italiana', 'Serif'),
  font('Pacifico', 'Script'),
  font('Lobster', 'Script'),
  font('Shrikhand', 'Script'),
  font('Sacramento', 'Script'),
  font('Caveat', 'Script', [400, 700], false, ':wght@400;700'),
  font('Permanent Marker', 'Script'),
  font('Orbitron', 'Tech', [400, 700, 900], false, ':wght@400;700;900'),
  font('Audiowide', 'Tech'),
  font('Syncopate', 'Tech', [400, 700], false, ':wght@400;700'),
  font('Michroma', 'Tech'),
  font('Major Mono Display', 'Tech'),
  font('Monoton', 'Retro'),
  font('Fascinate', 'Retro'),
  font('Rubik Mono One', 'Retro'),
  font('Rubik Glitch', 'Retro'),
  font('Press Start 2P', 'Retro'),
  font('Special Elite', 'Retro'),
];

export const DEFAULT_VISUALIZER_FONT = 'Bebas Neue';

export function findVisualizerFont(family: string): VisualizerFont | undefined {
  return VISUALIZER_FONTS.find((entry) => entry.family === family);
}

export function nearestFontWeight(font: VisualizerFont | undefined, weight: number): number {
  if (!font) return weight;
  return font.weights.reduce((best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best));
}

const requested = new Set<string>();

/** Injects the Google Fonts stylesheet for one family (once) and resolves when it is usable. */
export function loadVisualizerFont(family: string, weight = 400, italic = false): Promise<void> {
  const entry = findVisualizerFont(family);
  if (!entry || typeof document === 'undefined') return Promise.resolve();
  if (!requested.has(family)) {
    requested.add(family);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${entry.spec}&display=swap`;
    document.head.appendChild(link);
  }
  const fonts = document.fonts;
  if (!fonts?.load) return Promise.resolve();
  const descriptor = `${italic && entry.italic ? 'italic ' : ''}${weight} 32px "${family}"`;
  // The stylesheet may still be in flight; retry briefly until the face is registered.
  const attempt = (tries: number): Promise<void> =>
    fonts
      .load(descriptor)
      .then((faces) => {
        if (faces.length === 0 && tries > 0) {
          return new Promise<void>((resolve) => setTimeout(resolve, 150)).then(() =>
            attempt(tries - 1),
          );
        }
        return undefined;
      })
      .catch(() => undefined);
  return attempt(12);
}
