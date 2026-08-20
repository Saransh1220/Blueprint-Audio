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
import { type BlazeInstance, type BlazeOptions, createBlaze } from './blaze';

@Component({
  selector: 'app-blaze-effect',
  standalone: true,
  template: `
    <div #content class="blaze-capture" aria-hidden="true"></div>
    <canvas #source class="blaze-source" layoutsubtree="true" aria-hidden="true"></canvas>
    <canvas #output class="blaze-output" aria-hidden="true"></canvas>
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      display: block;
      overflow: hidden;
      pointer-events: none;
    }

    .blaze-source,
    .blaze-output {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .blaze-source {
      opacity: 0;
    }

    .blaze-capture {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      visibility: hidden;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlazeEffectComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly zone = inject(NgZone);

  @ViewChild('source', { static: true }) private sourceRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('content', { static: true }) private contentRef!: ElementRef<HTMLElement>;
  @ViewChild('output', { static: true }) private outputRef!: ElementRef<HTMLCanvasElement>;

  @Input() height = 0.97;
  @Input() distortion = 0.6;
  @Input() distortionScale = 0.5;
  @Input() speed = 1;
  @Input() sparks = 0.5;
  @Input() sparkDensity = 1.5;
  @Input() sparkSize = 1;
  @Input() layers = 4;
  @Input() smoke = 0.5;
  @Input() glow = 1.5;
  @Input() sparkColor: [number, number, number] = [1, 0.4, 0.05];
  @Input() smokeColor: [number, number, number] = [1, 0.43, 0.1];

  private instance: BlazeInstance | null = null;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.zone.runOutsideAngular(() => {
      try {
        this.instance = createBlaze(
          {
            source: this.sourceRef.nativeElement,
            content: this.contentRef.nativeElement,
            output: this.outputRef.nativeElement,
          },
          this.options(),
        );
      } catch {
        // WebGL is an enhancement; the hero remains usable when it is unavailable.
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

  private options(): BlazeOptions {
    return {
      height: this.height,
      distortion: this.distortion,
      distortionScale: this.distortionScale,
      speed: this.speed,
      sparks: this.sparks,
      sparkDensity: this.sparkDensity,
      sparkSize: this.sparkSize,
      layers: this.layers,
      smoke: this.smoke,
      glow: this.glow,
      sparkColor: this.sparkColor,
      smokeColor: this.smokeColor,
    };
  }
}
