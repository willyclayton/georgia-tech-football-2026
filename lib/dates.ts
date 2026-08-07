export function countdownLabel(targetDate: string, now = new Date()): string {
  const target = new Date(`${targetDate}T20:00:00`);
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return 'Game day';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 1) return `${days} days`;
  if (days === 1) return `1 day ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return 'Soon';
}
