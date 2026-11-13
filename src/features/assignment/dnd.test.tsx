import { beforeEach, describe, expect, it } from 'vitest';
import type React from 'react';
import { render } from '@testing-library/react';
import type { Organization } from '@/features/ministries/types';
import { DRAG_MIME, dragOf, endDrag, getDrag, startDrag, useDragStore, useDropHandler } from './dnd';
import { household, member, renderWorkspace } from '@tests/testUtils';

const m1 = member({ id: 'm1', full_name: '김도현', gender: 'M', birth_date: '1990-01-25' });
const board = {
  organization: 'EQ' as Organization,
  ministries: [{ id: 'g1', number: 1, name: null, companionIds: [], recipientIds: [] }],
};

function dragEvent(types: string[]) {
  return {
    dataTransfer: { types, effectAllowed: 'all', setData: () => {} },
  } as unknown as React.DragEvent;
}

const ours = () => dragEvent([DRAG_MIME, 'text/plain']);
const foreign = () => dragEvent(['text/plain', 'text/html']);

function setup() {
  let handler: ReturnType<typeof useDropHandler> | null = null;
  function Probe() {
    handler = useDropHandler('EQ');
    return null;
  }
  const { wrapper, value } = renderWorkspace(<Probe />, {
    members: [m1],
    households: [household({ id: 'h1', name: '김도현 가정' })],
    board,
  });
  render(wrapper);
  return { drop: handler!, perform: value.actions.perform };
}

const target = { type: 'ministry', ministryId: 'g1', zone: 'companion' } as const;

describe('dnd', () => {
  beforeEach(() => endDrag());

  it('ignores a drop without our MIME type even when a stale item is remembered, and clears it', () => {
    const { drop, perform } = setup();
    startDrag(ours(), { kind: 'member', id: 'm1', from: 'companion' });
    useDragStore.getState().setOver('g1:companion');

    drop(foreign(), target);

    expect(perform).not.toHaveBeenCalled();
    expect(getDrag()).toBeNull();
    expect(useDragStore.getState()).toMatchObject({ item: null, over: null });
  });

  it('handles a drop carrying our MIME type once and clears the drag', () => {
    const { drop, perform } = setup();
    startDrag(ours(), { kind: 'member', id: 'm1', from: 'companion' });

    const e = ours();
    drop(e, target);
    drop(e, target);

    expect(perform).toHaveBeenCalledTimes(1);
    expect(perform).toHaveBeenCalledWith([
      { type: 'add', role: 'companion', ministryId: 'g1', targetId: 'm1' },
    ]);
    expect(getDrag()).toBeNull();
  });

  it('startDrag marks the drag with the custom MIME type', () => {
    const types: string[] = [];
    const e = {
      dataTransfer: { types, effectAllowed: 'all', setData: (t: string) => types.push(t) },
    } as unknown as React.DragEvent;
    startDrag(e, { kind: 'member', id: 'm1', from: 'companion' });
    expect(types).toContain(DRAG_MIME);
  });

  it('dragOf clears a stale item when a foreign drag passes over', () => {
    startDrag(ours(), { kind: 'household', id: 'h1', from: 'recipient' });
    expect(dragOf(ours())).toMatchObject({ id: 'h1' });
    expect(dragOf(foreign())).toBeNull();
    expect(getDrag()).toBeNull();
  });
});
