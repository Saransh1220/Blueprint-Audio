import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { HeaderComponent } from './components/header/header';
import { FooterComponent } from './components/footer/footer';
import { PlayerComponent } from './components/player/player';
import { CartComponent } from './components/cart/cart.component';
import { gsap } from 'gsap';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, PlayerComponent, CartComponent, RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class AppComponent implements AfterViewInit {
  @ViewChild(CartComponent) cart!: CartComponent;

  constructor(private el: ElementRef) {}

  ngAfterViewInit(): void {
    const grid = this.el.nativeElement.querySelector('.grid-overlay');
    document.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      gsap.to(grid, {
        x: x,
        y: y,
        duration: 1,
        ease: 'power2.out',
      });
    });

    const tl = gsap.timeline();
    tl.to('.loader-progress', { width: '100%', duration: 1.5, ease: 'power2.inOut' })
      .to('.loader', { y: '-100%', duration: 0.8, ease: 'power4.inOut', delay: 0.2 }, 'loaderOut') // Loader finishes at "loaderOut"

      // Animate H1 explicitly
      .set('h1.hero-title', { y: 50, opacity: 0 }) // Set initial hidden state
      .to('h1.hero-title', { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }, 'loaderOut+=0.2') // Animate to visible

      // Animate other .gs-reveal elements
      .from(
        '.gs-reveal',
        { y: 30, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' },
        'loaderOut+=0.3',
      )
      .from(
        '.hero-visual',
        { scale: 0.9, opacity: 0, duration: 1, ease: 'expo.out' },
        'loaderOut+=0.4',
      );
  }
  toggleCart() {
    this.cart.toggle();
  }
}
