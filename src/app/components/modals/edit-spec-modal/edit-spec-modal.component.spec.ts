import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SpecService } from '../../../services/spec.service';
import { ToastService } from '../../../services/toast.service';
import { EditSpecModalComponent } from './edit-spec-modal.component';

describe('EditSpecModalComponent', () => {
  const updateSpec = vi.fn();
  const toast = { success: vi.fn(), error: vi.fn() };

  function create() {
    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: SpecService, useValue: { updateSpec } },
        { provide: ToastService, useValue: toast },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new EditSpecModalComponent());
    component.ngOnInit();
    return component;
  }

  const spec: any = {
    id: 's1',
    title: 'Spec 1',
    bpm: 120,
    key: 'A MINOR',
    tags: ['dark'],
    description: 'desc',
    free_mp3_enabled: true,
    image_url: 'img',
    licenses: [
      { type: 'Basic', name: 'Basic Lease', price: 1200, features: ['MP3'], file_types: ['MP3'] },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    updateSpec.mockReturnValue(of({}));
  });

  it('opens/closes modal and initializes with spec values', () => {
    const component = create();
    component.open(spec);
    expect(component.isOpen()).toBe(true);
    expect(component.spec()?.id).toBe('s1');
    expect(component.editForm.value.title).toBe('Spec 1');
    expect(component.licenses.length).toBe(4);

    component.close();
    expect(component.isOpen()).toBe(false);
    expect(component.spec()).toBeNull();
  });

  it('validates selected image file and stores preview', () => {
    const component = create();
    component.open(spec);

    component.onFileSelected({
      target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] },
    } as any);
    expect(toast.error).toHaveBeenCalledWith('Please select an image file');

    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'a.png', { type: 'image/png' });
    component.onFileSelected({ target: { files: [big] } } as any);
    expect(toast.error).toHaveBeenCalledWith('Image size must be less than 5MB');

    const ok = new File(['x'], 'a.png', { type: 'image/png' });
    component.onFileSelected({ target: { files: [ok] } } as any);
    expect(component.selectedFile()?.name).toBe('a.png');
  });

  it('handles save validation, success and failure', () => {
    const component = create();
    component.save();
    expect(toast.error).toHaveBeenCalledWith('Please fix the form errors');

    component.open(spec);
    component.editForm.patchValue({ title: '' });
    component.save();
    expect(toast.error).toHaveBeenCalledWith('Please fix the form errors');

    component.editForm.patchValue({ title: 'Updated' });
    component.licenses.controls.forEach((g) => g.patchValue({ enabled: false }));
    component.save();
    expect(toast.error).toHaveBeenCalledWith('Please enable at least one license option');

    component.licenses.at(0).patchValue({ enabled: true, price: 1000 });
    component.save();
    expect(updateSpec).toHaveBeenCalledWith('s1', expect.any(FormData));
    expect(toast.success).toHaveBeenCalledWith('Spec updated successfully');

    component.open(spec);
    component.licenses.at(0).patchValue({ enabled: true, price: 1000 });
    updateSpec.mockReturnValueOnce(throwError(() => ({ error: { message: 'boom' } })));
    component.save();
    expect(toast.error).toHaveBeenCalledWith('boom');
  });
});
