import { Component } from '@angular/core';

import { GenresSectionComponent, HeroComponent, LabSectionComponent, TickerComponent } from '../../components';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HeroComponent, TickerComponent, GenresSectionComponent, LabSectionComponent],
  template: `
    <app-hero></app-hero>
    <app-ticker></app-ticker>
    <app-genres-section></app-genres-section>
    <app-lab-section></app-lab-section>
  `,
})
export class HomeComponent {}
