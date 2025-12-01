import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  beforeEach(() => {
    const mockClassList = jasmine.createSpyObj('classList', ['add', 'remove']);

    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        {
          provide: DOCUMENT,
          useValue: {
            body: { classList: mockClassList },
          },
        },
      ],
    });
    TestBed.inject(DOCUMENT);
    spyOn(Storage.prototype, 'getItem').and.returnValue(null);
    spyOn(Storage.prototype, 'setItem');
    spyOn(window, 'matchMedia').and.returnValue({
      matches: false,
    } as MediaQueryList); // Mock matchMedia
  });

  it('should be created', () => {
    service = TestBed.inject(ThemeService);
    expect(service).toBeTruthy();
  });

  it('should toggle theme from light to dark', () => {
    service = TestBed.inject(ThemeService);
    service.setTheme('light');
    service.toggleTheme();
    expect(service.currentTheme()).toBe('dark');
  });

  it('should toggle theme from dark to light', () => {
    service = TestBed.inject(ThemeService);
    service.setTheme('dark');
    service.toggleTheme();
    expect(service.currentTheme()).toBe('light');
  });
});
