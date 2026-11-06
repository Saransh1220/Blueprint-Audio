import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BRAND } from '../../core/config/brand';
import { LegalService } from '../../services/legal.service';
import { LegalVersion } from '../../models/legal.model';

// Fallback baseline in case network or backend service is unreachable
const BASELINE_FALLBACKS: Record<string, LegalVersion> = {
  terms: {
    id: '11111111-1111-1111-1111-111111111111',
    documentKey: 'terms',
    displayVersion: '1.0.0',
    schemaVersion: 1,
    title: 'Terms of Use',
    summary:
      'Clear terms governing your account, beat licensing purchases, digital deliverables, and consumer rights on Waveyard.',
    sections: [
      {
        id: 'who-we-are',
        order: 1,
        title: 'Who we are and what these terms cover',
        content:
          'Waveyard is a curated personal music producer storefront operated for licensing beats and sound assets. These Terms govern your access to the store, account creation, and purchases.',
        summary: 'Waveyard is an independent beat storefront, not a third-party open marketplace.',
      },
      {
        id: 'eligibility',
        order: 2,
        title: 'Eligibility and agreement',
        content:
          'You must be at least 18 years old and legally competent to enter into a binding contract. By registering or completing a purchase, you agree to these Terms.',
        summary: 'Adults-only purchasing; affirmative agreement required.',
      },
      {
        id: 'account-security',
        order: 3,
        title: 'Your account and security',
        content:
          'You are responsible for keeping your credentials confidential. You must notify us promptly of any unauthorized account activity. Do not share accounts to evade license limits.',
        summary: 'Keep your credentials safe; one licensee per purchase.',
      },
      {
        id: 'orders-and-payments',
        order: 4,
        title: 'Orders, prices, and payments',
        content:
          'Checkout displays the exact currency, price, and payment gateway. Digital delivery occurs immediately upon verified payment. We will never apply post-purchase price changes without consent.',
        summary: 'Transparent pricing in INR or USD with instant digital delivery.',
      },
      {
        id: 'content-licenses',
        order: 5,
        title: 'Your content licenses',
        content:
          'Each beat purchase grants you the specific non-exclusive license rights stated in the selected tier agreement (Basic, Premium, Trackout, or Unlimited). Purchasing does not transfer copyright.',
        summary: 'Licenses grant designated usage rights, not copyright ownership.',
      },
      {
        id: 'refunds-and-remedies',
        order: 6,
        title: 'Refunds and remedies',
        content:
          'If deliverables are corrupted, materially defective, or duplicate charges occur, contact support for a prompt resolution, replacement, or refund in compliance with consumer protection laws.',
        summary: 'Remedies available for defects, duplicates, or fulfillment failures.',
      },
      {
        id: 'acceptable-use',
        order: 7,
        title: 'Acceptable use and copyright protection',
        content:
          'You may not reverse-engineer, scrape, redistribute raw stems, or register licensed beats into Content ID systems that block other legitimate licensees.',
        summary: 'No raw stem resale; no abusive Content ID registrations.',
      },
    ],
    contentHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef',
    updateClassification: 'material',
    status: 'published',
    publishedAt: '2026-11-06T00:00:00Z',
    effectiveAt: '2026-11-06T00:00:00Z',
  },
  privacy: {
    id: '22222222-2222-2222-2222-222222222222',
    documentKey: 'privacy',
    displayVersion: '1.0.0',
    schemaVersion: 1,
    title: 'Privacy Policy',
    summary:
      'Our transparent commitments regarding personal data collection, account security, payment processing, and your privacy rights.',
    sections: [
      {
        id: 'data-controller',
        order: 1,
        title: 'Who handles your information',
        content:
          'Waveyard is the data controller for personal data collected through waveyard.studio and associated storefront services.',
        summary: 'Direct operator accountability for your personal data.',
      },
      {
        id: 'data-collected',
        order: 2,
        title: 'Information we collect and why',
        content:
          'We collect account details (email, username, password hashes), transaction records for order fulfillment, and technical diagnostic telemetry.',
        summary: 'Only data necessary for account access and order fulfillment is collected.',
      },
      {
        id: 'payments-and-processors',
        order: 3,
        title: 'Payment processors and third parties',
        content:
          'Payment transactions are handled securely by PCI-compliant gateways (Razorpay, Dodo Payments). We never store full card numbers or sensitive banking credentials on our servers.',
        summary: 'Zero storage of credit card or bank credentials on our systems.',
      },
      {
        id: 'cookies-and-storage',
        order: 4,
        title: 'Cookies and browser storage',
        content:
          'We use strictly necessary browser storage for active sessions, cart contents, and interface preferences. We do not sell your personal data or deploy cross-site tracking brokers.',
        summary: 'Strictly functional cookies; zero third-party data brokers.',
      },
      {
        id: 'your-rights',
        order: 5,
        title: 'Your rights and data requests',
        content:
          'You have the right to access, rectify, or request deletion of your personal data, subject to statutory accounting and tax retention requirements.',
        summary: 'Right to access, export, or delete your account data at any time.',
      },
    ],
    contentHash: 'b2c3d4e5f6a10718293a4b5c6d7e8f901234567890abcdef1234567890abcdef',
    updateClassification: 'material',
    status: 'published',
    publishedAt: '2026-11-06T00:00:00Z',
    effectiveAt: '2026-11-06T00:00:00Z',
  },
  licensing: {
    id: '33333333-3333-3333-3333-333333333333',
    documentKey: 'licensing',
    displayVersion: '1.0.0',
    schemaVersion: 1,
    title: 'Licensing Guide & Terms',
    summary:
      'Comprehensive explanation of license tiers, deliverable audio file formats, commercial stream limits, and permitted usage rights.',
    sections: [
      {
        id: 'license-overview',
        order: 1,
        title: 'How beat licensing works',
        content:
          'Every beat available on Waveyard comes with clear license tier options. Licensing grants you permission to record vocals and distribute your new master recording under explicit terms.',
        summary: 'Choose the right tier based on your release and distribution needs.',
      },
      {
        id: 'tier-comparison',
        order: 2,
        title: 'License tier comparison',
        content:
          'We offer four transparent license tiers: Basic Lease (MP3, 50k streams), Premium Lease (MP3 + WAV, 250k streams), Trackout Lease (MP3 + WAV + Separated Track Stems, 1M streams), and Unlimited Lease (All files, unlimited streams).',
        summary: 'Structured rights scaling from demo releases to commercial broadcasting.',
        table: {
          headers: [
            'License Tier',
            'Audio Files',
            'Audio Streams',
            'Music Videos',
            'Radio Stations',
          ],
          rows: [
            ['Basic Lease', 'Tagged/Untagged MP3', '50,000', '1 Non-monetized', '0'],
            ['Premium Lease', 'MP3 + 24-bit WAV', '250,000', '1 Monetized', '2 Stations'],
            ['Trackout Lease', 'MP3 + WAV + Stems', '1,000,000', 'Unlimited', 'Unlimited'],
            ['Unlimited Lease', 'All Formats + Stems', 'Unlimited', 'Unlimited', 'Unlimited'],
          ],
        },
      },
      {
        id: 'free-vs-paid',
        order: 3,
        title: 'Free downloads vs commercial licenses',
        content:
          'Free MP3 downloads are provided solely for non-commercial audition, writing demos, or personal evaluation. Commercial release on streaming platforms requires purchasing a license tier.',
        summary: 'Free downloads = non-commercial audition only.',
      },
      {
        id: 'credit-requirements',
        order: 4,
        title: 'Credit and attribution',
        content:
          'Licensees must give production credit in the title, description, or metadata where customary (e.g. Prod. by Waveyard).',
        summary: 'Producer credit required on all released recordings.',
      },
      {
        id: 'retained-proof',
        order: 5,
        title: 'Your license agreement proof',
        content:
          'Upon successful payment, an immutable agreement record is pinned to your order. You can view, print, or download your verified license agreement proof anytime in Studio Purchases.',
        summary: 'Permanent, downloadable contract proof available in your account.',
      },
    ],
    contentHash: 'c3d4e5f6a1b20718293a4b5c6d7e8f901234567890abcdef1234567890abcdef',
    updateClassification: 'material',
    status: 'published',
    publishedAt: '2026-11-06T00:00:00Z',
    effectiveAt: '2026-11-06T00:00:00Z',
  },
};

@Component({
  selector: 'app-legal',
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './legal.component.html',
  styleUrl: './legal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalComponent implements OnInit, OnDestroy {
  readonly brand = BRAND;
  readonly currentYear = new Date().getFullYear();
  private readonly route = inject(ActivatedRoute);
  private readonly legalService = inject(LegalService, { optional: true });

  readonly currentKey = signal<string>('terms');
  readonly requestedVersion = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly activeVersion = signal<LegalVersion | null>(null);
  readonly versionHistory = signal<LegalVersion[]>([]);
  readonly activeSectionId = signal<string>('');
  readonly hashCopied = signal<boolean>(false);

  private observer: IntersectionObserver | null = null;
  private hashTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      const key = (data['document'] as string) || 'terms';
      this.currentKey.set(key);
      this.loadDocument();
    });

    this.route.queryParams.subscribe((params) => {
      const ver = params['version'] || null;
      if (ver !== this.requestedVersion()) {
        this.requestedVersion.set(ver);
        this.loadDocument();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.hashTimer) {
      clearTimeout(this.hashTimer);
      this.hashTimer = null;
    }
  }

  loadDocument(): void {
    const key = this.currentKey();
    const ver = this.requestedVersion();

    if (!this.legalService) {
      this.activeVersion.set(BASELINE_FALLBACKS[key] || BASELINE_FALLBACKS['terms']);
      this.isLoading.set(false);
      this.setupIntersectionObserver();
      this.checkInitialFragment();
      return;
    }

    this.isLoading.set(true);

    if (ver) {
      this.legalService.getDocumentVersion(key, ver).subscribe({
        next: (version) => {
          this.activeVersion.set(version);
          this.isLoading.set(false);
          this.setupIntersectionObserver();
          this.checkInitialFragment();
        },
        error: () => {
          this.activeVersion.set(BASELINE_FALLBACKS[key] || null);
          this.isLoading.set(false);
          this.setupIntersectionObserver();
          this.checkInitialFragment();
        },
      });
    } else {
      this.legalService.getDocument(key).subscribe({
        next: (view) => {
          this.activeVersion.set(view.currentVersion || null);
          this.isLoading.set(false);
          this.setupIntersectionObserver();
          this.checkInitialFragment();
        },
        error: () => {
          this.activeVersion.set(BASELINE_FALLBACKS[key] || null);
          this.isLoading.set(false);
          this.setupIntersectionObserver();
          this.checkInitialFragment();
        },
      });

      this.legalService.getDocumentVersions(key).subscribe({
        next: (history) => {
          this.versionHistory.set(history || []);
        },
        error: () => {
          this.versionHistory.set([]);
        },
      });
    }
  }

  /**
   * Smoothly scrolls to in-page section without causing router to navigate to home.
   */
  scrollToSection(event: Event, sectionId: string): void {
    event.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -84;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      this.activeSectionId.set(sectionId);
      window.history.replaceState(null, '', `/${this.currentKey()}#${sectionId}`);
    }
  }

  /**
   * Copies the full 64-character SHA-256 content hash with temporary visual feedback.
   */
  copyContentHash(hash: string): void {
    if (!hash) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(hash).then(() => {
        this.triggerCopiedState();
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = hash;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        this.triggerCopiedState();
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }

  private triggerCopiedState(): void {
    this.hashCopied.set(true);
    if (this.hashTimer) clearTimeout(this.hashTimer);
    this.hashTimer = setTimeout(() => {
      this.hashCopied.set(false);
    }, 2000);
  }

  printDocument(): void {
    window.print();
  }

  private checkInitialFragment(): void {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          const yOffset = -84;
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
          this.activeSectionId.set(hash);
        }
      }, 150);
    }
  }

  private setupIntersectionObserver(): void {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.activeSectionId.set(entry.target.id);
            break;
          }
        }
      },
      {
        rootMargin: '-84px 0px -65% 0px',
        threshold: 0,
      },
    );

    setTimeout(() => {
      const sections = document.querySelectorAll('.doc-section');
      sections.forEach((sec) => this.observer?.observe(sec));
    }, 100);
  }
}
