import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Spec } from '../../models/spec';
import { PlayerService } from '../../services/player.service';

@Component({
  selector: 'app-spec-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spec-card.html',
  styleUrls: ['./spec-card.scss'],
})
export class SpecCardComponent {
  @Input() spec!: Spec;
  playerService = inject(PlayerService);

  playSong() {
    this.playerService.showPlayer(this.spec);
  }
}
