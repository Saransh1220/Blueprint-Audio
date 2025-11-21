import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroComponent } from '../../components/hero/hero';
import { TickerComponent } from '../../components/ticker/ticker';
import { LabSectionComponent } from '../../components/lab-section/lab-section';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HeroComponent, TickerComponent, LabSectionComponent],
  template: `
    <app-hero></app-hero>
    <app-ticker></app-ticker>
    <app-lab-section></app-lab-section>
  `,
})
export class HomeComponent { }
