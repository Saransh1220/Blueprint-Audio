import { signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';
import { ProfileComponent } from './profile.component';

describe('ProfileComponent', () => {
  const navigate = vi.fn();
  const show = vi.fn();
  const updateProfile = vi.fn();
  const uploadAvatar = vi.fn();
  const currentUser = signal<any>({
    id: 'u1',
    display_name: 'Old',
    role: 'artist',
    created_at: '2026-01-01',
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
    const component = TestBed.runInInjectionContext(() => new ProfileComponent());
    component.ngOnInit();
    return component;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    currentUser.set({ id: 'u1', display_name: 'Old', role: 'artist', created_at: '2026-01-01' });
    updateProfile.mockReturnValue(of({ display_name: 'New', bio: 'bio' }));
    uploadAvatar.mockReturnValue(of({}));
  });

  it('initializes/saves profile and handles save error', () => {
    const component = create();
    component.profileForm.patchValue({ display_name: 'New' });
    component.saveProfile();
    expect(updateProfile).toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith('Profile updated successfully', 'success');
    expect(component.isSaving()).toBe(false);

    updateProfile.mockReturnValueOnce(throwError(() => new Error('x')));
    component.saveProfile();
    expect(show).toHaveBeenCalledWith('Failed to update profile', 'error');
    expect(component.isSaving()).toBe(false);
  });

  it('navigates to store and validates avatar file selection', () => {
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

  it('uploads/cancels/deletes avatar with success and error', () => {
    const component = create();
    component.uploadAvatar();
    expect(uploadAvatar).not.toHaveBeenCalled();

    component.selectedAvatarFile.set(new File(['x'], 'a.png', { type: 'image/png' }));
    component.uploadAvatar();
    expect(uploadAvatar).toHaveBeenCalled();
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
    expect(show).toHaveBeenCalledWith('Avatar deleted successfully', 'success');

    updateProfile.mockReturnValueOnce(throwError(() => new Error('x')));
    component.onDeleteConfirmed();
    expect(show).toHaveBeenCalledWith('Failed to delete avatar', 'error');
  });
});
