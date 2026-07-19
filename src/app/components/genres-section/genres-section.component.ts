import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-genres-section',
  standalone: true,
  templateUrl: './genres-section.component.html',
  styleUrl: './genres-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenresSectionComponent {}
