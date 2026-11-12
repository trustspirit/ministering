import clsx from 'clsx';
import { T } from '@/shared/copy';
import type { MobileTab } from '../store';

/** Bottom tab bar of the phone layout; one panel is shown at a time. */
export function MobileTabs({
  tab,
  onChange,
  poolCount,
  boardCount,
}: {
  tab: MobileTab;
  onChange: (tab: MobileTab) => void;
  poolCount: number;
  boardCount: number;
}) {
  const tabs: [MobileTab, string][] = [
    ['pool', T.mobile.tabPool(poolCount)],
    ['board', T.mobile.tabBoard(boardCount)],
    ['map', T.mobile.tabMap],
  ];
  return (
    <nav className="aw-mtabs" aria-label={T.mobile.tabsLabel}>
      {tabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          className={clsx(tab === key && 'aw-mtab--on')}
          aria-current={tab === key ? 'page' : undefined}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
