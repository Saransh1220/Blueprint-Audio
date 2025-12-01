import { Component, Input, inject, type OnInit, signal } from '@angular/core';
import type { Spec } from '../../models/spec';
import { LabService } from '../../services/lab';
import { PlayerService } from '../../services/player.service';
import { SpecCardComponent } from '../spec-card/spec-card';
import { SpecListItemComponent } from '../spec-list-item/spec-list-item.component';

@Component({
  selector: 'app-spec-row',
  standalone: true,
  imports: [SpecCardComponent, SpecListItemComponent],
  templateUrl: './spec-row.component.html',
  styleUrls: ['./spec-row.component.scss'],
})
export class SpecRowComponent implements OnInit {
  private labService = inject(LabService);
  private playerService = inject(PlayerService);

  @Input() title = '';
  @Input() filterTag = ''; // Genre or Tag to filter by
  @Input() type: 'beat' | 'sample' = 'beat';

  specs = signal<Spec[]>([]);
  viewMode = signal<'grid' | 'list'>('grid');

  setViewMode(mode: 'grid' | 'list') {
    this.viewMode.set(mode);
  }

  playSong(spec: Spec) {
    this.playerService.showPlayer(spec);
  }

  ngOnInit() {
    // In a real app, we'd have a more specific API call.
    // Here we'll fetch all and filter client-side for the mock.
    this.labService.getSpecs(this.type).subscribe((allSpecs) => {
      if (this.filterTag) {
        this.specs.set(
          allSpecs.filter(
            (s) =>
              s.tags.includes(this.filterTag) ||
              s.key === this.filterTag ||
              s.title.includes(this.filterTag),
          ),
        );
      } else {
        this.specs.set(allSpecs);
      }
    });
  }
}
