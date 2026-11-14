import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AddressHit } from '@/shared/lib/addressSearch';
import { AddressField, type AddressValue } from './AddressField';

const hit: AddressHit = {
  id: '0',
  address: '서울 강동구 상일로 55',
  description: '고덕자이아파트',
  lat: 37.5533,
  lng: 127.1687,
};

function setup(value: AddressValue = { address: null, lat: null, lng: null }) {
  const onChange = vi.fn();
  const search = vi.fn(async () => [hit]);
  render(<AddressField label="가정 주소" value={value} onChange={onChange} search={search} />);
  return { onChange, search };
}

describe('AddressField', () => {
  it('saves the picked Kakao address with its coordinates', async () => {
    const user = userEvent.setup();
    const { onChange, search } = setup();
    await user.type(screen.getByRole('combobox', { name: '가정 주소' }), '고덕자이');
    await user.click(await screen.findByRole('option', { name: /서울 강동구 상일로 55/ }));
    expect(search).toHaveBeenCalledWith('고덕자이');
    expect(onChange).toHaveBeenLastCalledWith({ address: '서울 강동구 상일로 55', lat: 37.5533, lng: 127.1687 });
  });

  it('appends the detail (동·호수) to the picked address, keeping its coordinates', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();
    await user.type(screen.getByRole('combobox', { name: '가정 주소' }), '상일로');
    await user.click(await screen.findByRole('option', { name: /서울 강동구 상일로 55/ }));
    await user.type(screen.getByLabelText('상세 주소'), '111동 205호');
    expect(onChange).toHaveBeenLastCalledWith({
      address: '서울 강동구 상일로 55 111동 205호',
      lat: 37.5533,
      lng: 127.1687,
    });
  });

  it('shows the current address and reports nothing until the user changes it', () => {
    const { onChange } = setup({ address: '서울 송파구 위례성대로 22', lat: 37.5, lng: 127.1 });
    expect(screen.getByRole('combobox', { name: '가정 주소' })).toHaveValue('서울 송파구 위례성대로 22');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clearing removes the address and its coordinates', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ address: '서울 송파구 위례성대로 22', lat: 37.5, lng: 127.1 });
    await user.click(screen.getByRole('button', { name: '주소 지우기' }));
    expect(onChange).toHaveBeenLastCalledWith({ address: null, lat: null, lng: null });
  });

  it('typed text that was not picked from the results is not saved', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();
    await user.type(screen.getByRole('combobox', { name: '가정 주소' }), '아무렇게나 쓴 주소');
    await user.tab();
    await waitFor(() => expect(onChange).not.toHaveBeenCalled());
  });
});
