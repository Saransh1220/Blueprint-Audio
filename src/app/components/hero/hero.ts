import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { isFeatureAvailable } from '../../core/config/feature-availability';

import { HalftoneNebulaComponent, type NebulaParams } from '../halftone-nebula/halftone-nebula';

interface SearchScope {
  id: string;
  label: string;
  icon: string;
  route: string;
  placeholder: string;
}

// Hard-coded for now; each scope sends the search to the page that lists it.
const SCOPES: SearchScope[] = [
  {
    id: 'beats',
    label: 'Beats',
    icon: 'fa-music',
    route: '/explore',
    placeholder: 'Search beats or producers…',
  },
  {
    id: 'sample-packs',
    label: 'Sample packs',
    icon: 'fa-box-open',
    route: '/sample-packs',
    placeholder: 'Search packs or producers…',
  },
  {
    id: 'loops',
    label: 'Loops',
    icon: 'fa-repeat',
    route: '/loops',
    placeholder: 'Search loops or producers…',
  },
].filter((scope) => isFeatureAvailable(scope.route));

@Component({
  selector: 'app-hero',
  imports: [HalftoneNebulaComponent],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block', '(document:click)': 'onDocumentClick($event)' },
})
export class HeroComponent {
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The planet sits bottom right, out from behind the centred headline. */
  readonly sky: Partial<NebulaParams> = { planetX: 0.78, planetY: 0.2 };

  readonly scopes = SCOPES;
  readonly query = signal('');
  readonly selected = signal(0);
  readonly open = signal(false);
  /** The option the keyboard is on while the menu is open (aria-activedescendant). */
  readonly active = signal(0);
  /** Opens upward when there is not room below the bar inside the hero. */
  readonly openUp = signal(false);

  readonly scope = computed(() => SCOPES[this.selected()]);

  onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  clear(): void {
    this.query.set('');
    this.host.nativeElement.querySelector<HTMLInputElement>('.search-input')?.focus();
  }

  /** Phone scope bar: switch scope without stealing focus from wherever the user is. */
  pick(index: number): void {
    this.selected.set(index);
  }

  onSegmentKeydown(event: KeyboardEvent): void {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (this.selected() + step + SCOPES.length) % SCOPES.length;
    this.selected.set(next);
    this.host.nativeElement.querySelectorAll<HTMLElement>('.segment')[next]?.focus();
  }

  toggle(): void {
    if (this.open()) this.close();
    else this.show();
  }

  select(index: number): void {
    this.selected.set(index);
    this.close();
    this.host.nativeElement.querySelector<HTMLInputElement>('.search-input')?.focus();
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    const last = SCOPES.length - 1;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!this.open()) {
          this.show();
          return;
        }
        const step = event.key === 'ArrowDown' ? 1 : -1;
        this.active.update((i) => Math.min(last, Math.max(0, i + step)));
        break;
      }
      case 'Home':
      case 'End':
        if (this.open()) {
          event.preventDefault();
          this.active.set(event.key === 'Home' ? 0 : last);
        }
        break;
      case 'Enter':
      case ' ':
        if (this.open()) {
          event.preventDefault();
          this.select(this.active());
        }
        break;
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          this.close();
        }
        break;
      case 'Tab':
        this.close();
        break;
    }
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    const picker = this.host.nativeElement.querySelector('.scope');
    if (picker && !picker.contains(event.target as Node)) this.close();
  }

  submit(event: Event): void {
    event.preventDefault();
    const search = this.query().trim();
    void this.router.navigate([this.scope().route], {
      queryParams: search ? { search } : {},
    });
  }

  private show(): void {
    const bar = this.host.nativeElement.querySelector<HTMLElement>('.search');
    const sky = this.host.nativeElement.querySelector<HTMLElement>('.nebula');
    if (bar && sky) {
      // Menu height (44px rows plus padding) and its gap; the hero clips anything that overflows.
      const room = sky.getBoundingClientRect().bottom - bar.getBoundingClientRect().bottom;
      this.openUp.set(room < SCOPES.length * 46 + 44);
    }
    this.active.set(this.selected());
    this.open.set(true);
  }

  private close(): void {
    this.open.set(false);
  }
}
