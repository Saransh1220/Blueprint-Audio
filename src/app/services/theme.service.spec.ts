import { vi } from 'vitest';
import '../../test-setup';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ThemeService],
    });

    const doc = TestBed.inject(DOCUMENT);
    vi.spyOn(doc.body.classList, 'add');
    vi.spyOn(doc.body.classList, 'remove');
    vi.spyOn(doc.body, 'setAttribute');

    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
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
});
