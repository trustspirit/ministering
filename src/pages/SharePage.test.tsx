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
      address: '서울 마포구 성미산로 150',
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

  it('renders hostile phone values only as text and inside a tel: href', async () => {
    const evil = 'javascript:alert(1)';
    const quote = '010-1"><img src=x onerror=alert(1)>';
    mocks.rpc.mockResolvedValue({
      data: {
        ...eqShare,
        companions: [
          { name: '정원석', phone: evil },
          { name: '박민수', phone: quote },
        ],
      },
      error: null,
    });
    const { container } = open(TOKEN);
    await screen.findByRole('heading', { name: '장로 정원회 성역 임무 지명' });
    expect(screen.getByRole('link', { name: evil })).toHaveAttribute('href', `tel:${evil}`);
    expect(screen.getByRole('link', { name: quote })).toHaveAttribute('href', `tel:${quote}`);
    expect(container.querySelector('img[src="x"]')).toBeNull();
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href')).toMatch(/^tel:/);
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

  it('shows no memo or app navigation', async () => {
    mocks.rpc.mockResolvedValue({
      data: { ...eqShare, memo: '비밀 메모' },
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

  describe('addresses', () => {
    const rsShare = (address: string | null) => ({
      organization: 'RS',
      number: 1,
      name: null,
      companions: [{ name: '최지은', phone: '010-5555-6666' }],
      recipients: [{ type: 'member', name: '한미래', phone: '010-7777-8888', address }],
    });

    it('shows a household address right under the household name', async () => {
      mocks.rpc.mockResolvedValue({ data: eqShare, error: null });
      open(TOKEN);
      const address = await screen.findByText('서울 마포구 성미산로 150');
      expect(screen.getByText('김도현 가정').nextElementSibling).toBe(address);
      expect(screen.queryByRole('link', { name: /성미산로/ })).toBeNull();
    });

    it('shows a sister address below her name and phone row', async () => {
      mocks.rpc.mockResolvedValue({ data: rsShare('서울 서대문구 연희로 7'), error: null });
      open(TOKEN);
      const address = await screen.findByText('서울 서대문구 연희로 7');
      const row = screen.getByText('한미래').closest('tr');
      expect(row).not.toBeNull();
      expect(row).not.toContainElement(address);
      expect(row?.compareDocumentPosition(address)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('renders no address line, not even a dash, when the address is null', async () => {
      mocks.rpc.mockResolvedValue({
        data: { ...eqShare, recipients: [{ ...eqShare.recipients[0], address: null }] },
        error: null,
      });
      const { container } = open(TOKEN);
      await screen.findByText('김도현 가정');
      expect(container.querySelector('.sp-address')).toBeNull();
      // only the two missing phones (박민수, 이수진) are dashes; no dash stands in for the address
      expect(screen.getAllByText('—')).toHaveLength(2);

      mocks.rpc.mockResolvedValue({ data: rsShare(null), error: null });
      const second = open(TOKEN);
      await screen.findAllByText('한미래');
      expect(second.container.querySelector('.sp-address')).toBeNull();
    });

    it('shows no address for companions', async () => {
      mocks.rpc.mockResolvedValue({
        data: {
          ...rsShare('서울 서대문구 연희로 7'),
          companions: [{ name: '최지은', phone: '010-5555-6666', address: '서울 비밀동 9' }],
        },
        error: null,
      });
      open(TOKEN);
      await screen.findByText('한미래');
      expect(screen.queryByText('서울 비밀동 9')).toBeNull();
      expect(screen.getAllByText(/서울/)).toHaveLength(1);
    });

    it('renders hostile address text only as text', async () => {
      const evil = `<script>alert("x")</script> '"><img src=x onerror=alert(1)>`;
      mocks.rpc.mockResolvedValue({
        data: { ...eqShare, recipients: [{ ...eqShare.recipients[0], address: evil }] },
        error: null,
      });
      const { container } = open(TOKEN);
      expect(await screen.findByText(evil)).toBeInTheDocument();
      expect(container.querySelector('script')).toBeNull();
      expect(container.querySelector('img[src="x"]')).toBeNull();
    });
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
