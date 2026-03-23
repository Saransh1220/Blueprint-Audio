import { signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { ToastService } from '../../../services/toast.service';
import { Role } from '../../../models';
import { StudioProfileComponent } from './studio-profile.component';

describe('StudioProfileComponent', () => {
  const navigate = vi.fn();
  const show = vi.fn();
  const updateProfile = vi.fn();
  const uploadAvatar = vi.fn();
  const currentUser = signal<any>({
    id: 'u1',
    name: 'Blaze',
    display_name: 'Blaze',
    role: Role.PRODUCER,
    created_at: '2026-01-01',
    avatar_url: 'avatar.png',
    bio: 'Old bio',
  });

  function create() {
    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: Router, useValue: { navigate } },
        { provide: AuthService, useValue: { currentUser, uploadAvatar } },
        { provide: UserService, useValue: { updateProfile } },
        { provide: ToastService, useValue: { show } },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new StudioProfileComponent());
    component.ngOnInit();
    return component;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    currentUser.set({
      id: 'u1',
      name: 'Blaze',
      display_name: 'Blaze',
      role: Role.PRODUCER,
      created_at: '2026-01-01',
      avatar_url: 'avatar.png',
      bio: 'Old bio',
    });
    updateProfile.mockReturnValue(of({ display_name: 'New Blaze', bio: 'New bio' }));
    uploadAvatar.mockReturnValue(of({}));
  });

  it('initializes and saves profile updates back into the auth signal', () => {
    const component = create();

    expect(component.profileForm.getRawValue().display_name).toBe('Blaze');
    component.profileForm.patchValue({ display_name: 'New Blaze', bio: 'New bio' });
    component.saveProfile();

    expect(updateProfile).toHaveBeenCalledWith(component.profileForm.value);
    expect(currentUser().display_name).toBe('New Blaze');
    expect(currentUser().bio).toBe('New bio');
    expect(show).toHaveBeenCalledWith('Profile updated successfully', 'success');
    expect(component.isSaving()).toBe(false);
    expect(component.profileForm.pristine).toBe(true);
  });

  it('shows validation and update errors without saving invalid form state', () => {
    const component = create();
    component.profileForm.patchValue({ instagram_url: 'invalid-url' });

    component.saveProfile();
    expect(show).toHaveBeenCalledWith('Please fix the form errors', 'error');

    component.profileForm.patchValue({ instagram_url: 'https://instagram.com/blaze' });
    updateProfile.mockReturnValueOnce(throwError(() => new Error('x')));
    component.saveProfile();

    expect(show).toHaveBeenCalledWith('Failed to update profile', 'error');
    expect(component.isSaving()).toBe(false);
  });

  it('navigates to the producer store and validates avatar file selection', () => {
    const component = create();
    component.navigateToStore();
    expect(navigate).toHaveBeenCalledWith(['/store', 'u1']);

    const tooLarge = new File([new Uint8Array(6 * 1024 * 1024)], 'a.png', { type: 'image/png' });
    component.onAvatarFileSelected({ target: { files: [tooLarge] } } as any);
    expect(show).toHaveBeenCalledWith('File size must be less than 5MB', 'error');

    const badType = new File(['x'], 'a.txt', { type: 'text/plain' });
    component.onAvatarFileSelected({ target: { files: [badType] } } as any);
    expect(show).toHaveBeenCalledWith('Please select an image file', 'error');

    const good = new File(['x'], 'a.png', { type: 'image/png' });
    component.onAvatarFileSelected({ target: { files: [good] } } as any);
    expect(component.selectedAvatarFile()?.name).toBe('a.png');
  });

  it('uploads, cancels, opens delete confirmation, and deletes avatar', () => {
    const component = create();

    component.uploadAvatar();
    expect(uploadAvatar).not.toHaveBeenCalled();

    component.selectedAvatarFile.set(new File(['x'], 'a.png', { type: 'image/png' }));
    component.uploadAvatar();
    expect(uploadAvatar).toHaveBeenCalled();
    expect(component.selectedAvatarFile()).toBeNull();
    expect(component.avatarPreview()).toBeNull();
    expect(show).toHaveBeenCalledWith('Avatar uploaded successfully', 'success');

    uploadAvatar.mockReturnValueOnce(throwError(() => new Error('x')));
    component.selectedAvatarFile.set(new File(['x'], 'a.png', { type: 'image/png' }));
    component.uploadAvatar();
    expect(show).toHaveBeenCalledWith('Failed to upload avatar', 'error');

    component.cancelAvatarUpload();
    expect(component.selectedAvatarFile()).toBeNull();

    (component as any).confirmDialog = { open: vi.fn() };
    component.deleteAvatar();
    expect((component as any).confirmDialog.open).toHaveBeenCalled();

    component.onDeleteConfirmed();
    expect(updateProfile).toHaveBeenCalledWith({ avatar_url: '' });
    expect(currentUser().avatar_url).toBeNull();
    expect(show).toHaveBeenCalledWith('Avatar deleted successfully', 'success');

    updateProfile.mockReturnValueOnce(throwError(() => new Error('x')));
    component.onDeleteConfirmed();
    expect(show).toHaveBeenCalledWith('Failed to delete avatar', 'error');
  });
});
