import { describe, expect, it, beforeEach } from 'vitest';
import { useSelectionStore } from './store';

describe('useSelectionStore', () => {
  beforeEach(() => {
    useSelectionStore.getState().clear();
  });

  it('초기 상태는 빈 Set', () => {
    expect(useSelectionStore.getState().selectedIds.size).toBe(0);
  });

  it('toggle 로 추가', () => {
    useSelectionStore.getState().toggle('m1');
    expect(useSelectionStore.getState().selectedIds.has('m1')).toBe(true);
    expect(useSelectionStore.getState().selectedIds.size).toBe(1);
  });

  it('toggle 다시 하면 제거', () => {
    useSelectionStore.getState().toggle('m1');
    useSelectionStore.getState().toggle('m1');
    expect(useSelectionStore.getState().selectedIds.size).toBe(0);
  });

  it('여러 id 개별 toggle', () => {
    useSelectionStore.getState().toggle('m1');
    useSelectionStore.getState().toggle('m2');
    useSelectionStore.getState().toggle('m3');
    expect(useSelectionStore.getState().selectedIds.size).toBe(3);
  });

  it('clear 로 전부 제거', () => {
    useSelectionStore.getState().toggle('m1');
    useSelectionStore.getState().toggle('m2');
    useSelectionStore.getState().clear();
    expect(useSelectionStore.getState().selectedIds.size).toBe(0);
  });

  it('removeAll 로 특정 id 들 제거', () => {
    useSelectionStore.getState().toggle('m1');
    useSelectionStore.getState().toggle('m2');
    useSelectionStore.getState().toggle('m3');
    useSelectionStore.getState().removeAll(['m1', 'm3']);
    const ids = useSelectionStore.getState().selectedIds;
    expect(ids.has('m1')).toBe(false);
    expect(ids.has('m2')).toBe(true);
    expect(ids.has('m3')).toBe(false);
  });

  it('setSelected 로 전체 교체', () => {
    useSelectionStore.getState().toggle('m1');
    useSelectionStore.getState().setSelected(['a', 'b', 'c']);
    const ids = useSelectionStore.getState().selectedIds;
    expect(ids.has('m1')).toBe(false);
    expect(ids.has('a')).toBe(true);
    expect(ids.size).toBe(3);
  });
});
