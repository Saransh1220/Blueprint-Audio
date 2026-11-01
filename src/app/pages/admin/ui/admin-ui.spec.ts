import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { pageOf } from '../admin.fixtures';
import { AdminList } from '../admin-list';
import { AdminBadgeComponent } from './admin-badge.component';
import { AdminListFooterComponent } from './admin-list-footer.component';
import { AdminListStateComponent } from './admin-list-state.component';
import { AdminListToolbarComponent } from './admin-list-toolbar.component';
import { AdminStatCardComponent } from './admin-stat-card.component';

function listWith(fetch = vi.fn().mockReturnValue(of(pageOf<number>([], 0)))) {
  return { fetch, list: new AdminList<number>(fetch) };
}

const text = (fixture: ComponentFixture<unknown>) =>
  (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ').trim() ?? '';
const q = (fixture: ComponentFixture<unknown>, selector: string) =>
  (fixture.nativeElement as HTMLElement).querySelector(selector) as HTMLElement | null;

describe('AdminBadgeComponent', () => {
  it.each([
    ['ok', 'fa-circle-check'],
    ['warn', 'fa-clock'],
    ['bad', 'fa-circle-xmark'],
    ['muted', 'fa-circle-minus'],
  ] as const)('shows the %s status with its own icon, not just a colour', (tone, icon) => {
    const fixture = TestBed.createComponent(AdminBadgeComponent);
    fixture.componentRef.setInput('status', { text: 'Label', tone });
    fixture.detectChanges();

    expect(q(fixture, '.badge')?.getAttribute('data-tone')).toBe(tone);
    expect(q(fixture, 'i')?.classList).toContain(icon);
    expect(text(fixture)).toBe('Label');
  });
});

describe('AdminStatCardComponent', () => {
  function render(inputs: Record<string, string>) {
    const fixture = TestBed.createComponent(AdminStatCardComponent);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('shows the label, the big value, the icon and the tint', () => {
    const fixture = render({ label: 'Users', value: '1,204', icon: 'fa-users', tint: 'violet' });

    expect(q(fixture, '.stat-label')?.textContent).toBe('Users');
    expect(q(fixture, '.stat-value')?.textContent).toBe('1,204');
    expect(q(fixture, '.tile i')?.classList).toContain('fa-users');
    expect(q(fixture, '.tile')?.getAttribute('data-tint')).toBe('violet');
    expect(q(fixture, '.stat-note')).toBeNull();
  });

  it('shows a note only when one is given', () => {
    const fixture = render({
      label: 'Revenue',
      value: '$1',
      icon: 'fa-wallet',
      note: 'All currencies',
    });
    expect(q(fixture, '.stat-note')?.textContent).toBe('All currencies');
  });
});

describe('AdminListToolbarComponent', () => {
  afterEach(() => vi.useRealTimers());

  function render(list: AdminList<number>) {
    const fixture = TestBed.createComponent(AdminListToolbarComponent);
    fixture.componentRef.setInput('list', list);
    fixture.componentRef.setInput('placeholder', 'Search users');
    fixture.componentRef.setInput('noun', 'users');
    fixture.detectChanges();
    return fixture;
  }

  const type = (fixture: ComponentFixture<unknown>, value: string) => {
    const input = q(fixture, 'input') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  it('shows the placeholder and the number of matching rows', () => {
    const { list } = listWith();
    list.total.set(1204);
    const fixture = render(list);

    expect((q(fixture, 'input') as HTMLInputElement).placeholder).toBe('Search users');
    expect(q(fixture, '.count')?.textContent).toBe(`${new Intl.NumberFormat().format(1204)} users`);
  });

  it('waits for typing to pause, then searches once from page 1', () => {
    vi.useFakeTimers();
    const { fetch, list } = listWith();
    const fixture = render(list);
    list.load();
    fetch.mockClear();

    type(fixture, 'a');
    type(fixture, 'ad');
    type(fixture, 'ada');
    expect(list.draft()).toBe('ada');

    vi.advanceTimersByTime(299);
    expect(fetch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith({ page: 1, limit: 10, q: 'ada' });
  });

  it('shows a clear button only while there is text, and clears at once', () => {
    const { fetch, list } = listWith();
    const fixture = render(list);
    expect(q(fixture, '.clear')).toBeNull();

    list.draft.set('ada');
    list.search.set('ada');
    fixture.detectChanges();
    fetch.mockClear();

    q(fixture, '.clear')?.click();
    fixture.detectChanges();

    expect(list.draft()).toBe('');
    expect(fetch).toHaveBeenCalledWith({ page: 1, limit: 10, q: '' });
    expect(q(fixture, '.clear')).toBeNull();
  });

  it('refreshes on demand and is disabled while loading', () => {
    const { fetch, list } = listWith();
    const fixture = render(list);
    const refresh = q(fixture, '.refresh') as HTMLButtonElement;

    refresh.click();
    expect(fetch).toHaveBeenCalledTimes(1);

    list.loading.set(true);
    fixture.detectChanges();
    expect(refresh.disabled).toBe(true);
    expect(q(fixture, '.refresh i')?.classList).toContain('spin');
  });
});

describe('AdminListStateComponent', () => {
  function render(list: AdminList<number>) {
    const fixture = TestBed.createComponent(AdminListStateComponent);
    fixture.componentRef.setInput('list', list);
    fixture.componentRef.setInput('noun', 'users');
    fixture.detectChanges();
    return fixture;
  }

  it('shows a loading skeleton until the first response', () => {
    const { list } = listWith();
    const fixture = render(list);
    expect(q(fixture, '.skeleton')).not.toBeNull();
    expect(q(fixture, '.state')).toBeNull();
  });

  it('shows nothing once rows are loaded', () => {
    const { list } = listWith(vi.fn().mockReturnValue(of(pageOf([1, 2], 2))));
    list.load();
    const fixture = render(list);
    expect(q(fixture, '.skeleton')).toBeNull();
    expect(q(fixture, '.state')).toBeNull();
  });

  it('explains an empty list without offering a way back', () => {
    const { list } = listWith();
    list.load();
    const fixture = render(list);

    expect(text(fixture)).toBe('No users yet.');
    expect(q(fixture, 'button')).toBeNull();
  });

  it('explains an empty search and clears it from the button', () => {
    const { fetch, list } = listWith();
    list.load();
    list.search.set('zed');
    list.draft.set('zed');
    const fixture = render(list);
    expect(text(fixture)).toContain('No users match “zed”.');

    fetch.mockClear();
    q(fixture, 'button')?.click();

    expect(list.draft()).toBe('');
    expect(fetch).toHaveBeenCalledWith({ page: 1, limit: 10, q: '' });
  });

  it('offers a retry when loading failed', () => {
    const fetch = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('x')))
      .mockReturnValueOnce(of(pageOf([1], 1)));
    const { list } = listWith(fetch);
    list.load();
    const fixture = render(list);

    expect(text(fixture)).toContain('Could not load users.');
    q(fixture, 'button')?.click();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(list.failed()).toBe(false);
  });
});

describe('AdminListFooterComponent', () => {
  function render(list: AdminList<number>) {
    const fixture = TestBed.createComponent(AdminListFooterComponent);
    fixture.componentRef.setInput('list', list);
    fixture.detectChanges();
    return fixture;
  }

  it('renders nothing for an empty list', () => {
    const fixture = render(listWith().list);
    expect(q(fixture, 'app-pagination')).toBeNull();
  });

  it('pages and resizes the list with the sizes the UI offers', () => {
    const fetch = vi.fn().mockReturnValue(of(pageOf<number>([], 42)));
    const { list } = listWith(fetch);
    list.load();
    const fixture = render(list);
    expect(q(fixture, 'app-pagination')).not.toBeNull();

    fetch.mockClear();
    q(fixture, '.pager-btn.next')?.click();
    expect(fetch).toHaveBeenCalledWith({ page: 2, limit: 10, q: '' });

    const select = q(fixture, '.pagination-perpage select') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['5', '10', '20', '50']);
    fetch.mockClear();
    select.value = '20';
    select.dispatchEvent(new Event('change'));
    expect(fetch).toHaveBeenCalledWith({ page: 1, limit: 20, q: '' });
  });
});
