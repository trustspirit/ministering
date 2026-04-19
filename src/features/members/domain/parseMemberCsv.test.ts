import { describe, expect, it } from 'vitest';
import { parseMemberCsv } from './parseMemberCsv';

describe('parseMemberCsv', () => {
  it('기본 영문 헤더 파싱', () => {
    const csv = [
      'full_name,gender,birth_date,address,active_status,personality,memo,household_name,household_role',
      '김성도,M,1990-01-15,서울시 강남구,active,active,메모,김성도 가정,husband',
    ].join('\n');

    const res = parseMemberCsv(csv);
    expect(res.valid).toHaveLength(1);
    expect(res.errors).toHaveLength(0);
    expect(res.valid[0]).toEqual({
      full_name: '김성도',
      gender: 'M',
      birth_date: '1990-01-15',
      address: '서울시 강남구',
      active_status: 'active',
      personality: 'active',
      memo: '메모',
      household_name: '김성도 가정',
      household_role: 'husband',
    });
  });

  it('한글 값 매핑 (남/여 → M/F)', () => {
    const csv = 'full_name,gender,birth_date\n이자매,여,1985-03-20';
    const res = parseMemberCsv(csv);
    expect(res.valid[0].gender).toBe('F');
  });

  it('한글 active_status 매핑 (활동/저활동)', () => {
    const csv = 'full_name,gender,birth_date,active_status\n홍길동,M,1990-01-01,저활동';
    const res = parseMemberCsv(csv);
    expect(res.valid[0].active_status).toBe('less_active');
  });

  it('한글 personality 매핑', () => {
    const csv = 'full_name,gender,birth_date,personality\nA,M,1990-01-01,적극적\nB,M,1990-01-01,보통\nC,M,1990-01-01,수동적';
    const res = parseMemberCsv(csv);
    expect(res.valid[0].personality).toBe('active');
    expect(res.valid[1].personality).toBe('moderate');
    expect(res.valid[2].personality).toBe('passive');
  });

  it('한글 household_role 매핑', () => {
    const csv = 'full_name,gender,birth_date,household_role\n가장,M,1980-01-01,남편\n아내,F,1982-01-01,아내\n자녀,M,2010-01-01,자녀';
    const res = parseMemberCsv(csv);
    expect(res.valid[0].household_role).toBe('husband');
    expect(res.valid[1].household_role).toBe('wife');
    expect(res.valid[2].household_role).toBe('child');
  });

  it('필수 필드 누락 → errors', () => {
    const csv = 'full_name,gender,birth_date\n,M,1990-01-01';
    const res = parseMemberCsv(csv);
    expect(res.valid).toHaveLength(0);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].rowIndex).toBe(1);
    expect(res.errors[0].reason).toContain('full_name');
  });

  it('알 수 없는 gender → error', () => {
    const csv = 'full_name,gender,birth_date\n이상한,Z,1990-01-01';
    const res = parseMemberCsv(csv);
    expect(res.valid).toHaveLength(0);
    expect(res.errors[0].reason).toContain('gender');
  });

  it('birth_date 포맷 체크 (YYYY-MM-DD)', () => {
    const csv = 'full_name,gender,birth_date\nA,M,1990/01/01';
    const res = parseMemberCsv(csv);
    expect(res.errors[0].reason).toContain('birth_date');
  });

  it('기본값 적용 (누락된 옵션 필드)', () => {
    const csv = 'full_name,gender,birth_date\n최소,M,1990-01-01';
    const res = parseMemberCsv(csv);
    expect(res.valid[0]).toMatchObject({
      full_name: '최소',
      gender: 'M',
      birth_date: '1990-01-01',
      active_status: 'active',
      personality: 'moderate',
      household_role: 'other',
      address: null,
      memo: null,
      household_name: null,
    });
  });

  it('여러 행 처리 + 일부만 에러', () => {
    const csv = [
      'full_name,gender,birth_date',
      '김성도,M,1990-01-01',
      ',M,1990-01-01',
      '박형제,M,1995-05-20',
    ].join('\n');

    const res = parseMemberCsv(csv);
    expect(res.valid).toHaveLength(2);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].rowIndex).toBe(2);
  });

  it('공백/빈 줄 무시', () => {
    const csv = 'full_name,gender,birth_date\n\n김성도,M,1990-01-01\n\n';
    const res = parseMemberCsv(csv);
    expect(res.valid).toHaveLength(1);
  });
});
