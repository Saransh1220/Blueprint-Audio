import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    <div class="spinner-container" [style.width]="size()" [style.height]="size()">
      <div class="spinner"></div>
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
        vertical-align: middle;
      }

      .spinner-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .spinner {
        width: 100%;
        height: 100%;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: spin 0.8s ease-in-out infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class LoadingSpinnerComponent {
  size = input<string>('20px');
}
