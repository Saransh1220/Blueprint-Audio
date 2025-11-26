import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpecCardComponent } from '../spec-card/spec-card';
import { Spec } from '../../models/spec';
import { LabService } from '../../services/lab';

@Component({
    selector: 'app-spec-row',
    standalone: true,
    imports: [CommonModule, SpecCardComponent],
    templateUrl: './spec-row.component.html',
    styleUrls: ['./spec-row.component.scss'],
})
export class SpecRowComponent implements OnInit {
    @Input() title = '';
    @Input() filterTag = ''; // Genre or Tag to filter by
    @Input() type: 'beat' | 'sample' = 'beat';

    specs = signal<Spec[]>([]);

    constructor(private labService: LabService) { }

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
                            s.title.includes(this.filterTag)
                    )
                );
            } else {
                this.specs.set(allSpecs);
            }
        });
    }
}
