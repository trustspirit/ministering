import { describe, expect, it } from 'vitest';
import { exportMembersCsv } from './exportMembersCsv';
import type { Member } from '../types';

const member = (p: Partial<Member>): Member => ({
  id: 'id',
  full_name: '홍길동',
  gender: 'M',
  birth_date: '1990-01-01',
  address: null,
  lat: null,
  lng: null,
  active_status: 'active',
  personality: 'moderate',
  memo: null,
  household_id: null,
  household_role: 'other',
  is_deleted: false,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  ...p,
});

describe('exportMembersCsv', () => {
  it('빈 배열 → 헤더만', () => {
    const csv = exportMembersCsv([], {});
    expect(csv.split('\n')[0]).toContain('full_name');
    expect(csv.split('\n').filter((l) => l.trim()).length).toBe(1);
  });

  it('단일 회원 → 헤더 + 1행', () => {
    const csv = exportMembersCsv(
      [member({ full_name: '김성도', address: '서울시 강남구' })],
      {},
    );
    const lines = csv.split('\n').filter((l) => l.trim());
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('김성도');
    expect(lines[1]).toContain('서울시 강남구');
  });

  it('household_name 맵으로 가정 이름 포함', () => {
    const csv = exportMembersCsv(
      [member({ household_id: 'h1' })],
      { h1: '김성도 가정' },
    );
    expect(csv).toContain('김성도 가정');
  });

  it('household_id 없으면 빈 household_name', () => {
    const csv = exportMembersCsv(
      [member({ household_id: null })],
      {},
    );
    const fields = csv.split('\n')[1].split(',');
    expect(fields[fields.length - 2]).toBe('');
  });

  it('쉼표가 들어간 필드는 quote', () => {
    const csv = exportMembersCsv(
      [member({ address: '서울, 강남구' })],
      {},
    );
    expect(csv).toContain('"서울, 강남구"');
  });
});
