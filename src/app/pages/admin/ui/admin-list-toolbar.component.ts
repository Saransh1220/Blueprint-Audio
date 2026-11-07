import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, Subject } from 'rxjs';
import { AdminList } from '../admin-list';
import { formatNumber } from '../admin-format';

const SEARCH_DEBOUNCE_MS = 300;

/** Search box, result count and refresh for one {@link AdminList}. */
@Component({
  selector: 'app-admin-list-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <label class="search">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input
          type="text"
          autocomplete="off"
          [value]="list().draft()"
          [placeholder]="placeholder()"
          [attr.aria-label]="placeholder()"
          (input)="onInput($event)"
        />
        @if (list().draft()) {
          <button type="button" class="clear" aria-label="Clear search" (click)="clear()">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        }
      </label>
      <span class="count">{{ count() }} {{ noun() }}</span>
      <button type="button" class="refresh" [disabled]="list().loading()" (click)="list().load()">
        <i class="fa-solid fa-rotate" [class.spin]="list().loading()" aria-hidden="true"></i>
        Refresh
      </button>
    </div>
  `,
  styles: `
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--line);
    }

    .search {
      position: relative;
      flex: 1 1 240px;
      max-width: 380px;
      color: var(--text-muted);
    }

    .search > i {
      position: absolute;
      top: 50%;
      left: 12px;
      transform: translateY(-50%);
      font-size: 13px;
      pointer-events: none;
    }

    .search input {
      width: 100%;
      height: 34px;
      padding: 0 34px 0 34px;
      border: 1px solid var(--line-strong);
      border-radius: 8px;
      background: var(--canvas);
      color: var(--text);
      font: inherit;
      font-size: 14px;
    }

    .search input::placeholder {
      color: var(--text-muted);
    }

    .search input:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
      outline-offset: 0;
      border-color: var(--accent);
    }

    .clear {
      position: absolute;
      top: 50%;
      right: 6px;
      transform: translateY(-50%);
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
      padding: 0;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--text-muted);
      font-size: 12px;
      cursor: pointer;
    }

    .clear:hover {
      background: var(--surface-3);
      color: var(--text);
    }

    .count {
      margin-left: auto;
      font-size: 13px;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }

    .refresh {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 34px;
      padding: 0 12px;
      border: 1px solid var(--line-strong);
      border-radius: 8px;
      background: transparent;
      color: var(--text-2);
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition:
        background 0.15s ease,
        color 0.15s ease;
    }

    .refresh:hover:not(:disabled) {
      background: var(--surface-3);
      color: var(--text);
    }

    .refresh:disabled {
      opacity: 0.6;
      cursor: progress;
    }

    .refresh:focus-visible,
    .clear:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: no-preference) {
      .spin {
        animation: spin 0.9s linear infinite;
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 900px) {
      .count {
        margin-left: 0;
      }
    }
  `,
})
export class AdminListToolbarComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly typed = new Subject<string>();

  readonly list = input.required<AdminList<unknown>>();
  readonly placeholder = input('Search');
  /** What the list holds, for the count ("users", "orders", ...). */
  readonly noun = input.required<string>();

  ngOnInit() {
    this.typed
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe((text) => this.list().setSearch(text));
  }

  protected count(): string {
    return formatNumber(this.list().total());
  }

  protected onInput(event: Event) {
    const text = (event.target as HTMLInputElement).value;
    this.list().draft.set(text);
    this.typed.next(text);
  }

  protected clear() {
    this.list().draft.set('');
    this.list().setSearch('');
  }
}
