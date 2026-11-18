import { ProductSubscription, SubscriptionDay } from '../types';

export const WEEKDAYS_ORDERED: SubscriptionDay[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function getLocalDateString(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatOrderDateLabel(dateStr?: string): string {
  if (!dateStr) return 'Today';
  const today = getLocalDateString(0);
  const yesterday = getLocalDateString(-1);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getTodayWeekdayName(): SubscriptionDay {
  return WEEKDAYS_ORDERED[new Date().getDay()];
}

export function getTwiceWeeklySecondDay(primaryDay: SubscriptionDay): SubscriptionDay {
  const idx = WEEKDAYS_ORDERED.indexOf(primaryDay);
  if (idx === -1) return primaryDay;
  return WEEKDAYS_ORDERED[(idx + 3) % 7];
}

export function isSubscriptionDueToday(
  sub: ProductSubscription,
  todayDay: SubscriptionDay = getTodayWeekdayName()
): boolean {
  if (sub.status !== 'active') return false;
  if (sub.nextDeliveryDate?.toLowerCase().includes('skipped')) return false;
  if (sub.deliveryDay === todayDay) return true;
  if (sub.frequency === 'twice-weekly' && getTwiceWeeklySecondDay(sub.deliveryDay) === todayDay) {
    return true;
  }
  return false;
}

export function formatTodayFullDate(): string {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
