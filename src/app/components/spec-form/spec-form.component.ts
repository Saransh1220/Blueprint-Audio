import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  effect,
  inject,
  OnInit,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { Genre, MusicalKey, Spec, SpecFormData } from '../../models';

@Component({
  selector: 'app-spec-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './spec-form.component.html',
  styleUrl: './spec-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecFormComponent implements OnInit {
  private fb = inject(FormBuilder);

  // Inputs
  mode = input<'create' | 'edit'>('create');
  initialData = input<Partial<Spec>>();

  // Outputs
  formSubmit = output<SpecFormData>();
  formCancel = output<void>();

  // File Signals (create mode only)
  coverFile = signal<File | null>(null);
  coverPreviewUrl = signal<string | null>(null);
  previewFile = signal<File | null>(null);
  wavFile = signal<File | null>(null);
  stemsFile = signal<File | null>(null);

  // Const ants
  keys = Object.values(MusicalKey);
  genres = signal<string[]>(Object.values(Genre));

  // Form
  specForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    category: ['beat' as 'beat' | 'sample', Validators.required],
    genre: ['', Validators.required],
    bpm: [
      null as number | null,
      [Validators.min(60), Validators.max(300), Validators.pattern(/^[0-9]*$/)],
    ],
    key: [''],
    description: [''],
    tags: this.fb.array([], [Validators.maxLength(3)]),
    licenses: this.fb.array([]),
  });

  get tags() {
    return this.specForm.get('tags') as FormArray;
  }

  get licenses() {
    return this.specForm.get('licenses') as FormArray;
  }

  constructor() {
    // Load initial data when provided
    effect(() => {
      const data = this.initialData();
      if (data) {
        this.loadFormData(data);
      }
    });
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

  loadFormData(data: Partial<Spec>) {
    this.specForm.patchValue({
      title: data.title || '',
      category: data.category || 'beat',
      genre: data.genres?.[0]?.name || '',
      bpm: data.bpm || null,
      key: data.key || '',
    });

    // Load tags
    if (data.tags) {
      this.tags.clear();
      data.tags.forEach((tag) => this.tags.push(this.fb.control(tag)));
    }

    // Load licenses
    if (data.licenses) {
      this.licenses.clear();
      data.licenses.forEach((license) => {
        this.licenses.push(
          this.fb.group({
            enabled: [true],
            type: [license.type],
            name: [license.name, Validators.required],
            price: [license.price, [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
            features: [license.features],
            file_types: [license.fileTypes],
          }),
        );
      });
    }
  }

  addTag(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();

    if (value && this.tags.length < 3) {
      this.tags.push(this.fb.control(value));
      input.value = '';
    }
  }

  removeTag(index: number) {
    this.tags.removeAt(index);
  }

  onFileSelected(event: Event, type: 'cover' | 'preview' | 'wav' | 'stems') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    switch (type) {
      case 'cover':
        this.coverFile.set(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          this.coverPreviewUrl.set(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        break;
      case 'preview':
        this.previewFile.set(file);
        break;
      case 'wav':
        this.wavFile.set(file);
        break;
      case 'stems':
        this.stemsFile.set(file);
        break;
    }
  }

  onSubmit() {
    if (this.specForm.invalid) {
      this.specForm.markAllAsTouched();
      return;
    }

    const formData: SpecFormData = {
      ...(this.specForm.value as any),
      coverFile: this.coverFile(),
      previewFile: this.previewFile(),
      wavFile: this.wavFile(),
      stemsFile: this.stemsFile(),
    };

    this.formSubmit.emit(formData);
  }

  onCancel() {
    this.formCancel.emit();
  }

  isCreateMode(): boolean {
    return this.mode() === 'create';
  }

  getLicenseGroup(index: number): FormGroup {
    return this.licenses.at(index) as FormGroup;
  }
}
