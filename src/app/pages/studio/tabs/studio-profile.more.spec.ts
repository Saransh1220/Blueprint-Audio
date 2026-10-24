import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Role } from '../../../models';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { UserService } from '../../../services/user.service';
import { StudioProfileComponent } from './studio-profile.component';

describe('StudioProfileComponent (more)', () => {
  const show = vi.fn();
  const updateProfile = vi.fn();
  const uploadAvatar = vi.fn();
  const uploadBanner = vi.fn();
  const getMe = vi.fn();
  let currentUser: ReturnType<typeof signal<any>>;
  let fixture: ComponentFixture<StudioProfileComponent>;
  let component: StudioProfileComponent;

  const baseUser = () => ({
    id: 'u1',
    name: 'Blaze',
    display_name: 'Blaze',
    role: Role.PRODUCER,
    created_at: '2026-01-01',
    bio: 'Old bio',
  });

  function setup(user: any = baseUser()) {
    currentUser = signal<any>(user);
    TestBed.configureTestingModule({
      imports: [StudioProfileComponent],
      providers: [
        { provide: AuthService, useValue: { currentUser, uploadAvatar, uploadBanner, getMe } },
        { provide: UserService, useValue: { updateProfile } },
        { provide: ToastService, useValue: { show } },
      ],
    });
    fixture = TestBed.createComponent(StudioProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
    updateProfile.mockReturnValue(of({}));
    uploadAvatar.mockReturnValue(of({ avatar_url: 'av.png' }));
    uploadBanner.mockReturnValue(of({ banner_url: 'bn.png' }));
    getMe.mockReturnValue(of({}));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function stubImage(width: number, height: number, fail = false) {
    class FakeImage {
      width = width;
      height = height;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_v: string) {
        queueMicrotask(() => (fail ? this.onerror?.() : this.onload?.()));
      }
    }
    vi.stubGlobal('Image', FakeImage);
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
  }

  const flush = () => new Promise((r) => setTimeout(r, 10));

  it('computes display name, handle and letter fallbacks', () => {
    setup({ ...baseUser(), display_name: undefined, name: undefined });
    expect(component.displayName()).toBe('Producer');
    expect(component.handle()).toBe('producer');
    expect(component.avatarLetter()).toBe('p');

    currentUser.set({ ...baseUser(), display_name: '', name: 'Dj  Cool!!' });
    expect(component.displayName()).toBe('Dj  Cool!!');
    expect(component.handle()).toBe('dj.cool');
  });

  it('falls back to producer handle for non-alphanumeric names', () => {
    setup({ ...baseUser(), display_name: '', name: '!!!' });
    expect(component.displayName()).toBe('!!!');
    expect(component.handle()).toBe('producer');
    expect(component.avatarLetter()).toBe('!');
  });

  it('syncs the form from the user via effect and marks pristine', () => {
    setup();
    currentUser.set({ ...baseUser(), instagram_url: 'https://i.com/x', bio: undefined });
    fixture.detectChanges();
    expect(component.profileForm.value.instagram_url).toBe('https://i.com/x');
    expect(component.profileForm.value.bio).toBe('');
    expect(component.profileForm.pristine).toBe(true);
    expect(getMe).toHaveBeenCalled();
  });

  it('hasUnsavedChanges reflects form, avatar and banner state', () => {
    setup();
    expect(component.hasUnsavedChanges()).toBe(false);
    component.selectedBannerFile.set(new File(['x'], 'b.png'));
    expect(component.hasUnsavedChanges()).toBe(true);
    component.selectedBannerFile.set(null);
    component.profileForm.markAsDirty();
    expect(component.hasUnsavedChanges()).toBe(true);
    component.profileForm = undefined as any;
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('renders banner, preview and save bar controls', () => {
    setup({ ...baseUser(), banner_url: 'http://x/banner.png', avatar_url: 'http://x/a.png', instagram_url: 'https://i.com' });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.banner-image')).toBeTruthy();
    expect(el.querySelector('.preview-banner img')).toBeTruthy();
    expect(el.querySelector('.avatar-letter')).toBeNull();
    expect(el.querySelector('.social-status.connected')?.textContent).toContain('linked');
    expect(el.querySelector('.save-bar')).toBeNull();

    fixture.detectChanges();
    component.profileForm.patchValue({ bio: 'changed' });
    component.profileForm.markAsDirty();
    fixture.detectChanges();
    expect(el.querySelector('.preview-bio')?.textContent).toContain('changed');
    (el.querySelectorAll('.save-bar .btn')[1] as HTMLElement).click();
    expect(updateProfile).toHaveBeenCalled();

    fixture.detectChanges();
    component.profileForm.markAsDirty();
    fixture.detectChanges();
    (el.querySelectorAll('.save-bar .btn')[0] as HTMLElement).click();
    expect(component.profileForm.pristine).toBe(true);
  });

  it('renders letter avatar and empty bio placeholder when no avatar', () => {
    setup({ ...baseUser(), bio: '' });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.avatar-letter')?.textContent).toBe('b');
    expect(el.querySelector('.preview-bio')?.textContent).toContain('Tell listeners');
    expect(el.querySelector('.banner-image')).toBeNull();
  });

  it('shows avatar preview in the template', () => {
    setup();
    component.avatarPreview.set('data:image/png;base64,abc');
    fixture.detectChanges();
    expect(
      (fixture.nativeElement.querySelector('.avatar-drop') as HTMLElement).style.backgroundImage,
    ).toContain('data:image/png');
  });

  it('saves avatar and banner uploads together, merging media profile', () => {
    setup({ ...baseUser(), avatar_url: 'old.png', banner_url: 'oldb.png' });
    component.selectedAvatarFile.set(new File(['a'], 'a.png', { type: 'image/png' }));
    component.selectedBannerFile.set(new File(['b'], 'b.png', { type: 'image/png' }));
    component.bannerPreview.set('data:x');
    updateProfile.mockReturnValueOnce(of({ bio: 'B' }));
    component.saveProfile();
    expect(uploadAvatar).toHaveBeenCalled();
    expect(uploadBanner).toHaveBeenCalled();
    expect(currentUser().bio).toBe('B');
    // only the last upload response (banner) is merged; avatar falls back to the current url
    expect(currentUser().avatar_url).toContain('old.png');
    expect(currentUser().banner_url).toContain('bn.png');
    expect(component.selectedBannerFile()).toBeNull();
    expect(component.bannerPreview()).toBeNull();
    expect(show).toHaveBeenCalledWith('Profile updated successfully', 'success');
  });

  it('keeps existing media urls when neither profile nor upload returns them', () => {
    setup({ ...baseUser(), avatar_url: 'http://h/keep.png', banner_url: 'http://h/keepb.png' });
    updateProfile.mockReturnValueOnce(of({}));
    component.saveProfile();
    expect(currentUser().avatar_url).toBe('http://h/keep.png');
    expect(currentUser().banner_url).toBe('http://h/keepb.png');
  });

  it('saves without touching auth user when signed out', () => {
    setup();
    currentUser.set(null);
    component.saveProfile();
    expect(currentUser()).toBeNull();
    expect(show).toHaveBeenCalledWith('Profile updated successfully', 'success');
  });

  it('reports media upload failure on save', () => {
    setup();
    component.selectedBannerFile.set(new File(['b'], 'b.png', { type: 'image/png' }));
    uploadBanner.mockReturnValueOnce(throwError(() => new Error('x')));
    component.saveProfile();
    expect(show).toHaveBeenCalledWith('Failed to update profile', 'error');
    expect(component.isSaving()).toBe(false);
  });

  it('discards changes, restoring user values and clearing files', () => {
    setup();
    component.profileForm.patchValue({ bio: 'edited' });
    component.selectedAvatarFile.set(new File(['a'], 'a.png'));
    component.avatarPreview.set('x');
    component.selectedBannerFile.set(new File(['a'], 'b.png'));
    component.bannerPreview.set('y');
    component.discardProfileChanges();
    expect(component.profileForm.value.bio).toBe('Old bio');
    expect(component.selectedAvatarFile()).toBeNull();
    expect(component.avatarPreview()).toBeNull();
    expect(component.selectedBannerFile()).toBeNull();
    expect(component.bannerPreview()).toBeNull();

    currentUser.set(null);
    component.profileForm.patchValue({ bio: 'edited2' });
    component.discardProfileChanges();
    expect(component.profileForm.value.bio).toBe('edited2');
    expect(component.profileForm.pristine).toBe(true);
  });

  it('ignores avatar selection with no files and rejects non-square avatars', async () => {
    setup();
    await component.onAvatarFileSelected({ target: { files: [] } } as any);
    await component.onAvatarFileSelected({ target: {} } as any);
    expect(show).not.toHaveBeenCalled();

    stubImage(10, 20);
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    await component.onAvatarFileSelected({ target: { files: [file] } } as any);
    expect(show).toHaveBeenCalledWith('Avatar image must be square', 'error');
    expect(component.selectedAvatarFile()).toBeNull();
  });

  it('rejects avatars that fail to load', async () => {
    setup();
    stubImage(10, 10, true);
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    await component.onAvatarFileSelected({ target: { files: [file] } } as any);
    expect(show).toHaveBeenCalledWith('Avatar image must be square', 'error');
  });

  it('accepts a square avatar and creates a preview', async () => {
    setup();
    stubImage(10, 10);
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    await component.onAvatarFileSelected({ target: { files: [file] } } as any);
    expect(component.selectedAvatarFile()).toBe(file);
    // the preview is read by an async FileReader, so wait for it instead of a fixed delay
    await vi.waitFor(() => expect(component.avatarPreview()).toContain('data:image/png'));
  });

  it('validates banner selection', async () => {
    setup();
    component.onBannerFileSelected({ target: { files: [] } } as any);
    component.onBannerFileSelected({ target: {} } as any);
    expect(show).not.toHaveBeenCalled();

    component.onBannerFileSelected({
      target: { files: [new File([new Uint8Array(6 * 1024 * 1024)], 'b.png', { type: 'image/png' })] },
    } as any);
    expect(show).toHaveBeenCalledWith('Banner must be less than 5MB', 'error');

    component.onBannerFileSelected({
      target: { files: [new File(['x'], 'b.gif', { type: 'image/gif' })] },
    } as any);
    expect(show).toHaveBeenCalledWith('Please select a JPEG, PNG, or WebP image', 'error');

    stubImage(10, 20);
    component.onBannerFileSelected({
      target: { files: [new File(['x'], 'b.png', { type: 'image/png' })] },
    } as any);
    await flush();
    expect(show).toHaveBeenCalledWith('Banner image must be landscape', 'error');
    expect(component.selectedBannerFile()).toBeNull();

    stubImage(20, 10, true);
    component.onBannerFileSelected({
      target: { files: [new File(['x'], 'b.png', { type: 'image/png' })] },
    } as any);
    await flush();
    expect(show).toHaveBeenCalledWith('Invalid banner image', 'error');
  });

  it('accepts a landscape banner and sets preview', async () => {
    setup();
    stubImage(30, 10);
    const file = new File(['x'], 'b.png', { type: 'image/png' });
    component.onBannerFileSelected({ target: { files: [file] } } as any);
    await vi.waitFor(() => expect(component.bannerPreview()).toContain('data:image/png'));
    expect(component.selectedBannerFile()).toBe(file);
    expect(component.profileBannerUrl()).toContain('data:image/png');
  });

  it('delete avatar does nothing without a dialog and delete confirm handles signed-out user', () => {
    setup();
    component.confirmDialog = undefined as any;
    expect(() => component.deleteAvatar()).not.toThrow();
    currentUser.set(null);
    component.onDeleteConfirmed();
    expect(currentUser()).toBeNull();
    expect(show).toHaveBeenCalledWith('Avatar deleted successfully', 'success');
  });
});
