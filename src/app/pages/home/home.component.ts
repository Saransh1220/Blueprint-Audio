import { Component } from "@angular/core";

import { HeroComponent } from "../../components/hero/hero";
import { LabSectionComponent } from "../../components/lab-section/lab-section";
import { TickerComponent } from "../../components/ticker/ticker";

@Component({
	selector: "app-home",
	standalone: true,
	imports: [HeroComponent, TickerComponent, LabSectionComponent],
	template: `
    <app-hero></app-hero>
    <app-ticker></app-ticker>
    <app-lab-section></app-lab-section>
  `,
})
export class HomeComponent {}
