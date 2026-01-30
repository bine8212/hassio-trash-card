import type { CalendarEvent } from './calendarEvents';

interface CalendarItem extends CalendarEvent {
  label: string;
  color?: string;
  icon?: string;
  type: `custom-${number}` | `custom-calendar-${string}` | 'organic' | 'paper' | 'recycle' | 'waste' | 'others';
  picture?: string;
}

export type {
  CalendarItem
};
