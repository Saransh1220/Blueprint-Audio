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

  it('initializes from localStorage values when available', () => {
    getItemSpy.mockImplementation((key: string) => {
      if (key === 'theme-mode') return 'dark';
      return null;
    });

    service = TestBed.inject(ThemeService);
    expect(service.currentMode()).toBe('dark');
  });

  it('sets mode properly', () => {
    service = TestBed.inject(ThemeService);
    service.setMode('dark');
    expect(service.currentMode()).toBe('dark');

    service.toggleMode();
    expect(service.currentMode()).toBe('light');
  });
});
