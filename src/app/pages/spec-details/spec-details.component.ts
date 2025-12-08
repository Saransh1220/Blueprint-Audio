import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { LabService } from '../../services/lab';
import { PlayerService } from '../../services/player.service';
import { CartService } from '../../services/cart.service';
import { ModalService } from '../../services/modal.service';
import { LicenseSelectorComponent } from '../../components/license-selector/license-selector.component';
import { SpecRowComponent } from '../../components/spec-row/spec-row.component';
import { HeaderComponent } from '../../components/header/header';
import { Spec } from '../../models/spec';

@Component({
    selector: 'app-spec-details',
    standalone: true,
    imports: [CommonModule, RouterLink, HeaderComponent, SpecRowComponent],
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
            })
        )
    );

    // Related specs (mock logic for now, just same category)
    relatedSpecs = toSignal(
        this.labService.getSpecs('beat') // simplified for now
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
