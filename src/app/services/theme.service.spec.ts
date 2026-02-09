import { vi } from 'vitest';
import '../../test-setup';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let getItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ThemeService],
    });

    const doc = TestBed.inject(DOCUMENT);
    vi.spyOn(doc.body.classList, 'add');
    vi.spyOn(doc.body.classList, 'remove');
    vi.spyOn(doc.body, 'setAttribute');

    getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem');
  });

  it('should be created', () => {
    service = TestBed.inject(ThemeService);
    expect(service).toBeTruthy();
  });

  it('should toggle mode from light to dark', () => {
    service = TestBed.inject(ThemeService);
    service.setMode('light');
    service.toggleMode();
    expect(service.currentMode()).toBe('dark');
  });

  it('should toggle mode from dark to light', () => {
    service = TestBed.inject(ThemeService);
    service.setMode('dark');
    service.toggleMode();
    expect(service.currentMode()).toBe('light');
  });

  it('initializes from localStorage values when available', () => {
    getItemSpy.mockImplementation((key: string) => {
      if (key === 'app-mode') return 'dark';
      if (key === 'app-theme-preset') return 'mint';
      return null;
    });

    service = TestBed.inject(ThemeService);

    expect(service.currentMode()).toBe('dark');
    expect(service.activeTheme()).toBe('mint');
  });

  it('ignores invalid mode values', () => {
    service = TestBed.inject(ThemeService);
    service.setMode('light');
    service.setMode('invalid-mode');

    expect(service.currentMode()).toBe('light');
  });
});
