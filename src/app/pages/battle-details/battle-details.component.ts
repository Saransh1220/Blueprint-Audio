import { CommonModule } from '@angular/common';
import { Component, inject, type OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface BattleDetail {
  title: string;
  type: string;
  status: string;
  deadline: string;
  action: string;
  description: string;
  brief: { label: string; value: string }[];
  rules: string[];
  settings: { label: string; value: string }[];
  rewards: string[];
}

interface Submission {
  id: number;
  artist: string;
  title: string;
  score: number;
  note: string;
}

@Component({
  selector: 'app-battle-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './battle-details.component.html',
  styleUrls: ['./battle-details.component.scss'],
})
export class BattleDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);

  battleId = signal<string>('');

  battle = signal<BattleDetail>({
    title: 'Weekly Fire Vol. 42',
    type: 'Artist battle',
    status: 'Voting open',
    deadline: '22h 14m left',
    action: 'Rank submissions',
    description:
      'Record over the assigned beat and theme. Usernames stay hidden during voting so the room is judged on the track first.',
    brief: [
      { label: 'Beat', value: 'Redline Bounce' },
      { label: 'Theme', value: 'Toxic love' },
      { label: 'Reward', value: 'Rs 500 + exclusive pack' },
    ],
    rules: [
      'Submit one mixed audio file before lock.',
      'Use the assigned beat and theme.',
      'Voting is blind until results reveal.',
      'Judge votes carry extra weight.',
    ],
    settings: [
      { label: 'Participants', value: '24 / 32' },
      { label: 'Entry', value: 'Free' },
      { label: 'Privacy', value: 'Public' },
      { label: 'Voting', value: 'Mixed blind' },
    ],
    rewards: ['Winner badge', '250 credits', 'Exclusive sound pack'],
  });

  submissions = signal<Submission[]>([
    { id: 1, artist: 'Hidden A', title: 'Static Roses', score: 248, note: 'Judge favorite' },
    { id: 2, artist: 'Hidden B', title: 'No Caller ID', score: 231, note: 'Verified surge' },
    { id: 3, artist: 'Hidden C', title: 'Velvet Damage', score: 198, note: 'Public pick' },
  ]);

  ngOnInit() {
    this.route.params.subscribe((params) => {
      // biome-ignore lint/complexity/useLiteralKeys: Angular Params uses index signature
      this.battleId.set(params['id'] || 'weekly-fire-42');
    });
  }

  vote(submissionId: number) {
    console.log('Visual vote for submission:', submissionId);
  }
}
