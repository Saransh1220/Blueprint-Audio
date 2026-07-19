import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-ticker',
  standalone: true,
  imports: [],
  templateUrl: './ticker.html',
  styleUrls: ['./ticker.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TickerComponent {}
