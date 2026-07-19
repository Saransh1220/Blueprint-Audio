import {
  CreateSpecRequest,
  DeleteSpecRequest,
  GetCatalogHomeRequest,
  GetUserSpecsRequest,
  UpdateSpecRequest,
} from './spec.requests';
import { UploadBannerRequest } from './user.requests';

describe('remaining API request objects', () => {
  it('builds catalog home parameters', () => {
    const request = new GetCatalogHomeRequest({
      limit: 8,
      sections: ['trending', 'top_charts'],
      period: '7d',
    });

    expect(request.method).toBe('GET');
    expect(request.path).toBe('/catalog/home');
    expect(request.params.get('limit')).toBe('8');
    expect(request.params.get('sections')).toBe('trending,top_charts');
    expect(request.params.get('period')).toBe('7d');
    expect(new GetCatalogHomeRequest().params.keys()).toEqual([]);
  });

  it('builds create, update, delete, and user catalog requests', () => {
    const form = new FormData();
    const create = new CreateSpecRequest(form);
    expect(create.method).toBe('POST');
    expect(create.path).toBe('/specs');
    expect(create.body).toBe(form);

    const update = new UpdateSpecRequest('spec-1', { title: 'Updated' });
    expect(update.method).toBe('PATCH');
    expect(update.path).toBe('/specs/spec-1');
    expect(update.body).toEqual({ title: 'Updated' });

    const remove = new DeleteSpecRequest('spec-1');
    expect(remove.method).toBe('DELETE');
    expect(remove.path).toBe('/specs/spec-1');

    const userSpecs = new GetUserSpecsRequest('producer-1', 2, 5);
    expect(userSpecs.path).toBe('/users/producer-1/specs');
    expect(userSpecs.params.get('page')).toBe('2');
    expect(userSpecs.params.get('limit')).toBe('5');
  });

  it('builds a banner form-data payload', () => {
    const file = new File(['banner'], 'banner.jpg', { type: 'image/jpeg' });
    const request = new UploadBannerRequest(file);

    expect(request.method).toBe('POST');
    expect(request.path).toBe('/users/profile/banner');
    expect(request.body.get('banner')).toBe(file);
  });
});
