import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BRAND } from '../../../core/config/brand';

@Component({
  selector: 'app-studio-messages',
  imports: [],
  templateUrl: './studio-messages.component.html',
  styleUrl: './studio-messages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioMessagesComponent {
  readonly brand = BRAND;
}
