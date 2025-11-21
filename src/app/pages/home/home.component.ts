import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroComponent } from '../../components/hero/hero';
import { TickerComponent } from '../../components/ticker/ticker';
import { LabSectionComponent } from '../../components/lab-section/lab-section';
import { DirectoryComponent } from '../../components/directory/directory';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HeroComponent, TickerComponent, LabSectionComponent, DirectoryComponent],
  template: `
    <app-hero></app-hero>
    <app-ticker></app-ticker>
    <app-lab-section></app-lab-section>
    <app-directory></app-directory>
  `,
})
export class HomeComponent {}
