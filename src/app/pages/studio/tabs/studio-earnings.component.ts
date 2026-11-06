import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-studio-earnings',
  imports: [RouterLink],
  template: `<section class="container" style="padding:3rem 1rem">
    <h1>Earnings and payouts are not available yet.</h1>
    <p>View your completed sales in Studio Orders.</p>
    <a routerLink="/studio/orders">View orders</a>
  </section>`,
})
export class StudioEarningsComponent {}
