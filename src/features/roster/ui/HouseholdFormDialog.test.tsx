import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { household } from '@tests/testUtils';
import { HouseholdFormDialog } from './HouseholdFormDialog';

const mocks = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock('@/features/households/hooks/useHouseholdMutations', () => ({
  useUpdateHousehold: () => ({ mutateAsync: mocks.update, isPending: false }),
}));
vi.mock('@/shared/lib/addressSearch', () => ({
  searchAddresses: async () => [
    { id: '0', address: '서울 강동구 상일로 55', description: '고덕자이아파트', lat: 37.553, lng: 127.168 },
  ],
}));

const choi = household({
  id: 'h1',
  name: '최희근 가정',
  address: '서울 성동구 금호로 100',
  lat: 37.55,
  lng: 127.02,
  memo: '메모',
});

describe('HouseholdFormDialog', () => {
  beforeEach(() => mocks.update.mockReset().mockResolvedValue({}));

  it('shows the derived name in the title and has no name field', () => {
    render(<HouseholdFormDialog open household={choi} onClose={vi.fn()} />);
    expect(screen.getByText('최희근 가정 수정')).toBeInTheDocument();
    expect(screen.queryByLabelText(/가정 이름/)).toBeNull();
  });

  it('saves an address picked from the Kakao search with its coordinates', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<HouseholdFormDialog open household={choi} onClose={onClose} />);
    const field = screen.getByRole('combobox', { name: '주소' });
    await user.clear(field);
    await user.type(field, '고덕자이');
    await user.click(await screen.findByRole('option', { name: /서울 강동구 상일로 55/ }));
    await user.type(screen.getByLabelText('상세 주소'), '111동 205호');
    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mocks.update).toHaveBeenCalledWith({
      id: 'h1',
      patch: { address: '서울 강동구 상일로 55 111동 205호', lat: 37.553, lng: 127.168, memo: '메모' },
      previousAddress: '서울 성동구 금호로 100',
    });
  });

  it('keeps the stored address and coordinates when only the memo changes', async () => {
    const user = userEvent.setup();
    render(<HouseholdFormDialog open household={choi} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText('가정 메모'), ' 추가');
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    expect(mocks.update.mock.calls[0][0].patch).toEqual({
      address: '서울 성동구 금호로 100',
      lat: 37.55,
      lng: 127.02,
      memo: '메모 추가',
    });
  });
});
