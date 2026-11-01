import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { StatusView, Tone } from '../admin-format';

const ICONS: Record<Tone, string> = {
  ok: 'fa-circle-check',
  warn: 'fa-clock',
  bad: 'fa-circle-xmark',
  muted: 'fa-circle-minus',
};

/** A status with a tinted background, a thin border and an icon, so it never relies on colour alone. */
@Component({
  selector: 'app-admin-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [attr.data-tone]="status().tone"
    ><i class="fa-solid" [class]="icon()" aria-hidden="true"></i>{{ status().text }}</span
  >`,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 8px 2px 7px;
      border: 1px solid var(--line);
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      line-height: 18px;
      white-space: nowrap;
      color: var(--text-muted);
    }

    .badge i {
      font-size: 11px;
    }

    .badge[data-tone='ok'] {
      border-color: color-mix(in srgb, var(--ok) 30%, transparent);
      background: color-mix(in srgb, var(--ok) 12%, transparent);
      color: var(--ok);
    }

    .badge[data-tone='warn'] {
      border-color: color-mix(in srgb, var(--warn) 30%, transparent);
      background: color-mix(in srgb, var(--warn) 12%, transparent);
      color: var(--warn);
    }

    .badge[data-tone='bad'] {
      border-color: color-mix(in srgb, var(--bad) 30%, transparent);
      background: color-mix(in srgb, var(--bad) 12%, transparent);
      color: var(--bad);
    }
  `,
})
export class AdminBadgeComponent {
  readonly status = input.required<StatusView>();
  protected readonly icon = computed(() => `fa-solid ${ICONS[this.status().tone]}`);
}
