import { useMutation, useQueryClient } from '@tanstack/react-query';
import pThrottle from 'p-throttle';
import { memberRepository } from '@/repositories/MemberRepository';
import { householdRepository } from '@/repositories/HouseholdRepository';
import { geocodeAddress } from '@/shared/lib/geocode';
import { extractHouseholdPlan, householdKey } from '../domain/mergeHouseholds';
import type { ParsedMemberRow } from '../domain/parseMemberCsv';
import { MEMBERS_QUERY_KEY } from './useMembers';

export interface ImportProgress {
  total: number;
  completed: number;
  phase: 'households' | 'members' | 'done';
}

export interface ImportReport {
  created: number;
  updated: number;
  failed: Array<{ row: ParsedMemberRow; reason: string }>;
  householdsCreated: number;
  householdsFailed: Array<{ name: string; reason: string }>;
}

export interface ImportMembersOptions {
  rows: ParsedMemberRow[];
  onProgress?: (p: ImportProgress) => void;
}

export function useImportMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rows,
      onProgress,
    }: ImportMembersOptions): Promise<ImportReport> => {
      const report: ImportReport = {
        created: 0,
        updated: 0,
        failed: [],
        householdsCreated: 0,
        householdsFailed: [],
      };

      const existingHouseholds = await householdRepository.list();
      const plan = extractHouseholdPlan(rows, existingHouseholds);
      onProgress?.({
        total: plan.toCreate.length + rows.length,
        completed: 0,
        phase: 'households',
      });

      for (let i = 0; i < plan.toCreate.length; i++) {
        const h = plan.toCreate[i];
        try {
          const geo = await geocodeAddress(h.address);
          // The household's name is derived from its members; h.name is only the CSV grouping key.
          const created = await householdRepository.create({
            address: h.address,
            lat: geo.lat,
            lng: geo.lng,
          });
          plan.existingNameToId[h.name] = created.id;
          report.householdsCreated++;
        } catch (err) {
          report.householdsFailed.push({
            name: h.name,
            reason: err instanceof Error ? err.message : String(err),
          });
        }
        onProgress?.({ total: plan.toCreate.length + rows.length, completed: i + 1, phase: 'households' });
      }

      const throttle = pThrottle({ limit: 3, interval: 1000 });
      const processRow = throttle(async (row: ParsedMemberRow) => {
        try {
          const existing = await memberRepository.findByNameAndBirthDate(
            row.full_name,
            row.birth_date,
          );
          const key = householdKey(row);
          const householdId = key ? (plan.existingNameToId[key] ?? null) : null;

          const payload = {
            full_name: row.full_name,
            gender: row.gender,
            birth_date: row.birth_date,
            ...(row.phone === undefined ? {} : { phone: row.phone }),
            active_status: row.active_status,
            personality: row.personality,
            memo: row.memo,
            household_id: householdId,
            household_role: row.household_role,
          };

          if (existing) {
            await memberRepository.update(existing.id, payload);
            report.updated++;
          } else {
            await memberRepository.create(payload);
            report.created++;
          }
        } catch (err) {
          report.failed.push({
            row,
            reason: err instanceof Error ? err.message : String(err),
          });
        }
      });

      let completed = plan.toCreate.length;
      const totalSteps = plan.toCreate.length + rows.length;
      await Promise.all(
        rows.map(async (row) => {
          await processRow(row);
          completed++;
          onProgress?.({ total: totalSteps, completed, phase: 'members' });
        }),
      );

      onProgress?.({ total: totalSteps, completed: totalSteps, phase: 'done' });
      return report;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MEMBERS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['households'] });
    },
  });
}
