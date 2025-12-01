import {
  type AfterViewInit,
  Component,
  type ElementRef,
  effect,
  inject,
  ViewChild,
} from '@angular/core';
import { gsap } from 'gsap';
import { PlayerService } from '../../services/player.service';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [],
  templateUrl: './player.html',
  styleUrls: ['./player.scss'],
})
export class PlayerComponent implements AfterViewInit {
  playerService = inject(PlayerService);

  @ViewChild('controlDeck') controlDeck!: ElementRef;

  constructor() {
    // Use effect to react to changes in the isVisible signal
    effect(() => {
      const isVisible = this.playerService.isVisible(); // Access the signal's current value

      // We need to check if controlDeck is available (it might not be on first run)
      if (this.controlDeck?.nativeElement) {
        const el = this.controlDeck.nativeElement;

        if (isVisible) {
          gsap.to(el, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
        } else {
          gsap.to(el, { y: 100, opacity: 0, duration: 0.5, ease: 'power2.in' });
        }
      }
    });
  }

  ngAfterViewInit(): void {
    // Set initial state (hidden) if the signal is false initially
    if (this.controlDeck?.nativeElement && !this.playerService.isVisible()) {
      gsap.set(this.controlDeck.nativeElement, { y: 100, opacity: 0 }); // Start off-screen and invisible
    }
  }
}
