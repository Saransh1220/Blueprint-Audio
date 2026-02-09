import { MusicalKey } from '../models/enums';
import type { LicenseOption, Spec } from '../models/spec';
import { CartService } from './cart.service';

describe('CartService', () => {
  const baseSpec: Spec = {
    id: 'spec-1',
    type: 'beat',
    category: 'beat',
    imageUrl: 'cover.jpg',
    title: 'First Spec',
    bpm: 140,
    key: MusicalKey.C_MINOR,
    tags: ['dark'],
    price: 20,
    genres: [],
    licenses: [],
  };

  const basicLicense: LicenseOption = {
    id: 'lic-1',
    type: 'Basic',
    name: 'Basic',
    price: 20,
    features: ['mp3'],
    fileTypes: ['mp3'],
  };

  const premiumLicense: LicenseOption = {
    ...basicLicense,
    id: 'lic-2',
    type: 'Premium',
    name: 'Premium',
    price: 50,
  };

  it('adds items and updates count and total', () => {
    const service = new CartService();

    service.addItem(baseSpec, basicLicense);
    service.addItem({ ...baseSpec, id: 'spec-2' }, premiumLicense);

    expect(service.items()).toHaveLength(2);
    expect(service.count()).toBe(2);
    expect(service.total()).toBe(70);
  });

  it('removes an item by id', () => {
    const service = new CartService();
    service.addItem(baseSpec, basicLicense);
    service.addItem({ ...baseSpec, id: 'spec-2' }, premiumLicense);

    const firstId = service.items()[0].id;
    service.removeItem(firstId);

    expect(service.items()).toHaveLength(1);
    expect(service.items()[0].spec.id).toBe('spec-2');
  });

  it('clears all cart items', () => {
    const service = new CartService();
    service.addItem(baseSpec, basicLicense);

    service.clear();

    expect(service.items()).toEqual([]);
    expect(service.count()).toBe(0);
    expect(service.total()).toBe(0);
  });
});
