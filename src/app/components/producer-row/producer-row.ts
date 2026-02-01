import { Component, Input } from '@angular/core';

import type { Producer } from '../../models';

@Component({
  selector: 'app-producer-row',
  standalone: true,
  imports: [],
  templateUrl: './producer-row.html',
  styleUrls: ['./producer-row.scss'],
})
export class ProducerRowComponent {
  @Input() producer!: Producer;
}
