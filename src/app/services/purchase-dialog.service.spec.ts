import { TestBed } from '@angular/core/testing';

import type { Spec } from '../models';
import { PurchaseDialogService } from './purchase-dialog.service';

describe('PurchaseDialogService', () => {
  it('holds the beat being bought until closed', () => {
    const service = TestBed.inject(PurchaseDialogService);
    const spec = { id: 'a', title: 'A' } as Spec;
    expect(service.spec()).toBeNull();
    service.open(spec);
    expect(service.spec()).toBe(spec);
    service.close();
    expect(service.spec()).toBeNull();
  });
});
