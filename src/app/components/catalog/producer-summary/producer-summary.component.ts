import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { SamplePackProducerProfile } from '../../../models/catalog';

@Component({
  selector: 'app-producer-summary',
  imports: [],
  templateUrl: './producer-summary.component.html',
  styleUrl: './producer-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProducerSummaryComponent {
  readonly producer = input.required<SamplePackProducerProfile>();
  readonly following = input(false);
  readonly followRequested = output<void>();
}
