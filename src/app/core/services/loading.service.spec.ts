import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  it('sets loading true on first show', () => {
    const service = new LoadingService();
    expect(service.isLoading()).toBe(false);

    service.show();
    expect(service.isLoading()).toBe(true);
  });

  it('keeps loading true until all requests hide', () => {
    const service = new LoadingService();

    service.show();
    service.show();
    expect(service.isLoading()).toBe(true);

    service.hide();
    expect(service.isLoading()).toBe(true);

    service.hide();
    expect(service.isLoading()).toBe(false);
  });

  it('does not go below zero when hide is called extra times', () => {
    const service = new LoadingService();

    service.hide();
    expect(service.isLoading()).toBe(false);

    service.show();
    service.hide();
    service.hide();
    expect(service.isLoading()).toBe(false);
  });
});
