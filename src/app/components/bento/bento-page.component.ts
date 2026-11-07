import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Page shell for the "Finance Bento" look: black canvas, header with title, subtitle and a controls
 * slot (`bentoActions`), and a 12-column grid for `app-bento-card` children.
 * Design tokens live here so every bento component below inherits them.
 */
@Component({
  selector: 'app-bento-page',
  template: `
    <header class="head">
      <div class="head-text">
        <h1>{{ heading() }}</h1>
        @if (subtitle()) {
          <p class="sub">{{ subtitle() }}</p>
        }
      </div>
      <div class="head-actions"><ng-content select="[bentoActions]" /></div>
    </header>
    <div class="grid"><ng-content /></div>
  `,
  styles: `
    :host {
      --bento-bg: #000;
      --bento-text: #fff;
      --bento-muted: rgba(255, 255, 255, 0.58);
      --bento-faint: rgba(255, 255, 255, 0.36);
      --bento-accent: #e8ff1f;
      --bento-accent-ink: #121700;
      --bento-glass: rgba(255, 255, 255, 0.06);
      --bento-glass-line: rgba(255, 255, 255, 0.12);
      --bento-s1: #ffffff;
      --bento-s2: #a9b2ff;
      --bento-s3: #ffb37a;
      --bento-font: 'Geist', 'Bricolage Grotesque', system-ui, sans-serif;
      --bento-mono: 'Geist Mono', 'DM Mono', ui-monospace, monospace;
      display: block;
      box-sizing: border-box;
      min-height: 100%;
      padding: clamp(16px, 3vw, 36px);
      background: var(--bento-bg);
      color: var(--bento-text);
      font-family: var(--bento-font);
    }
    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px 24px;
      margin: 0 auto 22px;
      max-width: 1480px;
    }
    h1 {
      margin: 0;
      font-size: clamp(26px, 3.4vw, 40px);
      font-weight: 300;
      letter-spacing: -0.03em;
      line-height: 1.1;
    }
    .sub {
      margin: 6px 0 0;
      color: var(--bento-muted);
      font-size: 14px;
    }
    .head-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 14px;
      max-width: 1480px;
      margin: 0 auto;
    }
    @media (max-width: 767px) {
      .grid {
        gap: 12px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BentoPageComponent {
  readonly heading = input.required<string>();
  readonly subtitle = input('');
}
