import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { BattleDetailsComponent } from './battle-details.component';

describe('BattleDetailsComponent', () => {
  it('reads route id and exposes simplified mock detail data', () => {
    const params$ = new Subject<Record<string, string>>();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [{ provide: ActivatedRoute, useValue: { params: params$ } }],
    });

    const component = TestBed.runInInjectionContext(() => new BattleDetailsComponent());
    component.ngOnInit();
    params$.next({ id: 'weekly-fire-42' });

    expect(component.battleId()).toBe('weekly-fire-42');
    expect(component.battle().type).toBe('Artist battle');
    expect(component.battle().rules.length).toBeGreaterThan(0);
    expect(component.battle().settings.length).toBeGreaterThan(0);
    expect(component.battle().rewards.length).toBeGreaterThan(0);
    expect(component.submissions().length).toBeGreaterThan(0);

    component.vote(2);
    expect(logSpy).toHaveBeenCalledWith('Visual vote for submission:', 2);
  });
});
