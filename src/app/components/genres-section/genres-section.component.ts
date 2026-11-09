import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-genres-section',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './genres-section.component.html',
  styleUrl: './genres-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenresSectionComponent {}
