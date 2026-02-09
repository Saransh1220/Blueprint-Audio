import { GetSpecRequest, GetSpecsRequest } from './spec.requests';

describe('GetSpecsRequest', () => {
  it('builds query params from filters and maps R&B to RnB', () => {
    const request = new GetSpecsRequest({
      category: 'beat',
      genres: ['R&B', 'Trap'],
      tags: ['dark', 'melodic'],
      search: 'night',
      min_bpm: 120,
      max_bpm: 170,
      min_price: 10,
      max_price: 100,
      key: 'C MINOR',
      page: 2,
      sort: 'price_asc',
    });

    expect(request.method).toBe('GET');
    expect(request.path).toBe('/specs');
    expect(request.params.get('genres')).toBe('RnB,Trap');
    expect(request.params.get('tags')).toBe('dark,melodic');
    expect(request.params.get('key')).toBe('C MINOR');
    expect(request.params.get('page')).toBe('2');
  });

  it('does not set key when key is All', () => {
    const request = new GetSpecsRequest({ key: 'All' });
    expect(request.params.has('key')).toBe(false);
  });
});

describe('GetSpecRequest', () => {
  it('creates detail path with id', () => {
    const request = new GetSpecRequest('spec-99');
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/specs/spec-99');
  });
});
