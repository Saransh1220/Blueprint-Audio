import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
@Component({
  selector: 'app-unavailable',
  imports: [RouterLink],
  template: `<section class="container" style="padding:5rem 1.5rem;min-height:50vh">
    <h1>{{ feature }} is not available yet.</h1>
    <p>Explore the beat catalog or return to your Studio workspace.</p>
    <a routerLink="/explore">Explore beats</a> · <a routerLink="/studio">Open Studio</a>
  </section>`,
})
export class UnavailableComponent {
  readonly feature = inject(ActivatedRoute).snapshot.queryParamMap.get('feature') || 'This feature';
}
