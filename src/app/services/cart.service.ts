import { computed, Injectable, signal, inject } from '@angular/core';
import type { LicenseOption, Spec } from '../models';
import { HttpClient } from '@angular/common/http';
import { finalize, forkJoin, of, catchError } from 'rxjs';
import { environment } from '../../environments/environment';
import { SpecAdapter } from '../adapters/spec.adapter';
import type { SpecDto } from '../core/api/spec.requests';
import { summarizeCartMoney } from '../utils/cart-money';

export interface CartItem {
  id: string; // Unique ID for the cart item (e.g., timestamp)
  spec: Spec;
  license: LicenseOption;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly storageKey = 'waveyard.cart.v1';
  private itemsSignal = signal<CartItem[]>(this.restore());
  private persist() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.itemsSignal()));
    } catch {
      /* Keep the in-memory cart usable. */
    }
  }
  private restore(): CartItem[] {
    try {
      const items: unknown = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      if (!Array.isArray(items)) return [];
      return items.filter(
        (item): item is CartItem =>
          !!item &&
          typeof item.id === 'string' &&
          typeof item.spec?.id === 'string' &&
          typeof item.license?.id === 'string' &&
          Number.isFinite(item.license.price) &&
          item.license.price >= 0,
      );
    } catch {
      return [];
    }
  }
  private readonly http = inject(HttpClient, { optional: true });
  readonly isRefreshing = signal(false);
  readonly needsRefresh = signal(this.itemsSignal().length > 0);
  private readonly summary = computed(() => summarizeCartMoney(this.itemsSignal()));
  readonly hasUnavailableItems = computed(
    () => this.summary().hasUnavailable || this.needsRefresh(),
  );
  readonly hasMixedCurrencies = computed(() => this.summary().hasMixedCurrencies);
  readonly totalMoney = computed(() =>
    this.needsRefresh() || this.isRefreshing() ? null : this.summary().totalMoney,
  );
  readonly totalMinor = computed(
    () => this.totalMoney()?.amount_minor ?? (this.itemsSignal().length ? null : 0),
  );

  refresh(): void {
    if (!this.http || this.isRefreshing() || !this.itemsSignal().length) return;
    this.isRefreshing.set(true);
    const ids = [...new Set(this.itemsSignal().map((item) => item.spec.id))];
    forkJoin(
      ids.map((id) =>
        this.http!.get<SpecDto>(`${environment.apiUrl}/specs/${encodeURIComponent(id)}`).pipe(
          catchError(() => of(null)),
        ),
      ),
    )
      .pipe(finalize(() => this.isRefreshing.set(false)))
      .subscribe((results) => {
        const adapter = new SpecAdapter();
        const current = new Map(
          ids.map((id, i) => [id, results[i] ? adapter.adapt(results[i]!) : null]),
        );
        let failed = false;
        this.itemsSignal.update((items) =>
          items.map((item) => {
            if (!current.has(item.spec.id)) {
              failed = true;
              return item;
            }
            const spec = current.get(item.spec.id);
            const license = spec?.licenses.find((license) => license.id === item.license.id);
            if (!spec || !license) {
              failed = true;
              return {
                ...item,
                license: {
                  ...item.license,
                  selectedPrice: {
                    amount_minor: 0,
                    amount_major: 0,
                    currency: '',
                    revision: 0,
                    selection: 'unavailable',
                    is_purchasable: false,
                    available_currencies: [],
                  },
                },
              };
            }
            return { ...item, spec, license };
          }),
        );
        this.needsRefresh.set(failed);
        this.persist();
      });
  }

  readonly items = this.itemsSignal.asReadonly();

  readonly total = computed(() => {
    const money = this.totalMoney();
    return money ? money.amount_minor / 100 : 0;
  });

  readonly count = computed(() => this.itemsSignal().length);

  addItem(spec: Spec, license: LicenseOption) {
    if (
      this.itemsSignal().some((item) => item.spec.id === spec.id && item.license.id === license.id)
    )
      return;
    const newItem: CartItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      spec,
      license,
    };

    this.itemsSignal.update((items) => [...items, newItem]);
    this.persist();
  }

  removeItem(cartItemId: string) {
    this.itemsSignal.update((items) => items.filter((item) => item.id !== cartItemId));
    this.persist();
  }

  clear() {
    this.itemsSignal.set([]);
    this.persist();
  }
}
