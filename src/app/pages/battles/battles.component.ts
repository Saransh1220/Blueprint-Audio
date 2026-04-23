import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type BattleTab = 'overview' | 'artist' | 'producer' | 'rooms';

interface BattleCard {
  id: string;
  title: string;
  format: string;
  status: string;
  deadline: string;
  participants: string;
  reward: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
}

interface RoomCard {
  id: string;
  title: string;
  type: 'Artist' | 'Producer';
  owner: string;
  privacy: string;
  participants: string;
  deadline: string;
}

@Component({
  selector: 'app-battles',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './battles.component.html',
  styleUrls: ['./battles.component.scss'],
})
export class BattlesComponent {
  activeTab = signal<BattleTab>('overview');

  readonly tabs: { label: string; value: BattleTab }[] = [
    { label: 'Overview', value: 'overview' },
    { label: 'Artist Battles', value: 'artist' },
    { label: 'Producer Battles', value: 'producer' },
    { label: 'My Rooms', value: 'rooms' },
  ];

  readonly artistBattles: BattleCard[] = [
    {
      id: 'weekly-fire-42',
      title: 'Weekly Fire Vol. 42',
      format: 'Rap / vocal battle',
      status: 'Recording open',
      deadline: '48h left',
      participants: '24 / 32 joined',
      reward: 'Rs 500 + exclusive pack',
      primaryLabel: 'Beat',
      primaryValue: 'Redline Bounce',
      secondaryLabel: 'Theme',
      secondaryValue: 'Toxic love',
    },
    {
      id: 'storytelling-eight',
      title: 'Storytelling Eight',
      format: 'Blind cypher room',
      status: 'One slot open',
      deadline: '22h left',
      participants: '7 / 8 joined',
      reward: 'Badge + 250 credits',
      primaryLabel: 'Beat',
      primaryValue: 'Noir Keys',
      secondaryLabel: 'Theme',
      secondaryValue: 'One true story',
    },
    {
      id: 'hook-room',
      title: 'Hook Room',
      format: 'Melody challenge',
      status: 'Open',
      deadline: '3d left',
      participants: '11 / 16 joined',
      reward: 'Featured profile slot',
      primaryLabel: 'Beat',
      primaryValue: 'Velvet 808',
      secondaryLabel: 'Theme',
      secondaryValue: 'Late night confession',
    },
  ];

  readonly producerBattles: BattleCard[] = [
    {
      id: 'flip-lab-april',
      title: 'Flip Lab: Dusted Soul',
      format: 'Sample flip',
      status: 'Creating phase',
      deadline: '3d left',
      participants: '51 / 64 joined',
      reward: 'Rs 2,000 + placement',
      primaryLabel: 'Pack',
      primaryValue: 'Soul sample + stems',
      secondaryLabel: 'Rule',
      secondaryValue: '86-96 BPM',
    },
    {
      id: 'five-sound-cage',
      title: 'Five Sound Cage',
      format: 'Restriction mode',
      status: 'Open',
      deadline: '70h left',
      participants: '12 / 16 joined',
      reward: 'Premium drum rack',
      primaryLabel: 'Pack',
      primaryValue: '5 one-shots only',
      secondaryLabel: 'Rule',
      secondaryValue: 'No extra sounds',
    },
    {
      id: 'acapella-rumble',
      title: 'Acapella Rumble',
      format: 'Remix battle',
      status: 'Voting soon',
      deadline: '2d left',
      participants: '22 / 32 joined',
      reward: 'Remix badge + credits',
      primaryLabel: 'Pack',
      primaryValue: 'Dry acapella',
      secondaryLabel: 'Rule',
      secondaryValue: 'Must use vocal',
    },
  ];

  readonly myRooms: RoomCard[] = [
    {
      id: 'private-remix-camp',
      title: 'Private Remix Camp',
      type: 'Producer',
      owner: '@mera808',
      privacy: 'Invite link',
      participants: '10 / 16',
      deadline: '3 days',
    },
    {
      id: 'rookie-cypher-room',
      title: 'Rookie Cypher Room',
      type: 'Artist',
      owner: '@northsideink',
      privacy: 'Public',
      participants: '7 / 8',
      deadline: '22h',
    },
  ];

  readonly leaderboardPreview = [
    { name: 'Lil Glitch', role: 'Artist', points: 2450 },
    { name: 'Neon Soul', role: 'Producer', points: 2100 },
    { name: 'Cyber Spit', role: 'Artist', points: 1850 },
  ];

  readonly activityPreview = [
    'Rookie Cypher Room closes in 22h.',
    'Flip Lab entered judge review.',
    'Five Sound Cage added 4 new producers.',
  ];

  readonly featuredBattle = this.artistBattles[0];
  readonly activeList = computed(() =>
    this.activeTab() === 'producer' ? this.producerBattles : this.artistBattles,
  );

  setTab(tab: BattleTab) {
    this.activeTab.set(tab);
  }
}
