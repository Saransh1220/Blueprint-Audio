import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-battles',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './battles.component.html',
  styleUrls: ['./battles.component.scss'],
})
export class BattlesComponent {
  tournaments = [
    {
      name: 'Weekly Fire Vol. 42',
      prize: '₹500 + Exclusive Pack',
      participants: 128,
      endsIn: '2d 14h',
    },
    {
      name: 'Monthly King',
      prize: '₹2000 + Studio Time',
      participants: 542,
      endsIn: '12d 05h',
    },
  ];

  leaderboard = [
    { name: 'Lil Glitch', points: 2450 },
    { name: 'Neon Soul', points: 2100 },
    { name: 'Cyber Spit', points: 1850 },
    { name: 'Wave Runner', points: 1600 },
    { name: 'Analog Kid', points: 1450 },
  ];
}
