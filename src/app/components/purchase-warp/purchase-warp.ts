import { BRAND } from '../../core/config/brand';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';

import type { LicenseOption, Spec } from '../../models';
import { CartService } from '../../services/cart.service';
import { PaymentService } from '../../services/payment.service';
import { PlayerService } from '../../services/player.service';
import { PurchaseDialogService } from '../../services/purchase-dialog.service';
import { ToastService } from '../../services/toast.service';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { licenseTiers, TIER_ICON, TIER_LABEL } from '../../utils/license-tiers';
import { WarpDialogComponent } from '../warp-dialog/warp-dialog';
import { defaultLicense, formatLength, licenseFeatures, licenseSubtitle } from './license-display';

/**
 * The buy flow: opens the warp dialog for the beat in `PurchaseDialogService`, shows its details
 * and license tiers, and lets the buyer add the chosen license to the cart or buy it now.
 */
@Component({
  selector: 'app-purchase-warp',
  imports: [WarpDialogComponent, MoneyPipe],
  templateUrl: './purchase-warp.html',
  styleUrl: './purchase-warp.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseWarpComponent {
  readonly brand = BRAND;
  private readonly dialog = inject(PurchaseDialogService);
  private readonly cart = inject(CartService);
  private readonly payment = inject(PaymentService);
  private readonly toast = inject(ToastService);
  private readonly player = inject(PlayerService);

  readonly open = computed(() => !!this.dialog.spec());

  /** The beat on show. Kept after the dialog closes so the content survives the exit animation. */
  readonly spec = signal<Spec | null>(null);
  readonly selectedLicenseId = signal<string | null>(null);
  readonly isSubmitting = signal(false);
  readonly priceChangedNotice = signal<string | null>(null);

  readonly licenses = computed(() => this.spec()?.licenses ?? []);
  private readonly tiers = computed(() => licenseTiers(this.licenses()));
  readonly selectedLicense = computed(() => {
    const spec = this.spec();
    const id = this.selectedLicenseId();
    return spec?.licenses?.find((license) => license.id === id) ?? defaultLicense(spec);
  });
  /** The preview on the cover is playing (this beat is the current track and audio is running). */
  readonly previewing = computed(() => {
    const spec = this.spec();
    return !!spec && this.player.currentTrack()?.id === spec.id && this.player.isPlaying();
  });
  readonly length = computed(() => formatLength(this.spec()?.duration));
  readonly genre = computed(() => {
    const spec = this.spec();
    return spec?.genres?.[0]?.name || spec?.category || 'Beat';
  });

  constructor() {
    effect(() => {
      const spec = this.dialog.spec();
      if (!spec) return;
      untracked(() => {
        this.spec.set(spec);
        this.selectedLicenseId.set(defaultLicense(spec)?.id ?? null);
      });
    });
  }

  close(): void {
    this.priceChangedNotice.set(null);
    this.isSubmitting.set(false);
    this.dialog.close();
  }

  togglePreview(): void {
    const spec = this.spec();
    if (!spec) return;
    if (this.player.currentTrack()?.id === spec.id) this.player.togglePlay();
    else this.player.showPlayer(spec);
  }

  select(license: LicenseOption): void {
    this.selectedLicenseId.set(license.id);
  }

  addToCart(): void {
    const spec = this.spec();
    const license = this.selectedLicense();
    if (!spec || !license) return;
    this.cart.addItem(spec, license);
    this.toast.show(`Added ${spec.title} (${license.name}) to cart`, 'success');
    this.close();
  }

  buyNow(): void {
    const spec = this.spec();
    const license = this.selectedLicense();
    if (!spec || !license) return;
    this.isSubmitting.set(true);
    this.priceChangedNotice.set(null);
    const call = license.selectedPrice
      ? this.payment.initiatePayment(spec.id, license.id, spec.title, license)
      : this.payment.initiatePayment(spec.id, license.id, spec.title);
    call.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.close();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        console.error('Payment initiation failed:', err);
        if (err?.status === 409 || err?.error?.code === 'PRICE_CHANGED') {
          const fresh = err?.error?.current_offer;
          if (fresh) {
            license.selectedPrice = fresh;
            license.displayPriceMoney = {
              amount_minor: fresh.amount_minor,
              currency: fresh.currency,
            };
            this.selectedLicenseId.set(license.id);
          }
          this.priceChangedNotice.set(
            'The price for this item has changed. Please review the updated amount before confirming.',
          );
        } else {
          this.close();
        }
      },
    });
  }

  badge(index: number): string {
    return TIER_LABEL[this.tiers()[index] ?? 'standard'];
  }

  badgeIcon(index: number): string {
    return TIER_ICON[this.tiers()[index] ?? 'standard'];
  }

  subtitle(license: LicenseOption, index: number): string {
    return licenseSubtitle(license, index, this.licenses().length);
  }

  features(license: LicenseOption): string[] {
    return licenseFeatures(license);
  }
}
