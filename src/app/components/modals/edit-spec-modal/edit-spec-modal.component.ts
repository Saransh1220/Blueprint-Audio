import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SpecService } from '../../../services/spec.service';
import { ToastService } from '../../../services/toast.service';
import { SpecDto } from '../../../core/api/spec.requests';

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

  private initForm() {
    const currentSpec = this.spec();
    this.editForm = this.fb.group({
      title: [currentSpec?.title || '', [Validators.required, Validators.maxLength(100)]],
      base_price: [currentSpec ? currentSpec.price : 0, [Validators.required, Validators.min(0)]],
      bpm: [currentSpec?.bpm || null, [Validators.min(50), Validators.max(300)]],
      key: [currentSpec?.key || ''],
      tags: [currentSpec?.tags?.join(', ') || ''],
      description: [currentSpec?.description || ''],
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      // Validate file type and size (optional but good practice)
      if (!file.type.startsWith('image/')) {
        this.toastService.error('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        this.toastService.error('Image size must be less than 5MB');
        return;
      }

      this.selectedFile.set(file);

      // Create preview
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
    const metadata = {
      title: formValue.title,
      price: formValue.base_price, // Backend uses base_price db tag but expects price in JSON? No, we updated handler to map BasePrice. Wait, let's check DTO.
      // DTO says "price" for BasePrice.
      bpm: formValue.bpm || 0,
      key: formValue.key || '',
      tags: formValue.tags
        ? formValue.tags
            .split(',')
            .map((tag: string) => tag.trim())
            .filter(Boolean)
        : [],
      description: formValue.description || '',
    };

    // Create FormData
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
