import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  DeleteSpecRequest,
  GetUserSpecsRequest,
  UpdateSpecRequest,
} from '../core/api/spec.requests';
import { ApiService } from '../core/services/api.service';
import { SpecService } from './spec.service';

describe('SpecService', () => {
  it('delegates get/update/delete operations to ApiService with correct request objects', () => {
    const execute = vi.fn().mockReturnValue(of({}));
    TestBed.configureTestingModule({
      providers: [SpecService, { provide: ApiService, useValue: { execute } }],
    });
    const service = TestBed.inject(SpecService);

    service.getUserSpecs('u1', 2).subscribe();
    service.updateSpec('s1', { title: 'Updated' }).subscribe();
    service.deleteSpec('s1').subscribe();

    expect(execute.mock.calls[0][0]).toBeInstanceOf(GetUserSpecsRequest);
    expect(execute.mock.calls[1][0]).toBeInstanceOf(UpdateSpecRequest);
    expect(execute.mock.calls[2][0]).toBeInstanceOf(DeleteSpecRequest);
  });
});
