import { RouterLink } from '@angular/router';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-genres-section',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './genres-section.component.html',
  styleUrl: './genres-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenresSectionComponent {}
