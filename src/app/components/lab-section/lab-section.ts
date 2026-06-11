import {
  type AfterViewInit,
  Component,
  computed,
  ElementRef,
  Input,
  inject,
  type OnInit,
  signal,
} from '@angular/core';

import { Router } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { type LicenseType, type Spec } from '../../models';
import { LabService, PlayerService } from '../../services';
import { SpecCardComponent } from '../spec-card/spec-card';
import { LoadingSpinnerComponent } from '../ui/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-lab-section',
  standalone: true,
  imports: [SpecCardComponent, LoadingSpinnerComponent],
  templateUrl: './lab-section.html',
  styleUrls: ['./lab-section.scss'],
})
export class LabSectionComponent implements OnInit, AfterViewInit {
  private labService = inject(LabService);
  private playerService = inject(PlayerService);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);

  constructor() {
    gsap.registerPlugin(ScrollTrigger);
  }

  @Input() type: 'beat' | 'sample' = 'beat';
  specs = signal<Spec[]>([]);
  isLoading = signal(true);
  readonly typeBeatArtists = [
    { name: 'J. Cole', note: 'warm drums, honest piano', image: 'assets/images/genres/rnb.png' },
    {
      name: 'Kendrick Lamar',
      note: 'switch-ups, tension, bounce',
      image: 'assets/images/genres/boom-bap.png',
    },
    { name: 'Drake', note: 'late-night R&B pockets', image: 'assets/images/genres/lofi.png' },
    {
      name: 'Travis Scott',
      note: 'dark synths, festival drums',
      image: 'assets/images/genres/trap.png',
    },
    {
      name: 'Metro Boomin',
      note: 'villain brass and 808s',
      image: 'assets/images/genres/synth.png',
    },
    { name: 'Future', note: 'spacey trap motion', image: 'assets/images/genres/afro.png' },
    { name: 'SZA', note: 'soft guitar and velvet bass', image: 'assets/images/genres/rnb.png' },
    { name: 'The Weeknd', note: 'neon pop noir', image: 'assets/images/genres/synth.png' },
    {
      name: 'Tyler',
      note: 'colorful chords, left turns',
      image: 'assets/images/genres/boom-bap.png',
    },
    { name: 'Yeat', note: 'rage synths, clipped bounce', image: 'assets/images/genres/trap.png' },
    { name: 'Pop Smoke', note: 'drill swing and glide', image: 'assets/images/genres/trap.png' },
    { name: 'Bryson Tiller', note: 'moody trap soul', image: 'assets/images/genres/lofi.png' },
  ];

  readonly licenseTiers: Array<{
    type: LicenseType;
    name: string;
    note: string;
    features: string[];
  }> = [
    {
      type: 'Basic',
      name: 'Basic Lease',
      note: 'Starter files for demos and rough releases.',
      features: ['MP3', 'Untagged', 'Limited Streams (50k)'],
    },
    {
      type: 'Premium',
      name: 'Premium Lease',
      note: 'Release-ready audio for polished singles.',
      features: ['MP3', 'WAV', 'Untagged', 'Limited Streams (500k)'],
    },
    {
      type: 'Trackout',
      name: 'Trackout Lease',
      note: 'Session-ready stems for better mixes.',
      features: ['MP3', 'WAV', 'Stems', 'Untagged', 'Unlimited Streams'],
    },
    {
      type: 'Unlimited',
      name: 'Unlimited Lease',
      note: 'Highest tier for serious placements.',
      features: ['Exclusive Rights', 'All Files Included', 'Full Ownership'],
    },
  ];

  topChartSpecs = computed(() =>
    [...this.specs()]
      .sort((a, b) => {
        const aScore = (a.analytics?.playCount ?? 0) * 100 + (a.analytics?.favoriteCount ?? 0);
        const bScore = (b.analytics?.playCount ?? 0) * 100 + (b.analytics?.favoriteCount ?? 0);
        return bScore - aScore || (b.price ?? 0) - (a.price ?? 0);
      })
      .slice(0, 6),
  );

  ngOnInit(): void {
    this.loadFeaturedSpecs();
  }

  loadFeaturedSpecs() {
    this.isLoading.set(true);
    this.labService
      .getSpecs({
        category: this.type,
        page: 1,
        per_page: 7,
        sort: 'newest',
      })
      .subscribe((specs) => {
        this.specs.set(specs.slice(0, 7));
        this.isLoading.set(false);
        this.refreshAnimations();
      });
  }

  scrollReleaseRailBy(direction: -1 | 1) {
    const rail = this.host.nativeElement.querySelector('.spec-grid') as HTMLElement | null;
    if (!rail) return;

    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.72, 260),
      behavior: 'smooth',
    });
  }

  navigateToSearch() {
    this.router.navigate(['/explore']);
  }

  navigateToTypeBeat(artist: string) {
    this.router.navigate(['/explore'], {
      queryParams: { search: `${artist} type beat` },
    });
  }

  playSong(spec: Spec) {
    this.playerService.showPlayer(spec);
  }

  isChartPlaying(spec: Spec) {
    return this.playerService.currentTrack()?.id === spec.id && this.playerService.isPlaying();
  }

  getPrimaryGenre(spec: Spec) {
    return spec.genres?.[0]?.name || spec.category || 'Beat';
  }

  formatPlays(spec: Spec) {
    const plays = spec.analytics?.playCount ?? 0;
    if (plays >= 1_000_000) return `${(plays / 1_000_000).toFixed(plays >= 10_000_000 ? 0 : 1)}M`;
    if (plays >= 1_000) return `${Math.round(plays / 1_000)}K`;
    return plays.toString();
  }

  startingPrice(spec: Spec) {
    const amount = spec.displayPriceMoney?.amount_minor
      ? spec.displayPriceMoney.amount_minor / 100
      : (spec.price ?? 0);
    const currency = spec.displayPriceMoney?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  }

  chartTrend(index: number) {
    return ['-', 'up', 'down', 'up', 'down', '-'][index % 6];
  }

  ngAfterViewInit(): void {
    this.refreshAnimations();
  }

  refreshAnimations() {
    // Wait for DOM update
    setTimeout(() => {
      ScrollTrigger.refresh();
      (gsap.utils.toArray('.gs-item, app-spec-card') as Element[]).forEach(
        (item: Element, i: number) => {
          gsap.fromTo(
            item,
            { y: 50, opacity: 0 },
            {
              scrollTrigger: { trigger: item, start: 'top 95%' },
              y: 0,
              opacity: 1,
              duration: 0.6,
              delay: i * 0.05,
              overwrite: true,
            },
          );
        },
      );
    }, 100);
  }
}
