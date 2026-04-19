export function computeAge(
  birthDate: Date | string,
  today: Date | string = new Date(),
): number {
  const b = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const t = typeof today === 'string' ? new Date(today) : today;
  let age = t.getFullYear() - b.getFullYear();
  const monthDiff = t.getMonth() - b.getMonth();
  const dayDiff = t.getDate() - b.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  return age;
}
