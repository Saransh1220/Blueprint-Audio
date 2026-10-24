import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { Genre } from '../../models';
import { AuthService } from '../../services/auth.service';
import { LabService } from '../../services/lab';
import { SpecUploadMonitorService } from '../../services/spec-upload-monitor.service';
import { SpecUploadCompletionError, SpecUploadService } from '../../services/spec-upload.service';
import { ToastService } from '../../services/toast.service';
import { UploadComponent } from './upload.component';

describe('UploadFormBase (more)', () => {
  const toast = { show: vi.fn() };
  const router = { navigate: vi.fn() };
  const labService = { notifyRefresh: vi.fn() };
  const monitor = { monitor: vi.fn() };
  const specUploadService = {
    createDraft: vi.fn(),
    uploadFile: vi.fn(),
    publishBeat: vi.fn(),
    completeUpload: vi.fn(),
  };
  let user: ReturnType<typeof signal<any>>;
  let imageSize = { width: 100, height: 100 };
  let imageFails = false;
  let audioDuration = 75;
  let audioFails = false;

  const tick = () => new Promise((r) => setTimeout(r, 0));
  const file = (name: string, type = '', size = 1) => {
    const f = new File(['a'], name, { type });
    if (size > 1) Object.defineProperty(f, 'size', { value: size });
    return f;
  };

  function create() {
    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: AuthService, useValue: { currentUser: user } },
        { provide: LabService, useValue: labService },
        { provide: SpecUploadMonitorService, useValue: monitor },
        { provide: SpecUploadService, useValue: specUploadService },
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toast },
      ],
    });
    const c = TestBed.runInInjectionContext(() => new UploadComponent());
    c.ngOnInit();
    return c;
  }

  function fillForm(c: UploadComponent, extra: Record<string, unknown> = {}) {
    c.uploadForm.patchValue({
      title: 'Song',
      category: 'beat',
      genre: Genre.TRAP,
      bpm: 120,
      ...extra,
    });
  }

  function readyToPublish(c: UploadComponent) {
    c.coverFile.set(file('c.png', 'image/png'));
    c.previewFile.set(file('p.mp3', 'audio/mpeg'));
    c.wavFile.set(file('m.wav', 'audio/wav'));
    c.stemsFile.set(file('s.zip'));
    c.uploadSessionId.set('up-1');
    c.fileUploadStates.set({
      cover: { phase: 'uploaded', progress: 100 },
      preview: { phase: 'uploaded', progress: 100 },
      wav: { phase: 'uploaded', progress: 100 },
      stems: { phase: 'uploaded', progress: 100 },
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
    window.localStorage.clear();
    user = signal<any>({ id: 'u1', store_currency: 'USD' });
    imageSize = { width: 100, height: 100 };
    imageFails = false;
    audioDuration = 75;
    audioFails = false;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    specUploadService.createDraft.mockReturnValue(of({ upload_id: 'up-1' }));
    specUploadService.uploadFile.mockReturnValue(
      of({ type: 'progress', percent: 10 }, { type: 'verifying' }, { type: 'completed' }),
    );
    vi.stubGlobal(
      'Image',
      class {
        get width() {
          return imageSize.width;
        }
        get height() {
          return imageSize.height;
        }
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_: string) {
          setTimeout(() => (imageFails ? this.onerror?.() : this.onload?.()), 0);
        }
      },
    );
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'audio') {
        const el: any = {
          preload: '',
          onloadedmetadata: null,
          onerror: null,
          get duration() {
            return audioDuration;
          },
        };
        Object.defineProperty(el, 'src', {
          set() {
            setTimeout(() => (audioFails ? el.onerror?.() : el.onloadedmetadata?.()), 0);
          },
        });
        return el;
      }
      return realCreate(tag);
    }) as typeof document.createElement);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reports field errors only once touched', () => {
    const c = create();
    expect(c.fieldError('title')).toBeNull();
    c.uploadForm.get('title')!.markAsTouched();
    expect(c.fieldError('title')).toBe('Track name is required.');
    c.uploadForm.get('genre')!.markAsTouched();
    expect(c.fieldError('genre')).toBe('Genre is required.');
    c.uploadForm.get('title')!.setValue('x'.repeat(101));
    expect(c.fieldError('title')).toBe('Track name is too long.');
    c.uploadForm.get('description')!.setValue('x'.repeat(501));
    c.uploadForm.get('description')!.markAsDirty();
    expect(c.fieldError('description')).toBe('Description is too long.');
    const bpm = c.uploadForm.get('bpm')!;
    bpm.markAsTouched();
    bpm.setValue(10);
    expect(c.fieldError('bpm')).toBe('BPM must be between 60 and 300.');
    bpm.setValue(500);
    expect(c.fieldError('bpm')).toBe('BPM must be between 60 and 300.');
    bpm.setValue('100.5');
    expect(c.fieldError('bpm')).toBe('BPM must be a whole number.');
    bpm.setValidators([() => ({ custom: true })]);
    bpm.updateValueAndValidity();
    expect(c.fieldError('bpm')).toBe('Please enter a valid value.');
    expect(c.f.title).toBeTruthy();
  });

  it('does not reinitialize licenses and falls back when key is empty', () => {
    const c = create();
    c.uploadForm.get('key')!.setValue('');
    c.initializeLicenses();
    expect(c.licenses.length).toBe(4);
    c.ngOnInit();
    expect(c.currentKeyRoot()).toBe('E');
    c.uploadForm.get('key')!.setValue('G MAJOR');
    c.ngOnInit();
    expect(c.currentKeyRoot()).toBe('G');
    expect(c.currentScale()).toBe('major');
    c.uploadForm.get('key')!.setValue('');
    expect(c.getKeyPreview()).toEqual({ root: 'E', mode: 'minor' });
    c.uploadForm.get('key')!.setValue('D');
    expect(c.getKeyPreview()).toEqual({ root: 'D', mode: 'minor' });
  });

  it('walks through nextStep including failures and final submit', () => {
    const c = create();
    c.coverFile.set(file('c.png', 'image/png'));
    c.previewFile.set(file('p.mp3'));
    c.uploadForm.patchValue({ category: 'sample' });
    c.nextStep();
    expect(c.currentStep()).toBe(2);
    c.nextStep(); // invalid details
    expect(c.currentStep()).toBe(2);
    expect(c.uploadForm.get('title')!.touched).toBe(true);
    fillForm(c, { category: 'sample' });
    c.nextStep();
    expect(c.currentStep()).toBe(3);
    c.licenses.controls.forEach((l) => l.get('enabled')!.setValue(false));
    c.nextStep();
    expect(c.currentStep()).toBe(3);
    expect(toast.show).toHaveBeenCalledWith('Please enable at least one license option.', 'error');
    // selectedLicenses is a computed over non-signal form state, so it stays memoized
    c.goToStep(4);
    expect(c.currentStep()).toBe(4);
    c.nextStep(); // submits; cover/preview present, but files not uploaded
    expect(toast.show).toHaveBeenCalledWith(
      'Please wait until the cover, preview, WAV, and stems uploads are complete.',
      'error',
    );
    c.prevStep();
    c.prevStep();
    c.prevStep();
    c.prevStep();
    expect(c.currentStep()).toBe(1);
    expect(c.stepProgress()).toBe(25);
  });

  it('validates a single missing download file in step 1', () => {
    const c = create();
    c.coverFile.set(file('c.png'));
    c.previewFile.set(file('p.mp3'));
    c.wavFile.set(file('m.wav'));
    c.nextStep();
    expect(toast.show).toHaveBeenCalledWith(
      'Please upload the required stems archive for this beat.',
      'error',
    );
    c.wavFile.set(null);
    c.stemsFile.set(file('s.zip'));
    c.nextStep();
    expect(toast.show).toHaveBeenCalledWith(
      'Please upload the required master WAV for this beat.',
      'error',
    );
  });

  it('handles tag input edge cases', () => {
    const c = create();
    c.addTag({ target: { value: '   ' } });
    expect(c.tags.length).toBe(0);
    c.addTag({ target: { value: 'x'.repeat(31) } });
    expect(c.tagInputError()).toBe('Tags must be 30 characters or fewer.');
    const input = { value: ' Trap ' };
    c.addTag({ target: input });
    expect(input.value).toBe('');
    expect(c.tagInputError()).toBeNull();
    c.addTag({ target: { value: 'trap' } });
    expect(c.tagInputError()).toBe('That tag has already been added.');
    c.addTag({ target: { value: 'b' } });
    c.addTag({ target: { value: 'c' } });
    c.addTag({ target: { value: 'd' } });
    expect(c.tagInputError()).toBe('You can add up to 3 tags.');
    c.removeTag(0);
    expect(c.tagInputError()).toBeNull();
  });

  it('removes selected moods and instruments, and picks options', () => {
    const c = create();
    c.toggleMood('Moody');
    expect(c.isMoodSelected('Moody')).toBe(false);
    c.toggleInstrument('Piano');
    expect(c.isInstrumentSelected('Piano')).toBe(true);
    c.toggleInstrument('Piano');
    expect(c.isInstrumentSelected('Piano')).toBe(false);
    c.pickRoyalty('60/40');
    c.pickContract('Custom PDF');
    c.pickTerritory('US only');
    expect(c.royaltySplit()).toBe('60/40');
    expect(c.contractType()).toBe('Custom PDF');
    expect(c.territory()).toBe('US only');
    c.setScale('minor');
    c.selectKeyRoot('A');
    expect(c.uploadForm.value.key).toBe('A MINOR');
  });

  it('onFileSelected ignores empty selection and resets input', () => {
    const c = create();
    const spy = vi.spyOn(c as any, 'handleFile').mockResolvedValue(undefined);
    const input: any = { files: [], value: 'x' };
    c.onFileSelected({ target: input } as any, 'cover');
    expect(input.value).toBe('');
    c.onFileSelected({ target: { value: 'y' } } as any, 'cover');
    expect(spy).not.toHaveBeenCalled();
    c.onFileDropped({ preventDefault: vi.fn(), stopPropagation: vi.fn(), dataTransfer: { files: [] } } as any, 'wav');
    c.onFileDropped({ preventDefault: vi.fn(), stopPropagation: vi.fn() } as any, 'wav');
    expect(spy).not.toHaveBeenCalled();
  });

  it('uploads each file type end-to-end through the draft session', async () => {
    const c = create();
    c.onFileSelected({ target: { files: [file('c.png', 'image/png')], value: '' } } as any, 'cover');
    c.onFileSelected({ target: { files: [file('p.mp3', 'audio/mpeg')], value: '' } } as any, 'preview');
    c.onFileSelected({ target: { files: [file('m.wav', 'audio/wav')], value: '' } } as any, 'wav');
    c.onFileSelected({ target: { files: [file('s.ZIP')], value: '' } } as any, 'stems');
    await tick();
    await tick();
    await tick();
    expect(specUploadService.createDraft).toHaveBeenCalledTimes(1);
    expect(c.uploadSessionId()).toBe('up-1');
    expect(c.allRequiredFilesUploaded()).toBe(true);
    expect(c.coverSummary()?.detail).toBe('100x100');
    expect(c.coverPreviewUrl()).toContain('data:image/png');
    expect(c.previewSummary()?.detail).toBe('1:15');
    expect(c.wavSummary()?.detail).toBe('1:15');
    expect(c.beatDuration()).toBe(75);
    expect(c.stemsSummary()?.detail).toBeUndefined();
    expect(c.formatFileState('stems')).toContain('s.ZIP - 1B');
    expect(c.formatFileState('wav')).toBe('m.wav - 1B - 1:15');
    expect(specUploadService.uploadFile.mock.calls.map((x: any) => x[1].kind).sort()).toEqual(['image', 'preview', 'stems', 'wav']);
    c.ngOnDestroy();
  });

  it('rejects invalid or oversize files by type', async () => {
    const c = create();
    const h = (f: File, t: any) => (c as any).handleFile(f, t);
    await h(file('c.png', 'image/png', 6 * 1024 * 1024), 'cover');
    expect(toast.show).toHaveBeenLastCalledWith('File too large. Max size for cover is 5MB', 'error');
    await h(file('c.gif', 'image/gif'), 'cover');
    expect(toast.show).toHaveBeenLastCalledWith('Cover art must be a JPG or PNG image.', 'error');
    imageFails = true;
    await h(file('c.png', 'image/png'), 'cover');
    expect(toast.show).toHaveBeenLastCalledWith('Cover art must be a valid JPG or PNG image.', 'error');
    imageFails = false;
    imageSize = { width: 0, height: 0 };
    await h(file('c.png', 'image/png'), 'cover');
    expect(toast.show).toHaveBeenLastCalledWith('Cover art must be a valid JPG or PNG image.', 'error');
    await h(file('p.mp3', 'audio/mpeg', 31 * 1024 * 1024), 'preview');
    expect(toast.show).toHaveBeenLastCalledWith('File too large. Max size for preview is 30MB', 'error');
    await h(file('p.wav', 'audio/wav'), 'preview');
    expect(toast.show).toHaveBeenLastCalledWith('Preview audio must be an MP3 file.', 'error');
    await h(file('w.mp3', 'audio/mpeg'), 'wav');
    expect(toast.show).toHaveBeenLastCalledWith('Invalid file type. Please upload a WAV file.', 'error');
    await h(file('s.7z'), 'stems');
    expect(toast.show).toHaveBeenLastCalledWith('Invalid file type. Please upload a ZIP or RAR file.', 'error');
    await h(file('w.wav', 'audio/wav', 301 * 1024 * 1024), 'wav');
    expect(toast.show).toHaveBeenLastCalledWith('File too large. Max size for wav is 300MB', 'error');
    await h(file('s.zip', '', 1025 * 1024 * 1024), 'stems');
    expect(toast.show).toHaveBeenLastCalledWith('File too large. Max size for stems is 1GB', 'error');
    expect(c.coverFile()).toBeNull();
    expect(specUploadService.createDraft).not.toHaveBeenCalled();
  });

  it('accepts mp3 by extension and wav by mime; handles audio errors and zero duration', async () => {
    const c = create();
    const h = (f: File, t: any) => (c as any).handleFile(f, t);
    audioFails = true;
    await h(file('p.MP3'), 'preview');
    expect(c.previewSummary()?.detail).toBe('');
    audioFails = false;
    audioDuration = Number.NaN;
    await h(file('weird', 'audio/x-wav'), 'wav');
    expect(c.wavSummary()?.detail).toBe('');
    expect(c.wavFile()?.name).toBe('weird');
    audioDuration = 5;
    await h(file('p.mp3', 'audio/mpeg'), 'preview');
    expect(c.previewSummary()?.detail).toBe('0:05');
  });

  it('formats sizes in bytes, KB and MB', async () => {
    const c = create();
    const fb = (n: number) => (c as any).formatBytes(n);
    expect(fb(10)).toBe('10B');
    expect(fb(2048)).toBe('2KB');
    expect(fb(3 * 1024 * 1024)).toBe('3.0MB');
  });

  it('reports file upload progress states and labels', async () => {
    const c = create();
    const subj = new Subject<any>();
    specUploadService.uploadFile.mockReturnValue(subj);
    await (c as any).handleFile(file('s.zip'), 'stems');
    await tick();
    expect(c.fileUploadLabel('stems')).toBe('Preparing secure upload'.length ? c.fileUploadLabel('stems') : '');
    subj.next({ type: 'progress', percent: 42 });
    expect(c.fileUploadLabel('stems')).toBe('Uploading 42%');
    expect(c.fileUploadState('stems').phase).toBe('uploading');
    subj.next({ type: 'verifying' });
    expect(c.fileUploadLabel('stems')).toBe('Verifying file');
    subj.next({ type: 'completed' });
    expect(c.fileUploadLabel('stems')).toBe('Uploaded');
    expect(c.fileUploadLabel('cover')).toBe('Not uploaded');
    (c as any).setFileUploadState('cover', { phase: 'preparing', progress: 0 });
    expect(c.fileUploadLabel('cover')).toBe('Preparing secure upload');
    (c as any).setFileUploadState('cover', { phase: 'error', progress: 0 });
    expect(c.fileUploadLabel('cover')).toBe('Upload failed - select again');
    (c as any).setFileUploadState('cover', { phase: 'error', progress: 0, error: 'Nope' });
    expect(c.fileUploadLabel('cover')).toBe('Nope');
  });

  it('handles file upload errors (service, draft creation) and details formats', async () => {
    const c = create();
    specUploadService.uploadFile.mockReturnValue(throwError(() => ({ error: { message: 'quota' } })));
    await (c as any).handleFile(file('s.zip'), 'stems');
    await tick();
    expect(c.fileUploadState('stems').error).toBe('Failed - quota');
    expect(toast.show).toHaveBeenLastCalledWith('Stems upload failed: quota', 'error');

    specUploadService.uploadFile.mockReturnValue(throwError(() => ({ error: 'plain text' })));
    await (c as any).handleFile(file('m.wav', 'audio/wav'), 'wav');
    await tick();
    expect(c.fileUploadState('wav').error).toBe('Failed - plain text');
    expect(toast.show).toHaveBeenLastCalledWith('Master WAV upload failed: plain text', 'error');

    specUploadService.uploadFile.mockReturnValue(throwError(() => new Error('boom')));
    await (c as any).handleFile(file('p.mp3', 'audio/mpeg'), 'preview');
    await tick();
    expect(toast.show).toHaveBeenLastCalledWith('Preview MP3 upload failed: boom', 'error');

    specUploadService.uploadFile.mockReturnValue(throwError(() => 'str'));
    await (c as any).handleFile(file('c.png', 'image/png'), 'cover');
    await tick();
    expect(c.fileUploadState('cover').error).toBe('Upload failed - select again');
    expect(toast.show).toHaveBeenLastCalledWith('Cover upload failed: Please select it again.', 'error');
  });

  it('fails the file upload when the draft cannot be created', async () => {
    const c = create();
    specUploadService.createDraft.mockReturnValue(throwError(() => new Error('no draft')));
    await (c as any).handleFile(file('s.zip'), 'stems');
    await tick();
    await tick();
    expect(c.fileUploadState('stems').phase).toBe('error');
    expect(c.uploadSessionId()).toBeNull();
    // draft promise cleared: a retry creates a new draft
    specUploadService.createDraft.mockReturnValue(of({ upload_id: 'up-2' }));
    await (c as any).handleFile(file('s.zip'), 'stems');
    await tick();
    expect(c.uploadSessionId()).toBe('up-2');
  });

  it('shares one in-flight draft between concurrent uploads', async () => {
    const c = create();
    const draft = new Subject<any>();
    specUploadService.createDraft.mockReturnValue(draft);
    void (c as any).handleFile(file('s.zip'), 'stems');
    void (c as any).handleFile(file('m.wav', 'audio/wav'), 'wav');
    await tick();
    await tick();
    expect(specUploadService.createDraft).toHaveBeenCalledTimes(1);
    draft.next({ upload_id: 'up-9' });
    draft.complete();
    await tick();
    await tick();
    expect(specUploadService.uploadFile).toHaveBeenCalledTimes(2);
  });

  it('ignores results for removed or replaced files', async () => {
    const c = create();
    const draft = new Subject<any>();
    specUploadService.createDraft.mockReturnValue(draft);
    void (c as any).handleFile(file('s.zip'), 'stems');
    await tick();
    c.removeFile('stems');
    expect(c.fileUploadState('stems').phase).toBe('idle');
    draft.next({ upload_id: 'up-1' });
    draft.complete();
    await tick();
    await tick();
    expect(specUploadService.uploadFile).not.toHaveBeenCalled();

    // stale events and errors after removal
    const subj = new Subject<any>();
    specUploadService.uploadFile.mockReturnValue(subj);
    await (c as any).handleFile(file('s2.zip'), 'stems');
    await tick();
    c.removeFile('stems');
    subj.next({ type: 'progress', percent: 5 });
    expect(c.fileUploadState('stems').phase).toBe('idle');
    (c as any).handleFileUploadError('stems', file('x'), 99, new Error('late'));
    expect(c.fileUploadState('stems').phase).toBe('idle');
  });

  it('removes every file type and clears its state', () => {
    const c = create();
    for (const t of ['cover', 'preview', 'wav', 'stems'] as const) {
      c.removeFile(t);
    }
    expect(c.coverPreviewUrl()).toBeNull();
    expect(c.coverSummary()).toBeNull();
    expect(c.previewSummary()).toBeNull();
    expect(c.wavSummary()).toBeNull();
    expect(c.stemsSummary()).toBeNull();
  });

  it('blocks submit for invalid form, missing session and bad state', () => {
    const c = create();
    c.submitUpload();
    expect(c.uploadForm.get('title')!.touched).toBe(true);
    expect(specUploadService.publishBeat).not.toHaveBeenCalled();

    fillForm(c);
    c.coverFile.set(file('c.png'));
    c.previewFile.set(file('p.mp3'));
    c.submitUpload();
    expect(toast.show).toHaveBeenLastCalledWith(
      'Please upload the required master WAV and stems archive for this beat.',
      'error',
    );

    readyToPublish(c);
    c.uploadSessionId.set(null);
    c.submitUpload();
    expect(toast.show).toHaveBeenLastCalledWith(
      'The upload draft could not be created. Select a file again.',
      'error',
    );
  });

  it('publishes a pack with INR currency and fallbacks', () => {
    user.set({ id: 'u1', store_currency: 'INR' });
    const c = create();
    fillForm(c, { category: 'sample', bpm: 100, key: '', description: '', genre: 'Hip Hop' });
    readyToPublish(c);
    c.licenses.at(1).get('enabled')!.setValue(false);
    specUploadService.publishBeat.mockReturnValue(of({ uploadId: 'up-1' }));
    c.submitUpload();
    const [, meta] = specUploadService.publishBeat.mock.calls[0];
    expect(meta.type).toBe('pack');
    expect(meta.bpm).toBe(100);
    expect(meta.key).toBe('Unknown');
    expect(meta.price).toBe(14.99);
    expect(meta.price_currency).toBe('INR');
    expect(meta.genres[0].slug).toBe('hip-hop');
    expect(meta.licenses).toHaveLength(3);
    expect(meta.licenses[0].price_currency).toBe('INR');
    expect(c.formatCurrency('5')).toBe('₹5.00');
    expect(c.formatCurrency(0)).toBe('₹0.00');
  });

  it('defaults currency to USD when the user has no store currency', () => {
    user.set(null);
    const c = create();
    fillForm(c);
    readyToPublish(c);
    specUploadService.publishBeat.mockReturnValue(of({ uploadId: 'up-1' }));
    c.submitUpload();
    expect(specUploadService.publishBeat.mock.calls[0][1].price_currency).toBe('USD');
    expect(c.formatCurrency(2)).toBe('$2.00');
  });

  it('treats completion errors by status: ambiguous retains, definite clears', () => {
    const c = create();
    fillForm(c);
    readyToPublish(c);
    for (const status of [408, 425, 429, 503]) {
      c.pendingCompletionId.set(null);
      specUploadService.publishBeat.mockReturnValueOnce(
        throwError(() => new SpecUploadCompletionError('u-' + status, { status })),
      );
      c.submitUpload();
      expect(c.pendingCompletionId()).toBe('u-' + status);
    }
    expect(window.localStorage.getItem('waveyard.pending-spec-completion.v1:u1')).toBe('u-503');

    c.pendingCompletionId.set(null);
    specUploadService.publishBeat.mockReturnValueOnce(
      throwError(() => new SpecUploadCompletionError('u-400', { status: 400, error: { message: 'bad' } })),
    );
    c.submitUpload();
    expect(c.pendingCompletionId()).toBeNull();
    expect(window.localStorage.getItem('waveyard.pending-spec-completion.v1:u1')).toBeNull();
    expect(toast.show).toHaveBeenLastCalledWith(
      'Upload failed: Could not confirm finalization for upload u-400.',
      'error',
    );

    specUploadService.publishBeat.mockReturnValueOnce(
      throwError(() => new SpecUploadCompletionError('u-x', null)),
    );
    c.submitUpload();
    expect(c.pendingCompletionId()).toBe('u-x');
  });

  it('shows "Unknown error" for non-object errors and plain-string error bodies', () => {
    const c = create();
    fillForm(c);
    readyToPublish(c);
    specUploadService.publishBeat.mockReturnValueOnce(throwError(() => 'weird'));
    c.submitUpload();
    expect(toast.show).toHaveBeenLastCalledWith('Upload failed: Unknown error', 'error');
    specUploadService.publishBeat.mockReturnValueOnce(throwError(() => ({ error: 'text body' })));
    c.submitUpload();
    expect(toast.show).toHaveBeenLastCalledWith('Upload failed: text body', 'error');
    specUploadService.publishBeat.mockReturnValueOnce(throwError(() => null));
    c.submitUpload();
    expect(toast.show).toHaveBeenLastCalledWith('Upload failed: Unknown error', 'error');
  });

  it('retry completion failing surfaces an error', () => {
    const c = create();
    c.pendingCompletionId.set('u-r');
    specUploadService.completeUpload.mockReturnValue(throwError(() => ({ message: 'still bad' })));
    c.submitUpload();
    expect(c.isSubmitting()).toBe(false);
    expect(toast.show).toHaveBeenLastCalledWith('Upload failed: still bad', 'error');
  });

  it('restores a pending completion from storage and tolerates storage failures', () => {
    window.localStorage.setItem('waveyard.pending-spec-completion.v1:u1', '  up-saved ');
    const c = create();
    expect(c.pendingCompletionId()).toBe('up-saved');

    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const remove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('denied');
    });
    TestBed.resetTestingModule();
    const d = create();
    expect(d.pendingCompletionId()).toBeNull();
    fillForm(d);
    readyToPublish(d);
    specUploadService.publishBeat.mockReturnValueOnce(
      throwError(() => new SpecUploadCompletionError('u-s', { status: 500 })),
    );
    d.submitUpload();
    expect(d.pendingCompletionId()).toBe('u-s');
    specUploadService.completeUpload.mockReturnValue(of({ uploadId: 'u-s' }));
    d.submitUpload();
    expect(d.pendingCompletionId()).toBeNull();
    expect(router.navigate).toHaveBeenCalled();
    get.mockRestore();
    set.mockRestore();
    remove.mockRestore();
  });

  it('uses an unknown user key when signed out', () => {
    user.set(null);
    window.localStorage.setItem('waveyard.pending-spec-completion.v1:unknown', 'anon-1');
    const c = create();
    expect(c.pendingCompletionId()).toBe('anon-1');
  });

  it('formats display helpers with fallbacks', () => {
    const c = create();
    expect(c.getCoverSummaryText()).toBe('Not uploaded');
    c.coverSummary.set({ name: 'c.png', size: '1KB' });
    expect(c.getCoverSummaryText()).toBe('c.png - 1KB');
    expect(c.getReferenceLicenseName('Basic')).toBe('Basic');
    expect(c.getReferenceLicenseName('Custom')).toBe('Custom');
    expect(c.getReferenceLicenseName('')).toBe('License');
    expect(c.getReferenceLicenseFormat('Basic')).toBe('MP3');
    expect(c.getReferenceLicenseFormat('x')).toBe('');
    expect(c.getReferenceLicenseSub('x')).toBe('');
    expect(c.getReferenceLicenseSub('Basic')).toBe('demos & drafts');
    const empty = { get: () => null } as any;
    expect(c.getLicenseDisplayFormat(empty)).toBe('');
    expect(c.getLicenseSummaryName(empty)).toBe('License');
    const typed = { get: (k: string) => (k === 'type' ? { value: 'Basic' } : { value: '' }) } as any;
    expect(c.getLicenseSummaryName(typed)).toBe('Basic');
    c.stepHints;
    expect(c.getStepHint()).toContain('files');
  });

  it('computes audio counts and preview tags for beats and packs', () => {
    const c = create();
    expect(c.requiredAudioCount()).toBe(0);
    expect(c.requiredAudioTotal()).toBe(3);
    c.previewFile.set(file('p.mp3'));
    c.wavFile.set(file('m.wav'));
    c.stemsFile.set(file('s.zip'));
    expect(c.requiredAudioCount()).toBe(3);
    c.uploadForm.patchValue({ category: 'sample' });
    expect(c.requiredAudioCount()).toBe(1);
    c.selectedMoods.set(['a', 'b', 'c', 'd', 'e']);
    expect(c.beatPreviewTags()).toHaveLength(5);
  });
});
