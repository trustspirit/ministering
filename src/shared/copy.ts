import type { Database } from '@/types/database.types';

type Organization = Database['public']['Enums']['organization'];
type ActiveStatus = Database['public']['Enums']['active_status'];
type Gender = Database['public']['Enums']['gender'];

export const ORG_LABEL: Record<Organization, string> = {
  EQ: '장로 정원회',
  RS: '상호부조회',
};

export const STATUS_LABEL: Record<ActiveStatus, string> = {
  active: '활동 회원',
  less_active: '저활동 회원',
  new_member: '새로운 회원',
};

export const GENDER_LABEL: Record<Gender, string> = {
  M: '남',
  F: '여',
};

export const PERSONALITY_LABEL: Record<Database['public']['Enums']['personality'], string> = {
  active: '적극적',
  moderate: '보통',
  passive: '수동적',
};

export const UNIT_NAME: string = import.meta.env.VITE_UNIT_NAME ?? '';
export const APP_TITLE = '성역 임무 지명';

export const T = {
  saveFailed: '저장하지 못했습니다. 다른 사람이 먼저 바꿨을 수 있습니다.',
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
  ministry: {
    defaultLabel: (number: number) => `성역 동반자 ${number}`,
  },
  assign: {
    loading: '불러오는 중…',
    loadFailed: '지명 정보를 불러오지 못했습니다.',
    unit: { EQ: '가정 단위', RS: '개인 단위' } satisfies Record<Organization, string>,
    unitDescription: {
      EQ: '형제 성역자가 각 회원 가정에 지명됩니다',
      RS: '자매 성역자가 각 성인 자매에게 지명됩니다',
    } satisfies Record<Organization, string>,
    /** "가정" / "자매": the kind of recipient on each board */
    recipientNoun: { EQ: '가정', RS: '자매' } satisfies Record<Organization, string>,
    /** "형제" / "자매": the kind of companion on each board */
    companionNoun: { EQ: '형제', RS: '자매' } satisfies Record<Organization, string>,
    ministryCount: '성역 동반자',
    assignedSuffix: '지명',
    warnShortMinistries: '성역자가 부족한 동반자',
    warnUnassignedRecipients: (noun: string) => `성역자가 지명되지 않은 ${noun}`,
    warnUnassignedCandidates: (noun: string) => `동반자가 없는 ${noun}`,
    legendLabel: '회원 상태',
    sizeLabel: '지도 크기',
    sizePresets: [
      { value: '32vw', label: '동반자 넓게' },
      { value: '45vw', label: '기본' },
      { value: '60vw', label: '지도 넓게' },
    ],
    search: '이름 검색',
    poolLabel: '지명 대기 목록',
    headcount: (n: number) => `${n}명`,
    familyLabel: '가족',
    zoneCompanions: (noun: string) => `${noun} 성역자`,
    zoneRecipients: (noun: string) => `지명된 ${noun}`,
    emptyCompanions: (noun: string) => `${noun}를 여기로`,
    emptyRecipients: { EQ: '가정을 여기로', RS: '자매를 여기로' } satisfies Record<Organization, string>,
    warnTooFewCompanions: '성역자가 2명 이상 필요합니다',
    warnNoRecipients: { EQ: '지명된 가정이 없습니다', RS: '지명된 자매가 없습니다' } satisfies Record<Organization, string>,
    share: '공유',
    shareTitle: '이 성역 동반자의 공개 공유 링크',
    menu: '이름 바꾸기 · 삭제',
    rename: '이름 바꾸기',
    renameLabel: '성역 동반자 이름',
    delete: '성역 동반자 삭제',
    deleteConfirm: (label: string) =>
      `${label}을(를) 삭제할까요? 이 동반자의 성역자와 지명된 대상이 모두 지명 해제됩니다.`,
    cancel: '취소',
    confirmDelete: '삭제',
    unassign: '지명 해제',
    newMinistry: '＋ 새 성역 동반자',
    newMinistryHint: '여기에 끌어다 놓기',
    resize: '끌어서 지도 크기 조절',
  },
  detail: {
    label: '배경 정보',
    empty: '사람이나 가정을 클릭하면 여기에 배경 정보가 열립니다.',
    household: '가정',
    brother: '형제',
    sister: '자매',
    none: '—',
    ministryHeading: '성역',
    householdHeading: '가정',
    noHousehold: '가정 미지정',
    noAssignment: '임무 지명 없음',
    noRecipientMinistry: '지명된 성역자 없음',
    assignedBrothers: (names: string) => `지명된 형제 성역자: ${names}`,
    servesIn: (org: string, label: string) => `${org} ${label}에서 봉사`,
    assignedSisterMinistry: (names: string, label: string) => `지명된 자매 성역자: ${names} (${label})`,
    householdBrotherMinistry: (names: string, label: string) => `가정에 지명된 형제 성역자: ${names} (${label})`,
    noNames: '없음',
    familyHead: ['이름', '나이', '성별', '상태', '연락처'] as const,
    ageUnit: (n: number) => `${n}세`,
    personalMemo: '개인 메모',
    householdMemo: '가정 메모',
    memoOf: (name: string) => `${name} 메모`,
    memoEmpty: '아직 메모가 없습니다',
    memoEdit: '메모 편집',
    memoSave: '저장',
    memoCancel: '취소',
    memoSaveFailed: '메모를 저장하지 못했습니다. 다시 시도해 주세요.',
  },
  map: {
    label: '지도',
    keyLabel: '지도 범례',
    loading: '지도를 불러오는 중…',
    loadFailed: '지도를 불러오지 못했습니다. 목록과 성역 동반자 카드는 그대로 쓸 수 있습니다.',
    noCoords: '주소 좌표가 있는 대상이 없습니다',
    keyHousehold: '가정',
    keyMember: { EQ: '장로 정원회 회원', RS: '상호부조회 회원' } satisfies Record<Organization, string>,
    keyAssigned: '지명됨 (숫자 = 성역 동반자 번호)',
    keyRecipientBadge: '작은 숫자 = 지명된 성역 동반자',
    /** Stripped from household names on pin labels ("노진수 가정" → "노진수"). */
    householdSuffix: ' 가정',
    pinCompanion: (n: number) => `성역 동반자 ${n}의 성역자`,
    pinRecipient: (n: number) => `성역 동반자 ${n}에게 지명됨`,
    pinNewMember: '새로운 회원',
    pinLessActive: '저활동 회원',
  },
  drop: {
    notFound: '대상을 찾을 수 없습니다',
    needZoneRs: '자매 성역자 칸이나 지명된 자매 칸에 놓아 주세요',
    eqCompanionOnly: '장로 정원회 회원만 성역자가 될 수 있습니다',
    rsCompanionOnly: '상호부조회 회원만 성역자가 될 수 있습니다',
    rsRecipientOnly: '성인 자매에게만 지명할 수 있습니다',
    eqHouseholdUnit: '장로 정원회는 가정 단위로 지명합니다',
    tooManyCompanions: '성역자는 최대 4명입니다',
    selfHousehold: '성역자 자신의 가정에는 지명할 수 없습니다',
    selfPerson: '자기 자신에게 지명될 수 없습니다',
  },
  role: {
    bishopric: '감독단',
    eq_president: '장로 정원회 회장단',
    rs_president: '상호부조회 회장단',
    viewer: '열람',
  } satisfies Record<Database['public']['Enums']['user_role'], string>,
} as const;
