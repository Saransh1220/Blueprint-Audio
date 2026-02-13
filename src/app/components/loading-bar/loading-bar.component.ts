import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loadingService.isLoading()) {
      <div class="loading-bar-container">
        <div class="loading-bar"></div>
      </div>
    }
  `,
  styles: [
    `
      .loading-bar-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        z-index: 9999;
        pointer-events: none;
        overflow: hidden;
      }

      .loading-bar {
        width: 100%;
        height: 100%;
        background: var(--brand-color);
        transform-origin: left;
        animation: loading-animation 1.5s infinite linear;
      }

      @keyframes loading-animation {
        0% {
          transform: translateX(-100%);
        }
        50% {
          transform: translateX(0);
        }
        100% {
          transform: translateX(100%);
        }
      }
    `,
  ],
})
export class LoadingBarComponent {
  loadingService = inject(LoadingService);
}
