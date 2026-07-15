import { HttpEventType } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Genre, MusicalKey } from '../../models';
import { AuthService } from '../../services/auth.service';
import { LabService } from '../../services/lab';
import { ToastService } from '../../services/toast.service';
import { UploadComponent } from './upload.component';

describe('UploadComponent', () => {
  const toast = { show: vi.fn() };
  const router = { navigate: vi.fn() };
  const labService = { createSpec: vi.fn() };

  function create() {
    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: AuthService, useValue: { currentUser: signal(null) } },
        { provide: LabService, useValue: labService },
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toast },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new UploadComponent());
    component.ngOnInit();
    return component;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'Image',
      class {
        width = 100;
        height = 100;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        set src(_: string) {
          setTimeout(() => this.onload?.(), 0);
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initializes default licenses and allows tags up to limit', () => {
    const component = create();
    expect(component.licenses.length).toBe(4);

    const input = { value: 'tag1' };
    component.addTag({ target: input });
    component.addTag({ target: { value: 'tag2' } });
    component.addTag({ target: { value: 'tag3' } });
    component.addTag({ target: { value: 'tag4' } });

    expect(component.tags.length).toBe(3);
    component.removeTag(1);
    expect(component.tags.length).toBe(2);
  });

  it('validates step progression across files, details, and licenses', () => {
    const component = create();

    component.nextStep();
    expect(toast.show).toHaveBeenCalledWith('Please upload cover art and preview audio.', 'error');
    expect(component.currentStep()).toBe(1);

    component.coverFile.set(new File(['a'], 'cover.png', { type: 'image/png' }));
    component.nextStep();
    expect(toast.show).toHaveBeenCalledWith('Please upload cover art and preview audio.', 'error');
    expect(component.currentStep()).toBe(1);

    component.previewFile.set(new File(['a'], 'preview.mp3', { type: 'audio/mpeg' }));
    component.nextStep();
    expect(component.currentStep()).toBe(2);

    component.uploadForm.patchValue({
      title: 'Song',
      category: 'beat',
      genre: Genre.TRAP,
      bpm: 120,
      key: MusicalKey.A_MINOR,
    });

    component.nextStep();
    expect(component.currentStep()).toBe(3);

    component.nextStep();
    expect(component.currentStep()).toBe(4);
    component.prevStep();
    expect(component.currentStep()).toBe(3);
  });

  it('validates files by type and size', async () => {
    const component = create();
    const handleFile = (component as any).handleFile.bind(component);
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'audio') {
        return {
          duration: 60,
          preload: '',
          onloadedmetadata: null,
          onerror: null,
          set src(_: string) {
            setTimeout(() => this.onloadedmetadata?.(), 0);
          },
        } as unknown as HTMLAudioElement;
      }
      return createElement(tagName);
    }) as typeof document.createElement);

    await handleFile(new File(['a'], 'large.png', { type: 'image/png' }), 'cover');
    const hugeCover = new File([new Uint8Array(6 * 1024 * 1024)], 'large.png', {
      type: 'image/png',
    });
    await handleFile(hugeCover, 'cover');
    expect(toast.show).toHaveBeenCalled();

    await handleFile(new File(['a'], 'x.txt', { type: 'text/plain' }), 'preview');
    await handleFile(new File(['a'], 'x.mp3', { type: 'audio/mpeg' }), 'preview');
    expect(component.previewFile()?.name).toBe('x.mp3');

    await handleFile(new File(['a'], 'x.mp3', { type: 'audio/mpeg' }), 'wav');
    await handleFile(new File(['a'], 'x.wav', { type: 'audio/wav' }), 'wav');
    expect(component.wavFile()?.name).toBe('x.wav');

    await handleFile(new File(['a'], 'x.txt', { type: 'text/plain' }), 'stems');
    await handleFile(new File(['a'], 'x.zip', { type: 'application/zip' }), 'stems');
    expect(component.stemsFile()?.name).toBe('x.zip');

    component.removeFile('preview');
    component.removeFile('wav');
    component.removeFile('stems');
    expect(component.previewFile()).toBeNull();
    expect(component.wavFile()).toBeNull();
    expect(component.stemsFile()).toBeNull();
  });

  it('submits upload with progress and response handling', () => {
    const component = create();
    component.uploadForm.patchValue({
      title: 'Song',
      category: 'beat',
      genre: Genre.TRAP,
      bpm: 130,
      key: MusicalKey.C_MINOR,
      description: 'desc',
      freeMp3Enabled: true,
    });
    component.coverFile.set(new File(['a'], 'cover.png', { type: 'image/png' }));
    component.previewFile.set(new File(['a'], 'preview.mp3', { type: 'audio/mpeg' }));

    const progressEvent = { type: HttpEventType.UploadProgress, loaded: 50, total: 100 } as any;
    const responseEvent = { type: HttpEventType.Response } as any;
    labService.createSpec.mockReturnValue(of(progressEvent, responseEvent));

    component.submitUpload();

    expect(component.uploadProgress()).toBe(50);
    expect(component.isSubmitting()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('handles submit validation and upload errors', () => {
    const component = create();
    component.uploadForm.patchValue({
      title: 'Song',
      category: 'beat',
      genre: Genre.TRAP,
      bpm: 110,
    });

    component.submitUpload();
    expect(toast.show).toHaveBeenCalledWith('Cover image and preview audio are required.', 'error');

    component.coverFile.set(new File(['a'], 'cover.png', { type: 'image/png' }));
    component.previewFile.set(new File(['a'], 'preview.mp3', { type: 'audio/mpeg' }));
    component.licenses.clear();
    component.submitUpload();
    expect(toast.show).toHaveBeenCalledWith('Please enable at least one license option.', 'error');

    component.initializeLicenses();
    labService.createSpec.mockReturnValue(throwError(() => ({ message: 'bad' })));
    component.submitUpload();
    expect(component.isSubmitting()).toBe(false);
    expect(component.uploadProgress()).toBe(0);
  });

  it('formats sharp keys for the picker label', () => {
    const component = create();
    expect(component.getKeyRootLabel('C#')).toBe('C♯');
    expect(component.getKeyRootLabel('A')).toBe('A');
  });
  it('manages metadata selections and display helpers', () => {
    const component = create();
    component.goToStep(0);
    component.goToStep(5);
    expect(component.currentStep()).toBe(1);
    component.goToStep(3);
    expect(component.isStepDone(2)).toBe(true);
    expect(component.isStepCurrent(3)).toBe(true);
    expect(component.getStepHint()).toContain('licenses');
    expect(component.getStepLabel(4)).toBe('Review');

    component.toggleMood('Cinematic');
    component.toggleMood('Moody');
    expect(component.isMoodSelected('Cinematic')).toBe(true);
    component.selectedMoods.set(component.moodOptions.slice(0, 5));
    component.toggleMood('Soulful');
    expect(toast.show).toHaveBeenCalledWith('Pick up to 5 mood tags.', 'info');

    component.toggleInstrument('Piano');
    component.toggleInstrument('Piano');
    component.selectedInstruments.set(component.instrumentOptions.slice(0, 5));
    component.toggleInstrument('808');
    expect(toast.show).toHaveBeenCalledWith('Pick up to 5 instruments.', 'info');
    component.selectKeyRoot('C#');
    component.setScale('major');
    expect(component.uploadForm.value.key).toBe('C# MAJOR');
    expect(component.getKeyPreview()).toEqual({ root: 'C#', mode: 'major' });
  });

  it('formats upload and license details', () => {
    const component = create();
    const basic = component.licenses.at(0);
    expect(component.getLicenseDisplayFormat(basic)).toBe('MP3');
    expect(component.getLicenseSummaryName(basic)).toBe('Basic Lease');
    expect(component.getReferenceLicenseName('Trackout')).toBe('Unlimited');
    expect(component.getReferenceLicenseFormat('Unlimited')).toBe('*');
    expect(component.getReferenceLicenseSub('Premium')).toBe('full release');
    expect(component.formatCurrency(12)).toBe('$12.00');
    component.coverSummary.set({ name: 'cover.png', size: '1KB', detail: '100x100' });
    component.previewSummary.set({ name: 'preview.mp3', size: '2KB' });
    expect(component.getCoverSummaryText()).toBe('cover.png - 100x100');
    expect(component.formatFileState('cover')).toBe('cover.png - 1KB - 100x100');
    expect(component.formatFileState('preview')).toBe('preview.mp3 - 2KB');
    component.coverSummary.set(null);
    expect(component.formatFileState('cover')).toContain('Required');
    expect(component.formatFileState('wav')).toContain('Optional');
    expect(component.formatFileState('stems')).toContain('Optional');
    component.saveDraft();
    expect(toast.show).toHaveBeenCalledWith(expect.stringContaining('Draft saving'), 'info');
  });

  it('handles drag input, cover removal, and license-derived previews', async () => {
    const component = create();
    const handleFile = vi.spyOn(component as any, 'handleFile').mockResolvedValue(undefined);
    const file = new File(['a'], 'cover.png', { type: 'image/png' });
    component.onFileSelected({ target: { files: [file] } } as unknown as Event, 'cover');
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    component.onFileDropped(
      { preventDefault, stopPropagation, dataTransfer: { files: [file] } } as unknown as DragEvent,
      'preview',
    );
    component.onDragOver({ preventDefault, stopPropagation } as unknown as DragEvent);
    await Promise.resolve();
    expect(handleFile).toHaveBeenCalledWith(file, 'cover');
    expect(handleFile).toHaveBeenCalledWith(file, 'preview');
    component.coverFile.set(file);
    component.coverPreviewUrl.set('data:image');
    component.coverSummary.set({ name: 'cover.png', size: '1B' });
    component.removeFile('cover');
    expect(component.coverFile()).toBeNull();
    component.licenses.controls.forEach((control) => control.get('enabled')?.setValue(false));
    expect(component.selectedLicenses()).toHaveLength(0);
    expect(component.minimumEnabledPrice()).toBe(0);
    component.stemsFile.set(new File(['a'], 'stems.zip'));
    expect(component.beatPreviewTags()).toContain('+ stems');
  });
});
