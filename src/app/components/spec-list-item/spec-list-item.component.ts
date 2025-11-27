import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Spec } from '../../models/spec';
import { PlayerService } from '../../services/player.service';

@Component({
    selector: 'app-spec-list-item',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './spec-list-item.component.html',
    styleUrls: ['./spec-list-item.component.scss']
})
export class SpecListItemComponent {
    @Input({ required: true }) spec!: Spec;

    constructor(private playerService: PlayerService) { }

    playSong(event: MouseEvent) {
        event.stopPropagation();
        this.playerService.showPlayer(this.spec);
    }

    addToCart(event: MouseEvent) {
        event.stopPropagation();
        // TODO: Implement add to cart logic
        console.log('Added to cart:', this.spec.title);
    }
}
