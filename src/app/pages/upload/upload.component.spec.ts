import { HttpEventType } from '@angular/common/http';
import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
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
        { provide: AuthService, useValue: {} },
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

  it('prevents next step when required files are missing and advances when valid', () => {
    const component = create();
    component.uploadForm.patchValue({
      title: 'Song',
      category: 'beat',
      genre: Genre.TRAP,
      bpm: 120,
      key: MusicalKey.A_MINOR,
    });

    component.nextStep();
    expect(toast.show).toHaveBeenCalledWith('Please upload cover art and preview audio.', 'error');
    expect(component.currentStep()).toBe(1);

    component.coverFile.set(new File(['a'], 'cover.png', { type: 'image/png' }));
    component.previewFile.set(new File(['a'], 'preview.mp3', { type: 'audio/mpeg' }));
    component.nextStep();

    expect(component.currentStep()).toBe(2);
    component.prevStep();
    expect(component.currentStep()).toBe(1);
  });

  it('validates files by type and size', () => {
    const component = create();
    const handleFile = (component as any).handleFile.bind(component);

    handleFile(new File(['a'], 'large.png', { type: 'image/png' }), 'cover');
    const hugeCover = new File([new Uint8Array(6 * 1024 * 1024)], 'large.png', {
      type: 'image/png',
    });
    handleFile(hugeCover, 'cover');
    expect(toast.show).toHaveBeenCalled();

    handleFile(new File(['a'], 'x.txt', { type: 'text/plain' }), 'preview');
    handleFile(new File(['a'], 'x.mp3', { type: 'audio/mpeg' }), 'preview');
    expect(component.previewFile()?.name).toBe('x.mp3');

    handleFile(new File(['a'], 'x.mp3', { type: 'audio/mpeg' }), 'wav');
    handleFile(new File(['a'], 'x.wav', { type: 'audio/wav' }), 'wav');
    expect(component.wavFile()?.name).toBe('x.wav');

    handleFile(new File(['a'], 'x.txt', { type: 'text/plain' }), 'stems');
    handleFile(new File(['a'], 'x.zip', { type: 'application/zip' }), 'stems');
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
});
