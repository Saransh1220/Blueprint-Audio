import { Component, inject, type OnInit } from '@angular/core';

import type { Producer } from '../../models';
import { DirectoryService } from '../../services';
import { ProducerRowComponent } from '../producer-row/producer-row';

@Component({
  selector: 'app-directory',
  standalone: true,
  imports: [ProducerRowComponent],
  templateUrl: './directory.html',
  styleUrls: ['./directory.scss'],
})
export class DirectoryComponent implements OnInit {
  private directoryService = inject(DirectoryService);

  producers: Producer[] = [];

  ngOnInit(): void {
    this.directoryService.getProducers().subscribe((producers) => {
      this.producers = producers;
    });
  }
}
