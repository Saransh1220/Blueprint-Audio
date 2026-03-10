import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { BattleDetailsComponent } from './battle-details.component';

describe('BattleDetailsComponent', () => {
  it('reads route id and exposes mock battle data', () => {
    const params$ = new Subject<Record<string, string>>();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [{ provide: ActivatedRoute, useValue: { params: params$ } }],
    });

    const component = TestBed.runInInjectionContext(() => new BattleDetailsComponent());
    component.ngOnInit();
    params$.next({ id: 'b-1' });

    expect(component.battleId()).toBe('b-1');
    expect(component.battle().title).toContain('TOURNAMENT');
    expect(component.submissions().length).toBeGreaterThan(0);

    component.vote(2);
    expect(logSpy).toHaveBeenCalled();
  });
});
