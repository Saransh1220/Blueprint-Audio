import { HttpEventType, type HttpInterceptorFn } from '@angular/common/http';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { SpecUploadInstructionDto } from '../api/spec-upload.requests';
import { ObjectStorageUploadService } from './object-storage-upload.service';

describe('ObjectStorageUploadService', () => {
  let service: ObjectStorageUploadService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    const appAuthInterceptor: HttpInterceptorFn = (request, next) =>
      next(request.clone({ setHeaders: { Authorization: 'Bearer app-token' } }));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([appAuthInterceptor])),
        provideHttpClientTesting(),
        ObjectStorageUploadService,
      ],
    });

    service = TestBed.inject(ObjectStorageUploadService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('uploads the raw file to the absolute URL with exactly the signed headers', () => {
    const file = new File(['preview'], 'preview.mp3', { type: 'audio/mpeg' });
    const instruction: SpecUploadInstructionDto = {
      kind: 'preview',
      object_key: 'staging/preview.mp3',
      upload_url: 'https://storage.example.test/bucket/staging/preview.mp3?signature=abc',
      method: 'PUT',
      headers: {
        'Content-Type': 'audio/mpeg',
        'x-amz-meta-upload-id': 'upload-1',
      },
    };
    const events: number[] = [];

    service.upload(instruction, file).subscribe((event) => events.push(event.type));

    const request = httpTesting.expectOne(instruction.upload_url);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toBe(file);
    expect(request.request.withCredentials).toBe(false);
    expect(request.request.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(request.request.headers.get('x-amz-meta-upload-id')).toBe('upload-1');
    expect(request.request.headers.has('Authorization')).toBe(false);

    request.event({
      type: HttpEventType.UploadProgress,
      loaded: 4,
      total: file.size,
    });
    request.flush('', { status: 200, statusText: 'OK' });

    expect(events).toContain(HttpEventType.UploadProgress);
    expect(events).toContain(HttpEventType.Response);
  });
});
