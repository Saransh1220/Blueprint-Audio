import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  effect,
  inject,
  input,
  NgZone,
  viewChild,
} from '@angular/core';
import type { Figure, HairlineOptions } from '@lucasmarkes/hairline';

/**
 * An empty wire basket under a bail handle, drawn in thin lines by Hairline (MIT, Lucas Marques).
 * The pointer tilts it toward itself, so the bare floor shows, and the handle swings after it.
 *
 * Hairline draws into a plain element, so this is a thin wrapper: it mounts the figure outside
 * Angular's zone, passes option changes on, and removes the figure when destroyed. It fills its
 * parent's width at a 5:4 ratio. Colours come from the `--hb-*` properties below, which default
 * to the app's cream-on-black; the page that uses it can map them to its own tokens.
 *
 *   --hb-plate  the colour the figure sits on (plates are filled, so it must match the page)
 *   --hb-hi     what is lit
 *   --hb-edge   silhouettes
 *   --hb-mid    every other stroke
 *   --hb-lo     what recedes
 */
@Component({
  selector: 'app-hairline-basket',
  template: '<div #host class="figure"></div>',
  styleUrl: './hairline-basket.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HairlineBasketComponent {
  /** The accessible name. */
  readonly label = input('An empty wire basket');
  /** How strongly it answers the pointer, 0 (subtle) to 1 (strong). */
  readonly intensity = input(0.5);
  /** Walks the figure through its motion on its own until the pointer arrives. */
  readonly play = input(false);

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private figure: Figure | null = null;
  private destroyed = false;

  constructor() {
    const zone = inject(NgZone);

    // The figure needs a DOM element with a width, so it is made once the view is on the page.
    // The library is loaded then too, as its own chunk, so the cart page does not weigh down the
    // first load of the app.
    afterNextRender(async () => {
      const { basket } = await import('@lucasmarkes/hairline');
      if (this.destroyed) return;
      this.figure = zone.runOutsideAngular(() => basket(this.host().nativeElement, this.options()));
    });

    effect(() => {
      const options = this.options();
      this.figure?.update(options);
    });

    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.figure?.destroy();
      this.figure = null;
    });
  }

  // The app is dark only, so the theme is fixed rather than guessed from the page.
  private options(): HairlineOptions {
    return {
      label: this.label(),
      intensity: this.intensity(),
      play: this.play(),
      theme: 'dark',
    };
  }
}
