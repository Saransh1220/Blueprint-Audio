import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
  type OnInit,
  signal,
} from '@angular/core';
import type { Spec } from '../../models';
import { LabService, PlayerService } from '../../services';
import { SpecCardComponent } from '../spec-card/spec-card';
import { SpecListItemComponent } from '../spec-list-item/spec-list-item.component';

@Component({
  selector: 'app-spec-row',
  standalone: true,
  imports: [SpecCardComponent, SpecListItemComponent],
  templateUrl: './spec-row.component.html',
  styleUrls: ['./spec-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecRowComponent implements OnInit {
  private labService = inject(LabService);
  private playerService = inject(PlayerService);

  @Input() title = '';
  @Input() filterTag = ''; // Genre or Tag to filter by
  @Input() type: 'beat' | 'sample' = 'beat';
  @Input() specsInput: Spec[] | null = null; // Optional input to override internal fetching

  specs = signal<Spec[]>([]);
  viewMode = signal<'grid' | 'list'>('grid');

  setViewMode(mode: 'grid' | 'list') {
    this.viewMode.set(mode);
  }

  playSong(spec: Spec) {
    this.playerService.showPlayer(spec);
  }

  ngOnChanges() {
    if (this.specsInput) {
      this.specs.set(this.specsInput);
    }
  }

  ngOnInit() {
    if (this.specsInput) {
      // Handled in ngOnChanges, but safe to keep or remove if we trust OnChanges runs first/also
      // Actually OnChanges runs before Init.
      return;
    }

    // Here we'll fetch all and filter client-side for the mock.
    this.labService.getSpecs({ category: this.type }).subscribe((allSpecs) => {
      // If we have a filterTag, filter by it (client side simplified)
      if (this.filterTag) {
        const tag = this.filterTag.toUpperCase();
        // Check genre or tags
        // This is legacy/mock behavior for the "Recommended" rows which use string tags
        const filtered = allSpecs.filter(
          (s) =>
            s.tags.some((t) => t.toUpperCase() === tag) ||
            s.genres.some((g) => g.slug.toUpperCase() === tag || g.name.toUpperCase() === tag),
        );
        this.specs.set(filtered);
      } else {
        this.specs.set(allSpecs);
      }
    });
  }
}
