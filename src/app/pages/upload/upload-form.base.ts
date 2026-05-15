import { HttpEventType } from '@angular/common/http';
import { computed, Directive, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Genre, MusicalKey } from '../../models';
import { LabService } from '../../services/lab';
import { ToastService } from '../../services/toast.service';

type UploadFileType = 'cover' | 'preview' | 'wav' | 'stems';

interface FileSummary {
  name: string;
  size: string;
  detail?: string;
}

@Directive()
export abstract class UploadFormBase implements OnInit {
  protected labService = inject(LabService);
  protected fb = inject(FormBuilder);
  protected router = inject(Router);
  protected toastService = inject(ToastService);

  abstract successRoute: string[];
  abstract closeRoute: string;

  totalSteps = 4;
  currentStep = signal(1);
  isSubmitting = signal(false);
  uploadProgress = signal(0);

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

  uploadForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    category: ['beat', Validators.required],
    genre: ['', Validators.required],
    bpm: [null, [Validators.min(60), Validators.max(300), Validators.pattern(/^[0-9]*$/)]],
    key: ['E MINOR'],
    description: ['', [Validators.maxLength(500)]],
    freeMp3Enabled: [false],
    tags: this.fb.array([], [Validators.maxLength(3)]),
    licenses: this.fb.array([]),
  });

  get f() {
    return this.uploadForm.controls;
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
  }

  initializeLicenses() {
    if (this.licenses.length) return;

    const defaultLicenses = [
      {
        type: 'Basic',
        name: 'Basic Lease',
        subtitle: 'mp3',
        price: 1499,
        features: ['MP3', 'Untagged', 'Limited Streams (50k)'],
        file_types: ['MP3'],
      },
      {
        type: 'Premium',
        name: 'Premium Lease',
        subtitle: 'mp3 + wav',
        price: 2499,
        features: ['MP3', 'WAV', 'Untagged', 'Limited Streams (500k)'],
        file_types: ['MP3', 'WAV'],
      },
      {
        type: 'Trackout',
        name: 'Trackout Lease',
        subtitle: 'wav + stems',
        price: 4999,
        features: ['MP3', 'WAV', 'Stems', 'Untagged', 'Unlimited Streams'],
        file_types: ['MP3', 'WAV', 'ZIP'],
      },
      {
        type: 'Unlimited',
        name: 'Unlimited Lease',
        subtitle: 'pro',
        price: 9999,
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
          price: [lic.price, [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
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
      'Draft saving will be wired later. Your progress is still on screen.',
      'info',
    );
  }

  addTag(event: { target: { value: string } }) {
    const input = event.target;
    const value = input.value.trim();

    if (value && this.tags.length < 3) {
      this.tags.push(this.fb.control(value));
      input.value = '';
    }
  }

  removeTag(index: number) {
    this.tags.removeAt(index);
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
    if (input.files && input.files.length > 0) {
      void this.handleFile(input.files[0], type);
    }
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
    if (this.uploadForm.invalid) {
      this.uploadForm.markAllAsTouched();
      return;
    }

    const cover = this.coverFile();
    const preview = this.previewFile();

    if (!cover || !preview) {
      this.toastService.show('Cover image and preview audio are required.', 'error');
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

    const formValue = this.uploadForm.getRawValue();
    const basePrice = Math.min(...enabledLicenses.map((license: any) => license.price));

    const metadata = {
      title: formValue.title,
      category: formValue.category,
      type: formValue.category === 'beat' ? 'beat' : 'pack',
      bpm: formValue.bpm ? Number(formValue.bpm) : 0,
      key: formValue.key || 'Unknown',
      price: basePrice,
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
      duration: this.beatDuration(),
      licenses: enabledLicenses.map(({ subtitle, ...license }: any) => license),
    };

    const formData = new FormData();
    formData.append('metadata', JSON.stringify(metadata));
    formData.append('image', cover);
    formData.append('preview', preview);

    const wav = this.wavFile();
    if (wav) formData.append('wav', wav);

    const stems = this.stemsFile();
    if (stems) formData.append('stems', stems);

    this.labService.createSpec(formData).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress.set(Math.round((100 * event.loaded) / event.total));
        } else if (event.type === HttpEventType.Response) {
          this.isSubmitting.set(false);
          this.toastService.show('Upload Started! Processing in background...', 'info');
          this.router.navigate(this.successRoute);
        }
      },
      error: (err) => {
        console.error('Upload failed', err);
        this.isSubmitting.set(false);
        this.uploadProgress.set(0);
        this.toastService.show(
          'Upload failed: ' + (err.error?.message || err.message || 'Unknown error'),
          'error',
        );
      },
    });
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

  formatCurrency(value: number | string) {
    const amount = Number(value || 0);
    return `\u20b9${Math.round(amount)}`;
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
    if (type === 'wav') return 'Optional - master WAV';
    return 'Optional - ZIP / RAR trackouts';
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
    return true;
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
        if (!file.type.startsWith('image/')) {
          this.toastService.show('Invalid file type. Please upload an image.', 'error');
          return;
        }
        this.coverFile.set(file);
        await this.setCoverPreview(file);
        this.coverSummary.set({
          name: file.name,
          size: this.formatBytes(file.size),
          detail: await this.getImageDimensions(file),
        });
        break;
      case 'preview':
        if (!file.type.startsWith('audio/')) {
          this.toastService.show('Invalid file type. Please upload an audio file.', 'error');
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
        if (
          !file.name.toLowerCase().endsWith('.zip') &&
          !file.name.toLowerCase().endsWith('.rar')
        ) {
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
    return new Promise<string>((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve(`${img.width}x${img.height}`);
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        resolve('');
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
