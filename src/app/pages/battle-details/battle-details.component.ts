import { Component, type OnInit, signal } from '@angular/core';

import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-battle-details',
  standalone: true,
  imports: [],
  templateUrl: './battle-details.component.html',
  styleUrls: ['./battle-details.component.scss'],
})
export class BattleDetailsComponent implements OnInit {
  battleId = signal<string>('');

  // Mock Data
  battle = signal({
    title: 'NEON NIGHTS TOURNAMENT',
    status: 'VOTING',
    prize: '$500 + PLACEMENT',
    deadline: '2 DAYS LEFT',
    description:
      'Create a Cyberpunk/Synthwave track using the provided sample pack. Focus on atmosphere and sound design.',
    rules: [
      'Must use at least 3 samples from the pack',
      'Track length: 2:00 - 3:00',
      'No pre-made loops allowed',
    ],
  });

  submissions = signal([
    { id: 1, artist: 'CyberSoul', title: 'Night Run', score: 145 },
    { id: 2, artist: 'GlitchMaster', title: 'System Failure', score: 132 },
    { id: 3, artist: 'NeonWave', title: 'Retro Future', score: 128 },
  ]);

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      // biome-ignore lint/complexity/useLiteralKeys: Angular Params uses index signature
      this.battleId.set(params['id']);
      // TODO: Fetch actual battle details using ID
    });
  }

  vote(submissionId: number) {
    console.log('Voted for submission:', submissionId);
    // TODO: Implement voting logic
  }
}
