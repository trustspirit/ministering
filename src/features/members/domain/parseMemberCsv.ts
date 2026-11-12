import Papa from 'papaparse';
import type {
  ActiveStatus,
  Gender,
  HouseholdRole,
  Personality,
} from '@/features/members/types';

export interface ParsedMemberRow {
  full_name: string;
  gender: Gender;
  birth_date: string;
  address: string | null;
  /** undefined = the CSV had no phone column, so an import must leave the stored phone alone. */
  phone?: string | null;
  active_status: ActiveStatus;
  personality: Personality;
  memo: string | null;
  household_name: string | null;
  household_role: HouseholdRole;
}

export interface ParseError {
  rowIndex: number;
  reason: string;
  raw: Record<string, string>;
}

export interface ParseResult {
  valid: ParsedMemberRow[];
  errors: ParseError[];
}

const GENDER_MAP: Record<string, Gender> = {
  M: 'M',
  F: 'F',
  '남': 'M',
  '여': 'F',
  '남자': 'M',
  '여자': 'F',
};

const ACTIVE_MAP: Record<string, ActiveStatus> = {
  active: 'active',
  less_active: 'less_active',
  new_member: 'new_member',
  '활동': 'active',
  '활동 회원': 'active',
  '저활동': 'less_active',
  '저활동 회원': 'less_active',
  '새로운 회원': 'new_member',
  '신회원': 'new_member',
};

const PERSONALITY_MAP: Record<string, Personality> = {
  active: 'active',
  moderate: 'moderate',
  passive: 'passive',
  '적극적': 'active',
  '보통': 'moderate',
  '수동적': 'passive',
};

const HOUSEHOLD_ROLE_MAP: Record<string, HouseholdRole> = {
  husband: 'husband',
  wife: 'wife',
  child: 'child',
  other: 'other',
  '남편': 'husband',
  '아내': 'wife',
  '자녀': 'child',
  '기타': 'other',
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function mapValue<T extends string>(
  raw: string | undefined,
  map: Record<string, T>,
  fieldName: string,
  defaultValue?: T,
): { ok: true; value: T } | { ok: false; reason: string } {
  if (raw === undefined || raw === '') {
    if (defaultValue !== undefined) return { ok: true, value: defaultValue };
    return { ok: false, reason: `${fieldName} is required` };
  }
  const v = map[raw.trim()];
  if (!v) return { ok: false, reason: `unknown ${fieldName}: "${raw}"` };
  return { ok: true, value: v };
}

function parseRow(
  raw: Record<string, string>,
  rowIndex: number,
): { ok: true; row: ParsedMemberRow } | { ok: false; error: ParseError } {
  const fullName = raw.full_name?.trim();
  if (!fullName) {
    return {
      ok: false,
      error: { rowIndex, reason: 'full_name is required', raw },
    };
  }

  const gender = mapValue(raw.gender?.trim(), GENDER_MAP, 'gender');
  if (!gender.ok) return { ok: false, error: { rowIndex, reason: gender.reason, raw } };

  const birthDate = raw.birth_date?.trim();
  if (!birthDate || !DATE_RE.test(birthDate)) {
    return {
      ok: false,
      error: { rowIndex, reason: 'birth_date must be YYYY-MM-DD', raw },
    };
  }

  const active = mapValue(raw.active_status?.trim(), ACTIVE_MAP, 'active_status', 'active');
  if (!active.ok) return { ok: false, error: { rowIndex, reason: active.reason, raw } };

  const personality = mapValue(
    raw.personality?.trim(),
    PERSONALITY_MAP,
    'personality',
    'moderate',
  );
  if (!personality.ok)
    return { ok: false, error: { rowIndex, reason: personality.reason, raw } };

  const role = mapValue(
    raw.household_role?.trim(),
    HOUSEHOLD_ROLE_MAP,
    'household_role',
    'other',
  );
  if (!role.ok) return { ok: false, error: { rowIndex, reason: role.reason, raw } };

  const phoneRaw = raw['연락처'] ?? raw.phone;

  return {
    ok: true,
    row: {
      full_name: fullName,
      gender: gender.value,
      birth_date: birthDate,
      address: raw.address?.trim() || null,
      ...(phoneRaw === undefined ? {} : { phone: phoneRaw.trim() || null }),
      active_status: active.value,
      personality: personality.value,
      memo: raw.memo?.trim() || null,
      household_name: raw.household_name?.trim() || null,
      household_role: role.value,
    },
  };
}

export function parseMemberCsv(csv: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const valid: ParsedMemberRow[] = [];
  const errors: ParseError[] = [];

  parsed.data.forEach((row, i) => {
    const rowIndex = i + 1;
    const result = parseRow(row, rowIndex);
    if (result.ok) valid.push(result.row);
    else errors.push(result.error);
  });

  return { valid, errors };
}
