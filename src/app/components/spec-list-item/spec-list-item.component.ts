import { Component, Input, inject } from "@angular/core";

import type { Spec } from "../../models/spec";
import { ModalService } from "../../services/modal.service";
import { PlayerService } from "../../services/player.service";
import { LicenseSelectorComponent } from "../license-selector/license-selector.component";

@Component({
	selector: "app-spec-list-item",
	standalone: true,
	imports: [],
	templateUrl: "./spec-list-item.component.html",
	styleUrls: ["./spec-list-item.component.scss"],
})
export class SpecListItemComponent {
	private playerService = inject(PlayerService);
	private modalService = inject(ModalService);

	@Input({ required: true }) spec!: Spec;

	playSong(event: MouseEvent) {
		event.stopPropagation();
		this.playerService.showPlayer(this.spec);
	}

	addToCart(event: MouseEvent) {
		event.stopPropagation();
		this.modalService.open(LicenseSelectorComponent, "Select License", {
			spec: this.spec,
		});
	}
}
