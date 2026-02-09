import {
  DownloadFreeMp3Request,
  GetAnalyticsOverviewRequest,
  GetProducerAnalyticsRequest,
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

  it('sets overview days query param', () => {
    const req = new GetAnalyticsOverviewRequest(14);
    expect(req.path).toBe('/analytics/overview');
    expect(req.method).toBe('GET');
    expect(req.params.get('days')).toBe('14');
  });
});
