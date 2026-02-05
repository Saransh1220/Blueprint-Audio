import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SpecService } from '../../../services/spec.service';
import { ToastService } from '../../../services/toast.service';
import { SpecDto } from '../../../core/api/spec.requests';

@Component({
  selector: 'app-edit-spec-modal',
  imports: [CommonModule, ReactiveFormsModule],
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

  ngOnInit() {
    this.initForm();
  }

  open(spec: SpecDto) {
    this.spec.set(spec);
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
    });
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
    const updateData = {
      title: formValue.title,
      base_price: formValue.base_price,
      bpm: formValue.bpm || undefined,
      key: formValue.key || undefined,
      tags: formValue.tags
        ? formValue.tags
            .split(',')
            .map((tag: string) => tag.trim())
            .filter(Boolean)
        : [],
    };

    this.specService.updateSpec(currentSpec.id, updateData).subscribe({
      next: () => {
        this.toastService.success('Spec updated successfully');
        this.close();
        // Reload the page to show updated data
        window.location.reload();
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to update spec');
        this.isSaving.set(false);
      },
    });
  }

  close() {
    this.isOpen.set(false);
    this.spec.set(null);
  }
}
