import { HttpEventType } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, filter, map, retry, switchMap, take, tap, throwError } from 'rxjs';
import { SpecAdapter } from '../adapters/spec.adapter';
import {
  ConfirmSpecUploadFileRequest,
  CompleteSpecUploadSessionRequest,
  CreateSpecUploadSessionRequest,
  PrepareSpecUploadFileRequest,
  SaveSpecUploadMetadataRequest,
  type ConfirmedSpecUploadFileDto,
  type SpecUploadFileDescriptorDto,
  type SpecUploadFileKind,
  type SpecUploadSessionDto,
} from '../core/api/spec-upload.requests';
import { ApiService } from '../core/services/api.service';
import { ObjectStorageUploadService } from '../core/services/object-storage-upload.service';
import type { Spec } from '../models';

export interface SpecUploadSourceFile {
  kind: SpecUploadFileKind;
  file: File;
  contentType: string;
}

export type SpecUploadEvent = {
  type: 'completed';
  spec: Spec;
  uploadId: string;
};

export type SpecFileUploadEvent =
  | {
      type: 'progress';
      percent: number;
    }
  | {
      type: 'verifying';
    }
  | {
      type: 'completed';
      file: ConfirmedSpecUploadFileDto;
    };

export class SpecUploadCompletionError extends Error {
  override readonly name = 'SpecUploadCompletionError';

  constructor(
    readonly uploadId: string,
    override readonly cause: unknown,
  ) {
    super(`Could not confirm finalization for upload ${uploadId}.`);
  }
}

@Injectable({
  providedIn: 'root',
})
export class SpecUploadService {
  private readonly api = inject(ApiService);
  private readonly objectStorage = inject(ObjectStorageUploadService);
  private readonly adapter = inject(SpecAdapter);

  createDraft(): Observable<SpecUploadSessionDto> {
    return this.api.execute(new CreateSpecUploadSessionRequest());
  }

  uploadFile(uploadId: string, source: SpecUploadSourceFile): Observable<SpecFileUploadEvent> {
    return new Observable<SpecFileUploadEvent>((subscriber) => {
      const subscription = this.api
        .execute(new PrepareSpecUploadFileRequest(uploadId, this.toDescriptor(source)))
        .pipe(
          switchMap((instruction) => {
            if (instruction.method !== 'PUT') {
              throw new Error(`Unsupported storage upload method for ${source.kind}.`);
            }
            subscriber.next({ type: 'progress', percent: 0 });
            return this.objectStorage.upload(instruction, source.file).pipe(
              tap((event) => {
                if (event.type !== HttpEventType.UploadProgress) return;
                const total = event.total || source.file.size;
                const percent = total > 0 ? Math.round((event.loaded / total) * 100) : 0;
                subscriber.next({
                  type: 'progress',
                  percent: Math.min(99, Math.max(0, percent)),
                });
              }),
              filter((event) => event.type === HttpEventType.Response),
              take(1),
              tap(() => subscriber.next({ type: 'verifying' })),
              switchMap(() =>
                this.api.execute(new ConfirmSpecUploadFileRequest(uploadId, instruction.asset_id)),
              ),
            );
          }),
        )
        .subscribe({
          next: (file) => subscriber.next({ type: 'completed', file }),
          error: (error) => subscriber.error(error),
          complete: () => subscriber.complete(),
        });
      return () => subscription.unsubscribe();
    });
  }

  publishBeat(uploadId: string, metadata: Record<string, unknown>): Observable<SpecUploadEvent> {
    return this.api.execute(new SaveSpecUploadMetadataRequest(uploadId, metadata)).pipe(
      switchMap(() => this.completeSession(uploadId)),
      map(({ spec, uploadId: completedUploadId }) => ({
        type: 'completed' as const,
        spec,
        uploadId: completedUploadId,
      })),
    );
  }

  completeUpload(uploadId: string): Observable<SpecUploadEvent> {
    return this.completeSession(uploadId).pipe(
      map(({ spec, uploadId: completedUploadId }) => ({
        type: 'completed' as const,
        spec,
        uploadId: completedUploadId,
      })),
    );
  }

  private completeSession(uploadId: string): Observable<{ spec: Spec; uploadId: string }> {
    return this.api.execute(new CompleteSpecUploadSessionRequest(uploadId)).pipe(
      // Completion is idempotent for a session. One immediate retry covers the
      // common lost-response case without creating a second upload/spec.
      retry({ count: 1 }),
      map((dto) => ({
        spec: this.adapter.adapt(dto),
        uploadId,
      })),
      catchError((cause) => throwError(() => new SpecUploadCompletionError(uploadId, cause))),
    );
  }

  private toDescriptor(source: SpecUploadSourceFile): SpecUploadFileDescriptorDto {
    return {
      kind: source.kind,
      file_name: source.file.name,
      content_type: source.contentType,
      size_bytes: source.file.size,
    };
  }
}

export function normalizeSpecUploadContentType(kind: SpecUploadFileKind, file: File): string {
  switch (kind) {
    case 'image':
      return file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    case 'preview':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'stems':
      return file.name.toLowerCase().endsWith('.rar') ? 'application/vnd.rar' : 'application/zip';
  }
}
