import type { Ministry } from '../types';

export function ministryDisplayName(m: Pick<Ministry, 'name' | 'number'>): string {
  if (m.name && m.name.trim().length > 0) return m.name;
  return `조 ${m.number}`;
}
