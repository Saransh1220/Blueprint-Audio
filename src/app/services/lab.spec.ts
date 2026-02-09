import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { SpecAdapter } from '../adapters/spec.adapter';
import { CreateSpecRequest, GetSpecRequest, GetSpecsRequest } from '../core/api/spec.requests';
import { ApiService } from '../core/services/api.service';
import { LabService } from './lab';

describe('LabService', () => {
  it('getSpecs maps data and stores pagination metadata', () => {
    const execute = vi.fn().mockReturnValue(
      of({
        data: [{ id: 'dto1' }],
        metadata: { page: 1, total: 1 },
      }),
    );
    const adapt = vi.fn().mockReturnValue({ id: 'spec1' });

    TestBed.configureTestingModule({
      providers: [
        LabService,
        { provide: ApiService, useValue: { execute } },
        { provide: SpecAdapter, useValue: { adapt } },
      ],
    });
    const service = TestBed.inject(LabService);

    service.getSpecs({ page: 1 }).subscribe((specs) => {
      expect(specs).toEqual([{ id: 'spec1' }]);
    });

    expect(execute.mock.calls[0][0]).toBeInstanceOf(GetSpecsRequest);
    expect(service.specsPagination()).toEqual({ page: 1, total: 1 });
    expect(adapt).toHaveBeenCalledWith({ id: 'dto1' });
  });

  it('getSpecs handles flat array response', () => {
    const execute = vi.fn().mockReturnValue(of([{ id: 'dto1' }, { id: 'dto2' }]));
    const adapt = vi.fn((dto) => ({ id: dto.id }));

    TestBed.configureTestingModule({
      providers: [
        LabService,
        { provide: ApiService, useValue: { execute } },
        { provide: SpecAdapter, useValue: { adapt } },
      ],
    });
    const service = TestBed.inject(LabService);

    service.getSpecs().subscribe((specs) => {
      expect(specs).toEqual([{ id: 'dto1' }, { id: 'dto2' }]);
    });
    expect(service.specsPagination()).toBeNull();
  });

  it('getSpecById strips # prefix and createSpec maps dto', () => {
    const execute = vi
      .fn()
      .mockReturnValueOnce(of({ id: 'dto1' }))
      .mockReturnValueOnce(of({ id: 'dto2' }));
    const adapt = vi.fn((dto) => ({ id: dto.id }));

    TestBed.configureTestingModule({
      providers: [
        LabService,
        { provide: ApiService, useValue: { execute } },
        { provide: SpecAdapter, useValue: { adapt } },
      ],
    });
    const service = TestBed.inject(LabService);

    service.getSpecById('#abc').subscribe((spec) => expect(spec).toEqual({ id: 'dto1' }));
    service.createSpec(new FormData()).subscribe((spec) => expect(spec).toEqual({ id: 'dto2' }));

    expect(execute.mock.calls[0][0]).toBeInstanceOf(GetSpecRequest);
    expect((execute.mock.calls[0][0] as GetSpecRequest).path).toBe('/specs/abc');
    expect(execute.mock.calls[1][0]).toBeInstanceOf(CreateSpecRequest);
  });
});
