import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { LegalAdapter } from '../adapters/legal.adapter';
import {
  GetLegalDocumentRequest,
  GetLegalDocumentVersionRequest,
  GetLegalDocumentVersionsRequest,
  GetLegalRequirementsRequest,
  RecordLegalAcceptanceRequest,
} from '../core/api/legal.requests';
import { ApiService } from '../core/services/api.service';
import type {
  LegalAcceptancePayload,
  LegalDocumentDto,
  LegalDocumentViewDto,
  LegalRequirementDto,
  LegalVersionDto,
} from '../models/legal.model';
import { LegalService } from './legal.service';

describe('LegalService', () => {
  let service: LegalService;
  let mockApi: { execute: ReturnType<typeof vi.fn> };

  const mockVersionDto: LegalVersionDto = {
    id: 'ver-123',
    document_key: 'terms',
    display_version: '1.0.0',
    schema_version: 1,
    title: 'Terms of Use',
    summary: 'Standard terms of use',
    sections: [
      {
        id: 'sec-1',
        order: 1,
        title: 'Introduction',
        content: 'Welcome to Waveyard.',
        summary: 'Intro summary',
      },
    ],
    content_hash: 'hash-abc-123',
    update_classification: 'material',
    status: 'published',
    published_at: '2026-11-06T00:00:00Z',
    effective_at: '2026-11-06T00:00:00Z',
  };

  const mockDocDto: LegalDocumentDto = {
    id: 'doc-123',
    key: 'terms',
    audience: 'buyer',
    locale: 'en',
    title: 'Terms of Use',
  };

  const mockViewDto: LegalDocumentViewDto = {
    document: mockDocDto,
    current_version: mockVersionDto,
  };

  beforeEach(() => {
    mockApi = {
      execute: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [LegalService, LegalAdapter, { provide: ApiService, useValue: mockApi }],
    });

    service = TestBed.inject(LegalService);
  });

  it('getDocument delegates to ApiService and adapts the document view', () => {
    mockApi.execute.mockReturnValue(of(mockViewDto));

    let result: unknown;
    service.getDocument('terms', 'en').subscribe((val) => {
      result = val;
    });

    expect(mockApi.execute).toHaveBeenCalledTimes(1);
    const req = mockApi.execute.mock.calls[0][0];
    expect(req).toBeInstanceOf(GetLegalDocumentRequest);
    expect(req.path).toBe('/api/v1/legal/documents/terms');
    expect(req.params.get('locale')).toBe('en');

    expect(result).toBeDefined();
    const view = result as { document: { key: string }; currentVersion: { id: string } };
    expect(view.document.key).toBe('terms');
    expect(view.currentVersion.id).toBe('ver-123');
  });

  it('getDocument falls back to in-memory cached view if subsequent call fails', () => {
    mockApi.execute.mockReturnValue(of(mockViewDto));

    // First successful call populates cache
    service.getDocument('terms', 'en').subscribe();

    // Second call fails with network error
    mockApi.execute.mockReturnValue(throwError(() => new Error('Network error')));

    let fallbackResult: unknown;
    service.getDocument('terms', 'en').subscribe((val) => {
      fallbackResult = val;
    });

    expect(fallbackResult).toBeDefined();
    const view = fallbackResult as { currentVersion: { id: string } };
    expect(view.currentVersion.id).toBe('ver-123');
  });

  it('getDocument re-throws error if cache is empty', () => {
    mockApi.execute.mockReturnValue(throwError(() => new Error('Server offline')));

    let errorOccurred = false;
    service.getDocument('unknown-doc', 'en').subscribe({
      next: () => fail('Should have failed'),
      error: () => {
        errorOccurred = true;
      },
    });

    expect(errorOccurred).toBe(true);
  });

  it('getDocumentVersions delegates to ApiService and adapts version array', () => {
    mockApi.execute.mockReturnValue(of({ data: [mockVersionDto] }));

    let versions: unknown[] = [];
    service.getDocumentVersions('terms').subscribe((res) => {
      versions = res;
    });

    expect(mockApi.execute).toHaveBeenCalledTimes(1);
    const req = mockApi.execute.mock.calls[0][0];
    expect(req).toBeInstanceOf(GetLegalDocumentVersionsRequest);
    expect(req.path).toBe('/api/v1/legal/documents/terms/versions');
    expect(versions).toHaveLength(1);
  });

  it('getDocumentVersion delegates to ApiService for a specific version', () => {
    mockApi.execute.mockReturnValue(of(mockVersionDto));

    let version: unknown;
    service.getDocumentVersion('terms', '1.0.0').subscribe((res) => {
      version = res;
    });

    expect(mockApi.execute).toHaveBeenCalledTimes(1);
    const req = mockApi.execute.mock.calls[0][0];
    expect(req).toBeInstanceOf(GetLegalDocumentVersionRequest);
    expect(req.path).toBe('/api/v1/legal/documents/terms/versions/1.0.0');
    expect(version).toBeDefined();
  });

  it('getRequirements delegates to ApiService and returns adapted requirements', () => {
    const reqDto: LegalRequirementDto = {
      document_key: 'terms',
      title: 'Terms of Use',
      current_version: mockVersionDto,
      accepted: true,
      last_accepted_at: '2026-11-06T01:00:00Z',
    };
    mockApi.execute.mockReturnValue(of({ data: [reqDto] }));

    let requirements: unknown[] = [];
    service.getRequirements().subscribe((res) => {
      requirements = res;
    });

    expect(mockApi.execute).toHaveBeenCalledTimes(1);
    const req = mockApi.execute.mock.calls[0][0];
    expect(req).toBeInstanceOf(GetLegalRequirementsRequest);
    expect(requirements).toHaveLength(1);
  });

  it('recordAcceptance calls ApiService with RecordLegalAcceptanceRequest and returns success status', () => {
    mockApi.execute.mockReturnValue(of({ success: true, message: 'Recorded' }));

    const payload: LegalAcceptancePayload = {
      documentKey: 'terms',
      versionId: 'ver-123',
      contentHash: 'hash-abc-123',
      action: 'checkout_checkbox',
      context: { checkout_id: 'chk-999' },
    };

    let success = false;
    service.recordAcceptance(payload).subscribe((res) => {
      success = res;
    });

    expect(mockApi.execute).toHaveBeenCalledTimes(1);
    const req = mockApi.execute.mock.calls[0][0];
    expect(req).toBeInstanceOf(RecordLegalAcceptanceRequest);
    expect(req.body.document_key).toBe('terms');
    expect(req.body.version_id).toBe('ver-123');
    expect(req.body.content_hash).toBe('hash-abc-123');
    expect(req.body.action).toBe('checkout_checkbox');
    expect(success).toBe(true);
  });
});
