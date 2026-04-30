import { HttpEventType } from '@angular/common/http';
import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Genre, MusicalKey } from '../../../models';
import { AuthService, LabService, ToastService } from '../../../services';
import { StudioUploadComponent } from './studio-upload.component';

describe('StudioUploadComponent', () => {
  const toast = { show: vi.fn() };
  const router = { navigate: vi.fn() };
  const labService = { createSpec: vi.fn() };

  function create() {
    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: AuthService, useValue: {} },
        { provide: LabService, useValue: labService },
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toast },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new StudioUploadComponent());
    component.ngOnInit();
    return component;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes default licenses and manages tag limits', () => {
    const component = create();
    expect(component.licenses.length).toBe(4);

    component.addTag({ target: { value: 'tag1' } });
    component.addTag({ target: { value: 'tag2' } });
    component.addTag({ target: { value: 'tag3' } });
    component.addTag({ target: { value: 'tag4' } });

    expect(component.tags.length).toBe(3);
    component.removeTag(1);
    expect(component.tags.length).toBe(2);
  });

  it('advances through the reference step order and still gates required files', () => {
    const component = create();
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    component.onDragOver({ preventDefault, stopPropagation } as any);
    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();

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

  it('validates selected files and supports dropped files', () => {
    const component = create();

    component.onFileDropped(
      {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: { files: [new File(['x'], 'dropped.mp3', { type: 'audio/mpeg' })] },
      } as any,
      'preview',
    );
    expect(component.previewFile()?.name).toBe('dropped.mp3');

    const hugeCover = new File([new Uint8Array(6 * 1024 * 1024)], 'large.png', {
      type: 'image/png',
    });
    component.onFileSelected({ target: { files: [hugeCover] } } as any, 'cover');
    expect(toast.show).toHaveBeenCalledWith('File too large. Max size for cover is 5MB', 'error');

    component.onFileSelected(
      { target: { files: [new File(['a'], 'x.txt', { type: 'text/plain' })] } } as any,
      'preview',
    );
    expect(toast.show).toHaveBeenCalledWith(
      'Invalid file type. Please upload an audio file.',
      'error',
    );

    component.onFileSelected(
      { target: { files: [new File(['a'], 'x.wav', { type: 'audio/wav' })] } } as any,
      'wav',
    );
    component.onFileSelected(
      { target: { files: [new File(['a'], 'x.zip', { type: 'application/zip' })] } } as any,
      'stems',
    );

    expect(component.wavFile()?.name).toBe('x.wav');
    expect(component.stemsFile()?.name).toBe('x.zip');

    component.removeFile('preview');
    component.removeFile('wav');
    component.removeFile('stems');
    expect(component.previewFile()).toBeNull();
    expect(component.wavFile()).toBeNull();
    expect(component.stemsFile()).toBeNull();
  });

  it('submits upload progress and redirects to studio tracks on completion', () => {
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
    expect(toast.show).toHaveBeenCalledWith('Upload Started! Processing in background...', 'info');
    expect(router.navigate).toHaveBeenCalledWith(['/studio/tracks']);
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
    component.licenses.controls.forEach((control) => control.patchValue({ enabled: false }));
    component.submitUpload();
    expect(toast.show).toHaveBeenCalledWith('Please enable at least one license option.', 'error');

    component.licenses.clear();
    component.initializeLicenses();
    labService.createSpec.mockReturnValue(throwError(() => ({ message: 'bad' })));
    component.submitUpload();
    expect(component.isSubmitting()).toBe(false);
    expect(component.uploadProgress()).toBe(0);
    expect(toast.show).toHaveBeenCalledWith('Upload failed: bad', 'error');
  });
});
