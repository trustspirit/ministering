import { useQueryClient } from '@tanstack/react-query';
import { ministryRepository } from '@/repositories/MinistryRepository';
import { validateCompanions } from '../domain/validateCompanions';
import { validateRecipient } from '../domain/validateRecipient';
import { nextMinistryNumber } from '../domain/nextMinistryNumber';
import type { Organization, Ministry } from '../types';
import type { Member } from '@/features/members/types';
import { ministriesKey } from './useMinistries';
import { ministryDetailsKey } from './useMinistryDetails';
import { assignmentIndexKey } from './useAssignmentIndex';

export type ActionResult =
  | { ok: true }
  | { ok: false; reason: string };

export function useAssignmentActions(org: Organization) {
  const qc = useQueryClient();

  const invalidate = (ministryId?: string) => {
    qc.invalidateQueries({ queryKey: ministriesKey(org) });
    qc.invalidateQueries({ queryKey: assignmentIndexKey(org) });
    if (ministryId) qc.invalidateQueries({ queryKey: ministryDetailsKey(ministryId) });
  };

  return {
    createMinistryFromCompanions: async (members: Member[]): Promise<ActionResult> => {
      const validation = validateCompanions(members);
      if (!validation.ok) return { ok: false, reason: validation.message };

      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const numbers = await ministryRepository.getExistingNumbers(org);
          const ministry = await ministryRepository.create({
            organization: org,
            number: nextMinistryNumber(numbers),
          });
          try {
            for (const m of members) {
              await ministryRepository.addCompanion(ministry.id, m.id);
            }
            invalidate(ministry.id);
            return { ok: true };
          } catch (err) {
            // 동반자 추가 실패 → ministry 롤백 (best effort)
            try { await ministryRepository.remove(ministry.id); } catch { /* ignore */ }
            return { ok: false, reason: err instanceof Error ? err.message : '동반자 추가 실패' };
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          // UNIQUE 위반 (동시 생성) 이면 재시도
          if ((msg.includes('duplicate key') || msg.includes('unique')) && attempt < maxRetries) {
            continue;
          }
          return { ok: false, reason: attempt === maxRetries ? `재시도 실패: ${msg}` : msg };
        }
      }
      return { ok: false, reason: '알 수 없는 오류' };
    },

    addCompanionsToMinistry: async (
      ministry: Ministry,
      newMembers: Member[],
      existingCompanions: Member[],
    ): Promise<ActionResult> => {
      const combined = [...existingCompanions, ...newMembers];
      const validation = validateCompanions(combined);
      if (!validation.ok) return { ok: false, reason: validation.message };

      const applied: string[] = [];
      try {
        for (const m of newMembers) {
          await ministryRepository.addCompanion(ministry.id, m.id);
          applied.push(m.id);
        }
        invalidate(ministry.id);
        return { ok: true };
      } catch (err) {
        // 롤백: 이미 추가된 것들 제거
        for (const id of applied) {
          try { await ministryRepository.removeCompanion(ministry.id, id); } catch { /* ignore */ }
        }
        invalidate(ministry.id);
        return { ok: false, reason: err instanceof Error ? err.message : '알 수 없는 오류' };
      }
    },

    addMemberRecipientsToMinistry: async (
      ministry: Ministry,
      members: Member[],
      context: { companionMemberIds: string[]; companionHouseholdIds: string[] },
    ): Promise<ActionResult> => {
      for (const m of members) {
        const res = validateRecipient(ministry, { type: 'member', member: m }, context);
        if (!res.ok) return { ok: false, reason: `${m.full_name}: ${res.message}` };
      }

      const applied: string[] = [];
      try {
        for (const m of members) {
          await ministryRepository.addMemberRecipient(ministry.id, m.id);
          applied.push(m.id);
        }
        invalidate(ministry.id);
        return { ok: true };
      } catch (err) {
        for (const id of applied) {
          try { await ministryRepository.removeMemberRecipient(ministry.id, id); } catch { /* ignore */ }
        }
        invalidate(ministry.id);
        return { ok: false, reason: err instanceof Error ? err.message : '알 수 없는 오류' };
      }
    },

    removeCompanion: async (ministryId: string, memberId: string): Promise<ActionResult> => {
      try {
        await ministryRepository.removeCompanion(ministryId, memberId);
        invalidate(ministryId);
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: err instanceof Error ? err.message : '알 수 없는 오류' };
      }
    },

    removeMemberRecipient: async (ministryId: string, memberId: string): Promise<ActionResult> => {
      try {
        await ministryRepository.removeMemberRecipient(ministryId, memberId);
        invalidate(ministryId);
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: err instanceof Error ? err.message : '알 수 없는 오류' };
      }
    },

    addHouseholdRecipientsToMinistry: async (
      ministry: Ministry,
      households: { id: string }[],
      context: { companionMemberIds: string[]; companionHouseholdIds: string[] },
    ): Promise<ActionResult> => {
      for (const h of households) {
        const res = validateRecipient(ministry, { type: 'household', household: h }, context);
        if (!res.ok) return { ok: false, reason: res.message };
      }

      const applied: string[] = [];
      try {
        for (const h of households) {
          await ministryRepository.addHouseholdRecipient(ministry.id, h.id);
          applied.push(h.id);
        }
        invalidate(ministry.id);
        return { ok: true };
      } catch (err) {
        for (const id of applied) {
          try { await ministryRepository.removeHouseholdRecipient(ministry.id, id); } catch { /* ignore */ }
        }
        invalidate(ministry.id);
        return { ok: false, reason: err instanceof Error ? err.message : '알 수 없는 오류' };
      }
    },

    removeHouseholdRecipient: async (ministryId: string, householdId: string): Promise<ActionResult> => {
      try {
        await ministryRepository.removeHouseholdRecipient(ministryId, householdId);
        invalidate(ministryId);
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: err instanceof Error ? err.message : '알 수 없는 오류' };
      }
    },
  };
}
