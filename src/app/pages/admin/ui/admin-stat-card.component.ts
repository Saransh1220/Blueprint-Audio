import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type StatTint = 'indigo' | 'violet' | 'teal' | 'green' | 'amber';

/** One headline number: a muted title with an icon, a large value, and an optional note. */
@Component({
  selector: 'app-admin-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="stat">
      <header>
        <span class="stat-label">{{ label() }}</span>
        <span class="tile" [attr.data-tint]="tint()"
          ><i [class]="'fa-solid ' + icon()" aria-hidden="true"></i
        ></span>
      </header>
      <strong class="stat-value">{{ value() }}</strong>
      @if (note()) {
        <span class="stat-note">{{ note() }}</span>
      }
    </article>
  `,
  styles: `
    .stat {
      display: flex;
      flex-direction: column;
      gap: 10px;
      height: 100%;
      padding: 16px 18px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--surface);
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .stat-label {
      font-size: 13px;
      color: var(--text-muted);
    }

    .tile {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      font-size: 13px;
      color: var(--tint);
      background: color-mix(in srgb, var(--tint) 14%, transparent);
    }

    .tile[data-tint='indigo'] {
      --tint: var(--accent);
    }

    .tile[data-tint='violet'] {
      --tint: #b08cff;
    }

    .tile[data-tint='teal'] {
      --tint: #36cfc9;
    }

    .tile[data-tint='green'] {
      --tint: var(--ok);
    }

    .tile[data-tint='amber'] {
      --tint: var(--warn);
    }

    .stat-value {
      font-size: 28px;
      font-weight: 600;
      line-height: 1.1;
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
      color: var(--text);
    }

    .stat-note {
      font-size: 12px;
      color: var(--text-muted);
    }
  `,
})
export class AdminStatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  /** Font Awesome icon class, for example `fa-users`. */
  readonly icon = input.required<string>();
  readonly tint = input<StatTint>('indigo');
  readonly note = input<string>('');
}
