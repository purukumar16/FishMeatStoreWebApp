import { DeliverySlot } from '../types';

export const DELIVERY_SLOTS: DeliverySlot[] = [
  {
    id: 'slot_express_now',
    type: 'express',
    title: 'Deliver Now (30-45 Mins)',
    subtitle: 'Dispatched immediately from nearest store chiller without extra charge',
    timeWindow: '30 - 45 Mins',
    dateLabel: 'Today · No extra charge',
    fee: 0,
  },
  {
    id: 'slot_today_evening',
    type: 'scheduled',
    title: 'Today Evening Slot',
    subtitle: 'Fresh evening cut butchered after 4:00 PM',
    timeWindow: '6:30 PM - 8:30 PM',
    dateLabel: 'Today',
    fee: 0,
  },
  {
    id: 'slot_tomorrow_morning',
    type: 'scheduled',
    title: 'Early Bird Sunday / Morning',
    subtitle: 'First morning butchery batch at 6:30 AM',
    timeWindow: '7:00 AM - 9:00 AM',
    dateLabel: 'Tomorrow',
    fee: 0,
  },
];
