import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AdminList } from '../admin-list';

/** What to show instead of rows: loading skeleton, failure with retry, or an empty message. */
@Component({
  selector: 'app-admin-list-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (list().failed()) {
      <div class="state" role="alert">
        <span class="mark bad"
          ><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i
        ></span>
        <p>Could not load {{ noun() }}.</p>
        <button type="button" (click)="list().load()">Try again</button>
      </div>
    } @else if (list().isEmpty()) {
      <div class="state">
        @if (list().search()) {
          <span class="mark"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></span>
          <p>No {{ noun() }} match “{{ list().search() }}”.</p>
          <button type="button" (click)="clearSearch()">Clear search</button>
        } @else {
          <span class="mark"><i class="fa-regular fa-folder-open" aria-hidden="true"></i></span>
          <p>No {{ noun() }} yet.</p>
        }
      </div>
    } @else if (!list().loaded()) {
      <div class="skeleton" aria-busy="true" aria-label="Loading">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
    }
  `,
  styles: `
    .state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 44px 16px;
      text-align: center;
    }

    .mark {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: var(--surface-3);
      color: var(--text-muted);
      font-size: 16px;
    }

    .mark.bad {
      background: color-mix(in srgb, var(--bad) 14%, transparent);
      color: var(--bad);
    }

    p {
      margin: 0;
      font-size: 14px;
      color: var(--text-2);
    }

    button {
      height: 32px;
      padding: 0 12px;
      border: 1px solid var(--line-strong);
      border-radius: 8px;
      background: transparent;
      color: var(--text-2);
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }

    button:hover {
      background: var(--surface-3);
      color: var(--text);
    }

    button:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
      outline-offset: 2px;
    }

    .skeleton {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 16px;
    }

    .skeleton span {
      height: 40px;
      border-radius: 8px;
      background: color-mix(in srgb, var(--text) 5%, transparent);
    }

    @media (prefers-reduced-motion: no-preference) {
      .skeleton span {
        animation: pulse 1.4s ease-in-out infinite;
      }
    }

    @keyframes pulse {
      50% {
        opacity: 0.5;
      }
    }
  `,
})
export class AdminListStateComponent {
  readonly list = input.required<AdminList<unknown>>();
  readonly noun = input.required<string>();

  protected clearSearch() {
    this.list().draft.set('');
    this.list().setSearch('');
  }
}
