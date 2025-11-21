import { TestBed } from '@angular/core/testing';

import { Directory } from './directory';

describe('Directory', () => {
  let service: Directory;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Directory);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
