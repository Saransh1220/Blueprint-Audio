import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Dark glass popover that follows the pointer. Coordinates are relative to the positioned
 * wrapper it sits in (`x`, `y`) and `width` is that wrapper's width, so it can sit above the
 * pointer and be kept inside the chart instead of running off the edge.
 */
@Component({
  selector: 'app-bento-tooltip',
  template: `<ng-content />`,
  styles: `
    :host {
      position: absolute;
      z-index: 20;
      min-width: 120px;
      padding: 9px 12px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 14px;
      background: rgba(12, 12, 14, 0.94);
      color: #fff;
      font: 400 12px var(--bento-font, system-ui);
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.left.px]': 'left()',
    '[style.top.px]': 'top()',
    '[style.transform]': 'transform()',
    role: 'tooltip',
  },
})
export class BentoTooltipComponent {
  readonly x = input(0);
  readonly y = input(0);
  /** Width of the wrapper (0 = do not clamp). */
  readonly width = input(0);

  private static readonly HALF = 90;
  private static readonly ABOVE = 72;

  protected readonly left = computed(() => {
    const w = this.width();
    if (!w) return this.x();
    const half = BentoTooltipComponent.HALF;
    return Math.min(Math.max(this.x(), half), Math.max(half, w - half));
  });

  /** Tooltip sits above the pointer; near the top edge it flips below. */
  protected readonly flip = computed(() => this.y() < BentoTooltipComponent.ABOVE);
  protected readonly top = computed(() => this.y());
  protected readonly transform = computed(() =>
    this.flip() ? 'translate(-50%, 18px)' : 'translate(-50%, calc(-100% - 14px))',
  );
}
