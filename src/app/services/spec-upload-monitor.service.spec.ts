import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  GetSpecUploadStatusRequest,
  type SpecUploadStatusDto,
} from '../core/api/spec-upload.requests';
import { ApiService } from '../core/services/api.service';
import { LabService } from './lab';
import {
  SPEC_UPLOAD_MONITOR_STORAGE_KEY,
  SpecUploadMonitorService,
} from './spec-upload-monitor.service';
import { ToastService } from './toast.service';

describe('SpecUploadMonitorService', () => {
  const notifyRefresh = vi.fn();
  const show = vi.fn();
  const execute = vi.fn();

  function status(
    value: SpecUploadStatusDto['status'],
    overrides: Partial<SpecUploadStatusDto> = {},
  ): SpecUploadStatusDto {
    return {
      upload_id: 'upload-1',
      spec_id: 'spec-1',
      status: value,
      processing_status:
        value === 'completed' ? 'completed' : value === 'failed' ? 'failed' : 'processing',
      created_at: '2026-07-23T12:00:00Z',
      updated_at: '2026-07-23T12:00:00Z',
      expires_at: '2026-07-23T13:00:00Z',
      ...overrides,
    };
  }

  function create() {
    TestBed.configureTestingModule({
      providers: [
        SpecUploadMonitorService,
        { provide: ApiService, useValue: { execute } },
        { provide: LabService, useValue: { notifyRefresh } },
        { provide: ToastService, useValue: { show } },
      ],
    });
    return TestBed.inject(SpecUploadMonitorService);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls immediately, deduplicates the upload id, and stops after success', async () => {
    execute
      .mockReturnValueOnce(of(status('queued', { processing_status: 'pending' })))
      .mockReturnValueOnce(of(status('processing')))
      .mockReturnValueOnce(of(status('completed')));
    const service = create();

    service.monitor('upload-1');
    service.monitor('upload-1');
    await vi.advanceTimersByTimeAsync(0);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toBeInstanceOf(GetSpecUploadStatusRequest);
    expect(service.isMonitoring('upload-1')).toBe(true);

    await vi.advanceTimersByTimeAsync(3_000);
    expect(execute).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(3_000);
    expect(execute).toHaveBeenCalledTimes(3);
    expect(notifyRefresh).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith('Upload processing complete. Your beat is ready.', 'success');
    expect(service.isMonitoring('upload-1')).toBe(false);

    await vi.advanceTimersByTimeAsync(6_000);
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it('shows the backend error and stops after failure', async () => {
    execute.mockReturnValue(of(status('failed', { error: 'Waveform extraction failed.' })));
    const service = create();

    service.monitor('upload-1');
    await vi.advanceTimersByTimeAsync(0);

    expect(notifyRefresh).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith('Waveform extraction failed.', 'error');
    expect(service.isMonitoring('upload-1')).toBe(false);
  });

  it('survives a transient status error and retries on the next interval', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    execute
      .mockReturnValueOnce(throwError(() => new Error('temporary')))
      .mockReturnValueOnce(of(status('expired')));
    const service = create();

    service.monitor('upload-1');
    await vi.advanceTimersByTimeAsync(0);
    expect(service.isMonitoring('upload-1')).toBe(true);

    await vi.advanceTimersByTimeAsync(3_000);

    expect(execute).toHaveBeenCalledTimes(2);
    expect(show).toHaveBeenCalledWith(
      'Upload session expired before processing completed.',
      'error',
    );
    expect(service.isMonitoring('upload-1')).toBe(false);
    errorSpy.mockRestore();
  });

  it('stops polling and clears persistence after a permanent status error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    execute.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' })),
    );
    const service = create();

    service.monitor('upload-1');
    await vi.advanceTimersByTimeAsync(0);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(service.isMonitoring('upload-1')).toBe(false);
    expect(window.localStorage.getItem(SPEC_UPLOAD_MONITOR_STORAGE_KEY)).toBeNull();
    expect(show).toHaveBeenCalledWith(
      'We could not keep checking this upload. Open Studio to check its status.',
      'error',
    );
    errorSpy.mockRestore();
  });

  it('resumes a persisted monitor after the service is recreated', async () => {
    execute.mockReturnValue(of(status('completed')));
    const service = create();

    service.monitor('upload-1');
    service.ngOnDestroy();
    expect(window.localStorage.getItem(SPEC_UPLOAD_MONITOR_STORAGE_KEY)).toContain('upload-1');

    service.resumePersisted();
    await vi.advanceTimersByTimeAsync(0);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith('Upload processing complete. Your beat is ready.', 'success');
    expect(window.localStorage.getItem(SPEC_UPLOAD_MONITOR_STORAGE_KEY)).toBeNull();
  });

  it('ignores blank upload ids', async () => {
    const service = create();

    service.monitor('   ');
    await vi.advanceTimersByTimeAsync(0);

    expect(execute).not.toHaveBeenCalled();
  });
});
