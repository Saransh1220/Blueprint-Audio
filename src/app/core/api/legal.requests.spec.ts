import { describe, it, expect } from 'vitest';
import {
  GetLegalDocumentRequest,
  GetLegalDocumentVersionRequest,
  GetLegalDocumentVersionsRequest,
  GetLegalRequirementsRequest,
  RecordLegalAcceptanceRequest,
} from './legal.requests';

describe('LegalRequests', () => {
  it('creates GetLegalDocumentRequest with correct path and params', () => {
    const req = new GetLegalDocumentRequest('terms', 'en');
    expect(req.path).toBe('/api/v1/legal/documents/terms');
    expect(req.method).toBe('GET');
    expect(req.params.get('locale')).toBe('en');
  });

  it('creates GetLegalDocumentVersionsRequest with correct path', () => {
    const req = new GetLegalDocumentVersionsRequest('privacy');
    expect(req.path).toBe('/api/v1/legal/documents/privacy/versions');
    expect(req.method).toBe('GET');
  });

  it('creates GetLegalDocumentVersionRequest with correct path', () => {
    const req = new GetLegalDocumentVersionRequest('licensing', '1.0.0');
    expect(req.path).toBe('/api/v1/legal/documents/licensing/versions/1.0.0');
    expect(req.method).toBe('GET');
  });

  it('creates GetLegalRequirementsRequest with correct path', () => {
    const req = new GetLegalRequirementsRequest();
    expect(req.path).toBe('/api/v1/legal/requirements');
    expect(req.method).toBe('GET');
  });

  it('creates RecordLegalAcceptanceRequest with correct body', () => {
    const req = new RecordLegalAcceptanceRequest({
      document_key: 'terms',
      version_id: 'uuid-1',
      content_hash: 'hash-abc',
      action: 'checkout',
      context: 'cart_payment',
    });
    expect(req.path).toBe('/api/v1/legal/acceptances');
    expect(req.method).toBe('POST');
    expect(req.body.action).toBe('checkout');
    expect(req.body.content_hash).toBe('hash-abc');
  });
});
