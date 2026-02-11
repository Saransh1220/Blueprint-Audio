import {
  DownloadFreeMp3Request,
  GetOverviewRequest,
  GetProducerAnalyticsRequest,
  GetTopSpecsRequest,
  ToggleFavoriteRequest,
  TrackPlayRequest,
} from './analytics.requests';

describe('analytics requests', () => {
  it('builds spec-based paths', () => {
    expect(new TrackPlayRequest('s1').path).toBe('/specs/s1/play');
    expect(new ToggleFavoriteRequest('s1').path).toBe('/specs/s1/favorite');
    expect(new GetProducerAnalyticsRequest('s1').path).toBe('/specs/s1/analytics');
    expect(new DownloadFreeMp3Request('s1').path).toBe('/specs/s1/download-free');
  });

  it('uses expected methods', () => {
    expect(new TrackPlayRequest('s1').method).toBe('POST');
    expect(new ToggleFavoriteRequest('s1').method).toBe('POST');
    expect(new GetProducerAnalyticsRequest('s1').method).toBe('GET');
    expect(new DownloadFreeMp3Request('s1').method).toBe('POST');
  });

  it('sets overview query params with defaults', () => {
    const req = new GetOverviewRequest();
    expect(req.path).toBe('/analytics/overview');
    expect(req.method).toBe('GET');
    expect(req.params.get('days')).toBe('30');
    expect(req.params.get('sortBy')).toBe('plays');
  });

  it('sets overview query params from input', () => {
    const req = new GetOverviewRequest(14, 'downloads');
    expect(req.path).toBe('/analytics/overview');
    expect(req.method).toBe('GET');
    expect(req.params.get('days')).toBe('14');
    expect(req.params.get('sortBy')).toBe('downloads');
  });

  it('sets top specs query params with defaults and overrides', () => {
    const defaults = new GetTopSpecsRequest();
    expect(defaults.path).toBe('/analytics/top-specs');
    expect(defaults.method).toBe('GET');
    expect(defaults.params.get('limit')).toBe('5');
    expect(defaults.params.get('sortBy')).toBe('plays');

    const custom = new GetTopSpecsRequest(10, 'revenue');
    expect(custom.params.get('limit')).toBe('10');
    expect(custom.params.get('sortBy')).toBe('revenue');
  });
});
