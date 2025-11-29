import { Component, type OnInit } from '@angular/core';

import type { Producer } from '../../models/producer';
import { DirectoryService } from '../../services/directory';
import { ProducerRowComponent } from '../producer-row/producer-row';

@Component({
  selector: 'app-directory',
  standalone: true,
  imports: [ProducerRowComponent],
  templateUrl: './directory.html',
  styleUrls: ['./directory.scss'],
})
export class DirectoryComponent implements OnInit {
  producers: Producer[] = [];

  constructor(private directoryService: DirectoryService) {}

  ngOnInit(): void {
    this.directoryService.getProducers().subscribe((producers) => {
      this.producers = producers;
    });
  }
}
