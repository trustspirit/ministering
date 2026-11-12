import { useMemo } from 'react';
import { Select } from 'trust-ui-react';
import { T } from '@/shared/copy';
import { assignOptions } from '../domain/assignOptions';
import type { Selection } from '../store';
import { useAssign } from '../dnd';
import { useWorkspace } from '../workspaceContext';

/** "임무 지명…": picks a ministry for the selected item and performs it right away. */
export function AssignSelect({ item }: { item: Selection }) {
  const { org, board } = useWorkspace();
  const assign = useAssign(org);
  const options = useMemo(() => assignOptions(board, item), [board, item]);

  return (
    <Select
      size="sm"
      fullWidth
      placeholder={T.mobile.assignPlaceholder}
      // Always shows the placeholder: choosing performs the move, so there is no selected state to keep.
      value=""
      options={options.map((o, i) => ({ value: String(i), label: o.label }))}
      onChange={(value) => {
        const option = options[Number(value)];
        if (option) assign({ kind: item.kind, id: item.id, from: option.from }, option.target);
      }}
    />
  );
}
