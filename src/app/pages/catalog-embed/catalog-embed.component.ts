import { Component, ElementRef, HostListener, inject, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-catalog-embed',
  standalone: true,
  templateUrl: './catalog-embed.component.html',
  styleUrl: './catalog-embed.component.scss',
})
export class CatalogEmbedComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('catalogFrame') catalogFrame?: ElementRef<HTMLIFrameElement>;

  readonly src = this.route.snapshot.data['src'] as string;
  readonly trustedSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.src);
  readonly title = this.route.snapshot.data['title'] as string;

  @HostListener('window:message', ['$event'])
  onCatalogMessage(event: MessageEvent) {
    if (
      event.origin !== window.location.origin ||
      event.source !== this.catalogFrame?.nativeElement.contentWindow
    ) {
      return;
    }

    if (event.data?.type === 'waveyard-open-pack') {
      this.router.navigate(['/sample-packs', event.data.slug]);
    }

    if (event.data?.type === 'waveyard-open-packs') {
      this.router.navigate(['/sample-packs']);
    }
  }
}
