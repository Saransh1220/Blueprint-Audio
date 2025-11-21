import { Component, inject, AfterViewInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerService } from '../../services/player.service';
import { gsap } from 'gsap';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player.html',
  styleUrls: ['./player.scss'],
})
export class PlayerComponent implements AfterViewInit {
  playerService = inject(PlayerService);
  private playerElement: HTMLElement | null = null; // Reference to the control-deck element

  constructor() {
    // Use effect to react to changes in the isVisible signal
    effect(() => {
      const isVisible = this.playerService.isVisible(); // Access the signal's current value
      if (this.playerElement) {
        // Ensure the element is available
        if (isVisible) {
          gsap.to(this.playerElement, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
        } else {
          // Only animate out if it was previously visible (opacity > 0)
          if (parseFloat(gsap.getProperty(this.playerElement, 'opacity').toString()) > 0) {
            gsap.to(this.playerElement, { y: 100, opacity: 0, duration: 0.5, ease: 'power2.in' });
          }
        }
      }
    });
  }

  ngAfterViewInit(): void {
    // Get reference to the player element
    this.playerElement = document.querySelector('.control-deck');
    // Set initial state (hidden) if the signal is false initially
    if (this.playerElement && !this.playerService.isVisible()) {
      gsap.set(this.playerElement, { y: 100, opacity: 0 }); // Start off-screen and invisible
    }
  }
}
