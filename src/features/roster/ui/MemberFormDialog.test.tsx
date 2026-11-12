import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from 'trust-ui-react';
import { household, member } from '@/features/assignment/ui/testUtils';
import { MemberFormDialog } from './MemberFormDialog';

const mocks = vi.hoisted(() => ({
  order: [] as string[],
  createHousehold: vi.fn(),
  createMember: vi.fn(),
  updateMember: vi.fn(),
  deleteMember: vi.fn(),
  removeHousehold: vi.fn(async () => {}),
}));

// The calendar popover is slow to drive; a plain date input stands in for trust-ui's DatePicker.
vi.mock('trust-ui-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('trust-ui-react')>();
  return {
    ...actual,
    DatePicker: ({ label, value, onChange, errorMessage }: { label?: string; value?: Date | null; onChange?: (d: Date | null) => void; errorMessage?: string }) => (
      <>
      <input
        aria-label={label}
        type="date"
        value={value ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}` : ''}
        onChange={(e) => {
          const [y, m, d] = e.target.value.split('-').map(Number);
          onChange?.(e.target.value ? new Date(y, m - 1, d) : null);
        }}
      />
      {errorMessage && <p role="alert">{errorMessage}</p>}
      </>
    ),
  };
});
vi.mock('@/features/households/hooks/useHouseholdMutations', () => ({
  useCreateHousehold: () => ({ mutateAsync: mocks.createHousehold, isPending: false }),
}));
vi.mock('@/features/members/hooks/useMemberMutations', () => ({
  useCreateMember: () => ({ mutateAsync: mocks.createMember, isPending: false }),
  useUpdateMember: () => ({ mutateAsync: mocks.updateMember, isPending: false }),
  useDeleteMember: () => ({ mutateAsync: mocks.deleteMember, isPending: false }),
}));
vi.mock('@/repositories/HouseholdRepository', () => ({
  householdRepository: { remove: mocks.removeHousehold },
}));

const hans = household({ id: 'h1', name: '한상철 가정' });

function renderDialog(props: Partial<Parameters<typeof MemberFormDialog>[0]> = {}) {
  const onClose = vi.fn();
  const qc = new QueryClient();
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemberFormDialog open member={null} households={[hans]} onClose={onClose} {...props} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { onClose, invalidate };
}

/** trust-ui's Select does not link its label to the combobox, so find it through the label text. */
function selectOf(label: string): HTMLElement {
  const field = screen.getByText(label, { selector: 'label' }).parentElement!;
  return within(field).getByRole('combobox');
}

async function choose(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
  await user.click(selectOf(label));
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('MemberFormDialog', () => {
  beforeEach(() => {
    mocks.order.length = 0;
    mocks.createHousehold.mockReset().mockImplementation(async () => {
      mocks.order.push('household');
      return { id: 'new-h' };
    });
    mocks.createMember.mockReset().mockImplementation(async () => {
      mocks.order.push('member');
      return {};
    });
    mocks.updateMember.mockReset().mockResolvedValue({});
    mocks.deleteMember.mockReset().mockResolvedValue(undefined);
    mocks.removeHousehold.mockClear();
  });

  it('requires name, gender and birth date and shows the copy messages', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('이름을 입력해 주세요')).toBeInTheDocument();
    expect(screen.getByText('성별을 선택해 주세요')).toBeInTheDocument();
    expect(screen.getByText('생년월일을 입력해 주세요')).toBeInTheDocument();
    expect(mocks.createMember).not.toHaveBeenCalled();
  });

  it('"새 가정 만들기" creates the household first, then saves the person linked to it', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog({ member: null });
    await user.type(screen.getByLabelText(/이름/), '김새롬');
    await choose(user, '성별', '여');
    await user.type(screen.getByPlaceholderText('서울시 강남구 …'), '서울 중구 세종대로 110');
    await user.type(screen.getByLabelText('연락처'), '010-5555-6666');
    fireEvent.change(screen.getByLabelText('생년월일'), { target: { value: '1990-05-06' } });
    await choose(user, '소속 가정', '새 가정 만들기');
    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mocks.order).toEqual(['household', 'member']);
    expect(mocks.createHousehold).toHaveBeenCalledWith({ name: '김새롬 가정', address: '서울 중구 세종대로 110' });
    expect(mocks.createMember).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: '김새롬',
        gender: 'F',
        birth_date: '1990-05-06',
        phone: '010-5555-6666',
        household_id: 'new-h',
      }),
    );
  });

  it('removes the just-created household when saving the person fails', async () => {
    const user = userEvent.setup();
    mocks.createMember.mockRejectedValue(new Error('boom'));
    const { onClose, invalidate } = renderDialog({ member: null });
    await user.type(screen.getByLabelText(/이름/), '김새롬');
    await choose(user, '성별', '여');
    fireEvent.change(screen.getByLabelText('생년월일'), { target: { value: '1990-05-06' } });
    await choose(user, '소속 가정', '새 가정 만들기');
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('저장하지 못했습니다');
    expect(mocks.removeHousehold).toHaveBeenCalledWith('new-h');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['households'] });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText(/가정은 만들어졌지만/)).toBeNull();
  });

  it('tells the user when the just-created household could not be removed either', async () => {
    const user = userEvent.setup();
    mocks.createMember.mockRejectedValue(new Error('boom'));
    mocks.removeHousehold.mockRejectedValueOnce(new Error('rls'));
    const { invalidate } = renderDialog({ member: null });
    await user.type(screen.getByLabelText(/이름/), '김새롬');
    await choose(user, '성별', '여');
    fireEvent.change(screen.getByLabelText('생년월일'), { target: { value: '1990-05-06' } });
    await choose(user, '소속 가정', '새 가정 만들기');
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(
      await screen.findByText('가정은 만들어졌지만 사람을 저장하지 못했습니다. 명부에서 가정을 확인해 주세요.'),
    ).toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['households'] });
  });

  it('editing defaults to the current household and offers a confirmed delete', async () => {
    const user = userEvent.setup();
    const m = member({ id: 'p', full_name: '박영수', household_id: 'h1', birth_date: '1980-02-03' });
    const { onClose } = renderDialog({ member: m });
    expect(selectOf('소속 가정')).toHaveTextContent('한상철 가정');
    await user.click(screen.getByRole('button', { name: '삭제' }));
    expect(mocks.deleteMember).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: '삭제' }));
    await waitFor(() => expect(mocks.deleteMember).toHaveBeenCalledWith('p'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows no delete button when registering', () => {
    renderDialog();
    expect(screen.queryByRole('button', { name: '삭제' })).toBeNull();
  });
});
