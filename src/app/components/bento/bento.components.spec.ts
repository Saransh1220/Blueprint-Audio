import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BentoCardComponent } from './bento-card.component';
import { BentoFeedComponent } from './bento-feed.component';
import { BentoGaugeComponent } from './bento-gauge.component';
import { BentoPageComponent } from './bento-page.component';
import { BentoRankListComponent } from './bento-rank-list.component';
import { BentoSegmentedComponent } from './bento-segmented.component';
import { BentoStatTileComponent } from './bento-stat-tile.component';
import { BentoStreamChartComponent } from './bento-stream-chart.component';
import { BentoTickBarComponent } from './bento-tick-bar.component';
import { BentoTooltipComponent } from './bento-tooltip.component';
import { BentoWaveComponent } from './bento-wave.component';
import { BentoWeekdayBarsComponent } from './bento-weekday-bars.component';

function make<T>(type: Type<T>, inputs: Record<string, unknown> = {}) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture: ComponentFixture<T> = TestBed.createComponent(type);
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance };
}

const rect = (el: Element) => {
  el.getBoundingClientRect = () => ({ left: 0, width: 100 }) as DOMRect;
};

describe('bento components', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('page shows heading, optional subtitle', () => {
    const { el, fixture } = make(BentoPageComponent, { heading: 'Hello' });
    expect(el.querySelector('h1')?.textContent).toBe('Hello');
    expect(el.querySelector('.sub')).toBeNull();
    fixture.componentRef.setInput('subtitle', 'World');
    fixture.detectChanges();
    expect(el.querySelector('.sub')?.textContent).toBe('World');
  });

  it('card renders header only with a heading and maps spans to variables', () => {
    const { el, fixture } = make(BentoCardComponent, { span: 4, height: 200, index: 2 });
    expect(el.querySelector('h2')).toBeNull();
    expect(el.style.getPropertyValue('--s')).toBe('4');
    expect(el.style.getPropertyValue('--delay')).toBe('120ms');
    fixture.componentRef.setInput('heading', 'Title');
    fixture.componentRef.setInput('hint', 'Hint');
    fixture.componentRef.setInput('palette', 'blue');
    fixture.detectChanges();
    expect(el.querySelector('h2')?.textContent).toBe('Title');
    expect(el.querySelector('.titles p')?.textContent).toBe('Hint');
    expect(el.getAttribute('data-palette')).toBe('blue');
    fixture.componentRef.setInput('height', null);
    fixture.detectChanges();
    expect(el.style.getPropertyValue('--h')).toBe('');
  });

  it('segmented control marks the active option and emits changes only when different', () => {
    const { el, fixture, cmp } = make(BentoSegmentedComponent, {
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
      value: 'a',
      label: 'Pick',
    });
    const spy = vi.fn();
    cmp.selected.subscribe(spy);
    const buttons = el.querySelectorAll('button');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
    expect(el.querySelector('[role=group]')?.getAttribute('aria-label')).toBe('Pick');
    buttons[0].click();
    expect(spy).not.toHaveBeenCalled();
    buttons[1].click();
    expect(spy).toHaveBeenCalledWith('b');
    fixture.componentRef.setInput('emitSame', true);
    buttons[0].click();
    expect(spy).toHaveBeenCalledWith('a');
  });

  it('tooltip stays inside the viewport', () => {
    const { el, fixture } = make(BentoTooltipComponent, { x: 10, y: 5 });
    expect(el.style.transform).toBe('translate(26px,8px)');
    fixture.componentRef.setInput('x', window.innerWidth - 10);
    fixture.detectChanges();
    expect(el.style.transform).toContain(`${window.innerWidth - 10 - 216}px`);
  });

  it('tick bar fills the right number of ticks and clamps', () => {
    const { el, fixture } = make(BentoTickBarComponent, { percent: 50, count: 10, label: 'Share' });
    expect(el.querySelectorAll('line.on').length).toBe(5);
    expect(el.querySelector('svg')?.getAttribute('aria-label')).toBe('Share: 50%');
    fixture.componentRef.setInput('percent', 400);
    fixture.detectChanges();
    expect(el.querySelectorAll('line.on').length).toBe(10);
    fixture.componentRef.setInput('count', 1);
    fixture.detectChanges();
    expect(el.querySelectorAll('line').length).toBe(1);
  });

  it('wave draws a path, shows a tooltip on hover and hides it on leave', () => {
    const { el, fixture } = make(BentoWaveComponent, {
      values: [1, 3, 2],
      labels: ['a', 'b', 'c'],
      format: (v: number) => `#${v}`,
      animateKey: 'x',
    });
    expect(el.querySelector('path.line')).not.toBeNull();
    expect(el.querySelectorAll('.axis span').length).toBe(3);
    const wrap = el.querySelector('.wrap') as HTMLElement;
    rect(wrap);
    wrap.dispatchEvent(new MouseEvent('pointermove', { clientX: 50 }));
    fixture.detectChanges();
    expect(el.querySelector('app-bento-tooltip')?.textContent).toContain('#3');
    expect(el.querySelector('.dot')).not.toBeNull();
    wrap.dispatchEvent(new MouseEvent('pointerleave'));
    fixture.detectChanges();
    expect(el.querySelector('app-bento-tooltip')).toBeNull();
    fixture.componentRef.setInput('animateKey', 'y');
    fixture.detectChanges();
    expect(el.querySelector('.draw')?.classList.contains('alt')).toBe(false);
  });

  it('compact wave ignores hover and empty waves draw nothing', () => {
    const { el, fixture } = make(BentoWaveComponent, { values: [1, 2], compact: true });
    const wrap = el.querySelector('.wrap') as HTMLElement;
    rect(wrap);
    wrap.dispatchEvent(new MouseEvent('pointermove', { clientX: 50 }));
    fixture.detectChanges();
    expect(el.querySelector('app-bento-tooltip')).toBeNull();
    expect(el.querySelector('.axis')).toBeNull();
    fixture.componentRef.setInput('compact', false);
    fixture.componentRef.setInput('values', []);
    fixture.detectChanges();
    wrap.dispatchEvent(new MouseEvent('pointermove', { clientX: 50 }));
    expect(el.querySelector('path.line')).toBeNull();
  });

  it('stat tile covers loading, unavailable and ready states', () => {
    const { el, fixture } = make(BentoStatTileComponent, {
      label: 'Plays',
      value: '12',
      delta: '+5.0%',
      up: true,
      hint: 'hint',
      icon: 'fa-solid fa-play',
      link: '/x',
      spark: [1, 2, 3],
    });
    expect(el.querySelector('.num')?.textContent).toBe('12');
    expect(el.querySelector('.chip.up')).not.toBeNull();
    expect(el.querySelector('app-bento-wave')).not.toBeNull();
    expect(el.querySelector('a.go')).not.toBeNull();
    fixture.componentRef.setInput('up', false);
    fixture.detectChanges();
    expect(el.querySelector('.chip.down')).not.toBeNull();
    fixture.componentRef.setInput('up', null);
    fixture.componentRef.setInput('spark', []);
    fixture.componentRef.setInput('accent', true);
    fixture.detectChanges();
    expect(el.querySelector('.chip i')).toBeNull();
    expect(el.querySelector('.tile.accent')).not.toBeNull();
    fixture.componentRef.setInput('state', 'loading');
    fixture.detectChanges();
    expect(el.textContent).toContain('Loading…');
    fixture.componentRef.setInput('state', 'unavailable');
    fixture.detectChanges();
    expect(el.textContent).toContain('Unavailable');
  });

  it('stream chart renders layers, hover and an empty state', () => {
    const { el, fixture } = make(BentoStreamChartComponent, {
      series: [
        { label: 'Plays', color: '#fff', values: [1, 2, 3] },
        { label: 'Downloads', color: '#aaa', values: [1, 1] },
      ],
      labels: ['a', 'b', 'c'],
      format: (v: number) => `${v}!`,
      empty: 'nothing',
    });
    expect(el.querySelectorAll('.layers path').length).toBe(2);
    const wrap = el.querySelector('.wrap') as HTMLElement;
    rect(wrap);
    wrap.dispatchEvent(new MouseEvent('pointermove', { clientX: 100 }));
    fixture.detectChanges();
    const tip = el.querySelector('app-bento-tooltip')?.textContent ?? '';
    expect(tip).toContain('3!');
    expect(tip).toContain('0!');
    expect(el.querySelector('line.guide')).not.toBeNull();
    wrap.dispatchEvent(new MouseEvent('pointerleave'));
    fixture.componentRef.setInput('animateKey', 'k');
    fixture.detectChanges();
    expect(el.querySelector('.layers')?.classList.contains('alt')).toBe(false);
    fixture.componentRef.setInput('animateKey', 'k2');
    fixture.detectChanges();
    expect(el.querySelector('.layers')?.classList.contains('alt')).toBe(true);
    fixture.componentRef.setInput('series', [{ label: 'x', color: '#fff', values: [0, 0] }]);
    fixture.detectChanges();
    expect(el.querySelector('.empty')?.textContent).toBe('nothing');
  });

  it('stream chart ignores hover without data points', () => {
    const { el, fixture } = make(BentoStreamChartComponent, {
      series: [{ label: 'x', color: '#fff', values: [1, 2] }],
    });
    fixture.componentRef.setInput('series', [{ label: 'x', color: '#fff', values: [] }]);
    fixture.detectChanges();
    expect(el.querySelector('.empty')).not.toBeNull();
    (fixture.componentInstance as unknown as { onMove(e: PointerEvent): void }).onMove({
      currentTarget: el,
      clientX: 1,
      clientY: 1,
    } as unknown as PointerEvent);
    expect(el.querySelector('app-bento-tooltip')).toBeNull();
  });

  it('gauge draws 56 ticks, the lead share and a legend', () => {
    const { el, fixture } = make(BentoGaugeComponent, {
      shares: [
        { label: 'premium', share: 60, amount: '$6', color: '#fff' },
        { label: 'basic', share: 40, amount: '$4', color: '#aaa' },
      ],
    });
    expect(el.querySelectorAll('line').length).toBe(56);
    expect(el.querySelector('.pct')?.textContent).toContain('60%');
    expect(el.querySelectorAll('li').length).toBe(2);
    expect(el.querySelector('svg')?.getAttribute('aria-label')).toContain('premium 60%');
    fixture.componentRef.setInput('shares', []);
    fixture.componentRef.setInput('empty', 'none');
    fixture.detectChanges();
    expect(el.querySelector('.empty')?.textContent).toBe('none');
  });

  it('weekday bars highlight the peak and show tooltips', () => {
    const { el, fixture } = make(BentoWeekdayBarsComponent, {
      values: [1, 5, 0, 0, 0, 0, 2],
      highlight: 1,
      unit: 'plays',
    });
    expect(el.querySelectorAll('.fill').length).toBe(7);
    expect(el.querySelectorAll('.fill.hi').length).toBe(1);
    const col = el.querySelectorAll('.col')[1] as HTMLElement;
    col.dispatchEvent(new MouseEvent('pointermove', { clientX: 5, clientY: 5 }));
    fixture.detectChanges();
    expect(el.querySelector('app-bento-tooltip')?.textContent).toContain('Tue');
    col.dispatchEvent(new MouseEvent('pointerleave'));
    fixture.detectChanges();
    expect(el.querySelector('app-bento-tooltip')).toBeNull();
    fixture.componentRef.setInput('values', [0, 0, 0, 0, 0, 0, 0]);
    fixture.detectChanges();
    expect(el.querySelector('.empty')).not.toBeNull();
  });

  it('rank list renders covers, letters, links and an empty state', () => {
    const { el, fixture } = make(BentoRankListComponent, {
      rows: [
        { id: '1', title: 'Alpha', value: '10', percent: 100, meta: 'm', link: ['/', '1'] },
        { id: '2', title: 'Beta', value: '5', percent: 50, imageUrl: 'b.png' },
      ],
    });
    expect(el.querySelector('a')?.textContent).toBe('Alpha');
    expect(el.querySelector('.letter')?.textContent).toBe('A');
    expect(el.querySelector('img')?.getAttribute('src')).toBe('b.png');
    expect(el.querySelector('small')?.textContent).toBe('m');
    expect(el.querySelectorAll('strong').length).toBe(1);
    fixture.componentRef.setInput('rows', []);
    fixture.componentRef.setInput('empty', 'none');
    fixture.detectChanges();
    expect(el.querySelector('.empty')?.textContent).toBe('none');
  });

  it('feed renders links, actions and trailing values', () => {
    const { el, fixture, cmp } = make(BentoFeedComponent, {
      columns: 2,
      rows: [
        { id: 'a', title: 'Linked', link: '/x', text: 't', trailing: '$1', time: '1h' },
        { id: 'b', title: 'Action', actionLabel: 'Dismiss', tone: 'bad' },
        { id: 'c', title: 'Route action', actionLabel: 'Go', link: '/y', avatar: 'Z' },
        { id: 'd', title: 'Plain' },
      ],
    });
    const spy = vi.fn();
    cmp.act.subscribe(spy);
    expect(el.querySelector('ul')?.style.getPropertyValue('--cols')).toBe('2');
    expect(el.querySelector('.txt a')?.textContent).toBe('Linked');
    expect(el.querySelector('.end b')?.textContent).toBe('$1');
    (el.querySelector('button.act') as HTMLElement).click();
    (el.querySelector('a.act') as HTMLElement).click();
    expect(spy).toHaveBeenCalledWith('b');
    expect(spy).toHaveBeenCalledWith('c');
    expect(el.querySelectorAll('.av')[2].textContent).toBe('Z');
    fixture.componentRef.setInput('rows', []);
    fixture.componentRef.setInput('empty', 'none');
    fixture.detectChanges();
    expect(el.querySelector('.empty')?.textContent).toBe('none');
  });
});
