import { Component, OnInit, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SpecService } from '../../services/spec.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { SpecDto } from '../../core/api/spec.requests';
import { PublicUserResponse } from '../../core/api/user.requests';
import { EditSpecModalComponent } from '../../components/modals/edit-spec-modal/edit-spec-modal.component';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-store',
  imports: [CommonModule, EditSpecModalComponent, ConfirmDialogComponent],
  templateUrl: './store.component.html',
  styleUrl: './store.component.scss',
})
export class StoreComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private specService = inject(SpecService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  @ViewChild(EditSpecModalComponent) editModal!: EditSpecModalComponent;
  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;

  profile = signal<PublicUserResponse | null>(null);
  specs = signal<SpecDto[]>([]);
  currentPage = signal(1);
  totalPages = signal(1);
  totalSpecs = signal(0);
  isLoading = signal(false);

  userId = '';
  currentUser = this.authService.currentUser;

  isOwnStore = computed(() => {
    return this.currentUser()?.id === this.userId;
  });

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.userId = params['id'];
      this.loadProfile();
      this.loadSpecs();
    });
  }

  private loadProfile() {
    this.userService.getPublicProfile(this.userId).subscribe({
      next: (profile) => {
        this.profile.set(profile);
      },
      error: () => {
        this.toastService.error('Failed to load profile');
      },
    });
  }

  loadSpecs(page: number = 1) {
    this.isLoading.set(true);
    this.specService.getUserSpecs(this.userId, page).subscribe({
      next: (response) => {
        this.specs.set(response.data);
        this.currentPage.set(response.metadata.page);
        this.totalSpecs.set(response.metadata.total);
        this.totalPages.set(Math.ceil(response.metadata.total / response.metadata.per_page));
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error('Failed to load specs');
        this.isLoading.set(false);
      },
    });
  }

  onPageChange(page: number) {
    this.loadSpecs(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openEditModal(spec: SpecDto) {
    if (this.editModal) {
      this.editModal.open(spec);
    }
  }

  confirmDelete(spec: SpecDto) {
    if (this.confirmDialog) {
      this.confirmDialog.open({
        title: 'Delete Spec',
        message: `Are you sure you want to delete "${spec.title}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger',
      });
      // Store spec ID for the confirm handler
      this.pendingDeleteId = spec.id;
    }
  }

  private pendingDeleteId: string | null = null;

  onDeleteConfirmed() {
    if (this.pendingDeleteId) {
      this.deleteSpec(this.pendingDeleteId);
      this.pendingDeleteId = null;
    }
  }

  private deleteSpec(specId: string) {
    this.specService.deleteSpec(specId).subscribe({
      next: () => {
        this.toastService.success('Spec deleted successfully');
        this.loadSpecs(this.currentPage());
      },
      error: () => {
        this.toastService.error('Failed to delete spec');
      },
    });
  }

  formatPrice(price: number): string {
    return `₹${price}`;
  }

  navigateToProfile() {
    this.router.navigate(['/profile']);
  }
}
