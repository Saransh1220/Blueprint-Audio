import { Component, Input } from '@angular/core';

import { Producer } from '../../models/producer';

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
