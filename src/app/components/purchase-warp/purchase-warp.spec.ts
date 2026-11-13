import '../../../test-setup';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import type { LicenseOption, Spec } from '../../models';
import { CartService } from '../../services/cart.service';
import { PaymentService } from '../../services/payment.service';
import { PlayerService } from '../../services/player.service';
import { PurchaseDialogService } from '../../services/purchase-dialog.service';
import { ToastService } from '../../services/toast.service';
import { defaultLicense, formatLength, licenseFeatures, licenseSubtitle } from './license-display';
import { PurchaseWarpComponent } from './purchase-warp';

const license = (id: string, type: string, extra: Partial<LicenseOption> = {}): LicenseOption =>
  ({
    id,
    type,
    name: `${type} License`,
    price: 20,
    features: ['MP3 file', 'License PDF'],
    fileTypes: ['MP3'],
    ...extra,
  }) as LicenseOption;

const makeSpec = (extra: Partial<Spec> = {}): Spec =>
  ({
    id: 'beat-1',
    title: 'Night Drive',
    producerName: 'Nova',
    imageUrl: '/art.webp',
    bpm: 140,
    key: 'C Minor',
    duration: 125,
    category: 'beat',
    genres: [{ id: 'g', name: 'Trap', slug: 'trap' }],
    licenses: [license('l1', 'Basic'), license('l2', 'Premium'), license('l3', 'Unlimited')],
    ...extra,
  }) as Spec;

describe('license display helpers', () => {
  const lic = (type: string, extra: Partial<LicenseOption> = {}) => license('x', type, extra);

  it('defaults to the second tier, else the first, else nothing', () => {
    const spec = makeSpec();
    expect(defaultLicense(spec)?.id).toBe('l2');
    expect(defaultLicense(makeSpec({ licenses: [license('only', 'Basic')] }))?.id).toBe('only');
    expect(defaultLicense(makeSpec({ licenses: [] }))).toBeNull();
    expect(defaultLicense(null)).toBeNull();
  });

  it('describes each tier', () => {
    expect(licenseSubtitle(lic('Basic'), 0, 3)).toContain('demos');
    expect(licenseSubtitle(lic('Premium'), 1, 3)).toContain('releases');
    expect(licenseSubtitle(lic('Trackout'), 2, 4)).toContain('stems');
    expect(licenseSubtitle(lic('Unlimited'), 2, 3)).toContain('bigger');
    expect(licenseSubtitle(lic('Unlimited'), 1, 3)).toContain('wide');
    expect(licenseSubtitle(lic('Unlimited'), 0, 4)).toContain('bigger');
    expect(licenseSubtitle(lic('Exclusive'), 0, 4)).toBe('One-time license');
  });

  it('lists up to four unique features', () => {
    const features = licenseFeatures(
      lic('Basic', { fileTypes: ['MP3', 'MP3', ' '], features: ['a', 'b', 'c', 'd'] }),
    );
    expect(features).toEqual(['MP3', 'a', 'b', 'c']);
    expect(licenseFeatures({ id: 'x' } as LicenseOption)).toEqual([]);
  });

  it('formats the length', () => {
    expect(formatLength(125)).toBe('2:05');
    expect(formatLength(undefined)).toBe('--:--');
  });
});

describe('PurchaseWarpComponent', () => {
  let fixture: ComponentFixture<PurchaseWarpComponent>;
  let component: PurchaseWarpComponent;
  let el: HTMLElement;
  let dialog: PurchaseDialogService;
  const addItem = vi.fn();
  const show = vi.fn();
  const initiatePayment = vi.fn();
  const currentTrack = signal<Spec | null>(null);
  const isPlaying = signal(false);
  const player = { currentTrack, isPlaying, togglePlay: vi.fn(), showPlayer: vi.fn() };

  const cards = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.pw-lic'));
  const button = (text: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('.pw-btn')).find((b) =>
      b.textContent?.includes(text),
    ) as HTMLButtonElement;
  const footer = () =>
    Array.from(el.querySelectorAll('.pw-sel-value')).map((p) => p.textContent?.trim());
  const openWith = (spec: Spec) => {
    dialog.open(spec);
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    initiatePayment.mockReturnValue(of(undefined));
    currentTrack.set(null);
    isPlaying.set(false);
    TestBed.configureTestingModule({
      providers: [
        { provide: CartService, useValue: { addItem } },
        { provide: ToastService, useValue: { show } },
        { provide: PaymentService, useValue: { initiatePayment } },
        { provide: PlayerService, useValue: player },
      ],
    });
    dialog = TestBed.inject(PurchaseDialogService);
    fixture = TestBed.createComponent(PurchaseWarpComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('shows nothing until a beat is opened', () => {
    expect(el.querySelector('.pw')).toBeNull();
    expect(component.open()).toBe(false);
  });

  it('lays out the beat details', () => {
    openWith(makeSpec());
    expect(el.querySelector('.pw-title')?.textContent).toContain('Night Drive');
    expect(el.querySelector('.pw-by')?.textContent).toContain('Nova');
    expect(el.querySelector('.pw-art')?.getAttribute('src')).toBe('/art.webp');
    const meta = Array.from(el.querySelectorAll('.pw-meta li')).map((d) => d.textContent?.trim());
    expect(meta).toEqual(['140 BPM', 'C Minor', '2:05', 'Trap']);
  });

  it('falls back for missing metadata and art', () => {
    openWith(
      makeSpec({
        bpm: 0,
        key: undefined as never,
        duration: undefined,
        genres: [],
        producerName: '',
        imageUrl: '',
      }),
    );
    const meta = Array.from(el.querySelectorAll('.pw-meta li')).map((d) => d.textContent?.trim());
    expect(meta).toEqual(['-- BPM', '--', '--:--', 'beat']);
    expect(el.querySelector('.pw-by')?.textContent).toContain('Waveyard');
    expect(el.querySelector('.pw-art')?.getAttribute('src')).toContain('placeholder');
  });

  it('lists the licenses with the second tier chosen and badged', () => {
    openWith(makeSpec());
    expect(cards()).toHaveLength(3);
    expect(cards()[1].getAttribute('aria-checked')).toBe('true');
    expect(cards()[0].getAttribute('aria-checked')).toBe('false');
    expect(el.querySelector('.pw-badge')?.textContent).toContain('Most popular');
    expect(el.querySelectorAll('.pw-lic.flagged')).toHaveLength(2);
    expect(cards()[0].querySelectorAll('.pw-feats li').length).toBeGreaterThan(0);
    expect(footer()).toEqual(['Premium License', '₹20']);
  });

  it('switches the chosen license', () => {
    openWith(makeSpec());
    cards()[2].click();
    fixture.detectChanges();
    expect(component.selectedLicense()?.id).toBe('l3');
    expect(cards()[2].getAttribute('aria-checked')).toBe('true');
    expect(footer()[0]).toBe('Unlimited License');
  });

  it('resets the choice for the next beat', () => {
    openWith(makeSpec());
    cards()[2].click();
    dialog.close();
    fixture.detectChanges();
    openWith(makeSpec({ id: 'beat-2', title: 'Other' }));
    expect(component.selectedLicense()?.id).toBe('l2');
  });

  it('adds the chosen license to the cart, confirms, and closes', () => {
    openWith(makeSpec());
    cards()[0].click();
    fixture.detectChanges();
    button('Add to cart').click();
    expect(addItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'beat-1' }),
      expect.objectContaining({ id: 'l1' }),
    );
    expect(show).toHaveBeenCalledWith('Added Night Drive (Basic License) to cart', 'success');
    expect(dialog.spec()).toBeNull();
  });

  it('buys the chosen license now and closes', () => {
    openWith(makeSpec());
    button('Buy now').click();
    expect(initiatePayment).toHaveBeenCalledWith('beat-1', 'l2', 'Night Drive');
    expect(dialog.spec()).toBeNull();
  });

  it('logs a failed payment start', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    initiatePayment.mockReturnValue(throwError(() => new Error('down')));
    openWith(makeSpec());
    button('Buy now').click();
    expect(error).toHaveBeenCalled();
  });

  it('does nothing without a license to buy', () => {
    openWith(makeSpec({ licenses: [] }));
    expect(button('Buy now').disabled).toBe(true);
    expect(button('Add to cart').disabled).toBe(true);
    expect(footer()).toEqual(['None', '--']);
    component.addToCart();
    component.buyNow();
    expect(addItem).not.toHaveBeenCalled();
    expect(initiatePayment).not.toHaveBeenCalled();
  });

  it('does nothing before any beat has been opened', () => {
    component.addToCart();
    component.buyNow();
    expect(addItem).not.toHaveBeenCalled();
  });

  it('closes from the close button and on Escape', () => {
    openWith(makeSpec());
    (el.querySelector('.warp-close') as HTMLButtonElement).click();
    expect(dialog.spec()).toBeNull();
    openWith(makeSpec());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(dialog.spec()).toBeNull();
  });

  it('plays the preview from the cover, and pauses it when this beat is already playing', () => {
    openWith(makeSpec());
    const play = () => el.querySelector('.pw-play') as HTMLButtonElement;
    expect(play().getAttribute('aria-label')).toBe('Play preview');
    play().click();
    expect(player.showPlayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'beat-1' }));
    currentTrack.set(makeSpec());
    isPlaying.set(true);
    fixture.detectChanges();
    expect(play().getAttribute('aria-label')).toBe('Pause preview');
    expect(play().querySelector('.fa-pause')).toBeTruthy();
    play().click();
    expect(player.togglePlay).toHaveBeenCalled();
  });

  it('ignores the preview button before any beat is open', () => {
    component.togglePreview();
    expect(player.showPlayer).not.toHaveBeenCalled();
    expect(player.togglePlay).not.toHaveBeenCalled();
  });

  it('keeps showing the beat while the dialog plays its exit', () => {
    openWith(makeSpec());
    dialog.close();
    fixture.detectChanges();
    expect(component.open()).toBe(false);
    expect(el.querySelector('.pw-title')?.textContent).toContain('Night Drive');
  });
});
