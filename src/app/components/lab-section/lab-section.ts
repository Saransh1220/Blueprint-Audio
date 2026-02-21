import {
  type AfterViewInit,
  Component,
  computed,
  Input,
  inject,
  type OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { type Spec } from '../../models';
import { LabService, PlayerService } from '../../services';
import { SpecCardComponent } from '../spec-card/spec-card';
import { SpecListItemComponent } from '../spec-list-item/spec-list-item.component';
import { LoadingSpinnerComponent } from '../ui/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-lab-section',
  standalone: true,
  imports: [SpecCardComponent, SpecListItemComponent, FormsModule, LoadingSpinnerComponent],
  templateUrl: './lab-section.html',
  styleUrls: ['./lab-section.scss'],
})
export class LabSectionComponent implements OnInit, AfterViewInit {
  private labService = inject(LabService);
  private playerService = inject(PlayerService);
  private router = inject(Router);

  constructor() {
    gsap.registerPlugin(ScrollTrigger);
  }

  @Input() type: 'beat' | 'sample' = 'beat';
  specs = signal<Spec[]>([]);
  isLoading = signal(true);
  viewMode = signal<'grid' | 'list'>('grid');

  // Search State
  searchTerm = signal('');

  setViewMode(mode: 'grid' | 'list') {
    this.viewMode.set(mode);
  }

  ngOnInit(): void {
    this.loadFeaturedSpecs();
  }

  loadFeaturedSpecs() {
    this.isLoading.set(true);
    // Fetch only top 8 for home page
    this.labService
      .getSpecs({
        category: this.type,
        page: 1,
        // per_page could be handled efficiently in backend or just slice here if needed,
        // but for now we rely on default pagination.
        // Ideally we'd validly limit this request.
      })
      .subscribe((specs) => {
        this.specs.set(specs.slice(0, 8)); // Limit to 8 for featured view
        this.isLoading.set(false);
        this.refreshAnimations();
      });
  }

  onSearch() {
    if (this.searchTerm().trim()) {
      this.router.navigate(['/search'], {
        queryParams: { search: this.searchTerm() },
      });
    }
  }

  navigateToSearch() {
    this.router.navigate(['/search']);
  }

  playSong(spec: Spec) {
    this.playerService.showPlayer(spec);
  }

  ngAfterViewInit(): void {
    this.refreshAnimations();
  }

  refreshAnimations() {
    // Wait for DOM update
    setTimeout(() => {
      ScrollTrigger.refresh();
      (gsap.utils.toArray('.gs-item') as Element[]).forEach((item: Element, i: number) => {
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
      });
    }, 100);
  }
}
