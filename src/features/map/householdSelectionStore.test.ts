import { describe, expect, it, beforeEach } from 'vitest';
import { useHouseholdSelectionStore } from './householdSelectionStore';

describe('useHouseholdSelectionStore', () => {
  beforeEach(() => {
    useHouseholdSelectionStore.getState().clear();
  });

  it('초기 상태는 빈 Set', () => {
    expect(useHouseholdSelectionStore.getState().selectedHouseholdIds.size).toBe(0);
  });

  it('toggle 로 추가/제거', () => {
    useHouseholdSelectionStore.getState().toggle('h1');
    expect(useHouseholdSelectionStore.getState().selectedHouseholdIds.has('h1')).toBe(true);
    useHouseholdSelectionStore.getState().toggle('h1');
    expect(useHouseholdSelectionStore.getState().selectedHouseholdIds.size).toBe(0);
  });

  it('여러 id', () => {
    useHouseholdSelectionStore.getState().toggle('h1');
    useHouseholdSelectionStore.getState().toggle('h2');
    expect(useHouseholdSelectionStore.getState().selectedHouseholdIds.size).toBe(2);
  });

  it('clear', () => {
    useHouseholdSelectionStore.getState().toggle('h1');
    useHouseholdSelectionStore.getState().toggle('h2');
    useHouseholdSelectionStore.getState().clear();
    expect(useHouseholdSelectionStore.getState().selectedHouseholdIds.size).toBe(0);
  });
});
