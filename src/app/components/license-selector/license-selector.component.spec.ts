import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { ModalService } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { PaymentService } from '../../services/payment.service';
import { LicenseSelectorComponent } from './license-selector.component';

describe('LicenseSelectorComponent', () => {
  const addItem = vi.fn();
  const close = vi.fn();
  const show = vi.fn();
  const initiatePayment = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    initiatePayment.mockReturnValue(of({}));
    TestBed.configureTestingModule({
      providers: [
        { provide: CartService, useValue: { addItem } },
        { provide: ModalService, useValue: { close } },
        { provide: ToastService, useValue: { show } },
        { provide: PaymentService, useValue: { initiatePayment } },
      ],
    });
  });

  it('adds selected license to cart and starts buy-now flow', () => {
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const component = TestBed.runInInjectionContext(() => new LicenseSelectorComponent());
    component.spec = { id: 's1', title: 'Song' } as any;
    const license = { id: 'l1', name: 'Basic' } as any;

    component.addToCart(license);
    expect(addItem).toHaveBeenCalledWith(component.spec, license);
    expect(show).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();

    const stopPropagation = vi.fn();
    component.buyNow(license, { stopPropagation } as any);
    expect(stopPropagation).toHaveBeenCalled();
    expect(initiatePayment).toHaveBeenCalledWith('s1', 'l1', 'Song');

    initiatePayment.mockReturnValueOnce(throwError(() => new Error('fail')));
    component.buyNow(license, { stopPropagation } as any);
    expect(logSpy).toHaveBeenCalled();
  });

  it('selects licenses and derives modal display helpers', () => {
    const component = TestBed.runInInjectionContext(() => new LicenseSelectorComponent());
    const basic = {
      id: 'basic',
      name: 'Basic MP3',
      type: 'Basic',
      fileTypes: ['MP3', 'License PDF'],
      features: ['Tagged preview', 'MP3'],
    } as any;
    const trackout = {
      id: 'trackout',
      name: 'Trackout',
      type: 'Trackout',
      fileTypes: ['WAV', 'Stems ZIP'],
      features: ['Stems ZIP'],
    } as any;
    component.spec = {
      id: 'beat-42',
      title: 'Red <Sun',
      producerName: 'Blaze',
      bpm: 144,
      key: 'F#m',
      duration: 187,
      category: 'Trap',
      tags: ['Dark', 'Bounce', 'Club'],
      freeMp3Enabled: true,
      licenses: [basic, trackout],
      genres: [{ id: 'g1', name: 'Drill' }],
    } as any;

    expect(component.selectedLicense()?.id).toBe('trackout');
    component.selectLicense(basic);
    expect(component.selectedLicense()?.id).toBe('basic');

    component.addSelectedToCart();
    component.buySelectedNow();
    expect(addItem).toHaveBeenCalledWith(component.spec, basic);
    expect(initiatePayment).toHaveBeenCalledWith('beat-42', 'basic', 'Red <Sun');

    expect(component.getStyledTitle('Solo')).toEqual({ lead: 'Solo', accent: '' });
    expect(component.getDisplayTitleHtml('Red <Sun')).toBe('<em>Red</em><br/>&lt;Sun.');
    expect(component.getProducerName()).toBe('Blaze');
    expect(component.getCatalogCode()).toBe('#0042');
    expect(component.getPrimaryGenre()).toBe('Drill');
    expect(component.formatDuration(187)).toBe('3:07');
    expect(component.getSpecChips()).toContain('Free MP3');
    expect(component.detailStats()[0]).toEqual({ label: 'Tempo', value: '144 BPM' });
    expect(component.getTempoDisplay()).toBe('144 BPM');
    expect(component.getKeyDisplay()).toBe('F#m');
    expect(component.getLengthDisplay()).toBe('3:07');
    expect(component.getTypeDisplay()).toBe('Drill');
    expect(component.detailTags().map((tag) => tag.label)).toContain('Free MP3');
    expect(component.getDetailLead()).toContain('Red <Sun');
    expect(component.getDetailBody()).toContain('dark, bounce, club');
    expect(component.getLicenseVariant(1, 4)).toBe('popular');
    expect(component.getLicenseVariant(3, 4)).toBe('exclusive');
    expect(component.getLicenseSubtitle(trackout, 2, 4)).toContain('stems');
    expect(component.getLicenseBadge(1, 4)).toBe('Most picked');
    expect(component.getLicenseFeatures(basic)).toEqual(['MP3', 'License PDF', 'Tagged preview']);
    expect(component.getFooterNote(basic)).toContain('license PDF');

    component.closeModal();
    expect(close).toHaveBeenCalled();
  });
});
