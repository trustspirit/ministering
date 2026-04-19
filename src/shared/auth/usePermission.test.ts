import { describe, expect, it } from 'vitest';
import { computePermissions } from './usePermission';

describe('computePermissions', () => {
  it('viewer는 읽기만 가능', () => {
    const p = computePermissions('viewer');
    expect(p.canEditRS).toBe(false);
    expect(p.canEditEQ).toBe(false);
    expect(p.canEditMembers).toBe(false);
    expect(p.canManageUsers).toBe(false);
  });

  it('rs_president는 RS와 회원 편집, EQ/사용자 관리 불가', () => {
    const p = computePermissions('rs_president');
    expect(p.canEditRS).toBe(true);
    expect(p.canEditEQ).toBe(false);
    expect(p.canEditMembers).toBe(true);
    expect(p.canManageUsers).toBe(false);
  });

  it('eq_president는 EQ와 회원 편집, RS/사용자 관리 불가', () => {
    const p = computePermissions('eq_president');
    expect(p.canEditRS).toBe(false);
    expect(p.canEditEQ).toBe(true);
    expect(p.canEditMembers).toBe(true);
    expect(p.canManageUsers).toBe(false);
  });

  it('bishopric은 모두 가능', () => {
    const p = computePermissions('bishopric');
    expect(p.canEditRS).toBe(true);
    expect(p.canEditEQ).toBe(true);
    expect(p.canEditMembers).toBe(true);
    expect(p.canManageUsers).toBe(true);
  });

  it('null(비로그인)은 모두 불가', () => {
    const p = computePermissions(null);
    expect(p.canEditRS).toBe(false);
    expect(p.canEditEQ).toBe(false);
    expect(p.canEditMembers).toBe(false);
    expect(p.canManageUsers).toBe(false);
  });
});
