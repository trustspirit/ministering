import type { Database } from '@/types/database.types';

type Organization = Database['public']['Enums']['organization'];
type ActiveStatus = Database['public']['Enums']['active_status'];
type Gender = Database['public']['Enums']['gender'];

export const ORG_LABEL: Record<Organization, string> = {
  EQ: '장로 정원회',
  RS: '상호부조회',
};

// `new_member` is added together with the DB enum change.
export const STATUS_LABEL: Record<ActiveStatus, string> = {
  active: '활동 회원',
  less_active: '저활동 회원',
};

export const GENDER_LABEL: Record<Gender, string> = {
  M: '남',
  F: '여',
};

export const UNIT_NAME: string = import.meta.env.VITE_UNIT_NAME ?? '';
export const APP_TITLE = '성역 임무 지명';

export const T = {
  nav: {
    eq: ORG_LABEL.EQ,
    rs: ORG_LABEL.RS,
    roster: '명부',
    settings: '설정',
  },
  header: {
    logout: '로그아웃',
    logoAlt: '예수 그리스도 후기 성도 교회',
    symbolAlt: '',
    navLabel: '주 메뉴',
    unknownRole: '알 수 없음',
  },
  role: {
    bishopric: '감독단',
    eq_president: '장로 정원회 회장단',
    rs_president: '상호부조회 회장단',
    viewer: '열람',
  } satisfies Record<Database['public']['Enums']['user_role'], string>,
} as const;
