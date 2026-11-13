import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BRAND } from '../../core/config/brand';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrls: ['./footer.scss'],
})
export class FooterComponent {
  readonly brand = BRAND;
  readonly year = new Date().getFullYear();
}
