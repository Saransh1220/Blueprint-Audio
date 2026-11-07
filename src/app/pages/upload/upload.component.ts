import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CurrencyPriceFieldComponent } from '../../components/currency-price-field/currency-price-field.component';
import { SuPageHeadComponent, SuPanelComponent } from '../studio/ui';
import { UploadFormBase } from './upload-form.base';

@Component({
  selector: 'app-upload',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SuPageHeadComponent,
    SuPanelComponent,
    CurrencyPriceFieldComponent,
  ],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadComponent extends UploadFormBase {
  override successRoute = ['/dashboard'];
  override closeRoute = '/dashboard';
}
