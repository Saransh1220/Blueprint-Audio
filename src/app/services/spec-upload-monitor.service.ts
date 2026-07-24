import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, OnDestroy, inject } from '@angular/core';
import {
  EMPTY,
  Subscription,
  catchError,
  exhaustMap,
  finalize,
  takeWhile,
  tap,
  throwError,
  timer,
} from 'rxjs';
import {
  GetSpecUploadStatusRequest,
  type SpecUploadStatusDto,
} from '../core/api/spec-upload.requests';
import { ApiService } from '../core/services/api.service';
import { LabService } from './lab';
import { ToastService } from './toast.service';

const PROCESSING_POLL_INTERVAL_MS = 3_000;
const MAX_CONSECUTIVE_STATUS_ERRORS = 5;
const MAX_MONITOR_AGE_MS = 24 * 60 * 60 * 1_000;
export const SPEC_UPLOAD_MONITOR_STORAGE_KEY = 'waveyard.active-spec-uploads.v1';

interface PersistedUploadMonitor {
  uploadId: string;
  startedAt: number;
}

class UploadMonitorStoppedError extends Error {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
  }
}

@Injectable({
  providedIn: 'root',
})
export class SpecUploadMonitorService implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly labService = inject(LabService);
  private readonly toastService = inject(ToastService);
  private readonly activePolls = new Map<string, Subscription>();
  private readonly consecutiveErrors = new Map<string, number>();

  resumePersisted() {
    const now = Date.now();
    for (const entry of this.readPersisted()) {
      if (now - entry.startedAt >= MAX_MONITOR_AGE_MS) {
        this.removePersisted(entry.uploadId);
        continue;
      }
      this.monitor(entry.uploadId, entry.startedAt);
    }
  }

  monitor(uploadId: string, monitorStartedAt = Date.now()) {
    const normalizedId = uploadId.trim();
    if (!normalizedId || this.activePolls.has(normalizedId)) return;

    this.consecutiveErrors.set(normalizedId, 0);
    this.persist(normalizedId, monitorStartedAt);

    const subscription = timer(0, PROCESSING_POLL_INTERVAL_MS)
      .pipe(
        exhaustMap(() => {
          if (Date.now() - monitorStartedAt >= MAX_MONITOR_AGE_MS) {
            return throwError(
              () =>
                new UploadMonitorStoppedError(
                  'Upload processing is taking longer than expected. Check Studio again later.',
                ),
            );
          }

          return this.api.execute(new GetSpecUploadStatusRequest(normalizedId)).pipe(
            tap(() => this.consecutiveErrors.set(normalizedId, 0)),
            catchError((error) => {
              const failures = (this.consecutiveErrors.get(normalizedId) ?? 0) + 1;
              this.consecutiveErrors.set(normalizedId, failures);
              console.error(`Failed to check upload ${normalizedId} status`, error);

              if (
                !this.isRetriableStatusError(error) ||
                failures >= MAX_CONSECUTIVE_STATUS_ERRORS
              ) {
                return throwError(
                  () =>
                    new UploadMonitorStoppedError(
                      'We could not keep checking this upload. Open Studio to check its status.',
                      error,
                    ),
                );
              }
              return EMPTY;
            }),
          );
        }),
        tap((status) => {
          if (this.isTerminal(status)) {
            this.handleTerminalStatus(status);
            this.removePersisted(normalizedId);
          }
        }),
        takeWhile((status) => !this.isTerminal(status), true),
        finalize(() => {
          this.activePolls.delete(normalizedId);
          this.consecutiveErrors.delete(normalizedId);
        }),
      )
      .subscribe({
        error: (error) => {
          this.removePersisted(normalizedId);
          const message =
            error instanceof UploadMonitorStoppedError
              ? error.message
              : 'We could not keep checking this upload. Open Studio to check its status.';
          this.toastService.show(message, 'error');
        },
      });

    this.activePolls.set(normalizedId, subscription);
  }

  isMonitoring(uploadId: string) {
    return this.activePolls.has(uploadId.trim());
  }

  ngOnDestroy() {
    for (const subscription of this.activePolls.values()) {
      subscription.unsubscribe();
    }
    this.activePolls.clear();
  }

  private isTerminal(status: SpecUploadStatusDto) {
    return (
      status.status === 'completed' || status.status === 'failed' || status.status === 'expired'
    );
  }

  private isRetriableStatusError(error: unknown) {
    if (!(error instanceof HttpErrorResponse)) return true;
    return (
      error.status === 0 ||
      error.status === 408 ||
      error.status === 425 ||
      error.status === 429 ||
      error.status >= 500
    );
  }

  private persist(uploadId: string, startedAt: number) {
    const entries = this.readPersisted().filter((entry) => entry.uploadId !== uploadId);
    entries.push({ uploadId, startedAt });
    this.writePersisted(entries);
  }

  private removePersisted(uploadId: string) {
    this.writePersisted(this.readPersisted().filter((entry) => entry.uploadId !== uploadId));
  }

  private readPersisted(): PersistedUploadMonitor[] {
    try {
      const raw = window.localStorage.getItem(SPEC_UPLOAD_MONITOR_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (entry): entry is PersistedUploadMonitor =>
          !!entry &&
          typeof entry.uploadId === 'string' &&
          entry.uploadId.trim().length > 0 &&
          typeof entry.startedAt === 'number' &&
          Number.isFinite(entry.startedAt),
      );
    } catch {
      return [];
    }
  }

  private writePersisted(entries: PersistedUploadMonitor[]) {
    try {
      if (entries.length) {
        window.localStorage.setItem(SPEC_UPLOAD_MONITOR_STORAGE_KEY, JSON.stringify(entries));
      } else {
        window.localStorage.removeItem(SPEC_UPLOAD_MONITOR_STORAGE_KEY);
      }
    } catch {
      // Upload processing still works when browser storage is unavailable.
    }
  }

  private handleTerminalStatus(status: SpecUploadStatusDto) {
    this.labService.notifyRefresh();

    if (status.status === 'completed') {
      this.toastService.show('Upload processing complete. Your beat is ready.', 'success');
      return;
    }

    const fallback =
      status.status === 'expired'
        ? 'Upload session expired before processing completed.'
        : 'Upload processing failed.';
    this.toastService.show(status.error?.trim() || fallback, 'error');
  }
}
