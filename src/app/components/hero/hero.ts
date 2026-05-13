import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  type OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { catchError, finalize, of } from 'rxjs';
import type { Spec } from '../../models';
import { LabService } from '../../services';

type BeatCard = {
  id: string;
  title: string;
  producer: string;
  producerHandle: string;
  genre: string;
  meta: string;
  price: string;
  imageUrl: string;
  className: string;
  tilt: number;
  lift: number;
};

const CARD_LAYOUTS = [
  { className: 'cover-noir', tilt: -14, lift: 34 },
  { className: 'cover-blueprint', tilt: -9, lift: 14 },
  { className: 'cover-yellow', tilt: -4, lift: 2 },
  { className: 'cover-coral', tilt: 2, lift: 0 },
  { className: 'cover-redline', tilt: 7, lift: 9 },
  { className: 'cover-poster', tilt: 12, lift: 22 },
  { className: 'cover-green', tilt: 16, lift: 40 },
] as const;

@Component({
  selector: 'app-hero',
  imports: [RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
})
export class HeroComponent implements OnInit, AfterViewInit {
  private el = inject(ElementRef);
  private labService = inject(LabService);

  readonly cardLayouts = CARD_LAYOUTS;
  beatCards = signal<BeatCard[]>([]);
  isLoading = signal(true);

  ngOnInit(): void {
    this.labService
      .getSpecs({ category: 'beat', page: 1, per_page: CARD_LAYOUTS.length, sort: 'newest' })
      .pipe(
        catchError(() => of([] as Spec[])),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((specs) => {
        this.beatCards.set(
          specs.slice(0, CARD_LAYOUTS.length).map((spec, index) => this.toBeatCard(spec, index)),
        );
      });
  }

  ngAfterViewInit(): void {
    const reveals = this.el.nativeElement.querySelectorAll('.gs-reveal');
    gsap.to(reveals, {
      opacity: 1,
      y: 0,
      duration: 1.2,
      stagger: 0.1,
      ease: 'power2.out',
      delay: 0.1,
    });
  }

  private toBeatCard(spec: Spec, index: number): BeatCard {
    const layout = CARD_LAYOUTS[index % CARD_LAYOUTS.length];
    const genre = spec.genres?.[0]?.name || spec.category;
    const meta = [spec.bpm ? `${spec.bpm} BPM` : '', spec.key].filter(Boolean).join(' / ');

    return {
      id: spec.id,
      title: spec.title,
      producer: spec.producerName,
      producerHandle: this.toHandle(spec.producerName),
      genre,
      meta,
      price: this.formatPrice(spec.price),
      imageUrl: spec.imageUrl,
      ...layout,
    };
  }

  private toHandle(name: string): string {
    const clean = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
    return clean ? `@${clean.slice(0, 14)}` : '@producer';
  }

  private formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  }
}
