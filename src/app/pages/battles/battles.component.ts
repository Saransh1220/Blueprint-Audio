import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-battles',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="battles-container">
      <div class="section-header">
        <h1>BATTLE_ARENA</h1>
        <div class="subtitle">PROVE YOUR WORTH. DOMINATE THE LEADERBOARD.</div>
      </div>

      <div class="battles-grid">
        <!-- ACTIVE TOURNAMENTS -->
        <div class="panel tournament-panel">
          <div class="panel-header"><i class="fas fa-trophy"></i> ACTIVE_TOURNAMENTS</div>
          <div class="tournament-list">
            <div class="tournament-card" *ngFor="let tourney of tournaments">
              <div class="tourney-status">LIVE</div>
              <h3>{{ tourney.name }}</h3>
              <p class="prize">PRIZE: {{ tourney.prize }}</p>
              <div class="meta">
                <span><i class="fas fa-users"></i> {{ tourney.participants }} ENTRIES</span>
                <span>ENDS IN: {{ tourney.endsIn }}</span>
              </div>
              <button class="btn-join">ENTER_ARENA</button>
            </div>
          </div>
        </div>

        <!-- LEADERBOARD -->
        <div class="panel leaderboard-panel">
          <div class="panel-header"><i class="fas fa-crown"></i> MONTHLY_LEADERBOARD</div>
          <div class="leaderboard-list">
            <div class="leaderboard-row header-row">
              <span>RANK</span>
              <span>ARTIST</span>
              <span>POINTS</span>
            </div>
            <div class="leaderboard-row" *ngFor="let user of leaderboard; let i = index">
              <span class="rank">#{{ i + 1 }}</span>
              <span class="artist">{{ user.name }}</span>
              <span class="points">{{ user.points }} PTS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .battles-container {
        padding: 120px 20px 60px;
        max-width: 1200px;
        margin: 0 auto;
        min-height: 80vh;
      }

      .section-header {
        text-align: center;
        margin-bottom: 60px;
      }

      h1 {
        font-family: var(--font-head);
        font-size: 3rem;
        margin-bottom: 10px;
        color: var(--text-color);
        text-transform: uppercase;
        letter-spacing: -0.02em;
      }

      .subtitle {
        font-family: var(--font-tech);
        color: var(--red-color);
        letter-spacing: 2px;
        font-size: 0.9rem;
        font-weight: 700;
      }

      .battles-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 40px;
      }

      @media (max-width: 768px) {
        .battles-grid {
          grid-template-columns: 1fr;
        }
      }

      .panel {
        border: 1px solid rgba(var(--line-color-rgb), 0.5);
        background: rgba(var(--card-bg-color-rgb), 0.8);
        backdrop-filter: blur(12px);
        padding: 30px;
        border-radius: 24px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      }

      .panel-header {
        font-family: var(--font-head);
        font-size: 1.2rem;
        margin-bottom: 25px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(var(--line-color-rgb), 0.3);
        color: var(--text-color);
        display: flex;
        align-items: center;
        gap: 12px;

        i {
          color: var(--red-color);
        }
      }

      /* Tournament Card */
      .tournament-card {
        background: rgba(var(--text-color-rgb), 0.05);
        padding: 25px;
        margin-bottom: 20px;
        border: 1px solid rgba(var(--line-color-rgb), 0.3);
        position: relative;
        transition: all 0.3s ease;
        border-radius: 24px;
      }

      .tournament-card:hover {
        border-color: var(--red-color);
        background: rgba(var(--text-color-rgb), 0.08);
        transform: translateY(-4px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      }

      .tourney-status {
        position: absolute;
        top: 15px;
        right: 15px;
        background: rgba(var(--red-color-rgb), 0.1);
        color: var(--red-color);
        font-size: 0.7rem;
        padding: 4px 10px;
        font-weight: 800;
        border-radius: 999px;
        border: 1px solid rgba(var(--red-color-rgb), 0.2);
        animation: pulse 2s infinite;
        font-family: var(--font-tech);
      }

      h3 {
        font-family: var(--font-head);
        margin: 10px 0;
        font-size: 1.4rem;
        color: var(--text-color);
      }

      .prize {
        color: #4caf50;
        font-weight: 700;
        font-family: var(--font-tech);
        margin-bottom: 15px;
        font-size: 0.9rem;
      }

      .meta {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        color: var(--line-color);
        margin-bottom: 25px;
        font-family: var(--font-tech);
      }

      .btn-join {
        width: 100%;
        padding: 14px;
        background: rgba(var(--red-color-rgb), 0.8);
        border: 1px solid rgba(var(--red-color-rgb), 0.3);
        color: white;
        font-family: var(--font-tech);
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
        font-weight: 700;
        border-radius: 999px;
        font-size: 0.9rem;
        backdrop-filter: blur(4px);
      }

      .btn-join:hover {
        background: var(--red-color);
        box-shadow: 0 0 20px rgba(var(--red-color-rgb), 0.4);
        transform: translateY(-2px);
      }

      /* Leaderboard */
      .leaderboard-row {
        display: grid;
        grid-template-columns: 60px 1fr 100px;
        padding: 18px;
        border-bottom: 1px solid rgba(var(--line-color-rgb), 0.2);
        align-items: center;
        transition: 0.2s;
      }

      .leaderboard-row:not(.header-row):hover {
        background: rgba(var(--text-color-rgb), 0.05);
      }

      .header-row {
        font-weight: 700;
        color: var(--line-color);
        font-size: 0.75rem;
        border-bottom: 1px solid rgba(var(--line-color-rgb), 0.2);
        font-family: var(--font-tech);
        text-transform: uppercase;
      }

      .rank {
        font-family: var(--font-head);
        color: var(--red-color);
        font-weight: 700;
        font-size: 1.1rem;
      }

      .artist {
        font-family: var(--font-tech);
        font-weight: 600;
        color: var(--text-color);
      }

      .points {
        text-align: right;
        font-family: var(--font-tech);
        color: var(--line-color);
        font-weight: 700;
      }

      @keyframes pulse {
        0% {
          opacity: 1;
          box-shadow: 0 0 0 0 rgba(var(--red-color-rgb), 0.4);
        }
        50% {
          opacity: 0.8;
          box-shadow: 0 0 0 4px rgba(var(--red-color-rgb), 0);
        }
        100% {
          opacity: 1;
          box-shadow: 0 0 0 0 rgba(var(--red-color-rgb), 0);
        }
      }
    `,
  ],
})
export class BattlesComponent {
  tournaments = [
    {
      name: 'WEEKLY FIRE VOL. 42',
      prize: '$500 + EXCLUSIVE BEAT PACK',
      participants: 128,
      endsIn: '2D 14H',
    },
    {
      name: 'MONTHLY KING',
      prize: '$2000 + STUDIO TIME',
      participants: 542,
      endsIn: '12D 05H',
    },
  ];

  leaderboard = [
    { name: 'Lil_Glitch', points: 2450 },
    { name: 'Neon_Soul', points: 2100 },
    { name: 'Cyber_Spit', points: 1850 },
    { name: 'Wave_Runner', points: 1600 },
    { name: 'Analog_Kid', points: 1450 },
  ];
}
