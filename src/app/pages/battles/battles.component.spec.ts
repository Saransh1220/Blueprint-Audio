import { BattlesComponent } from './battles.component';

describe('BattlesComponent', () => {
  it('defaults to the overview dashboard tab with separate battle datasets', () => {
    const component = new BattlesComponent();

    expect(component.activeTab()).toBe('overview');
    expect(component.artistBattles.length).toBeGreaterThan(0);
    expect(component.producerBattles.length).toBeGreaterThan(0);
    expect(component.myRooms.length).toBeGreaterThan(0);
    expect(component.featuredBattle.title).toContain('Weekly Fire');
  });

  it('switches tabs and exposes the matching battle list', () => {
    const component = new BattlesComponent();

    component.setTab('producer');

    expect(component.activeTab()).toBe('producer');
    expect(component.activeList()).toBe(component.producerBattles);

    component.setTab('artist');

    expect(component.activeTab()).toBe('artist');
    expect(component.activeList()).toBe(component.artistBattles);
  });
});
