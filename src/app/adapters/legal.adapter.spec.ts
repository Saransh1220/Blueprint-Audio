import { describe, it, expect } from 'vitest';
import { LegalAdapter } from './legal.adapter';
import { LegalDocumentViewDto } from '../core/api/legal.requests';

describe('LegalAdapter', () => {
  const adapter = new LegalAdapter();

  const mockDto: LegalDocumentViewDto = {
    document: {
      key: 'terms',
      audience: 'buyer',
      locale: 'en',
      title: 'Terms of Use',
      created_at: '2026-11-06T00:00:00Z',
      updated_at: '2026-11-06T00:00:00Z',
    },
    current_version: {
      id: 'ver-1',
      document_key: 'terms',
      display_version: '1.0.0',
      schema_version: 1,
      title: 'Terms of Use',
      summary: 'Summary text',
      sections: [
        {
          id: 'sec-1',
          order: 1,
          title: 'Section One',
          content: 'Section content',
          summary: 'Section summary',
          table: {
            headers: ['Col A', 'Col B'],
            rows: [['A1', 'B1']],
          },
        },
      ],
      content_hash: 'hash123',
      update_classification: 'material',
      status: 'published',
      published_at: '2026-11-06T00:00:00Z',
      effective_at: '2026-11-06T00:00:00Z',
    },
  };

  it('adapts DocumentViewDto to LegalDocumentView correctly', () => {
    const model = adapter.adaptView(mockDto);
    expect(model.document.key).toBe('terms');
    expect(model.document.title).toBe('Terms of Use');
    expect(model.currentVersion.displayVersion).toBe('1.0.0');
    expect(model.currentVersion.sections).toHaveLength(1);
    expect(model.currentVersion.sections[0].table?.headers).toEqual(['Col A', 'Col B']);
  });

  it('adapts requirements list correctly', () => {
    const reqs = adapter.adaptRequirements([
      {
        document_key: 'terms',
        title: 'Terms of Use',
        current_version: mockDto.current_version,
        accepted: true,
        last_accepted_at: '2026-11-06T12:00:00Z',
      },
    ]);
    expect(reqs).toHaveLength(1);
    expect(reqs[0].accepted).toBe(true);
    expect(reqs[0].currentVersion.displayVersion).toBe('1.0.0');
  });
});
