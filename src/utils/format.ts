import type { Session, SessionStatus } from '../types';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/** Short label for input suffixes: "$" for dollars, otherwise the code itself. */
export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

export function formatMoney(amount: number, currency = 'USD'): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = safe.toLocaleString('en-US', {
    minimumFractionDigits: safe % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  const symbol = CURRENCY_SYMBOLS[currency];
  return symbol ? `${symbol}${formatted}` : `${formatted} ${currency}`;
}

export function getSessionStatus(session: Session, now = new Date()): SessionStatus {
  const start = new Date(session.startAt);
  const end = new Date(session.endAt);
  if (now < start) return 'upcoming';
  if (now > end) return 'completed';
  return 'in-progress';
}

export const STATUS_LABEL: Record<SessionStatus, string> = {
  upcoming: 'Upcoming',
  'in-progress': 'In progress',
  completed: 'Completed',
};

/** Whole days between now and a future date, used for "in 3 days" style hints. */
export function daysUntil(date: Date, now = new Date()): number {
  const a = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}
