import { SpecAdapter } from './spec.adapter';

describe('SpecAdapter', () => {
  it('maps spec dto to domain model with nested fields', () => {
    const adapter = new SpecAdapter();
    const dto = {
      id: 'spec-1',
      producer_id: 'producer-1',
      title: 'Night Drive',
      category: 'beat' as const,
      type: 'Trap',
      bpm: 150,
      key: 'C Minor',
      image_url: 'cover.jpg',
      preview_url: 'preview.mp3',
      price: 30,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
      tags: ['dark', '808'],
      genres: [{ id: 'g1', name: 'Trap', slug: 'trap' }],
      licenses: [
        {
          id: 'lic-1',
          spec_id: 'spec-1',
          type: 'Basic',
          name: 'Basic',
          price: 30,
          features: ['mp3'],
          file_types: ['mp3'],
          created_at: '2026-01-01',
          updated_at: '2026-01-02',
        },
      ],
      duration: 120,
      free_mp3_enabled: true,
      analytics: {
        play_count: 100,
        favorite_count: 25,
        total_download_count: 10,
        is_favorited: true,
      },
    };

    const result = adapter.adapt(dto);

    expect(result.id).toBe('spec-1');
    expect(result.key).toBe('C MINOR');
    expect(result.audioUrl).toBe('preview.mp3');
    expect(result.licenses[0].fileTypes).toEqual(['mp3']);
    expect(result.analytics).toEqual({
      playCount: 100,
      favoriteCount: 25,
      totalDownloadCount: 10,
      isFavorited: true,
    });
  });

  it('defaults optional arrays when dto omits them', () => {
    const adapter = new SpecAdapter();
    const dto = {
      id: 'spec-2',
      producer_id: 'producer-2',
      title: 'Minimal',
      category: 'sample' as const,
      type: 'Ambient',
      bpm: 90,
      key: 'A Major',
      image_url: 'sample.jpg',
      preview_url: 'sample.mp3',
      price: 5,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    };

    const result = adapter.adapt(dto);

    expect(result.tags).toEqual([]);
    expect(result.genres).toEqual([]);
    expect(result.licenses).toEqual([]);
  });

  it('maps producer analytics dto', () => {
    const adapter = new SpecAdapter();
    const result = adapter.adaptProducerAnalytics({
      play_count: 50,
      favorite_count: 12,
      total_download_count: 7,
      total_purchase_count: 4,
      purchases_by_license: { Basic: 3, Premium: 1 },
      total_revenue: 220,
    });

    expect(result).toEqual({
      playCount: 50,
      favoriteCount: 12,
      totalDownloadCount: 7,
      totalPurchaseCount: 4,
      purchasesByLicense: { Basic: 3, Premium: 1 },
      totalRevenue: 220,
    });
  });
});
