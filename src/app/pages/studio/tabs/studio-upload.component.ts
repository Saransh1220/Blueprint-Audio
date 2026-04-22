import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UploadFormBase } from '../../../pages/upload/upload-form.base';

@Component({
  selector: 'app-studio-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: '../../../pages/upload/upload.component.html',
  styleUrls: ['../../../pages/upload/upload.component.scss'],
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .upload-page-container {
        padding-top: 0 !important;
      }
      .upload-shell {
        min-height: auto !important;
      }
      .upload-main {
        padding-bottom: 160px !important;
      }
      @media (max-width: 768px) {
        .upload-main {
          padding-bottom: 200px !important;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioUploadComponent extends UploadFormBase {
  override successRoute = ['/studio/tracks'];
  override closeRoute = '/studio/tracks';
}
