import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { BoardMinistry } from '@/features/assignment/domain/board';
import { renderWorkspace } from '@/features/assignment/ui/testUtils';
import { ShareDialog } from './ShareDialog';

const TOKEN = 'ab'.repeat(32);

function ministry(shareToken: string | null): BoardMinistry {
  return { id: 'g1', number: 1, name: null, shareToken, companionIds: [], recipientIds: [] };
}

function open(shareToken: string | null) {
  const { wrapper, value } = renderWorkspace(<ShareDialog ministry={ministry(shareToken)} open onClose={vi.fn()} />);
  render(wrapper);
  return value;
}

describe('ShareDialog', () => {
  const writeText = vi.fn(async () => {});
  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  });
  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  });

  it('without a link explains it and creates a 64-hex token', () => {
    const value = open(null);
    expect(
      screen.getByText('로그인 없이 누구나 이 링크로 볼 수 있습니다. 이름, 연락처, 가족의 나이와 성별이 표시됩니다.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '링크 복사' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '링크 만들기' }));
    expect(value.actions.setShareToken).toHaveBeenCalledWith('g1', expect.stringMatching(/^[0-9a-f]{64}$/));
  });

  it('with a link shows the address read-only and copies the full URL', async () => {
    open(TOKEN);
    const url = `${window.location.origin}/s/${TOKEN}`;
    const field = screen.getByLabelText('공개 링크 주소') as HTMLInputElement;
    expect(field.value).toBe(url);
    expect(field.readOnly).toBe(true);
    expect(screen.queryByRole('button', { name: '링크 만들기' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '링크 복사' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(url));
    expect(await screen.findByText('링크를 복사했습니다')).toBeInTheDocument();
  });

  it('regenerates after confirmation with a different token', async () => {
    const value = open(TOKEN);
    fireEvent.click(screen.getByRole('button', { name: '링크 다시 만들기' }));
    expect(value.actions.setShareToken).not.toHaveBeenCalled();
    const confirm = await screen.findByText(/이전 링크는 더 이상 열리지 않습니다/);
    const dialog = confirm.closest('dialog') ?? document.body;
    fireEvent.click(within(dialog as HTMLElement).getByRole('button', { name: '링크 다시 만들기' }));
    expect(value.actions.setShareToken).toHaveBeenCalledTimes(1);
    const [id, next] = vi.mocked(value.actions.setShareToken).mock.calls[0];
    expect(id).toBe('g1');
    expect(next).toMatch(/^[0-9a-f]{64}$/);
    expect(next).not.toBe(TOKEN);
  });

  it('disables the link after confirmation', async () => {
    const value = open(TOKEN);
    fireEvent.click(screen.getByRole('button', { name: '링크 끄기' }));
    expect(value.actions.setShareToken).not.toHaveBeenCalled();
    const confirm = await screen.findByText(/이 링크는 더 이상 열리지 않습니다/);
    const dialog = confirm.closest('dialog') ?? document.body;
    fireEvent.click(within(dialog as HTMLElement).getByRole('button', { name: '링크 끄기' }));
    expect(value.actions.setShareToken).toHaveBeenCalledWith('g1', null);
  });
});
