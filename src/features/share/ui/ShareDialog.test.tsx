import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { BoardMinistry } from '@/features/assignment/domain/board';
import { renderWorkspace } from '@/features/assignment/ui/testUtils';
import { flushDialogClose } from '../../../../tests/dialogPolyfill';
import { ShareDialog } from './ShareDialog';

const mocks = vi.hoisted(() => ({ getShareToken: vi.fn() }));
vi.mock('@/repositories/MinistryRepository', () => ({
  ministryRepository: { getShareToken: mocks.getShareToken },
}));

const TOKEN = 'ab'.repeat(32);
const ministry: BoardMinistry = { id: 'g1', number: 1, name: null, companionIds: [], recipientIds: [] };

/** The mocked server: the token the RPC returns, updated by the mocked setShareToken. */
function open(initial: string | null) {
  let server = initial;
  mocks.getShareToken.mockImplementation(async () => server);
  const { wrapper, value } = renderWorkspace(<ShareDialog ministry={ministry} open onClose={vi.fn()} />);
  vi.mocked(value.actions.setShareToken).mockImplementation(async (_id, token) => {
    server = token;
    return true;
  });
  render(wrapper);
  return value;
}

describe('ShareDialog', () => {
  const writeText = vi.fn(async () => {});
  beforeEach(() => {
    writeText.mockClear();
    mocks.getShareToken.mockReset();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  });
  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  });

  it('reads the token through the RPC when opened, showing a loading note first', async () => {
    open(TOKEN);
    expect(screen.getByText('링크를 불러오는 중…')).toBeInTheDocument();
    expect(await screen.findByLabelText('공개 링크 주소')).toBeInTheDocument();
    expect(mocks.getShareToken).toHaveBeenCalledWith('g1');
  });

  it('without a link explains it and creates a 64-hex token once, even on a double click', async () => {
    const value = open(null);
    expect(
      await screen.findByText('로그인 없이 누구나 이 링크로 볼 수 있습니다. 이름, 연락처, 가족의 나이와 성별이 표시됩니다.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '링크 복사' })).toBeNull();
    const create = await screen.findByRole('button', { name: '링크 만들기' });
    await waitFor(() => expect(create).toBeEnabled());
    fireEvent.click(create);
    fireEvent.click(create);
    expect(value.actions.setShareToken).toHaveBeenCalledTimes(1);
    expect(value.actions.setShareToken).toHaveBeenCalledWith('g1', expect.stringMatching(/^[0-9a-f]{64}$/));
    // the new address appears only after it was read back
    const field = (await screen.findByLabelText('공개 링크 주소')) as HTMLInputElement;
    expect(field.value).toMatch(/\/s\/[0-9a-f]{64}$/);
  });

  it('with a link shows the address read-only and copies the full URL', async () => {
    open(TOKEN);
    const url = `${window.location.origin}/s/${TOKEN}`;
    const field = (await screen.findByLabelText('공개 링크 주소')) as HTMLInputElement;
    expect(field.value).toBe(url);
    expect(field.readOnly).toBe(true);
    expect(screen.queryByRole('button', { name: '링크 만들기' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '링크 복사' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(url));
    expect(await screen.findByText('링크를 복사했습니다')).toBeInTheDocument();
  });

  it('falls back to selecting the address when the clipboard is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    open(TOKEN);
    const field = (await screen.findByLabelText('공개 링크 주소')) as HTMLInputElement;
    const select = vi.spyOn(field, 'select');
    fireEvent.click(screen.getByRole('button', { name: '링크 복사' }));
    expect(await screen.findByText(/복사하지 못했습니다/)).toBeInTheDocument();
    expect(select).toHaveBeenCalled();
    expect(screen.queryByText('링크를 복사했습니다')).toBeNull();
  });

  it('regenerates after confirmation with a different token and shows the re-read address', async () => {
    const value = open(TOKEN);
    fireEvent.click(await screen.findByRole('button', { name: '링크 다시 만들기' }));
    expect(value.actions.setShareToken).not.toHaveBeenCalled();
    const confirm = await screen.findByText(/이전 링크는 더 이상 열리지 않습니다/);
    const dialog = (confirm.closest('dialog') ?? document.body) as HTMLElement;
    fireEvent.click(within(dialog).getByRole('button', { name: '링크 다시 만들기' }));
    expect(value.actions.setShareToken).toHaveBeenCalledTimes(1);
    const [id, next] = vi.mocked(value.actions.setShareToken).mock.calls[0];
    expect(id).toBe('g1');
    expect(next).toMatch(/^[0-9a-f]{64}$/);
    expect(next).not.toBe(TOKEN);
    await waitFor(() =>
      expect((screen.getByLabelText('공개 링크 주소') as HTMLInputElement).value).toBe(
        `${window.location.origin}/s/${next}`,
      ),
    );
  });

  describe('switching to the confirmation (single dialog)', () => {
    const openDialog = () => document.querySelector('dialog[open]') as HTMLDialogElement;
    const focused = () => document.activeElement as HTMLElement;

    async function openConfirm(which: '링크 끄기' | '링크 다시 만들기') {
      let server: string | null = TOKEN;
      mocks.getShareToken.mockImplementation(async () => server);
      const onClose = vi.fn();
      const { wrapper, value } = renderWorkspace(<ShareDialog ministry={ministry} open onClose={onClose} />);
      vi.mocked(value.actions.setShareToken).mockImplementation(async (_id, token) => {
        server = token;
        return true;
      });
      render(wrapper);
      const trigger = await screen.findByRole('button', { name: which });
      await waitFor(() => expect(trigger).toBeEnabled());
      fireEvent.click(trigger);
      await screen.findByRole('button', { name: '취소' });
      return { onClose, value };
    }

    it('does not report onClose when it switches (trust-ui fires `close` after a programmatic close)', async () => {
      const { onClose } = await openConfirm('링크 끄기');
      await act(async () => flushDialogClose());
      expect(onClose).not.toHaveBeenCalled();
      expect(openDialog()).toContainElement(screen.getByText(/이 링크는 더 이상 열리지 않습니다/));
    });

    it('moves focus to 취소 inside the dialog, and back to the opening button on 취소', async () => {
      await openConfirm('링크 다시 만들기');
      expect(openDialog()).toContainElement(focused());
      expect(focused()).toBe(screen.getByRole('button', { name: '취소' }));
      fireEvent.click(screen.getByRole('button', { name: '취소' }));
      const back = await screen.findByRole('button', { name: '링크 다시 만들기' });
      await waitFor(() => expect(focused()).toBe(back));
      expect(openDialog()).toContainElement(focused());
    });

    it('Escape in the confirmation returns to the main view without acting or closing', async () => {
      const { onClose, value } = await openConfirm('링크 끄기');
      fireEvent(openDialog(), new Event('cancel', { cancelable: true }));
      const back = await screen.findByRole('button', { name: '링크 끄기' });
      await waitFor(() => expect(focused()).toBe(back));
      await act(async () => flushDialogClose());
      expect(onClose).not.toHaveBeenCalled();
      expect(value.actions.setShareToken).not.toHaveBeenCalled();
      expect(openDialog()).toBeTruthy();
    });

    it('a backdrop click in the confirmation does the same', async () => {
      const { onClose, value } = await openConfirm('링크 다시 만들기');
      fireEvent.mouseDown(openDialog());
      fireEvent.click(openDialog());
      const back = await screen.findByRole('button', { name: '링크 다시 만들기' });
      await waitFor(() => expect(focused()).toBe(back));
      expect(onClose).not.toHaveBeenCalled();
      expect(value.actions.setShareToken).not.toHaveBeenCalled();
    });

    it('after a completed action focus goes to a control in the dialog (link field / 링크 만들기)', async () => {
      const { value } = await openConfirm('링크 다시 만들기');
      fireEvent.click(within(openDialog()).getAllByRole('button', { name: '링크 다시 만들기' })[0]);
      const field = await screen.findByLabelText('공개 링크 주소');
      await waitFor(() => expect(focused()).toBe(field));
      expect(value.actions.setShareToken).toHaveBeenCalledTimes(1);

      fireEvent.click(await screen.findByRole('button', { name: '링크 끄기' }));
      await screen.findByRole('button', { name: '취소' });
      fireEvent.click(within(openDialog()).getAllByRole('button', { name: '링크 끄기' })[0]);
      const create = await screen.findByRole('button', { name: '링크 만들기' });
      await waitFor(() => expect(focused()).toBe(create));
      expect(openDialog()).toContainElement(focused());
    });
  });

  it('disables the link after confirmation', async () => {
    const value = open(TOKEN);
    fireEvent.click(await screen.findByRole('button', { name: '링크 끄기' }));
    expect(value.actions.setShareToken).not.toHaveBeenCalled();
    const confirm = await screen.findByText(/이 링크는 더 이상 열리지 않습니다/);
    const dialog = (confirm.closest('dialog') ?? document.body) as HTMLElement;
    fireEvent.click(within(dialog).getByRole('button', { name: '링크 끄기' }));
    expect(value.actions.setShareToken).toHaveBeenCalledWith('g1', null);
    expect(await screen.findByRole('button', { name: '링크 만들기' })).toBeInTheDocument();
  });

  it('shows an error toast and no address when the token cannot be read', async () => {
    mocks.getShareToken.mockRejectedValue(new Error('42501'));
    const { wrapper, value } = renderWorkspace(<ShareDialog ministry={ministry} open onClose={vi.fn()} />);
    render(wrapper);
    expect(await screen.findByText('링크를 불러오지 못했습니다. 다시 시도해 주세요.')).toBeInTheDocument();
    expect(screen.queryByLabelText('공개 링크 주소')).toBeNull();
    expect(screen.queryByRole('button', { name: '링크 만들기' })).toBeNull();
    expect(value.actions.setShareToken).not.toHaveBeenCalled();
  });
});
