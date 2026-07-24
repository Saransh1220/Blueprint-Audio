import { computed, Directive, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { Genre, MusicalKey } from '../../models';
import { AuthService, LabService, ToastService } from '../../services';
import {
  normalizeSpecUploadContentType,
  SpecUploadCompletionError,
  type SpecFileUploadEvent,
  type SpecUploadEvent,
  type SpecUploadSourceFile,
  SpecUploadService,
} from '../../services/spec-upload.service';
import { SpecUploadMonitorService } from '../../services/spec-upload-monitor.service';

type UploadFileType = 'cover' | 'preview' | 'wav' | 'stems';
type FileUploadPhase = 'idle' | 'preparing' | 'uploading' | 'verifying' | 'uploaded' | 'error';
const PENDING_COMPLETION_STORAGE_PREFIX = 'waveyard.pending-spec-completion.v1';

interface FileSummary {
  name: string;
  size: string;
  detail?: string;
}

interface FileUploadState {
  phase: FileUploadPhase;
  progress: number;
  error?: string;
}

const INITIAL_FILE_UPLOAD_STATE: FileUploadState = {
  phase: 'idle',
  progress: 0,
};

@Directive()
export abstract class UploadFormBase implements OnInit, OnDestroy {
  protected labService = inject(LabService);
  protected specUploadService = inject(SpecUploadService);
  protected specUploadMonitor = inject(SpecUploadMonitorService);
  protected authService = inject(AuthService);
  protected fb = inject(FormBuilder);
  protected router = inject(Router);
  protected toastService = inject(ToastService);

  currentUser = this.authService.currentUser;

  abstract successRoute: string[];
  abstract closeRoute: string;

  totalSteps = 4;
  currentStep = signal(1);
  isSubmitting = signal(false);
  uploadProgress = signal(0);
  pendingCompletionId = signal<string | null>(null);
  uploadSessionId = signal<string | null>(null);
  fileUploadStates = signal<Record<UploadFileType, FileUploadState>>({
    cover: { ...INITIAL_FILE_UPLOAD_STATE },
    preview: { ...INITIAL_FILE_UPLOAD_STATE },
    wav: { ...INITIAL_FILE_UPLOAD_STATE },
    stems: { ...INITIAL_FILE_UPLOAD_STATE },
  });
  private draftSessionPromise: Promise<string> | null = null;
  private readonly fileUploadSubscriptions = new Map<UploadFileType, Subscription>();
  private readonly fileUploadGenerations = new Map<UploadFileType, number>();

  coverFile = signal<File | null>(null);
  coverPreviewUrl = signal<string | null>(null);
  previewFile = signal<File | null>(null);
  wavFile = signal<File | null>(null);
  stemsFile = signal<File | null>(null);

  coverSummary = signal<FileSummary | null>(null);
  previewSummary = signal<FileSummary | null>(null);
  wavSummary = signal<FileSummary | null>(null);
  stemsSummary = signal<FileSummary | null>(null);

  currentScale = signal<'major' | 'minor'>('minor');
  currentKeyRoot = signal('E');
  selectedMoods = signal<string[]>(['Moody', 'Dark']);
  selectedInstruments = signal<string[]>([]);
  beatDuration = signal<number>(0);
  tagInputError = signal<string | null>(null);
  royaltySplit = signal('50/50');
  contractType = signal('Standard');
  territory = signal('Worldwide');

  readonly moodOptions = [
    'Moody',
    'Dark',
    'Cinematic',
    'Dreamy',
    'Aggressive',
    'Soulful',
    'Melancholic',
  ];
  readonly instrumentOptions = [
    'Piano',
    'Guitar',
    'Drums',
    'Synth',
    'Bass',
    'Strings',
    'Brass',
    '808',
    'Vocal',
  ];
  readonly royaltyOptions = ['50/50', '60/40', '70/30', 'None'];
  readonly contractOptions = ['Standard', 'Custom PDF'];
  readonly territoryOptions = ['Worldwide', 'US only', 'Custom'];
  readonly steps = [1, 2, 3, 4];

  readonly stepHints: Record<number, string> = {
    1: "files - drop 'em in",
    2: 'details - title & metadata',
    3: 'licenses - set your prices',
    4: 'review - last check before publish',
  };

  readonly keys = Object.values(MusicalKey);
  readonly keyRoots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  readonly genres = signal<string[]>(Object.values(Genre));

  readonly selectedLicenses = computed(() =>
    this.licenses.controls.filter((license) => !!license.get('enabled')?.value),
  );

  readonly minimumEnabledPrice = computed(() => {
    const enabled = this.selectedLicenses();
    if (!enabled.length) return 0;
    return Math.min(...enabled.map((license) => Number(license.get('price')?.value || 0)));
  });

  readonly beatPreviewTags = computed(() => {
    const tags = [...this.selectedMoods()];
    if (this.stemsFile()) {
      tags.push('+ stems');
    }
    return tags.slice(0, 5);
  });

  readonly stepProgress = computed(() => (this.currentStep() / this.totalSteps) * 100);
  readonly allRequiredFilesUploaded = computed(
    () =>
      this.fileUploadStates().cover.phase === 'uploaded' &&
      this.fileUploadStates().preview.phase === 'uploaded' &&
      this.fileUploadStates().wav.phase === 'uploaded' &&
      this.fileUploadStates().stems.phase === 'uploaded',
  );

  uploadForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    category: ['beat', Validators.required],
    genre: ['', Validators.required],
    bpm: [
      null,
      [
        Validators.required,
        Validators.min(60),
        Validators.max(300),
        Validators.pattern(/^[0-9]*$/),
      ],
    ],
    key: ['E MINOR'],
    description: ['', [Validators.maxLength(500)]],
    freeMp3Enabled: [false],
    tags: this.fb.array([], [Validators.maxLength(3)]),
    licenses: this.fb.array([]),
  });

  get f() {
    return this.uploadForm.controls;
  }

  fieldError(field: 'title' | 'genre' | 'bpm' | 'description') {
    const control = this.uploadForm.get(field);
    if (!control?.invalid || !(control.touched || control.dirty)) return null;
    if (control.hasError('required'))
      return `${field === 'title' ? 'Track name' : 'Genre'} is required.`;
    if (control.hasError('maxlength'))
      return `${field === 'description' ? 'Description' : 'Track name'} is too long.`;
    if (control.hasError('min') || control.hasError('max'))
      return 'BPM must be between 60 and 300.';
    if (control.hasError('pattern')) return 'BPM must be a whole number.';
    return 'Please enter a valid value.';
  }

  get licenses() {
    return this.uploadForm.get('licenses') as FormArray;
  }

  get tags() {
    return this.uploadForm.get('tags') as FormArray;
  }

  ngOnInit() {
    this.initializeLicenses();
    this.syncKeyFromValue(this.uploadForm.get('key')?.value || 'E MINOR');
    this.restorePendingCompletion();
  }

  ngOnDestroy() {
    for (const subscription of this.fileUploadSubscriptions.values()) {
      subscription.unsubscribe();
    }
    this.fileUploadSubscriptions.clear();
  }

  initializeLicenses() {
    if (this.licenses.length) return;

    const defaultLicenses = [
      {
        type: 'Basic',
        name: 'Basic Lease',
        subtitle: 'mp3',
        price: 14.99,
        features: ['MP3', 'Untagged', 'Limited Streams (50k)'],
        file_types: ['MP3'],
      },
      {
        type: 'Premium',
        name: 'Premium Lease',
        subtitle: 'mp3 + wav',
        price: 24.99,
        features: ['MP3', 'WAV', 'Untagged', 'Limited Streams (500k)'],
        file_types: ['MP3', 'WAV'],
      },
      {
        type: 'Trackout',
        name: 'Trackout Lease',
        subtitle: 'wav + stems',
        price: 49.99,
        features: ['MP3', 'WAV', 'Stems', 'Untagged', 'Unlimited Streams'],
        file_types: ['MP3', 'WAV', 'ZIP'],
      },
      {
        type: 'Unlimited',
        name: 'Unlimited Lease',
        subtitle: 'pro',
        price: 99.99,
        features: ['Exclusive Rights', 'All Files Included', 'Full Ownership'],
        file_types: ['MP3', 'WAV', 'ZIP'],
      },
    ];

    defaultLicenses.forEach((lic) => {
      this.licenses.push(
        this.fb.group({
          enabled: [true],
          type: [lic.type],
          name: [lic.name, Validators.required],
          subtitle: [lic.subtitle],
          price: [
            lic.price,
            [Validators.required, Validators.min(0.01), Validators.pattern(/^\d+(\.\d{1,2})?$/)],
          ],
          features: [lic.features],
          file_types: [lic.file_types],
        }),
      );
    });
  }

  goToStep(step: number) {
    if (step < 1 || step > this.totalSteps) return;
    this.currentStep.set(step);
  }

  nextStep() {
    if (this.currentStep() === 1) {
      if (this.validateFilesStep()) {
        this.currentStep.set(2);
      }
      return;
    }

    if (this.currentStep() === 2) {
      if (this.validateDetailsStep()) {
        this.currentStep.set(3);
      }
      return;
    }

    if (this.currentStep() === 3) {
      if (this.validateLicensesStep()) {
        this.currentStep.set(4);
      }
      return;
    }

    this.submitUpload();
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update((value) => value - 1);
    }
  }

  saveDraft() {
    this.toastService.show(
      'Selected files are saved automatically. Beat details are saved when you publish.',
      'info',
    );
  }

  addTag(event: { target: { value: string } }) {
    const input = event.target;
    const value = input.value.trim();

    if (!value) return;
    if (value.length > 30) {
      this.tagInputError.set('Tags must be 30 characters or fewer.');
      return;
    }
    if (this.tags.controls.some((tag) => tag.value.toLowerCase() === value.toLowerCase())) {
      this.tagInputError.set('That tag has already been added.');
      return;
    }
    if (this.tags.length < 3) {
      this.tagInputError.set(null);
      this.tags.push(this.fb.control(value, [Validators.maxLength(30)]));
      input.value = '';
    } else {
      this.tagInputError.set('You can add up to 3 tags.');
    }
  }

  removeTag(index: number) {
    this.tags.removeAt(index);
    this.tagInputError.set(null);
  }

  toggleMood(mood: string) {
    const active = this.selectedMoods();
    if (active.includes(mood)) {
      this.selectedMoods.set(active.filter((item) => item !== mood));
      return;
    }

    if (active.length >= 5) {
      this.toastService.show('Pick up to 5 mood tags.', 'info');
      return;
    }

    this.selectedMoods.set([...active, mood]);
  }

  isMoodSelected(mood: string) {
    return this.selectedMoods().includes(mood);
  }

  toggleInstrument(instrument: string) {
    const active = this.selectedInstruments();
    if (active.includes(instrument)) {
      this.selectedInstruments.set(active.filter((item) => item !== instrument));
      return;
    }

    if (active.length >= 5) {
      this.toastService.show('Pick up to 5 instruments.', 'info');
      return;
    }

    this.selectedInstruments.set([...active, instrument]);
  }

  isInstrumentSelected(instrument: string) {
    return this.selectedInstruments().includes(instrument);
  }

  selectKeyRoot(root: string) {
    this.currentKeyRoot.set(root);
    this.applySelectedKey();
  }

  setScale(mode: 'major' | 'minor') {
    this.currentScale.set(mode);
    this.applySelectedKey();
  }

  pickRoyalty(option: string) {
    this.royaltySplit.set(option);
  }

  pickContract(option: string) {
    this.contractType.set(option);
  }

  pickTerritory(option: string) {
    this.territory.set(option);
  }

  onFileSelected(event: Event, type: UploadFileType) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Reset the native input so selecting the same file can retry a failed
    // direct upload and still dispatch another change event.
    input.value = '';
    if (file) void this.handleFile(file, type);
  }

  onFileDropped(event: DragEvent, type: UploadFileType) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      void this.handleFile(event.dataTransfer.files[0], type);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  removeFile(type: UploadFileType) {
    this.cancelFileUpload(type);
    this.setFileUploadState(type, INITIAL_FILE_UPLOAD_STATE);
    switch (type) {
      case 'cover':
        this.coverFile.set(null);
        this.coverPreviewUrl.set(null);
        this.coverSummary.set(null);
        break;
      case 'preview':
        this.previewFile.set(null);
        this.previewSummary.set(null);
        break;
      case 'wav':
        this.wavFile.set(null);
        this.wavSummary.set(null);
        break;
      case 'stems':
        this.stemsFile.set(null);
        this.stemsSummary.set(null);
        break;
    }
  }

  submitUpload() {
    const pendingCompletionId = this.pendingCompletionId();
    if (pendingCompletionId) {
      this.retryPendingCompletion(pendingCompletionId);
      return;
    }

    if (this.uploadForm.invalid) {
      this.uploadForm.markAllAsTouched();
      return;
    }

    const cover = this.coverFile();
    const preview = this.previewFile();
    const wav = this.wavFile();
    const stems = this.stemsFile();

    if (!cover || !preview) {
      this.toastService.show('Cover image and preview audio are required.', 'error');
      return;
    }
    if (!this.validateBeatDownloadFiles(wav, stems)) return;
    if (!this.allRequiredFilesUploaded()) {
      this.toastService.show(
        'Please wait until the cover, preview, WAV, and stems uploads are complete.',
        'error',
      );
      return;
    }
    const uploadSessionId = this.uploadSessionId();
    if (!uploadSessionId) {
      this.toastService.show(
        'The upload draft could not be created. Select a file again.',
        'error',
      );
      return;
    }

    const enabledLicenses = this.uploadForm
      .getRawValue()
      .licenses.filter((license: any) => license.enabled)
      .map((license: any) => ({
        ...license,
        price: Number(license.price),
      }));

    if (!enabledLicenses.length) {
      this.toastService.show('Please enable at least one license option.', 'error');
      return;
    }

    this.isSubmitting.set(true);
    this.uploadProgress.set(100);

    const formValue = this.uploadForm.getRawValue();
    const basePrice = Math.min(...enabledLicenses.map((license: any) => license.price));
    const storeCurrency = this.authService.currentUser()?.store_currency || 'USD';

    const metadata = {
      title: formValue.title,
      category: formValue.category,
      type: formValue.category === 'beat' ? 'beat' : 'pack',
      bpm: formValue.bpm ? Number(formValue.bpm) : 0,
      key: formValue.key || 'Unknown',
      price: basePrice,
      price_currency: storeCurrency,
      tags: formValue.tags,
      genres: [
        {
          name: formValue.genre,
          slug: formValue.genre?.toLowerCase().replace(/\s+/g, '-'),
        },
      ],
      description: formValue.description || '',
      free_mp3_enabled: formValue.freeMp3Enabled,
      moods: this.selectedMoods(),
      instruments: this.selectedInstruments(),
      licenses: enabledLicenses.map(({ enabled, subtitle, ...license }: any) => ({
        ...license,
        price_currency: storeCurrency,
      })),
    };

    this.specUploadService.publishBeat(uploadSessionId, metadata).subscribe({
      next: (event) => this.handleUploadEvent(event),
      error: (error) => this.handleUploadError(error),
    });
  }

  private retryPendingCompletion(uploadId: string) {
    this.isSubmitting.set(true);
    this.uploadProgress.set(100);
    this.specUploadService.completeUpload(uploadId).subscribe({
      next: (event) => this.handleUploadEvent(event),
      error: (error) => this.handleUploadError(error),
    });
  }

  private handleUploadEvent(event: SpecUploadEvent) {
    this.clearPendingCompletion();
    this.isSubmitting.set(false);
    this.labService.notifyRefresh();
    this.specUploadMonitor.monitor(event.uploadId);
    this.toastService.show('Beat submitted. Processing started in the background.', 'info');
    this.router.navigate(this.successRoute);
  }

  private handleUploadError(error: unknown) {
    console.error('Upload failed', error);
    this.isSubmitting.set(false);
    this.uploadProgress.set(0);

    if (error instanceof SpecUploadCompletionError) {
      if (this.isAmbiguousCompletionError(error)) {
        this.pendingCompletionId.set(error.uploadId);
        this.rememberPendingCompletion(error.uploadId);
        this.toastService.show(
          'Your files are uploaded, but finalization was not confirmed. Use “Retry finalization” to safely continue this upload.',
          'error',
        );
        return;
      }
      this.clearPendingCompletion();
    }

    const details = this.errorDetails(error);
    this.toastService.show('Upload failed: ' + (details || 'Unknown error'), 'error');
  }

  private errorDetails(error: unknown) {
    return typeof error === 'object' && error !== null
      ? ((error as any).error?.message ??
          (typeof (error as any).error === 'string' ? (error as any).error : undefined) ??
          (error as any).message)
      : undefined;
  }

  private isAmbiguousCompletionError(error: SpecUploadCompletionError) {
    const status =
      typeof error.cause === 'object' && error.cause !== null
        ? Number((error.cause as any).status)
        : 0;
    return !status || status === 408 || status === 425 || status === 429 || status >= 500;
  }

  private pendingCompletionStorageKey() {
    const userId = this.authService.currentUser()?.id || 'unknown';
    return `${PENDING_COMPLETION_STORAGE_PREFIX}:${userId}`;
  }

  private rememberPendingCompletion(uploadId: string) {
    try {
      window.localStorage.setItem(this.pendingCompletionStorageKey(), uploadId);
    } catch {
      // The in-memory retry remains available when browser storage is disabled.
    }
  }

  private restorePendingCompletion() {
    try {
      const uploadId = window.localStorage.getItem(this.pendingCompletionStorageKey())?.trim();
      if (uploadId) this.pendingCompletionId.set(uploadId);
    } catch {
      // Nothing to restore when browser storage is disabled.
    }
  }

  private clearPendingCompletion() {
    this.pendingCompletionId.set(null);
    try {
      window.localStorage.removeItem(this.pendingCompletionStorageKey());
    } catch {
      // The upload is already finalized, so storage cleanup is best effort.
    }
  }

  getStepHint() {
    return this.stepHints[this.currentStep()];
  }

  isStepDone(step: number) {
    return step < this.currentStep();
  }

  isStepCurrent(step: number) {
    return step === this.currentStep();
  }

  getStepLabel(step: number) {
    const labels = ['Files', 'Details', 'Licenses', 'Review'];
    return labels[step - 1];
  }

  getKeyRootLabel(root: string) {
    return root.replace('#', '\u266f');
  }

  getCoverSummaryText() {
    const summary = this.coverSummary();
    return summary ? `${summary.name} - ${summary.detail || summary.size}` : 'Not uploaded';
  }

  getKeyPreview() {
    const [root, mode] = (this.uploadForm.get('key')?.value || 'E MINOR').split(' ');
    return {
      root,
      mode: mode?.toLowerCase() || 'minor',
    };
  }

  getLicenseDisplayFormat(control: any) {
    return (control.get('subtitle')?.value || '').toString().toUpperCase();
  }

  getLicenseSummaryName(control: any) {
    return control.get('name')?.value || control.get('type')?.value || 'License';
  }

  getReferenceLicenseName(type: string) {
    const names: Record<string, string> = {
      Basic: 'Basic',
      Premium: 'Premium',
      Trackout: 'Unlimited',
      Unlimited: 'Exclusive',
    };
    return names[type] || type || 'License';
  }

  getReferenceLicenseFormat(type: string) {
    const formats: Record<string, string> = {
      Basic: 'MP3',
      Premium: 'WAV',
      Trackout: 'Pro',
      Unlimited: '*',
    };
    return formats[type] || '';
  }

  getReferenceLicenseSub(type: string) {
    const subtitles: Record<string, string> = {
      Basic: 'demos & drafts',
      Premium: 'full release',
      Trackout: 'labels & sync',
      Unlimited: 'yours alone',
    };
    return subtitles[type] || '';
  }

  formatCurrency(value: number | string) {
    const amount = Number(value || 0);
    const storeCurrency = this.authService.currentUser()?.store_currency || 'USD';
    const symbol = storeCurrency === 'INR' ? '₹' : '$';
    return `${symbol}${amount.toFixed(2)}`;
  }

  formatFileState(type: UploadFileType) {
    const summary = this.getSummarySignal(type)();
    if (summary) {
      return summary.detail
        ? `${summary.name} - ${summary.size} - ${summary.detail}`
        : `${summary.name} - ${summary.size}`;
    }

    if (type === 'cover') return 'Required - upload cover art';
    if (type === 'preview') return 'Required - tagged MP3 preview';
    const requirement = this.isBeatUpload() ? 'Required' : 'Optional';
    if (type === 'wav') return `${requirement} - master WAV`;
    return `${requirement} - ZIP or RAR trackouts`;
  }

  isBeatUpload() {
    return this.uploadForm.get('category')?.value === 'beat';
  }

  requiredAudioCount() {
    let count = this.previewFile() ? 1 : 0;
    if (this.isBeatUpload()) {
      count += this.wavFile() ? 1 : 0;
      count += this.stemsFile() ? 1 : 0;
    }
    return count;
  }

  requiredAudioTotal() {
    return this.isBeatUpload() ? 3 : 1;
  }

  private validateDetailsStep() {
    const stepFields = ['title', 'category', 'genre', 'bpm'];
    let valid = true;

    stepFields.forEach((field) => {
      const control = this.uploadForm.get(field);
      if (control?.invalid) {
        control.markAsTouched();
        valid = false;
      }
    });

    return valid;
  }

  private validateFilesStep() {
    if (!this.coverFile() || !this.previewFile()) {
      this.toastService.show('Please upload cover art and preview audio.', 'error');
      return false;
    }
    return this.validateBeatDownloadFiles(this.wavFile(), this.stemsFile());
  }

  private validateBeatDownloadFiles(wav: File | null, stems: File | null) {
    if (!this.isBeatUpload() || (wav && stems)) return true;

    const missing = [!wav ? 'master WAV' : '', !stems ? 'stems archive' : ''].filter(Boolean);
    const missingLabel =
      missing.length === 2 ? `${missing[0]} and ${missing[1]}` : (missing[0] ?? 'audio files');
    this.toastService.show(`Please upload the required ${missingLabel} for this beat.`, 'error');
    return false;
  }

  private validateLicensesStep() {
    const enabled = this.selectedLicenses();
    if (!enabled.length) {
      this.toastService.show('Please enable at least one license option.', 'error');
      return false;
    }
    return true;
  }

  private applySelectedKey() {
    this.uploadForm.patchValue(
      {
        key: `${this.currentKeyRoot()} ${this.currentScale() === 'major' ? 'MAJOR' : 'MINOR'}`,
      },
      { emitEvent: false },
    );
  }

  private syncKeyFromValue(value: string) {
    const [root, mode] = value.split(' ');
    this.currentKeyRoot.set(root || 'E');
    this.currentScale.set(mode === 'MAJOR' ? 'major' : 'minor');
  }

  private async handleFile(file: File, type: UploadFileType) {
    const limits = {
      cover: { size: 5 * 1024 * 1024, label: '5MB' },
      preview: { size: 30 * 1024 * 1024, label: '30MB' },
      wav: { size: 300 * 1024 * 1024, label: '300MB' },
      stems: { size: 1024 * 1024 * 1024, label: '1GB' },
    };

    if (file.size > limits[type].size) {
      this.toastService.show(
        `File too large. Max size for ${type} is ${limits[type].label}`,
        'error',
      );
      return;
    }

    switch (type) {
      case 'cover':
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
          this.toastService.show('Cover art must be a JPG or PNG image.', 'error');
          return;
        }
        const dimensions = await this.getImageDimensions(file);
        if (!dimensions) {
          this.toastService.show('Cover art must be a valid JPG or PNG image.', 'error');
          return;
        }
        this.coverFile.set(file);
        await this.setCoverPreview(file);
        this.coverSummary.set({
          name: file.name,
          size: this.formatBytes(file.size),
          detail: `${dimensions.width}x${dimensions.height}${
            dimensions.width === dimensions.height ? '' : ' · center crop'
          }`,
        });
        break;
      case 'preview':
        if (file.type !== 'audio/mpeg' && !file.name.toLowerCase().endsWith('.mp3')) {
          this.toastService.show('Preview audio must be an MP3 file.', 'error');
          return;
        }
        this.previewFile.set(file);
        this.previewSummary.set({
          name: file.name,
          size: this.formatBytes(file.size),
          detail: await this.getAudioDuration(file),
        });
        break;
      case 'wav':
        if (!file.name.toLowerCase().endsWith('.wav') && !file.type.includes('wav')) {
          this.toastService.show('Invalid file type. Please upload a WAV file.', 'error');
          return;
        }
        this.wavFile.set(file);
        this.wavSummary.set({
          name: file.name,
          size: this.formatBytes(file.size),
          detail: await this.getAudioDuration(file),
        });
        break;
      case 'stems':
        if (!/\.(zip|rar)$/i.test(file.name)) {
          this.toastService.show('Invalid file type. Please upload a ZIP or RAR file.', 'error');
          return;
        }
        this.stemsFile.set(file);
        this.stemsSummary.set({
          name: file.name,
          size: this.formatBytes(file.size),
          detail: undefined,
        });
        break;
    }
    this.startFileUpload(type, file);
  }

  fileUploadState(type: UploadFileType) {
    return this.fileUploadStates()[type];
  }

  fileUploadLabel(type: UploadFileType) {
    const state = this.fileUploadState(type);
    switch (state.phase) {
      case 'preparing':
        return 'Preparing secure upload';
      case 'uploading':
        return `Uploading ${state.progress}%`;
      case 'verifying':
        return 'Verifying file';
      case 'uploaded':
        return 'Uploaded';
      case 'error':
        return state.error || 'Upload failed - select again';
      default:
        return 'Not uploaded';
    }
  }

  private startFileUpload(type: UploadFileType, file: File) {
    this.cancelFileUpload(type);
    const generation = (this.fileUploadGenerations.get(type) ?? 0) + 1;
    this.fileUploadGenerations.set(type, generation);
    this.setFileUploadState(type, { phase: 'preparing', progress: 0 });

    void this.ensureDraftSession()
      .then((uploadId) => {
        if (!this.isCurrentFileUpload(type, file, generation)) return;
        const source = this.toUploadSource(type, file);
        const subscription = this.specUploadService.uploadFile(uploadId, source).subscribe({
          next: (event) => this.handleFileUploadEvent(type, file, generation, event),
          error: (error) => this.handleFileUploadError(type, file, generation, error),
        });
        this.fileUploadSubscriptions.set(type, subscription);
      })
      .catch((error) => this.handleFileUploadError(type, file, generation, error));
  }

  private ensureDraftSession() {
    const existing = this.uploadSessionId();
    if (existing) return Promise.resolve(existing);
    if (this.draftSessionPromise) return this.draftSessionPromise;

    const pending = firstValueFrom(this.specUploadService.createDraft()).then((session) => {
      this.uploadSessionId.set(session.upload_id);
      return session.upload_id;
    });
    this.draftSessionPromise = pending;
    const clearPending = () => {
      if (this.draftSessionPromise === pending) this.draftSessionPromise = null;
    };
    void pending.then(clearPending, clearPending);
    return pending;
  }

  private handleFileUploadEvent(
    type: UploadFileType,
    file: File,
    generation: number,
    event: SpecFileUploadEvent,
  ) {
    if (!this.isCurrentFileUpload(type, file, generation)) return;
    if (event.type === 'progress') {
      this.setFileUploadState(type, { phase: 'uploading', progress: event.percent });
      return;
    }
    if (event.type === 'verifying') {
      this.setFileUploadState(type, { phase: 'verifying', progress: 100 });
      return;
    }
    this.setFileUploadState(type, { phase: 'uploaded', progress: 100 });
    this.fileUploadSubscriptions.delete(type);
  }

  private handleFileUploadError(
    type: UploadFileType,
    file: File,
    generation: number,
    error: unknown,
  ) {
    if (!this.isCurrentFileUpload(type, file, generation)) return;
    console.error(`Failed to upload ${type}`, error);
    const details = this.errorDetails(error);
    this.setFileUploadState(type, {
      phase: 'error',
      progress: 0,
      error: details ? `Failed - ${details}` : 'Upload failed - select again',
    });
    this.fileUploadSubscriptions.delete(type);
    this.toastService.show(
      `${this.fileDisplayName(type)} upload failed: ${details || 'Please select it again.'}`,
      'error',
    );
  }

  private cancelFileUpload(type: UploadFileType) {
    this.fileUploadSubscriptions.get(type)?.unsubscribe();
    this.fileUploadSubscriptions.delete(type);
    this.fileUploadGenerations.set(type, (this.fileUploadGenerations.get(type) ?? 0) + 1);
  }

  private isCurrentFileUpload(type: UploadFileType, file: File, generation: number) {
    return (
      this.getFileSignal(type)() === file && this.fileUploadGenerations.get(type) === generation
    );
  }

  private setFileUploadState(type: UploadFileType, state: FileUploadState) {
    this.fileUploadStates.update((states) => ({
      ...states,
      [type]: { ...state },
    }));
  }

  private toUploadSource(type: UploadFileType, file: File): SpecUploadSourceFile {
    const kind = type === 'cover' ? 'image' : type;
    return {
      kind,
      file,
      contentType: normalizeSpecUploadContentType(kind, file),
    };
  }

  private getFileSignal(type: UploadFileType) {
    if (type === 'cover') return this.coverFile;
    if (type === 'preview') return this.previewFile;
    if (type === 'wav') return this.wavFile;
    return this.stemsFile;
  }

  private fileDisplayName(type: UploadFileType) {
    if (type === 'cover') return 'Cover';
    if (type === 'preview') return 'Preview MP3';
    if (type === 'wav') return 'Master WAV';
    return 'Stems';
  }

  private getSummarySignal(type: UploadFileType) {
    if (type === 'cover') return this.coverSummary;
    if (type === 'preview') return this.previewSummary;
    if (type === 'wav') return this.wavSummary;
    return this.stemsSummary;
  }

  private setCoverPreview(file: File) {
    return new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        this.coverPreviewUrl.set((event.target?.result as string) || null);
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }

  private getImageDimensions(file: File) {
    return new Promise<{ width: number; height: number } | null>((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const dimensions =
          img.width > 0 && img.height > 0 ? { width: img.width, height: img.height } : null;
        resolve(dimensions);
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  }

  private getAudioDuration(file: File) {
    return new Promise<string>((resolve) => {
      const audio = document.createElement('audio');
      const url = URL.createObjectURL(file);
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        const total = Number.isFinite(audio.duration) ? audio.duration : 0;
        this.beatDuration.set(Math.round(total));
        const mins = Math.floor(total / 60);
        const secs = Math.floor(total % 60);
        resolve(total ? `${mins}:${secs.toString().padStart(2, '0')}` : '');
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        resolve('');
        URL.revokeObjectURL(url);
      };
      audio.src = url;
    });
  }

  private formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}
