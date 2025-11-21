import { TestBed } from '@angular/core/testing';

import { Lab } from './lab';

describe('Lab', () => {
  let service: Lab;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Lab);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
