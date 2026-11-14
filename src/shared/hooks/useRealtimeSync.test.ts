import { describe, expect, it } from 'vitest';
import { queryKeysToRefresh } from './useRealtimeSync';

describe('queryKeysToRefresh', () => {
  it('refreshes the roster as well when an assignment row is deleted (member soft delete is invisible to others)', () => {
    for (const table of ['ministry_companions', 'ministry_member_recipients', 'ministry_household_recipients'] as const) {
      expect(queryKeysToRefresh(table, 'DELETE')).toEqual([['assignment-board'], ['members']]);
    }
  });

  it('leaves the roster alone for assignment inserts and updates', () => {
    expect(queryKeysToRefresh('ministry_companions', 'INSERT')).toEqual([['assignment-board']]);
    expect(queryKeysToRefresh('ministry_member_recipients', 'UPDATE')).toEqual([['assignment-board']]);
    expect(queryKeysToRefresh('ministry_household_recipients')).toEqual([['assignment-board']]);
  });

  it('keeps the existing mapping for the other tables', () => {
    expect(queryKeysToRefresh('members', 'UPDATE')).toEqual([['members'], ['assignment-board'], ['households']]);
    expect(queryKeysToRefresh('households', 'DELETE')).toEqual([['households']]);
    expect(queryKeysToRefresh('ministries', 'UPDATE')).toEqual([['assignment-board']]);
  });

  it('refreshes the board when the presidency changes', () => {
    expect(queryKeysToRefresh('presidency_members', 'DELETE')).toEqual([['assignment-board']]);
  });
});
