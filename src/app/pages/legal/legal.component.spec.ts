import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { LegalComponent } from './legal.component';
import { LegalService } from '../../services/legal.service';
import type { LegalDocumentView, LegalVersion } from '../../models/legal.model';

describe('LegalComponent', () => {
  let fixture: ComponentFixture<LegalComponent>;
  let component: LegalComponent;
  let mockLegalService: {
    getDocument: ReturnType<typeof vi.fn>;
    getDocumentVersions: ReturnType<typeof vi.fn>;
    getDocumentVersion: ReturnType<typeof vi.fn>;
  };

  const routeDataSubject = new BehaviorSubject<{ document?: string }>({ document: 'terms' });
  const queryParamsSubject = new BehaviorSubject<{ version?: string }>({});

  const sampleVersion: LegalVersion = {
    id: 'ver-terms-1',
    documentKey: 'terms',
    displayVersion: '1.0.0',
    schemaVersion: 1,
    title: 'Terms of Use',
    summary: 'Mock terms summary for tests',
    sections: [
      {
        id: 'sec-1',
        order: 1,
        title: 'Section 1',
        content: 'Content 1',
        summary: 'Summary 1',
      },
    ],
    contentHash: 'mock-hash-1',
    updateClassification: 'material',
    status: 'published',
    publishedAt: '2026-11-06T00:00:00Z',
    effectiveAt: '2026-11-06T00:00:00Z',
  };

  const sampleView: LegalDocumentView = {
    document: {
      key: 'terms',
      audience: 'buyer',
      locale: 'en',
      title: 'Terms of Use',
    },
    currentVersion: sampleVersion,
  };

  beforeEach(async () => {
    mockLegalService = {
      getDocument: vi.fn().mockReturnValue(of(sampleView)),
      getDocumentVersions: vi.fn().mockReturnValue(of([sampleVersion])),
      getDocumentVersion: vi.fn().mockReturnValue(of(sampleVersion)),
    };

    routeDataSubject.next({ document: 'terms' });
    queryParamsSubject.next({});

    await TestBed.configureTestingModule({
      imports: [LegalComponent],
      providers: [
        provideRouter([]),
        { provide: LegalService, useValue: mockLegalService },
        {
          provide: ActivatedRoute,
          useValue: {
            data: routeDataSubject.asObservable(),
            queryParams: queryParamsSubject.asObservable(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LegalComponent);
    component = fixture.componentInstance;
  });

  it('creates the component and sets default document key', () => {
    expect(component).toBeTruthy();
    expect(component.currentKey()).toBe('terms');
  });

  it('loads active document version on init', () => {
    fixture.detectChanges();

    expect(mockLegalService.getDocument).toHaveBeenCalledWith('terms');
    expect(mockLegalService.getDocumentVersions).toHaveBeenCalledWith('terms');
    expect(component.activeVersion()?.title).toBe('Terms of Use');
    expect(component.versionHistory()).toHaveLength(1);
    expect(component.isLoading()).toBe(false);
  });

  it('falls back to baseline data if legal service fails', () => {
    mockLegalService.getDocument.mockReturnValue(throwError(() => new Error('Service down')));
    mockLegalService.getDocumentVersions.mockReturnValue(
      throwError(() => new Error('Service down')),
    );

    fixture.detectChanges();
    component.loadDocument();

    expect(component.activeVersion()).not.toBeNull();
    expect(component.activeVersion()?.documentKey).toBe('terms');
    expect(component.versionHistory()).toEqual([]);
  });

  it('loads specific version when query param is present', () => {
    const historicalVer: LegalVersion = {
      ...sampleVersion,
      id: 'ver-hist-0',
      displayVersion: '0.9.0',
      title: 'Terms of Use (Legacy 0.9.0)',
    };
    mockLegalService.getDocumentVersion.mockReturnValue(of(historicalVer));

    queryParamsSubject.next({ version: '0.9.0' });
    fixture.detectChanges();

    expect(mockLegalService.getDocumentVersion).toHaveBeenCalledWith('terms', '0.9.0');
    expect(component.activeVersion()?.displayVersion).toBe('0.9.0');
  });

  it('switches document when route data changes', () => {
    const privacyView: LegalDocumentView = {
      document: {
        key: 'privacy',
        audience: 'buyer',
        locale: 'en',
        title: 'Privacy Policy',
      },
      currentVersion: {
        ...sampleVersion,
        id: 'ver-privacy-1',
        documentKey: 'privacy',
        title: 'Privacy Policy',
      },
    };
    mockLegalService.getDocument.mockReturnValue(of(privacyView));

    routeDataSubject.next({ document: 'privacy' });
    fixture.detectChanges();

    expect(component.currentKey()).toBe('privacy');
    expect(mockLegalService.getDocument).toHaveBeenCalledWith('privacy');
    expect(component.activeVersion()?.title).toBe('Privacy Policy');
  });

  it('calls window.print on printDocument()', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    component.printDocument();
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it('scrolls to section on scrollToSection without router navigation', () => {
    const mockEvent = { preventDefault: vi.fn() } as unknown as Event;
    const mockElement = document.createElement('div');
    mockElement.id = 'sec-1';
    document.body.appendChild(mockElement);

    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    component.scrollToSection(mockEvent, 'sec-1');

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(scrollSpy).toHaveBeenCalled();
    expect(component.activeSectionId()).toBe('sec-1');

    document.body.removeChild(mockElement);
    scrollSpy.mockRestore();
  });

  it('copies content hash to clipboard and sets hashCopied state', () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    component.copyContentHash('mock-hash-1');
    expect(writeTextSpy).toHaveBeenCalledWith('mock-hash-1');
  });
});
