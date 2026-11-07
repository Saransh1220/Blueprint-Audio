import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { Genre, MusicalKey } from '../../models';
import { AuthService, LabService, ToastService } from '../../services';
import { CurrencyConfigurationService } from '../../services/currency-configuration.service';
import { CurrencyService } from '../../services/currency.service';
import { FxService, RateUnavailableError } from '../../services/fx.service';
import { SpecService } from '../../services/spec.service';
import { SpecUploadMonitorService } from '../../services/spec-upload-monitor.service';
import { SpecUploadService } from '../../services/spec-upload.service';
import { UploadComponent } from './upload.component';

describe('UploadComponent - RW-1-6 Explicit Prices & FX Auto-Fill', () => {
  const toast = { show: vi.fn(), success: vi.fn(), error: vi.fn() };
  const router = { navigate: vi.fn() };
  const labService = { notifyRefresh: vi.fn() };
  const monitor = { monitor: vi.fn() };
  const specService = { updateSpec: vi.fn() };
  const specUploadService = {
    createDraft: vi.fn(),
    uploadFile: vi.fn(),
    publishBeat: vi.fn(),
    completeUpload: vi.fn(),
  };
  const fxService = {
    suggestPrice: vi.fn(),
  };

  let userSignal: ReturnType<typeof signal<any>>;
  function readyToPublish(c: UploadComponent) {
    c.coverFile.set(new File(['a'], 'c.png', { type: 'image/png' }));
    c.previewFile.set(new File(['a'], 'p.mp3', { type: 'audio/mpeg' }));
    c.wavFile.set(new File(['a'], 'm.wav', { type: 'audio/wav' }));
    c.stemsFile.set(new File(['a'], 's.zip'));
    c.uploadSessionId.set('sess-1');
    c.fileUploadStates.set({
      cover: { phase: 'uploaded', progress: 100 },
      preview: { phase: 'uploaded', progress: 100 },
      wav: { phase: 'uploaded', progress: 100 },
      stems: { phase: 'uploaded', progress: 100 },
    });
  }

  function createComponent(): { component: UploadComponent; fixture: ComponentFixture<UploadComponent> } {
    TestBed.configureTestingModule({
      imports: [UploadComponent],
      providers: [
        FormBuilder,
        { provide: AuthService, useValue: { currentUser: userSignal } },
        { provide: LabService, useValue: labService },
        { provide: SpecUploadMonitorService, useValue: monitor },
        { provide: SpecUploadService, useValue: specUploadService },
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toast },
        { provide: SpecService, useValue: specService },
        { provide: FxService, useValue: fxService },
        CurrencyService,
        CurrencyConfigurationService,
      ],
    });

    const fixture = TestBed.createComponent(UploadComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();
    fixture.detectChanges();
    return { component, fixture };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
    userSignal = signal<any>({ id: 'u1', store_currency: 'USD' });
  });

  describe('Explicit price fields and store currency defaults (RW-1-6-1, RW-1-6-3)', () => {
    it('initializes dual price fields for USD store currency', () => {
      userSignal.set({ id: 'u1', store_currency: 'USD' });
      const { component } = createComponent();

      expect(component.storeCurrency()).toBe('USD');
      expect(component.secondaryCurrency()).toBe('INR');
      expect(component.nativeCurrencySymbol()).toBe('$');
      expect(component.secondaryCurrencySymbol()).toBe('₹');

      const basic = component.licenses.at(0);
      expect(basic.get('price')?.value).toBe('14.99');
      expect(basic.get('secondaryPrice')?.value).toBe('14.99');
      expect(basic.get('sellNativeOnly')?.value).toBe(false);
    });

    it('initializes dual price fields for INR store currency', () => {
      userSignal.set({ id: 'u1', store_currency: 'INR' });
      const { component } = createComponent();

      expect(component.storeCurrency()).toBe('INR');
      expect(component.secondaryCurrency()).toBe('USD');
      expect(component.nativeCurrencySymbol()).toBe('₹');
      expect(component.secondaryCurrencySymbol()).toBe('$');

      const basic = component.licenses.at(0);
      expect(basic.get('price')?.value).toBe('14.99');
      expect(basic.get('secondaryPrice')?.value).toBe('14.99');
    });

    it('updates native price and resets errors on user input', () => {
      const { component } = createComponent();
      component.onNativePriceChange(0, '19.99');

      const basic = component.licenses.at(0);
      expect(basic.get('price')?.value).toBe('19.99');
      expect(basic.get('nativePrice')?.value).toBe('19.99');
      expect(basic.get('nativeError')?.value).toBeNull();
    });

    it('toggles sell-native-only and clears secondary errors', () => {
      const { component } = createComponent();
      const basic = component.licenses.at(0);
      expect(basic.get('sellNativeOnly')?.value).toBe(false);

      const fakeEvent = { target: { checked: true } } as any;
      component.onSellNativeOnlyToggle(0, fakeEvent);
      expect(basic.get('sellNativeOnly')?.value).toBe(true);

      const uncheckEvent = { target: { checked: false } } as any;
      component.onSellNativeOnlyToggle(0, uncheckEvent);
      expect(basic.get('sellNativeOnly')?.value).toBe(false);
    });
  });

  describe('FX Auto-Fill (RW-1-6-2)', () => {
    it('successfully auto-fills secondary price from server rate suggestion', () => {
      const { component } = createComponent();
      fxService.suggestPrice.mockReturnValue(
        of({
          currency: 'INR',
          amount_minor: 165900,
          rounding: 'whole_unit',
          stale: false,
          rate_as_of: '2026-11-07T12:00:00Z',
        }),
      );

      component.onNativePriceChange(0, '19.99');
      component.autoFillSecondaryPrice(0);

      expect(fxService.suggestPrice).toHaveBeenCalledWith('USD', 'INR', 1999);
      const basic = component.licenses.at(0);
      expect(basic.get('secondaryPrice')?.value).toBe('1659.00');
      expect(basic.get('autoFilled')?.value).toBe(true);
      expect(basic.get('autoFillLoading')?.value).toBe(false);
      expect(basic.get('isStale')?.value).toBe(false);
      expect(basic.get('rateInfo')?.value).toContain('Rate as of');
      expect(toast.show).toHaveBeenCalledWith(
        expect.stringContaining('Auto-filled INR price'),
        'success',
      );
    });

    it('flags rate as stale when server indicates rate is older than threshold', () => {
      const { component } = createComponent();
      fxService.suggestPrice.mockReturnValue(
        of({
          currency: 'INR',
          amount_minor: 165900,
          rounding: 'whole_unit',
          stale: true,
          rate_as_of: '2026-11-05T10:00:00Z',
        }),
      );

      component.autoFillSecondaryPrice(0);

      const basic = component.licenses.at(0);
      expect(basic.get('isStale')?.value).toBe(true);
    });

    it('handles RATE_UNAVAILABLE with warning toast without breaking manual entry', () => {
      const { component } = createComponent();
      fxService.suggestPrice.mockReturnValue(
        throwError(() => new RateUnavailableError('Exchange rate currently unavailable')),
      );

      component.autoFillSecondaryPrice(0);

      const basic = component.licenses.at(0);
      expect(basic.get('autoFillLoading')?.value).toBe(false);
      expect(toast.show).toHaveBeenCalledWith(
        'Exchange rate currently unavailable',
        'info',
      );
    });

    it('blocks auto-fill and surfaces error if native price is invalid', () => {
      const { component } = createComponent();
      component.onNativePriceChange(0, 'invalid-num');
      component.autoFillSecondaryPrice(0);

      expect(fxService.suggestPrice).not.toHaveBeenCalled();
      expect(component.licenses.at(0).get('nativeError')?.value).toBe(
        'Enter a valid positive number',
      );
    });
  });

  describe('Submit and Edit mode round-tripping with revisions (RW-1-6-4, RW-1-6-5)', () => {
    it('sends explicit dual prices on upload create', () => {
      const { component } = createComponent();
      component.uploadForm.patchValue({
        title: 'New Beat',
        category: 'beat',
        genre: Genre.TRAP,
        bpm: 120,
        key: MusicalKey.C_MINOR,
      });
      readyToPublish(component);

      // Keep only first license enabled
      for (let i = 1; i < component.licenses.length; i++) {
        component.licenses.at(i).patchValue({ enabled: false });
      }

      component.onNativePriceChange(0, '19.99');
      component.onSecondaryPriceChange(0, '1659.00');

      specUploadService.publishBeat.mockReturnValue(of({ type: 'completed' }));
      component.submitUpload();

      expect(specUploadService.publishBeat).toHaveBeenCalled();
      const [, metadata] = specUploadService.publishBeat.mock.calls[0];

      expect(metadata.price).toBe(19.99);
      expect(metadata.price_currency).toBe('USD');
      expect(metadata.licenses[0].prices).toEqual([
        { currency: 'USD', amount_minor: 1999, is_active: true },
        { currency: 'INR', amount_minor: 165900, is_active: true },
      ]);
    });

    it('sends secondary price as inactive when sellNativeOnly is checked', () => {
      const { component } = createComponent();
      component.uploadForm.patchValue({
        title: 'Native Only Beat',
        category: 'beat',
        genre: Genre.TRAP,
        bpm: 120,
        key: MusicalKey.C_MINOR,
      });
      readyToPublish(component);

      for (let i = 1; i < component.licenses.length; i++) {
        component.licenses.at(i).patchValue({ enabled: false });
      }

      component.onNativePriceChange(0, '19.99');
      component.licenses.at(0).patchValue({ sellNativeOnly: true, secondaryPrice: '1659.00' });

      specUploadService.publishBeat.mockReturnValue(of({ type: 'completed' }));
      component.submitUpload();

      const [, metadata] = specUploadService.publishBeat.mock.calls[0];
      expect(metadata.licenses[0].prices).toEqual([
        { currency: 'USD', amount_minor: 1999, is_active: true },
        { currency: 'INR', amount_minor: 165900, is_active: false },
      ]);
    });

    it('sends NO price patches when editing metadata only (prices unchanged)', () => {
      const { component } = createComponent();
      component.editingSpecId.set('spec-100');

      // Setup license with existing stored prices and revisions
      const lic = component.licenses.at(0);
      lic.patchValue({
        id: 'lic-100',
        price: '19.99',
        nativePrice: '19.99',
        secondaryPrice: '1659.00',
        sellNativeOnly: false,
        originalNativeMinor: 1999,
        originalSecondaryMinor: 165900,
        originalSellNativeOnly: false,
        nativeRevision: 3,
        secondaryRevision: 2,
      });

      for (let i = 1; i < component.licenses.length; i++) {
        component.licenses.at(i).patchValue({ enabled: false });
      }

      component.uploadForm.patchValue({
        title: 'Title Changed Only',
        bpm: 125,
        genre: Genre.DRILL,
      });

      specService.updateSpec.mockReturnValue(of({ id: 'spec-100' }));
      component.saveEditedSpec();

      expect(specService.updateSpec).toHaveBeenCalled();
      const [, formData] = specService.updateSpec.mock.calls[0];
      const metadata = JSON.parse(formData.get('metadata'));

      // Since prices did not change, prices patch array must be omitted
      expect(metadata.licenses[0].prices).toBeUndefined();
    });

    it('sends price patch with optimistic revision when native price is changed', () => {
      const { component } = createComponent();
      component.editingSpecId.set('spec-100');

      const lic = component.licenses.at(0);
      lic.patchValue({
        id: 'lic-100',
        price: '19.99',
        nativePrice: '19.99',
        secondaryPrice: '1659.00',
        sellNativeOnly: false,
        originalNativeMinor: 1999,
        originalSecondaryMinor: 165900,
        originalSellNativeOnly: false,
        nativeRevision: 3,
        secondaryRevision: 2,
      });

      for (let i = 1; i < component.licenses.length; i++) {
        component.licenses.at(i).patchValue({ enabled: false });
      }

      // Change native price
      component.onNativePriceChange(0, '24.99');

      component.uploadForm.patchValue({
        title: 'Price Changed',
        bpm: 125,
        genre: Genre.DRILL,
      });

      specService.updateSpec.mockReturnValue(of({ id: 'spec-100' }));
      component.saveEditedSpec();

      const [, formData] = specService.updateSpec.mock.calls[0];
      const metadata = JSON.parse(formData.get('metadata'));

      expect(metadata.licenses[0].prices).toEqual([
        { currency: 'USD', amount_minor: 2499, is_active: true, revision: 3 },
      ]);
    });

    it('handles 409 STALE_PRICE conflict with review prompt and does not retry', () => {
      const { component } = createComponent();
      component.editingSpecId.set('spec-100');

      for (let i = 1; i < component.licenses.length; i++) {
        component.licenses.at(i).patchValue({ enabled: false });
      }

      component.uploadForm.patchValue({
        title: 'Conflict Test',
        bpm: 120,
        genre: Genre.TRAP,
      });

      specService.updateSpec.mockReturnValue(
        throwError(() => ({
          status: 409,
          error: { error: 'STALE_PRICE', message: 'price conflict' },
        })),
      );

      component.saveEditedSpec();

      expect(component.isSubmitting()).toBe(false);
      expect(toast.show).toHaveBeenCalledWith(
        expect.stringContaining('Prices were modified in another session'),
        'error',
      );
    });
  });
});
