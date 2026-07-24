import { HttpEventType } from '@angular/common/http';
import { defer, of, throwError } from 'rxjs';
import {
  CompleteSpecUploadSessionRequest,
  ConfirmSpecUploadFileRequest,
  CreateSpecUploadSessionRequest,
  PrepareSpecUploadFileRequest,
  SaveSpecUploadMetadataRequest,
  type SpecUploadSessionDto,
} from '../core/api/spec-upload.requests';
import type { Spec } from '../models';
import {
  normalizeSpecUploadContentType,
  SpecUploadCompletionError,
  SpecUploadService,
  type SpecFileUploadEvent,
  type SpecUploadSourceFile,
} from './spec-upload.service';

describe('SpecUploadService', () => {
  const session: SpecUploadSessionDto = {
    upload_id: 'upload-1',
    spec_id: 'spec-1',
    expires_at: '2026-07-24T12:00:00Z',
  };
  const completedSpec = { id: 'spec-1', title: 'Moonlight' } as Spec;
  const instruction = {
    asset_id: 'asset-1',
    kind: 'preview' as const,
    object_key: 'incoming/preview.mp3',
    upload_url: 'https://storage.test/preview.mp3',
    method: 'PUT' as const,
    headers: { 'Content-Type': 'audio/mpeg' },
  };
  const confirmed = {
    asset_id: 'asset-1',
    kind: 'preview' as const,
    file_name: 'preview.mp3',
    content_type: 'audio/mpeg',
    size_bytes: 8,
  };

  function setup() {
    const api = {
      execute: vi.fn((request: unknown) => {
        if (request instanceof CreateSpecUploadSessionRequest) return of(session);
        if (request instanceof PrepareSpecUploadFileRequest) return of(instruction);
        if (request instanceof ConfirmSpecUploadFileRequest) return of(confirmed);
        if (request instanceof SaveSpecUploadMetadataRequest) return of(undefined);
        return of({ id: 'spec-1' });
      }),
    };
    const objectStorage = {
      upload: vi.fn(() =>
        of(
          { type: HttpEventType.UploadProgress, loaded: 4, total: 8 },
          { type: HttpEventType.Response, body: '' },
        ),
      ),
    };
    const adapter = { adapt: vi.fn(() => completedSpec) };
    const service = Object.create(SpecUploadService.prototype) as SpecUploadService;
    (service as any).api = api;
    (service as any).objectStorage = objectStorage;
    (service as any).adapter = adapter;
    return { service, api, objectStorage, adapter };
  }

  it('creates an empty draft session', () => {
    const { service, api } = setup();
    let result: SpecUploadSessionDto | undefined;

    service.createDraft().subscribe((value) => (result = value));

    expect(result).toEqual(session);
    expect(api.execute.mock.calls[0][0]).toBeInstanceOf(CreateSpecUploadSessionRequest);
  });

  it('prepares, uploads, verifies, and confirms one selected file', () => {
    const { service, api, objectStorage } = setup();
    const source: SpecUploadSourceFile = {
      kind: 'preview',
      file: new File(['12345678'], 'preview.mp3', { type: 'audio/mpeg' }),
      contentType: 'audio/mpeg',
    };
    const events: SpecFileUploadEvent[] = [];

    service.uploadFile('upload-1', source).subscribe((event) => events.push(event));

    const prepare = api.execute.mock.calls[0][0] as PrepareSpecUploadFileRequest;
    expect(prepare.body).toEqual({
      kind: 'preview',
      file_name: 'preview.mp3',
      content_type: 'audio/mpeg',
      size_bytes: 8,
    });
    expect(objectStorage.upload).toHaveBeenCalledWith(instruction, source.file);
    expect(api.execute.mock.calls[1][0]).toBeInstanceOf(ConfirmSpecUploadFileRequest);
    expect(events).toEqual([
      { type: 'progress', percent: 0 },
      { type: 'progress', percent: 50 },
      { type: 'verifying' },
      { type: 'completed', file: confirmed },
    ]);
  });

  it('does not confirm a file when direct storage upload fails', () => {
    const { service, api, objectStorage } = setup();
    objectStorage.upload.mockReturnValue(throwError(() => new Error('storage unavailable')));
    const error = vi.fn();

    service
      .uploadFile('upload-1', {
        kind: 'preview',
        file: new File(['preview'], 'preview.mp3', { type: 'audio/mpeg' }),
        contentType: 'audio/mpeg',
      })
      .subscribe({ error });

    expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'storage unavailable' }));
    expect(api.execute).toHaveBeenCalledTimes(1);
  });

  it('saves final metadata before queueing processing', () => {
    const { service, api, adapter } = setup();
    const events: unknown[] = [];

    service.publishBeat('upload-1', { title: 'Moonlight' }).subscribe((event) => {
      events.push(event);
    });

    expect(api.execute.mock.calls[0][0]).toBeInstanceOf(SaveSpecUploadMetadataRequest);
    expect(api.execute.mock.calls[1][0]).toBeInstanceOf(CompleteSpecUploadSessionRequest);
    expect(adapter.adapt).toHaveBeenCalledWith({ id: 'spec-1' });
    expect(events).toEqual([{ type: 'completed', spec: completedSpec, uploadId: 'upload-1' }]);
  });

  it('retries idempotent completion once and preserves the upload id on failure', () => {
    const { service, api } = setup();
    let completionAttempts = 0;
    api.execute.mockImplementation((request: unknown) =>
      request instanceof CompleteSpecUploadSessionRequest
        ? defer(() => {
            completionAttempts++;
            return throwError(() => ({ status: 0, message: 'connection lost' }));
          })
        : of(undefined),
    );
    const error = vi.fn();

    service.completeUpload('upload-retry').subscribe({ error });

    expect(completionAttempts).toBe(2);
    expect(error).toHaveBeenCalledWith(expect.any(SpecUploadCompletionError));
    expect((error.mock.calls[0][0] as SpecUploadCompletionError).uploadId).toBe('upload-retry');
  });

  it('normalizes browser file types for every supported asset kind', () => {
    expect(
      normalizeSpecUploadContentType('image', new File(['x'], 'cover.png', { type: 'image/png' })),
    ).toBe('image/png');
    expect(
      normalizeSpecUploadContentType('image', new File(['x'], 'cover.jpg', { type: 'image/jpeg' })),
    ).toBe('image/jpeg');
    expect(normalizeSpecUploadContentType('preview', new File(['x'], 'p.mp3'))).toBe('audio/mpeg');
    expect(normalizeSpecUploadContentType('wav', new File(['x'], 'master.wav'))).toBe('audio/wav');
    expect(normalizeSpecUploadContentType('stems', new File(['x'], 'stems.zip'))).toBe(
      'application/zip',
    );
    expect(normalizeSpecUploadContentType('stems', new File(['x'], 'stems.rar'))).toBe(
      'application/vnd.rar',
    );
  });
});
