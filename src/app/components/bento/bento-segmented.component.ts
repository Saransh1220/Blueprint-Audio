import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface BentoOption<T extends string | number = string | number> {
  value: T;
  label: string;
}

/** Segmented control made of real buttons (`aria-pressed`) for period and currency choices. */
@Component({
  selector: 'app-bento-segmented',
  template: `
    <div class="seg" role="group" [attr.aria-label]="label()">
      @for (option of options(); track option.value) {
        <button
          type="button"
          [class.on]="option.value === value()"
          [attr.aria-pressed]="option.value === value()"
          (click)="select(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  styles: `
    .seg {
      display: inline-flex;
      gap: 2px;
      padding: 3px;
      border: 1px solid var(--bento-glass-line, rgba(255, 255, 255, 0.12));
      border-radius: 999px;
      background: var(--bento-glass, rgba(255, 255, 255, 0.06));
    }
    button {
      min-width: 38px;
      padding: 6px 12px;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: var(--bento-muted, rgba(255, 255, 255, 0.58));
      font: 500 12px var(--bento-mono, monospace);
      letter-spacing: 0.04em;
      cursor: pointer;
      transition:
        background 0.18s,
        color 0.18s;
    }
    button:hover {
      color: var(--bento-text, #fff);
    }
    button.on {
      background: var(--bento-text, #fff);
      color: #000;
    }
    button:focus-visible {
      outline: 2px solid var(--bento-accent, #e8ff1f);
      outline-offset: 2px;
    }
    @media (prefers-reduced-motion: reduce) {
      button {
        transition: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BentoSegmentedComponent {
  readonly options = input.required<BentoOption[]>();
  readonly value = input<string | number>('');
  readonly label = input('Options');
  /** Emit even when the active option is clicked again (used for sort-direction toggles). */
  readonly emitSame = input(false);
  readonly selected = output<string | number>();

  select(value: string | number) {
    if (this.emitSame() || value !== this.value()) this.selected.emit(value);
  }
}
