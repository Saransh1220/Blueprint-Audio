import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { type FlameWrapInstance, type FlameWrapOptions, createFlameWrap } from './flame-wrap';

@Component({
  selector: 'app-flame-wrap-effect',
  standalone: true,
  template: `
    <div #content class="flame-capture" aria-hidden="true"></div>
    <canvas #source class="flame-source" layoutsubtree="true" aria-hidden="true"></canvas>
    <canvas
      #output
      class="flame-output"
      aria-hidden="true"
      [style.top.px]="-reach"
      [style.right.px]="-glowReach"
      [style.bottom.px]="-glowReach"
      [style.left.px]="-glowReach"
      [style.width]="'calc(100% + ' + glowReach * 2 + 'px)'"
      [style.height]="'calc(100% + ' + (reach + glowReach) + 'px)'"
    ></canvas>
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      z-index: 0;
      display: block;
      overflow: visible;
      pointer-events: none;
    }

    .flame-capture,
    .flame-source {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      visibility: hidden;
      pointer-events: none;
    }

    .flame-output {
      position: absolute;
      max-width: none;
      max-height: none;
      pointer-events: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlameWrapEffectComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly zone = inject(NgZone);

  @ViewChild('source', { static: true }) private sourceRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('content', { static: true }) private contentRef!: ElementRef<HTMLElement>;
  @ViewChild('output', { static: true }) private outputRef!: ElementRef<HTMLCanvasElement>;

  @Input() color: [number, number, number] = [1, 0.24, 0.36];
  @Input() intensity = 0.5;
  @Input() height = 90;
  @Input() spread = 10;
  @Input() radius = 20;
  @Input() speed = 0.28;
  @Input() scale = 0.75;
  @Input() turbulence = 0.5;
  @Input() turbulenceScale = 0.5;
  @Input() turbulenceReach = 18;
  @Input() sparks = 1.2;
  @Input() sparkSize = 0.4;
  @Input() sparkDensity = 1;
  @Input() sparkSpeed = 0.9;
  @Input() rim = 2;
  @Input() melt = 3;
  @Input() distortion = 5;
  @Input() smoke = 0.7;
  @Input() ember = 1.5;
  @Input() scorch = 0;

  private instance: FlameWrapInstance | null = null;

  get reach(): number {
    return Math.round(Math.max(this.height, 24) * 1.5) + 40;
  }

  get glowReach(): number {
    return Math.round(Math.max(this.spread, 8) * 3) + 16;
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.zone.runOutsideAngular(() => {
      try {
        this.instance = createFlameWrap(
          {
            source: this.sourceRef.nativeElement,
            content: this.contentRef.nativeElement,
            output: this.outputRef.nativeElement,
          },
          this.options(),
        );
      } catch {
        this.instance = null;
      }
    });
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.instance?.setOptions(this.options());
  }

  ngOnDestroy(): void {
    this.instance?.destroy();
    this.instance = null;
  }

  private options(): FlameWrapOptions {
    return {
      color: this.color,
      intensity: this.intensity,
      height: this.height,
      spread: this.spread,
      radius: this.radius,
      speed: this.speed,
      scale: this.scale,
      turbulence: this.turbulence,
      turbulenceScale: this.turbulenceScale,
      turbulenceReach: this.turbulenceReach,
      sparks: this.sparks,
      sparkSize: this.sparkSize,
      sparkDensity: this.sparkDensity,
      sparkSpeed: this.sparkSpeed,
      rim: this.rim,
      melt: this.melt,
      distortion: this.distortion,
      smoke: this.smoke,
      ember: this.ember,
      scorch: this.scorch,
    };
  }
}
