import { BattlesComponent } from './battles.component';

describe('BattlesComponent', () => {
  it('exposes tournaments and leaderboard data', () => {
    const component = new BattlesComponent();
    expect(component.tournaments.length).toBe(2);
    expect(component.leaderboard.length).toBe(5);
    expect(component.tournaments[0].name).toContain('Weekly');
  });
});
