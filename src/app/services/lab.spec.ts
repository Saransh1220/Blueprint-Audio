import { HttpEventType } from '@angular/common/http';
import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { SpecAdapter } from '../adapters/spec.adapter';
import { CreateSpecRequest, GetSpecRequest, GetSpecsRequest } from '../core/api/spec.requests';
import { ApiService } from '../core/services/api.service';
import { LabService } from './lab';
import { Spec } from '../models';

const mockSpec = (overrides?: Partial<Spec>): Spec =>
  ({
    id: 'spec1',
    producerId: 'p1',
    producerName: 'Producer',
    type: 'beat',
    category: 'beat',
    imageUrl: 'img.jpg',
    title: 'Test Beat',
    bpm: 120,
    key: 'C Major',
    tags: [],
    price: 100,
    genres: [],
    licenses: [],
    ...overrides,
  }) as Spec;

describe('LabService', () => {
  it('getSpecs maps data and stores pagination metadata', () => {
    const execute = vi.fn().mockReturnValue(
      of({
        data: [{ id: 'dto1' }],
        metadata: { page: 1, total: 1, per_page: 20 },
      }),
    );
    const adapt = vi.fn().mockReturnValue(mockSpec({ id: 'spec1' }));

    TestBed.configureTestingModule({
      providers: [
        LabService,
        { provide: ApiService, useValue: { execute } },
        { provide: SpecAdapter, useValue: { adapt } },
      ],
    });
    const service = TestBed.inject(LabService);

    service.getSpecs({ page: 1 }).subscribe((specs) => {
      expect(specs).toEqual([mockSpec({ id: 'spec1' })]);
    });

    expect(execute.mock.calls[0][0]).toBeInstanceOf(GetSpecsRequest);
    expect(service.specsPagination()).toEqual({ page: 1, total: 1, per_page: 20 });
    expect(adapt).toHaveBeenCalledWith({ id: 'dto1' });
  });

  it('getSpecs handles flat array response', () => {
    const execute = vi.fn().mockReturnValue(of([{ id: 'dto1' }, { id: 'dto2' }]));
    const adapt = vi.fn((dto) => mockSpec({ id: dto.id }));

    TestBed.configureTestingModule({
      providers: [
        LabService,
        { provide: ApiService, useValue: { execute } },
        { provide: SpecAdapter, useValue: { adapt } },
      ],
    });
    const service = TestBed.inject(LabService);

    service.getSpecs().subscribe((specs) => {
      expect(specs).toEqual([mockSpec({ id: 'dto1' }), mockSpec({ id: 'dto2' })]);
    });
    expect(service.specsPagination()).toBeNull();
  });

  it('getSpecById strips # prefix and createSpec maps dto', () => {
    const execute = vi.fn().mockReturnValueOnce(of({ id: 'dto1' }));

    const upload = vi.fn().mockReturnValue(
      of({
        type: HttpEventType.Response,
        body: { id: 'dto2' },
        clone: vi.fn(({ body }) => ({ type: HttpEventType.Response, body })),
      }),
    );

    const adapt = vi.fn((dto) => mockSpec({ id: dto.id }));

    TestBed.configureTestingModule({
      providers: [
        LabService,
        { provide: ApiService, useValue: { execute, upload } },
        { provide: SpecAdapter, useValue: { adapt } },
      ],
    });
    const service = TestBed.inject(LabService);

    service.getSpecById('#abc').subscribe((spec) => expect(spec).toEqual(mockSpec({ id: 'dto1' })));

    service.createSpec(new FormData()).subscribe((event: any) => {
      expect(event.body).toEqual(mockSpec({ id: 'dto2' }));
    });

    expect(execute.mock.calls[0][0]).toBeInstanceOf(GetSpecRequest);
    expect((execute.mock.calls[0][0] as GetSpecRequest).path).toBe('/specs/abc');
    expect(upload).toHaveBeenCalled();
    expect(upload.mock.calls[0][0]).toBeInstanceOf(CreateSpecRequest);
  });

  it('createSpec passes through non-response upload events', () => {
    const execute = vi.fn();
    const progressEvent = { type: HttpEventType.UploadProgress, loaded: 50, total: 100 };
    const upload = vi.fn().mockReturnValue(of(progressEvent));
    const adapt = vi.fn((dto) => mockSpec({ id: dto.id }));

    TestBed.configureTestingModule({
      providers: [
        LabService,
        { provide: ApiService, useValue: { execute, upload } },
        { provide: SpecAdapter, useValue: { adapt } },
      ],
    });
    const service = TestBed.inject(LabService);

    service.createSpec(new FormData()).subscribe((event) => expect(event).toEqual(progressEvent));
    expect(adapt).not.toHaveBeenCalled();
  });
});
