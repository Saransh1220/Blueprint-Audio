import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { LicenseDownloadsResponse } from '../../models/payment';
import { PaymentService } from '../../services/payment.service';

const formats = [
  { key: 'wav_url', name: 'WAV', detail: 'Lossless audio' },
  { key: 'mp3_url', name: 'MP3', detail: 'Compressed audio' },
  { key: 'stems_url', name: 'Stems', detail: 'ZIP archive' },
] as const;

@Component({
  selector: 'app-purchased-files',
  templateUrl: './purchased-files.component.html',
  styleUrl: './purchased-files.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchasedFilesComponent {
  private readonly payment = inject(PaymentService);
  private readonly destroyRef = inject(DestroyRef);

  readonly licenseId = input.required<string>();
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly files = signal<LicenseDownloadsResponse | null>(null);
  readonly formats = formats;

  loadFiles(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(false);
    this.payment
      .getLicenseDownloads(this.licenseId())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (files) => this.files.set(files),
        error: () => this.error.set(true),
      });
  }
}
