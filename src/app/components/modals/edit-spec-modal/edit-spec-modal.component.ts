import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SpecDto } from '../../../core/api/spec.requests';
import { SpecService } from '../../../services/spec.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-edit-spec-modal',
  imports: [CommonModule, ReactiveFormsModule, NgOptimizedImage],
  templateUrl: './edit-spec-modal.component.html',
  styleUrl: './edit-spec-modal.component.scss',
})
export class EditSpecModalComponent implements OnInit {
  private specService = inject(SpecService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  editForm!: FormGroup;
  spec = signal<SpecDto | null>(null);
  isSaving = signal(false);
  isOpen = signal(false);

  // File Upload State
  selectedFile = signal<File | null>(null);
  imagePreview = signal<string | null>(null);

  ngOnInit() {
    this.initForm();
  }

  open(spec: SpecDto) {
    this.spec.set(spec);
    this.imagePreview.set(spec.image_url); // Set initial preview
    this.selectedFile.set(null); // Reset file
    this.initForm();
    this.isOpen.set(true);
  }

  get licenses() {
    return this.editForm.get('licenses') as FormArray;
  }

  private initForm() {
    const currentSpec = this.spec();
    this.editForm = this.fb.group({
      title: [currentSpec?.title || '', [Validators.required, Validators.maxLength(100)]],
      // base_price removed -> calculated from licenses
      bpm: [currentSpec?.bpm || null, [Validators.min(50), Validators.max(300)]],
      key: [currentSpec?.key || ''],
      tags: [currentSpec?.tags?.join(', ') || ''],
      description: [currentSpec?.description || ''],
      freeMp3Enabled: [currentSpec?.free_mp3_enabled || false],
      licenses: this.fb.array([]),
    });

    this.initializeLicenses(currentSpec);
  }

  private initializeLicenses(spec: SpecDto | null) {
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

    const currentLicenses = spec?.licenses || [];

    defaultLicenses.forEach((def) => {
      // Find matching license in existing spec
      const existing = currentLicenses.find((l: any) => l.type === def.type || l.name === def.name);

      this.licenses.push(
        this.fb.group({
          enabled: [!!existing], // Enabled if it exists
          type: [existing?.type || def.type],
          name: [existing?.name || def.name, Validators.required],
          price: [existing?.price || def.price, [Validators.required, Validators.min(0)]],
          features: [existing?.features || def.features],
          file_types: [existing?.file_types || def.file_types],
        }),
      );
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      if (!file.type.startsWith('image/')) {
        this.toastService.error('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.toastService.error('Image size must be less than 5MB');
        return;
      }

      this.selectedFile.set(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  save() {
    if (this.editForm.invalid) {
      this.toastService.error('Please fix the form errors');
      return;
    }

    const currentSpec = this.spec();
    if (!currentSpec) return;

    this.isSaving.set(true);

    const formValue = this.editForm.value;

    // Process licenses
    const enabledLicenses = formValue.licenses
      .filter((l: any) => l.enabled)
      .map((l: any) => ({
        ...l,
        price: Number(l.price),
      }));

    if (enabledLicenses.length === 0) {
      this.toastService.error('Please enable at least one license option');
      this.isSaving.set(false);
      return;
    }

    // Calculate base price (cheapest enabled license)
    const basePrice = Math.min(...enabledLicenses.map((l: any) => l.price));

    const metadata = {
      title: formValue.title,
      price: basePrice, // Use calculated base price
      bpm: formValue.bpm || 0,
      key: formValue.key || '',
      tags: formValue.tags
        ? formValue.tags
            .split(',')
            .map((tag: string) => tag.trim())
            .filter(Boolean)
        : [],
      description: formValue.description || '',
      free_mp3_enabled: !!formValue.freeMp3Enabled,
      licenses: enabledLicenses,
    };

    const formData = new FormData();
    formData.append('metadata', JSON.stringify(metadata));

    const file = this.selectedFile();
    if (file) {
      formData.append('image', file);
    }

    this.specService.updateSpec(currentSpec.id, formData).subscribe({
      next: () => {
        this.toastService.success('Spec updated successfully');
        this.close();
        window.location.reload();
      },
      error: (err) => {
        console.error('Update failed', err);
        this.toastService.error(err.error?.message || 'Failed to update spec');
        this.isSaving.set(false);
      },
    });
  }

  close() {
    this.isOpen.set(false);
    this.spec.set(null);
    this.selectedFile.set(null);
    this.imagePreview.set(null);
  }
}
