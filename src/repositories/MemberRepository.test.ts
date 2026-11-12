import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const from = vi.fn();
vi.mock('@/shared/lib/supabase', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a), from: (...a: unknown[]) => from(...a) } }));

import { memberRepository } from './MemberRepository';

describe('memberRepository.softDelete', () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
  });

  it('calls the role-checked soft_delete_member function, not a table update', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await memberRepository.softDelete('m-1');
    expect(rpc).toHaveBeenCalledWith('soft_delete_member', { p_member_id: 'm-1' });
    expect(from).not.toHaveBeenCalled();
  });

  it('throws the database error (e.g. 42501 for a viewer)', async () => {
    const error = { code: '42501', message: 'not allowed' };
    rpc.mockResolvedValue({ data: null, error });
    await expect(memberRepository.softDelete('m-1')).rejects.toBe(error);
  });
});
