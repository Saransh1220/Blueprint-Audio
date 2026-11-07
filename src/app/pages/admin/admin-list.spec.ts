import { of, Subject, throwError } from 'rxjs';
import type { PaginatedResponse } from '../../models';
import { ADMIN_DEFAULT_PAGE_SIZE, AdminList } from './admin-list';

function page<T>(data: T[], total: number, pageNo = 1, perPage = 10): PaginatedResponse<T> {
  return { data, metadata: { total, page: pageNo, per_page: perPage } };
}

describe('AdminList', () => {
  it('starts on page 1 with the default page size and sends them with the first load', () => {
    const fetch = vi.fn().mockReturnValue(of(page([{ id: 1 }], 1)));
    const list = new AdminList<{ id: number }>(fetch);

    list.load();

    expect(fetch).toHaveBeenCalledWith({ page: 1, limit: ADMIN_DEFAULT_PAGE_SIZE, q: '' });
    expect(list.items()).toEqual([{ id: 1 }]);
    expect(list.total()).toBe(1);
    expect(list.loaded()).toBe(true);
    expect(list.loading()).toBe(false);
    expect(list.failed()).toBe(false);
  });

  it('takes its page size from the caller', () => {
    const fetch = vi.fn().mockReturnValue(of(page([], 0)));
    new AdminList(fetch, 5).load();
    expect(fetch).toHaveBeenCalledWith({ page: 1, limit: 5, q: '' });
  });

  it('goes to another page, ignoring the current page and invalid pages', () => {
    const fetch = vi.fn().mockReturnValue(of(page([], 100)));
    const list = new AdminList(fetch);
    list.load();
    fetch.mockClear();

    list.goTo(1);
    list.goTo(0);
    expect(fetch).not.toHaveBeenCalled();

    list.goTo(4);
    expect(list.page()).toBe(4);
    expect(fetch).toHaveBeenCalledWith({ page: 4, limit: 10, q: '' });
  });

  it('changes page size back to page 1 and ignores no-op sizes', () => {
    const fetch = vi.fn().mockReturnValue(of(page([], 100)));
    const list = new AdminList(fetch);
    list.load();
    list.goTo(3);
    fetch.mockClear();

    list.setPerPage(10);
    list.setPerPage(0);
    expect(fetch).not.toHaveBeenCalled();

    list.setPerPage(20);
    expect(list.page()).toBe(1);
    expect(fetch).toHaveBeenCalledWith({ page: 1, limit: 20, q: '' });
  });

  it('searches from page 1, trimming and skipping an unchanged search', () => {
    const fetch = vi.fn().mockReturnValue(of(page([], 100)));
    const list = new AdminList(fetch);
    list.load();
    list.goTo(3);
    fetch.mockClear();

    list.setSearch('  bob ');
    expect(list.search()).toBe('bob');
    expect(list.page()).toBe(1);
    expect(fetch).toHaveBeenCalledWith({ page: 1, limit: 10, q: 'bob' });

    fetch.mockClear();
    list.setSearch('bob  ');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('only keeps the newest response when an older one arrives late', () => {
    const slow = new Subject<PaginatedResponse<string>>();
    const fast = new Subject<PaginatedResponse<string>>();
    const fetch = vi.fn().mockReturnValueOnce(slow).mockReturnValueOnce(fast);
    const list = new AdminList<string>(fetch);

    list.load();
    list.setSearch('new');
    fast.next(page(['fresh'], 1));
    slow.next(page(['stale'], 1));

    expect(list.items()).toEqual(['fresh']);
  });

  it('steps back to the last page when the current one no longer exists', () => {
    const fetch = vi
      .fn()
      .mockReturnValueOnce(of(page(['a'], 31)))
      .mockReturnValueOnce(of(page([], 11)))
      .mockReturnValueOnce(of(page(['z'], 11)));
    const list = new AdminList<string>(fetch);
    list.load();
    list.page.set(4);

    list.load();

    expect(list.page()).toBe(2);
    expect(fetch).toHaveBeenLastCalledWith({ page: 2, limit: 10, q: '' });
    expect(list.items()).toEqual(['z']);
  });

  it('reports a failure, and recovers on the next load', () => {
    const fetch = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('boom')))
      .mockReturnValueOnce(of(page([], 0)));
    const list = new AdminList(fetch);

    list.load();
    expect(list.failed()).toBe(true);
    expect(list.loading()).toBe(false);
    expect(list.isEmpty()).toBe(false);

    list.load();
    expect(list.failed()).toBe(false);
    expect(list.isEmpty()).toBe(true);
  });

  it('tolerates a response without data or metadata', () => {
    const fetch = vi.fn().mockReturnValue(of({}));
    const list = new AdminList(fetch);
    list.load();
    expect(list.items()).toEqual([]);
    expect(list.total()).toBe(0);
    expect(list.totalPages()).toBe(1);
  });

  it('patches rows optimistically and cancels in-flight work on destroy', () => {
    const pending = new Subject<PaginatedResponse<number>>();
    const list = new AdminList<number>(() => pending);
    list.items.set([1, 2]);
    list.patchItems((items) => items.map((n) => n * 2));
    expect(list.items()).toEqual([2, 4]);

    list.load();
    list.destroy();
    pending.next(page([9], 1));
    expect(list.items()).toEqual([2, 4]);
  });
});
