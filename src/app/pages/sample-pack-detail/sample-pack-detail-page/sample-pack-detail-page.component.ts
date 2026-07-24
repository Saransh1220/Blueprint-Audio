import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProducerSummaryComponent } from '../../../components/catalog/producer-summary/producer-summary.component';
import { RelatedPackCardComponent } from '../../../components/catalog/related-pack-card/related-pack-card.component';
import { ReviewListComponent } from '../../../components/catalog/review-list/review-list.component';
import { SampleFileListComponent } from '../../../components/catalog/sample-file-list/sample-file-list.component';
import { SamplePackHeroComponent } from '../../../components/catalog/sample-pack-hero/sample-pack-hero.component';
import type { SampleFile, SamplePackDetail } from '../../../models/catalog';
import { CATALOG_REPOSITORY } from '../../../services/catalog/catalog-repository';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-sample-pack-detail-page',
  imports: [
    RouterLink,
    ProducerSummaryComponent,
    RelatedPackCardComponent,
    ReviewListComponent,
    SampleFileListComponent,
    SamplePackHeroComponent,
  ],
  templateUrl: './sample-pack-detail-page.component.html',
  styleUrl: './sample-pack-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SamplePackDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly catalog = inject(CATALOG_REPOSITORY);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  readonly demoPlaying = signal(false);
  readonly playingFileId = signal<string | null>(null);
  readonly wishlisted = signal(false);
  readonly following = signal(false);

  readonly pack = computed<SamplePackDetail>(() => {
    const slug = this.params().get('slug');
    return this.catalog.getSamplePackDetail(slug) ?? this.catalog.getSamplePackDetail(null)!;
  });

  toggleDemo(): void {
    this.demoPlaying.update((value) => !value);
  }
  toggleFile(id: string): void {
    this.playingFileId.update((current) => (current === id ? null : id));
  }
  toggleWishlist(): void {
    this.wishlisted.update((value) => !value);
  }
  toggleFollowing(): void {
    this.following.update((value) => !value);
  }
  acquire(): void {
    this.toast.show(
      this.pack().price.amount_minor === 0
        ? `${this.pack().title} is ready to download.`
        : `${this.pack().title} added to cart.`,
      'success',
    );
  }
  downloadFile(file: SampleFile): void {
    this.toast.show(`${file.name} preview download started.`, 'success');
  }
  openPack(slug: string): void {
    void this.router.navigate(['/sample-packs', slug]);
  }
}
