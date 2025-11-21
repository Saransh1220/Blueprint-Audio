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
        font-family: 'Unbounded', sans-serif;
        font-size: 3rem;
        margin-bottom: 10px;
        background: linear-gradient(to right, var(--text-color), var(--line-color));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .subtitle {
        font-family: 'Space Mono', monospace;
        color: var(--red-color);
        letter-spacing: 2px;
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
        border: 1px solid var(--line-color);
        background: rgba(var(--card-bg-color-rgb), 0.8);
        backdrop-filter: blur(10px);
        padding: 20px;
      }

      .panel-header {
        font-family: 'Unbounded', sans-serif;
        font-size: 1.2rem;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--red-color);
        color: var(--red-color);
        display: flex;
        align-items: center;
        gap: 10px;
      }

      /* Tournament Card */
      .tournament-card {
        background: var(--faded-ink);
        padding: 20px;
        margin-bottom: 20px;
        border: 1px solid var(--line-color);
        position: relative;
        transition: all 0.3s ease;
      }

      .tournament-card:hover {
        border-color: var(--red-color);
        transform: translateY(-2px);
      }

      .tourney-status {
        position: absolute;
        top: 10px;
        right: 10px;
        background: var(--red-color);
        color: white;
        font-size: 0.7rem;
        padding: 2px 6px;
        font-weight: bold;
        border-radius: 2px;
        animation: pulse 2s infinite;
      }

      h3 {
        font-family: 'Unbounded', sans-serif;
        margin: 10px 0;
        font-size: 1.5rem;
        color: var(--text-color);
      }

      .prize {
        color: #4caf50;
        font-weight: bold;
        font-family: 'Space Mono', monospace;
        margin-bottom: 15px;
      }

      .meta {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        color: var(--line-color);
        margin-bottom: 20px;
      }

      .btn-join {
        width: 100%;
        padding: 12px;
        background: transparent;
        border: 1px solid var(--red-color);
        color: var(--red-color);
        font-family: 'Space Mono', monospace;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
        font-weight: bold;
      }

      .btn-join:hover {
        background: var(--red-color);
        color: var(--bg-color);
      }

      /* Leaderboard */
      .leaderboard-row {
        display: grid;
        grid-template-columns: 50px 1fr 80px;
        padding: 15px;
        border-bottom: 1px solid var(--line-color);
        align-items: center;
      }

      .header-row {
        font-weight: bold;
        color: var(--line-color);
        font-size: 0.8rem;
        border-bottom: 1px solid var(--line-color);
      }

      .rank {
        font-family: 'Unbounded', sans-serif;
        color: var(--red-color);
      }

      .points {
        text-align: right;
        font-family: 'Space Mono', monospace;
        color: var(--line-color);
      }

      @keyframes pulse {
        0% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
        100% {
          opacity: 1;
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
