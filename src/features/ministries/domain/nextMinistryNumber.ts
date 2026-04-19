export function nextMinistryNumber(existingNumbers: number[]): number {
  const taken = new Set(existingNumbers);
  for (let n = 1; n <= taken.size + 1; n++) {
    if (!taken.has(n)) return n;
  }
  return taken.size + 1;
}
