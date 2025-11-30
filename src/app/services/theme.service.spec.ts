import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let document: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: {
            body: { classList: { add: () => {}, remove: () => {} } },
          },
        },
      ],
    });
    service = TestBed.inject(ThemeService);
    document = TestBed.inject(DOCUMENT);
    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem');
    spyOn(window, 'matchMedia').and.returnValue({
      matches: false,
    } as MediaQueryList); // Mock matchMedia
    spyOn(document.body.classList, 'add');
    spyOn(document.body.classList, 'remove');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with light theme by default', () => {
    expect(service.currentTheme()).toBe('light');
    expect(document.body.classList.remove).toHaveBeenCalledWith('dark-theme');
  });

  it('should toggle theme from light to dark', () => {
    service.setTheme('light');
    service.toggleTheme();
    expect(service.currentTheme()).toBe('dark');
    expect(document.body.classList.add).toHaveBeenCalledWith('dark-theme');
    expect(localStorage.setItem).toHaveBeenCalledWith('app-theme', 'dark');
  });

  it('should toggle theme from dark to light', () => {
    service.setTheme('dark');
    service.toggleTheme();
    expect(service.currentTheme()).toBe('light');
    expect(document.body.classList.remove).toHaveBeenCalledWith('dark-theme');
    expect(localStorage.setItem).toHaveBeenCalledWith('app-theme', 'light');
  });

  it('should load theme from localStorage', () => {
    (localStorage.getItem as jasmine.Spy).and.returnValue('dark');
    // Re-initialize service to pick up localStorage change
    TestBed.resetTestingModule(); // Reset previous setup
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: {
            body: { classList: { add: () => {}, remove: () => {} } },
          },
        },
      ],
    });
    service = TestBed.inject(ThemeService);

    expect(service.currentTheme()).toBe('dark');
  });

  it('should use system preference if no localStorage theme', () => {
    (localStorage.getItem as jasmine.Spy).and.returnValue(null);
    (window.matchMedia as jasmine.Spy).and.returnValue({
      matches: true,
    } as MediaQueryList); // Prefers dark
    // Re-initialize service
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: {
            body: { classList: { add: () => {}, remove: () => {} } },
          },
        },
      ],
    });
    service = TestBed.inject(ThemeService);
    expect(service.currentTheme()).toBe('dark');
  });
});
