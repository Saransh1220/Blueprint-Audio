import { CommonModule } from '@angular/common';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Genre, MusicalKey } from '../../models';
import { AuthService, LabService, ToastService } from '../../services';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadComponent implements OnInit {
  private authService = inject(AuthService);
  private labService = inject(LabService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private toastService = inject(ToastService);

  currentStep = signal(1);
  isSubmitting = signal(false);
  uploadProgress = signal(0);

  // File Signals
  coverFile = signal<File | null>(null);
  coverPreviewUrl = signal<string | null>(null);
  previewFile = signal<File | null>(null);
  wavFile = signal<File | null>(null);
  stemsFile = signal<File | null>(null);

  // Constants
  keys = Object.values(MusicalKey);
  genres = signal<string[]>(Object.values(Genre));

  uploadForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    category: ['beat', Validators.required],
    genre: ['', Validators.required],
    bpm: [null, [Validators.min(60), Validators.max(300), Validators.pattern(/^[0-9]*$/)]],
    key: [''],
    description: [''],
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
  }

  initializeLicenses() {
    const defaultLicenses = [
      {
        type: 'Basic',
        name: 'Basic Lease',
        price: 1499,
        features: ['MP3', 'Untagged', 'Limited Streams (50k)'],
        file_types: ['MP3'],
      },
      {
        type: 'Premium',
        name: 'Premium Lease',
        price: 2499,
        features: ['MP3', 'WAV', 'Untagged', 'Limited Streams (500k)'],
        file_types: ['MP3', 'WAV'],
      },
      {
        type: 'Trackout',
        name: 'Trackout Lease',
        price: 4999,
        features: ['MP3', 'WAV', 'Stems', 'Untagged', 'Unlimited Streams'],
        file_types: ['MP3', 'WAV', 'ZIP'],
      },
      {
        type: 'Unlimited',
        name: 'Unlimited Lease',
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
          price: [lic.price, [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
          features: [lic.features],
          file_types: [lic.file_types],
        }),
      );
    });
  }

  addTag(event: any) {
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

  nextStep() {
    const step1Fields = ['title', 'category', 'genre', 'bpm'];
    let valid = true;

    step1Fields.forEach((field) => {
      const control = this.uploadForm.get(field);
      if (control?.invalid) {
        control.markAsTouched();
        valid = false;
      }
    });

    if (!this.coverFile() || !this.previewFile()) {
      this.toastService.show('Please upload cover art and preview audio.', 'error');
      return;
    }

    if (valid) {
      this.currentStep.set(2);
    }
  }

  prevStep() {
    this.currentStep.set(1);
  }

  onFileSelected(event: Event, type: 'cover' | 'preview' | 'wav' | 'stems') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0], type);
    }
  }

  onFileDropped(event: DragEvent, type: 'cover' | 'preview' | 'wav' | 'stems') {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0], type);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  private handleFile(file: File, type: 'cover' | 'preview' | 'wav' | 'stems') {
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
      case 'cover': {
        if (!file.type.startsWith('image/')) {
          this.toastService.show('Invalid file type. Please upload an image.', 'error');
          return;
        }
        this.coverFile.set(file);
        const reader = new FileReader();
        reader.onload = (e) => this.coverPreviewUrl.set(e.target?.result as string);
        reader.readAsDataURL(file);
        break;
      }
      case 'preview':
        if (!file.type.startsWith('audio/')) {
          this.toastService.show('Invalid file type. Please upload an audio file.', 'error');
          return;
        }
        this.previewFile.set(file);
        break;
      case 'wav':
        if (!file.name.toLowerCase().endsWith('.wav') && !file.type.includes('wav')) {
          this.toastService.show('Invalid file type. Please upload a WAV file.', 'error');
          return;
        }
        this.wavFile.set(file);
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
        break;
    }
  }

  removeFile(type: 'cover' | 'preview' | 'wav' | 'stems') {
    switch (type) {
      case 'cover':
        this.coverFile.set(null);
        this.coverPreviewUrl.set(null);
        break;
      case 'preview':
        this.previewFile.set(null);
        break;
      case 'wav':
        this.wavFile.set(null);
        break;
      case 'stems':
        this.stemsFile.set(null);
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

    this.isSubmitting.set(true);

    const formValue = this.uploadForm.getRawValue();

    const enabledLicenses = formValue.licenses
      .filter((l: any) => l.enabled)
      .map((l: any) => ({
        ...l,
        price: Number(l.price),
      }));

    if (enabledLicenses.length === 0) {
      this.toastService.show('Please enable at least one license option.', 'error');
      this.isSubmitting.set(false);
      return;
    }

    const basePrice = Math.min(...enabledLicenses.map((l: any) => l.price));

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
      licenses: enabledLicenses,
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
          const progress = Math.round((100 * event.loaded) / event.total);
          this.uploadProgress.set(progress);
        } else if (event.type === HttpEventType.Response) {
          this.isSubmitting.set(false);
          this.toastService.show('Upload Successful!', 'success');
          this.router.navigate(['/dashboard']);
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
}
