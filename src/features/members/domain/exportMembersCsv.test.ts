import { describe, expect, it } from 'vitest';
import Papa from 'papaparse';
import { exportMembersCsv } from './exportMembersCsv';
import { parseMemberCsv } from './parseMemberCsv';
import type { Member } from '../types';

const member = (p: Partial<Member>): Member => ({
  id: 'id',
  full_name: '홍길동',
  gender: 'M',
  birth_date: '1990-01-01',
  active_status: 'active',
  personality: 'moderate',
  phone: null,
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

  it("단일 회원 → 헤더 + 1행, 주소는 그 가정의 주소", () => {
    const csv = exportMembersCsv(
      [member({ full_name: '김성도', household_id: 'h1' })],
      { h1: { name: '김성도 가정', address: '서울시 강남구' } },
    );
    const lines = csv.split('\n').filter((l) => l.trim());
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('김성도');
    expect(lines[1]).toContain('서울시 강남구');
  });

  it('household_name 맵으로 가정 이름 포함', () => {
    const csv = exportMembersCsv(
      [member({ household_id: 'h1' })],
      { h1: { name: '김성도 가정', address: null } },
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

  it('머리글에 연락처, 상태는 한글 라벨, 연락처 값 포함', () => {
    const csv = exportMembersCsv(
      [member({ active_status: 'new_member', phone: '010-1111-2222' })],
      {},
    );
    const [head, row] = csv.split('\n');
    expect(head.split(',')).toContain('연락처');
    expect(row).toContain('새로운 회원');
    expect(row).toContain('010-1111-2222');
  });

  it('내보낸 CSV를 다시 읽으면 같은 값이 된다', () => {
    const csv = exportMembersCsv(
      [member({ full_name: '새신자', active_status: 'new_member', phone: '010-1111-2222', household_id: 'h1', household_role: 'wife', gender: 'F' })],
      { h1: { name: '새 가정', address: null } },
    );
    const res = parseMemberCsv(csv);
    expect(res.errors).toEqual([]);
    expect(res.valid[0]).toMatchObject({
      full_name: '새신자',
      gender: 'F',
      active_status: 'new_member',
      phone: '010-1111-2222',
      household_name: '새 가정',
      household_role: 'wife',
    });
  });

  it('neutralizes spreadsheet formulas, also in multi-line cells', () => {
    const csv = exportMembersCsv(
      [
        member({
          full_name: '@관리자',
          memo: '=HYPERLINK("http://x","y")\n둘째 줄',
          phone: '+82-10-1234-5678',
          household_id: 'h1',
        }),
      ],
      { h1: { name: '=가정', address: '-1 거리' } },
    );
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true });
    const cells = Object.values(parsed.data[0]);
    expect(cells.some((c) => /^[=+\-@\t\r]/.test(c))).toBe(false);
    expect(parsed.data[0]['memo']).toBe('\'=HYPERLINK("http://x","y")\n둘째 줄');
  });

  it.each([
    "'=x",
    "''=x",
    '=x',
    '+82-10-1234-5678',
    "O'Neil",
    "'plain",
    '=a\nb',
  ])('round-trips %j without leaving a formula character first', (value) => {
    const csv = exportMembersCsv([member({ full_name: 'N', memo: value, phone: value })], {});
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true });
    expect(/^[=+\-@\t\r]/.test(parsed.data[0]['memo'])).toBe(false);
    expect(/^[=+\-@\t\r]/.test(parsed.data[0]['연락처'])).toBe(false);
    const res = parseMemberCsv(csv);
    expect(res.errors).toEqual([]);
    expect(res.valid[0].memo).toBe(value);
    expect(res.valid[0].phone).toBe(value);
  });

  it('쉼표가 들어간 필드는 quote', () => {
    const csv = exportMembersCsv(
      [member({ household_id: 'h1' })],
      { h1: { name: '가정', address: '서울, 강남구' } },
    );
    expect(csv).toContain('"서울, 강남구"');
  });
});
