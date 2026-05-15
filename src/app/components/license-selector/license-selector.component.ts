import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject, signal } from '@angular/core';
import type { LicenseOption, Spec } from '../../models';
import { CartService } from '../../services/cart.service';
import { ModalService } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { PaymentService } from '../../services/payment.service';

@Component({
  selector: 'app-license-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './license-selector.component.html',
  styleUrls: ['./license-selector.component.scss'],
})
export class LicenseSelectorComponent {
  private cartService = inject(CartService);
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);
  private paymentService = inject(PaymentService);

  private specValue!: Spec;

  @Input() set spec(value: Spec) {
    this.specValue = value;
    const defaultLicense = value?.licenses?.[1] ?? value?.licenses?.[0] ?? null;
    this.selectedLicenseId.set(defaultLicense?.id ?? null);
  }

  get spec() {
    return this.specValue;
  }

  selectedLicenseId = signal<string | null>(null);

  selectedLicense = computed(() => {
    const licenses = this.spec?.licenses ?? [];
    const selectedId = this.selectedLicenseId();
    return (
      licenses.find((license) => license.id === selectedId) ?? licenses[1] ?? licenses[0] ?? null
    );
  });

  selectLicense(license: LicenseOption) {
    this.selectedLicenseId.set(license.id);
  }

  addSelectedToCart() {
    const license = this.selectedLicense();
    if (!license) return;
    this.addToCart(license);
  }

  buySelectedNow() {
    const license = this.selectedLicense();
    if (!license) return;
    this.buyNow(license);
  }

  addToCart(license: LicenseOption) {
    this.cartService.addItem(this.spec, license);
    this.toastService.show(`Added ${this.spec.title} (${license.name}) to cart`, 'success');
    this.modalService.close();
  }

  buyNow(license: LicenseOption, event?: Event) {
    event?.stopPropagation();
    this.modalService.close();

    this.paymentService.initiatePayment(this.spec.id, license.id, this.spec.title).subscribe({
      error: (err) => {
        console.error('Payment initiation failed:', err);
      },
    });
  }

  closeModal() {
    this.modalService.close();
  }

  getStyledTitle(title: string) {
    const parts = title.trim().split(/\s+/);
    if (parts.length <= 1) return { lead: title, accent: '' };
    return {
      lead: parts.slice(0, -1).join(' '),
      accent: parts.at(-1) ?? '',
    };
  }

  getDisplayTitleHtml(title: string) {
    const styled = this.getStyledTitle(title);
    const lead = styled.lead.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const accent = styled.accent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return accent ? `<em>${lead}</em><br/>${accent}.` : lead;
  }

  getProducerName() {
    return this.spec?.producerName || 'Red Wave';
  }

  getPrimaryGenre() {
    return this.spec?.genres?.[0]?.name || this.spec?.category || 'Beat';
  }

  formatDuration(seconds?: number) {
    if (!seconds) return '2:54';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getTempoDisplay() {
    return this.spec?.bpm ? `${this.spec.bpm} BPM` : '-- BPM';
  }

  getKeyDisplay() {
    return this.spec?.key || '--';
  }

  getLengthDisplay() {
    return this.formatDuration(this.spec?.duration);
  }

  getTypeDisplay() {
    return this.getPrimaryGenre();
  }

  getLicenseVariant(index: number, total: number) {
    if (index === 1) return 'popular';
    if (index === total - 1 && total > 2) return 'exclusive';
    return 'default';
  }

  getLicenseSubtitle(license: LicenseOption, index: number, total: number) {
    if (license.type === 'Basic') return 'for demos and rough drafts';
    if (license.type === 'Premium') return 'for proper releases';
    if (license.type === 'Trackout') return 'for sessions that need stems';
    if (license.type === 'Unlimited')
      return total > 3 || index === total - 1 ? 'for bigger placements' : 'for wide release';
    return 'one-time license';
  }

  getLicenseBadge(index: number, total: number) {
    const variant = this.getLicenseVariant(index, total);
    if (variant === 'popular') return 'Most picked';
    if (variant === 'exclusive') return 'Highest tier';
    return '';
  }

  getLicenseFeatures(license: LicenseOption) {
    const raw = [...(license.fileTypes ?? []), ...(license.features ?? [])]
      .map((item) => item?.trim())
      .filter((item): item is string => !!item);

    const unique = Array.from(new Set(raw));
    return unique.slice(0, 4);
  }

  getFooterNote(license: LicenseOption | null) {
    if (!license) return 'Choose a license to continue';
    const hasPdf = this.getLicenseFeatures(license).some((feature) => /license|pdf/i.test(feature));
    return hasPdf ? 'instant download and license PDF included' : 'instant delivery after payment';
  }
}
