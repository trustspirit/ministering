import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SharePage from './SharePage';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/shared/lib/supabase', () => ({ supabase: { rpc: mocks.rpc } }));

const TOKEN = 'a1'.repeat(32);
const INVALID = '링크가 유효하지 않습니다. 링크를 보낸 분께 다시 요청해 주세요.';

const eqShare = {
  organization: 'EQ',
  number: 2,
  name: null,
  companions: [
    { name: '정원석', phone: '010-1111-2222' },
    { name: '박민수', phone: null },
  ],
  recipients: [
    {
      type: 'household',
      name: '김도현 가정',
      members: [
        { name: '김도현', age: 41, gender: 'M', phone: '010-3333-4444' },
        { name: '이수진', age: 39, gender: 'F', phone: null },
      ],
    },
  ],
};

function open(token: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/s/${token}`]}>
        <Routes>
          <Route path="/s/:token" element={<SharePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SharePage', () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
  });

  it('shows the companionship from the RPC result', async () => {
    mocks.rpc.mockResolvedValue({ data: eqShare, error: null });
    open(TOKEN);
    expect(await screen.findByRole('heading', { name: '장로 정원회 성역 임무 지명' })).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledWith('get_ministry_share', { p_token: TOKEN });
    expect(screen.getByText('성역 동반자 2')).toBeInTheDocument();
    expect(screen.getByText('형제 성역자')).toBeInTheDocument();
    expect(screen.getByText('지명된 가정')).toBeInTheDocument();
    expect(screen.getByText('정원석')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '010-1111-2222' })).toHaveAttribute('href', 'tel:010-1111-2222');
    expect(screen.getByText('김도현 가정')).toBeInTheDocument();
    expect(screen.getByText('41세')).toBeInTheDocument();
    expect(screen.getByText('39세')).toBeInTheDocument();
    expect(screen.getByText('남')).toBeInTheDocument();
    expect(screen.getByText('여')).toBeInTheDocument();
    // a missing phone is a dash, never a link
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('uses the named title and the RS wording', async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        organization: 'RS',
        number: 1,
        name: '시내 동반자',
        companions: [{ name: '최지은', phone: '010-5555-6666' }],
        recipients: [{ type: 'member', name: '한미래', phone: '010-7777-8888' }],
      },
      error: null,
    });
    open(TOKEN);
    expect(await screen.findByRole('heading', { name: '상호부조회 성역 임무 지명' })).toBeInTheDocument();
    expect(screen.getByText('시내 동반자')).toBeInTheDocument();
    expect(screen.getByText('자매 성역자')).toBeInTheDocument();
    expect(screen.getByText('지명된 자매')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '010-7777-8888' })).toHaveAttribute('href', 'tel:010-7777-8888');
  });

  it('notes an empty recipient list', async () => {
    mocks.rpc.mockResolvedValue({ data: { ...eqShare, recipients: [] }, error: null });
    open(TOKEN);
    expect(await screen.findByText('아직 지명된 대상이 없습니다')).toBeInTheDocument();
  });

  it('shows no memo, address or app navigation', async () => {
    mocks.rpc.mockResolvedValue({
      data: { ...eqShare, memo: '비밀 메모', address: '서울시 비밀로 1' },
      error: null,
    });
    open(TOKEN);
    await screen.findByRole('heading', { name: '장로 정원회 성역 임무 지명' });
    expect(screen.queryByText(/비밀/)).toBeNull();
    for (const text of ['명부', '설정', '로그아웃']) expect(screen.queryByText(text)).toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('href')).toMatch(/^tel:/);
    }
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows only the invalid-link message when the RPC returns null', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    open(TOKEN);
    expect(await screen.findByText(INVALID)).toBeInTheDocument();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('shows the same message when the RPC fails', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    open(TOKEN);
    expect(await screen.findByText(INVALID)).toBeInTheDocument();
    expect(screen.queryByText('boom')).toBeNull();
  });

  it('does not call the RPC for a token of the wrong shape', () => {
    open('a'.repeat(31));
    expect(screen.getByText(INVALID)).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('shows a loading note first', () => {
    mocks.rpc.mockReturnValue(new Promise(() => {}));
    open(TOKEN);
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument();
  });
});
