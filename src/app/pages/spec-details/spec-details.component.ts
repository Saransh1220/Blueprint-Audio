import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { HeaderComponent } from '../../components/header/header';
import { LicenseSelectorComponent } from '../../components/license-selector/license-selector.component';
import { SpecRowComponent } from '../../components/spec-row/spec-row.component';
import { Spec } from '../../models/spec';
import { CartService } from '../../services/cart.service';
import { LabService } from '../../services/lab';
import { ModalService } from '../../services/modal.service';
import { PlayerService } from '../../services/player.service';

@Component({
  selector: 'app-spec-details',
  standalone: true,
  imports: [CommonModule, RouterLink, SpecRowComponent],
  templateUrl: './spec-details.component.html',
  styleUrls: ['./spec-details.component.scss'],
})
export class SpecDetailsComponent {
  private route = inject(ActivatedRoute);
  private labService = inject(LabService);
  private playerService = inject(PlayerService);
  private cartService = inject(CartService);
  private modalService = inject(ModalService);

  // Reactive spec fetching
  spec = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        return this.labService.getSpecById(id || '');
      }),
    ),
  );

  // Related specs (mock logic for now, just same category)
  relatedSpecs = toSignal(
    this.labService.getSpecs('beat'), // simplified for now
  );

  playSpec() {
    const s = this.spec();
    if (s) {
      this.playerService.showPlayer(s);
    }
  }

  openLicenseModal() {
    const s = this.spec();
    if (s) {
      this.modalService.open(LicenseSelectorComponent, 'Select License', {
        spec: s,
      });
    }
  }
}
