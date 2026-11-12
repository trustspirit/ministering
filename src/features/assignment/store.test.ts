import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SIDE_WIDTH, parseSideWidth, SIDE_WIDTH_KEY } from './store';

describe('parseSideWidth', () => {
  it.each(['440px', '45vw', '12.5vw', '600.25px'])('accepts %s', (value) => {
    expect(parseSideWidth(value)).toBe(value);
  });

  it.each([null, undefined, '', 'calc(100vw - 1px)', '10em', '45', 'px', '-300px', '1e3px', '45vw;color:red'])(
    'falls back to 45vw for %s',
    (value) => {
      expect(parseSideWidth(value)).toBe(DEFAULT_SIDE_WIDTH);
    },
  );
});

describe('useWorkspaceStore side width', () => {
  afterEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  async function freshStore() {
    vi.resetModules();
    return (await import('./store')).useWorkspaceStore;
  }

  it('restores a valid persisted width', async () => {
    localStorage.setItem(SIDE_WIDTH_KEY, '520px');
    expect((await freshStore()).getState().sideWidth).toBe('520px');
  });

  it('ignores an invalid persisted width', async () => {
    localStorage.setItem(SIDE_WIDTH_KEY, 'url(evil)');
    expect((await freshStore()).getState().sideWidth).toBe('45vw');
  });

  it('persists on setSideWidth but not on previewSideWidth', async () => {
    const store = await freshStore();
    store.getState().previewSideWidth('400px');
    expect(store.getState().sideWidth).toBe('400px');
    expect(localStorage.getItem(SIDE_WIDTH_KEY)).toBeNull();
    store.getState().setSideWidth('410px');
    expect(localStorage.getItem(SIDE_WIDTH_KEY)).toBe('410px');
  });

  it('clears selection and highlight when the organization changes', async () => {
    const store = await freshStore();
    store.getState().setOrg('EQ');
    store.setState({ selected: { kind: 'member', id: 'm1' }, hotMinistryId: 'g1' });
    store.getState().setOrg('EQ');
    expect(store.getState().selected).not.toBeNull();
    store.getState().setOrg('RS');
    expect(store.getState()).toMatchObject({ selected: null, hotMinistryId: null });
  });
});
