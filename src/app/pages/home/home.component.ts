import { Component } from '@angular/core';

import { HeroComponent, LabSectionComponent, TickerComponent } from '../../components';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HeroComponent, TickerComponent, LabSectionComponent],
  template: `
    <app-hero></app-hero>
    <app-ticker></app-ticker>
    <app-lab-section></app-lab-section>
  `,
})
export class HomeComponent { }
