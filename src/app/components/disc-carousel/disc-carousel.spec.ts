import '../../../test-setup';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscCarouselComponent, type DiscItem } from './disc-carousel';

const items = (n: number): DiscItem[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `b${i}`,
    title: `Beat ${i}`,
    imageUrl: i === 1 ? undefined : `/cover-${i}.webp`,
    credits: [{ label: 'Producer', value: `Producer ${i}` }],
    stats: [{ label: 'Plays', value: '1K' }],
  }));

describe('DiscCarouselComponent', () => {
  let fixture: ComponentFixture<DiscCarouselComponent>;
  let component: DiscCarouselComponent;
  let el: HTMLElement;
  let frames: FrameRequestCallback[];

  const root = () => el.querySelector<HTMLElement>('.dcc-root') as HTMLElement;
  const slides = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.dcc-slide'));
  const button = (label: string) =>
    el.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`) as HTMLButtonElement;
  const render = (list: DiscItem[] = items(5)) => {
    fixture.componentRef.setInput('items', list);
    fixture.detectChanges();
  };
  const runFrames = (times = 400, step = 16) => {
    let t = 0;
    for (let i = 0; i < times && frames.length; i++) {
      t += step;
      frames.shift()?.(t);
    }
  };

  beforeEach(() => {
    frames = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    fixture = TestBed.createComponent(DiscCarouselComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders one disc per item with cover art or a generated label', () => {
    render();
    expect(slides()).toHaveLength(5);
    expect(slides()[0].querySelector('img')?.getAttribute('src')).toBe('/cover-0.webp');
    expect(slides()[1].querySelector('img')).toBeNull();
    expect(slides()[1].querySelector('text')?.textContent).toContain('BEAT 1');
    expect(slides()[0].getAttribute('aria-label')).toBe('1 of 5: Beat 0');
    expect(slides()[0].getAttribute('aria-current')).toBe('true');
    expect(slides()[4].querySelector('img')?.getAttribute('loading')).toBe('lazy');
  });

  it('shows the chosen disc credits and stats, and counts position', () => {
    render();
    expect(el.querySelector('.dcc-title')?.textContent).toContain('Beat 0');
    expect(el.querySelector('.dcc-row dd')?.textContent).toBe('Producer 0');
    expect(el.querySelector('.dcc-stat-value')?.textContent).toBe('1K');
    expect(el.querySelector('.dcc-count')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      '01 / 05',
    );
  });

  it('poses the discs on the first frame', () => {
    render();
    expect(slides()[0].style.transform).toContain('translate3d');
    expect(slides()[0].style.getPropertyValue('--dcc-roll')).toBe('0.00deg');
  });

  it('moves with the buttons, announcing the change', () => {
    const changed: number[] = [];
    component.activeChange.subscribe((i) => changed.push(i));
    render();
    button('Next beat').click();
    fixture.detectChanges();
    expect(component.active()).toBe(1);
    expect(el.querySelector('.dcc-title')?.textContent).toContain('Beat 1');
    button('Previous beat').click();
    button('Previous beat').click();
    fixture.detectChanges();
    expect(component.active()).toBe(4);
    expect(changed).toEqual([1, 0, 4]);
    expect(component.resting).toBe(4);
  });

  it('animates until the springs settle, then stops asking for frames', () => {
    render();
    component.next();
    runFrames();
    expect(frames).toHaveLength(0);
    expect(slides()[1].style.transform).toContain('rotateY(');
  });

  it('settles at once with reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (q) =>
        ({
          matches: true,
          media: q,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }) as unknown as MediaQueryList,
    );
    render();
    component.next();
    runFrames(3);
    expect(frames).toHaveLength(0);
  });

  it('handles the keyboard', () => {
    render();
    const key = (k: string) => {
      const e = new KeyboardEvent('keydown', { key: k, cancelable: true });
      root().dispatchEvent(e);
      fixture.detectChanges();
      return e.defaultPrevented;
    };
    expect(key('ArrowRight')).toBe(true);
    expect(component.active()).toBe(1);
    expect(key('ArrowDown')).toBe(true);
    expect(key('ArrowLeft')).toBe(true);
    expect(key('ArrowUp')).toBe(true);
    expect(component.active()).toBe(0);
    expect(key('End')).toBe(true);
    expect(component.active()).toBe(4);
    expect(key('Home')).toBe(true);
    expect(component.active()).toBe(0);
    expect(key('x')).toBe(false);
  });

  it('brings a side disc forward on click and selects the chosen one', () => {
    const picked: number[] = [];
    component.selected.subscribe((i) => picked.push(i));
    render();
    slides()[2].click();
    fixture.detectChanges();
    expect(component.active()).toBe(2);
    expect(picked).toEqual([]);
    slides()[2].click();
    expect(picked).toEqual([2]);
  });

  it('turns the chosen disc only while spinning', () => {
    render();
    expect(el.querySelector('.dcc-spin')).toBeNull();
    fixture.componentRef.setInput('spinning', true);
    fixture.detectChanges();
    expect(el.querySelectorAll('.dcc-spin')).toHaveLength(1);
  });

  describe('dragging', () => {
    const pointer = (
      type: string,
      x: number,
      t: number,
      init: MouseEventInit = {},
      target: Element = root(),
    ) => {
      const e = new MouseEvent(type, { clientX: x, button: 0, bubbles: true, ...init });
      Object.defineProperty(e, 'pointerId', { value: 1 });
      Object.defineProperty(e, 'pointerType', { value: 'touch' });
      Object.defineProperty(e, 'timeStamp', { value: t });
      target.dispatchEvent(e);
    };

    beforeEach(() => {
      render();
      root().setPointerCapture = () => undefined;
    });

    it('flicks to another disc and blocks the click that ends the drag', () => {
      pointer('pointerdown', 400, 0);
      pointer('pointermove', 380, 10);
      expect(component.dragging()).toBe(true);
      pointer('pointermove', 100, 30);
      pointer('pointerup', 100, 40);
      fixture.detectChanges();
      expect(component.dragging()).toBe(false);
      const landed = component.active();
      expect(landed).not.toBe(0);
      slides()[0].click();
      expect(component.active()).toBe(landed);
    });

    it('ignores a small wobble and presses on controls', () => {
      pointer('pointerdown', 400, 0);
      pointer('pointermove', 398, 5);
      pointer('pointerup', 398, 8);
      expect(component.dragging()).toBe(false);
      pointer('pointerdown', 5, 0, {}, el.querySelector('.dcc-ctl .dcc-btn') as Element);
      pointer('pointermove', 100, 20);
      expect(component.dragging()).toBe(false);
    });

    it('cancels without a flick, and ignores other buttons', () => {
      pointer('pointerdown', 400, 0, { button: 2 });
      pointer('pointermove', 100, 10);
      expect(component.dragging()).toBe(false);
      pointer('pointerdown', 400, 0);
      pointer('pointermove', 300, 10);
      pointer('pointercancel', 300, 20);
      expect(component.dragging()).toBe(false);
    });

    it('tilts the glint with a mouse, and resets on leave', () => {
      const e = new MouseEvent('pointermove', { clientX: 10, clientY: 10, bubbles: true });
      Object.defineProperty(e, 'pointerType', { value: 'mouse' });
      root().dispatchEvent(e);
      expect(root().style.getPropertyValue('--dcc-px')).not.toBe('');
      root().dispatchEvent(new MouseEvent('pointerleave'));
      expect(root().style.getPropertyValue('--dcc-px')).toBe('0');
    });
  });

  it('steps through on horizontal swipes only', () => {
    render();
    const vertical = new WheelEvent('wheel', { deltaX: 2, deltaY: 40, cancelable: true });
    root().dispatchEvent(vertical);
    expect(vertical.defaultPrevented).toBe(false);
    const swipe = new WheelEvent('wheel', { deltaX: 80, deltaY: 1, cancelable: true });
    root().dispatchEvent(swipe);
    expect(swipe.defaultPrevented).toBe(true);
    expect(component.active()).toBe(1);
  });

  it('copes with a list that shrinks, and with none', () => {
    render(items(5));
    for (let i = 0; i < 4; i++) component.next();
    render(items(2));
    expect(component.active()).toBeLessThan(2);
    render([]);
    expect(slides()).toHaveLength(0);
    expect(el.querySelector('.dcc-ctl')).toBeNull();
    component.next();
    expect(component.active()).toBe(0);
  });

  it('hides the controls for a single disc', () => {
    render(items(1));
    expect(el.querySelector('.dcc-ctl')).toBeNull();
  });
});
