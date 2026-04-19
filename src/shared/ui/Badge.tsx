import clsx from 'clsx';

export function Badge({ tone, children }: { tone: 'green' | 'gray' | 'blue' | 'orange'; children: React.ReactNode }) {
  const map = {
    green: 'bg-green-100 text-green-800',
    gray: 'bg-slate-200 text-slate-700',
    blue: 'bg-blue-100 text-blue-800',
    orange: 'bg-orange-100 text-orange-800',
  };
  return (
    <span className={clsx('inline-block text-xs font-medium px-2 py-0.5 rounded', map[tone])}>
      {children}
    </span>
  );
}
