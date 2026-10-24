import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { UploadFormBase } from '../../../pages/upload/upload-form.base';
import { SuPageHeadComponent, SuPanelComponent } from '../ui';

@Component({
  selector: 'app-studio-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SuPageHeadComponent, SuPanelComponent],
  templateUrl: '../../../pages/upload/upload.component.html',
  styleUrls: ['../../../pages/upload/upload.component.scss'],
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      /* Inside the studio the shell already provides the page padding and background. */
      .upload-page-container {
        min-height: auto !important;
        padding: 0 0 140px !important;
        background: transparent !important;
      }
      .upload-shell {
        max-width: none !important;
        padding: 0 !important;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioUploadComponent extends UploadFormBase {
  override successRoute = ['/studio/tracks'];
  override closeRoute = '/studio/tracks';
}
