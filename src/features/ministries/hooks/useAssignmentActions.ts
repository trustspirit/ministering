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

      try {
        const numbers = await ministryRepository.getExistingNumbers(org);
        const ministry = await ministryRepository.create({
          organization: org,
          number: nextMinistryNumber(numbers),
        });
        for (const m of members) {
          await ministryRepository.addCompanion(ministry.id, m.id);
        }
        invalidate(ministry.id);
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: err instanceof Error ? err.message : '알 수 없는 오류' };
      }
    },

    addCompanionsToMinistry: async (
      ministry: Ministry,
      newMembers: Member[],
      existingCompanions: Member[],
    ): Promise<ActionResult> => {
      const combined = [...existingCompanions, ...newMembers];
      const validation = validateCompanions(combined);
      if (!validation.ok) return { ok: false, reason: validation.message };

      try {
        for (const m of newMembers) {
          await ministryRepository.addCompanion(ministry.id, m.id);
        }
        invalidate(ministry.id);
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: err instanceof Error ? err.message : '알 수 없는 오류' };
      }
    },

    addMemberRecipientsToMinistry: async (
      ministry: Ministry,
      members: Member[],
      context: { companionMemberIds: string[]; companionHouseholdIds: string[] },
    ): Promise<ActionResult> => {
      for (const m of members) {
        const res = validateRecipient(
          ministry,
          { type: 'member', member: m },
          context,
        );
        if (!res.ok) return { ok: false, reason: `${m.full_name}: ${res.message}` };
      }

      try {
        for (const m of members) {
          await ministryRepository.addMemberRecipient(ministry.id, m.id);
        }
        invalidate(ministry.id);
        return { ok: true };
      } catch (err) {
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
  };
}
