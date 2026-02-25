import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { SpecService } from '../../services/spec.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { StoreComponent } from './store.component';

describe('StoreComponent', () => {
  const params$ = new Subject<Record<string, string>>();
  const navigate = vi.fn();
  const getUserSpecs = vi.fn();
  const deleteSpec = vi.fn();
  const getPublicProfile = vi.fn();
  const toast = { success: vi.fn(), error: vi.fn() };

  function create() {
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { params: params$ } },
        { provide: Router, useValue: { navigate } },
        { provide: SpecService, useValue: { getUserSpecs, deleteSpec } },
        { provide: UserService, useValue: { getPublicProfile } },
        { provide: AuthService, useValue: { currentUser: signal({ id: 'u1' }) } },
        { provide: ToastService, useValue: toast },
      ],
    });
    return TestBed.runInInjectionContext(() => new StoreComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getPublicProfile.mockReturnValue(of({ id: 'u1', name: 'A' }));
    getUserSpecs.mockReturnValue(
      of({ data: [{ id: 's1', title: 'Spec 1' }], metadata: { page: 1, total: 1, per_page: 10 } }),
    );
    deleteSpec.mockReturnValue(of({}));
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads profile/specs from route params and handles pagination', () => {
    const component = create();
    component.ngOnInit();

    params$.next({ id: 'u1' });

    expect(getPublicProfile).toHaveBeenCalledWith('u1');
    expect(getUserSpecs).toHaveBeenCalledWith('u1', 1);
    expect(component.specs().length).toBe(1);
    expect(component.isOwnStore()).toBe(true);

    component.onPageChange(2);
    expect(getUserSpecs).toHaveBeenCalledWith('u1', 2);
  });

  it('handles profile/spec loading failures', () => {
    const component = create();
    getPublicProfile.mockReturnValueOnce(throwError(() => new Error('x')));
    getUserSpecs.mockReturnValueOnce(throwError(() => new Error('y')));

    (component as any).loadProfile();
    component.loadSpecs();

    expect(toast.error).toHaveBeenCalledWith('Failed to load profile');
    expect(toast.error).toHaveBeenCalledWith('Failed to load specs');
    expect(component.isLoading()).toBe(false);
  });

  it('handles edit/delete flows and utility methods', () => {
    const component = create();
    (component as any).editModal = { open: vi.fn() };
    (component as any).confirmDialog = { open: vi.fn() };
    const spec = { id: 's1', title: 'My Spec', price: 1200 } as any;

    component.openEditModal(spec);
    expect((component as any).editModal.open).toHaveBeenCalledWith(spec);

    component.confirmDelete(spec);
    expect((component as any).confirmDialog.open).toHaveBeenCalled();

    component.onDeleteConfirmed();
    expect(deleteSpec).toHaveBeenCalledWith('s1');
    expect(toast.success).toHaveBeenCalledWith('Spec deleted successfully');

    deleteSpec.mockReturnValueOnce(throwError(() => new Error('fail')));
    (component as any).pendingDeleteId = 's2';
    component.onDeleteConfirmed();
    expect(toast.error).toHaveBeenCalledWith('Failed to delete spec');

    expect(component.formatPrice(999)).toContain('999');
    component.navigateToProfile();
    expect(navigate).toHaveBeenCalledWith(['/profile']);
  });
});
