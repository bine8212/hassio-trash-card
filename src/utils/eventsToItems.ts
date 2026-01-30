import { filterEventByPatterns } from './filterEventByPatterns';

import type { CalendarEvent } from './calendarEvents';
import type { CalendarItem } from './calendarItem';
import type { ItemSettings } from './itemSettings';
import type { TrashCardConfig, CalendarSettings } from '../cards/trash-card/trash-card-config';

interface Options {
  pattern: Required<TrashCardConfig>['pattern'];
  calendar_settings?: TrashCardConfig['calendar_settings'];
  useSummary: boolean;
}

type Pattern = Options['pattern'][number];

const getLabel = (event: CalendarEvent, settings: ItemSettings | CalendarSettings, useSummary: boolean): string => {
  if (useSummary && event.content.summary) {
    return event.content.summary;
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return settings.label ?? event.content.summary ?? 'unknown';
};

const getDataFromPattern = (event: CalendarEvent, pattern: Pattern & { idx: number }, useSummary: boolean): CalendarItem => ({
  ...event,
  ...pattern,
  label: getLabel(event, pattern, useSummary),
  type: pattern.type === 'custom' ? `custom-${pattern.idx}` : pattern.type
});

const getDataFromCalendarSettings = (event: CalendarEvent, calendarSettings: CalendarSettings, useSummary: boolean): CalendarItem => {
  const type = calendarSettings.type ?? 'others';
  const label = getLabel(event, calendarSettings, useSummary);

  return {
    ...event,
    ...calendarSettings,
    label,
    type: type === 'custom' ? `custom-calendar-${calendarSettings.entity}` : type
  };
};

const getCalendarSettingsForEvent = (
  event: CalendarEvent,
  calendar_settings?: CalendarSettings[]
): CalendarSettings | null => {
  if (!event.entity || !calendar_settings || calendar_settings.length === 0) {
    return null;
  }

  return calendar_settings.find(settings => settings.entity === event.entity) ?? null;
};

const eventToItem = (event: CalendarEvent | undefined, { pattern, calendar_settings, useSummary }: Options): CalendarItem[] => {
  if (!event || !('summary' in event.content)) {
    return [];
  }

  // First, check if there are calendar_settings for this event's entity
  const calendarSettings = getCalendarSettingsForEvent(event, calendar_settings);
  if (calendarSettings) {
    // Use calendar settings - they take priority
    return [ getDataFromCalendarSettings(event, calendarSettings, useSummary) ];
  }

  // Fallback to pattern matching (existing logic)
  const possibleTypes = pattern.
    map((pat, idx) => ({
      ...pat,
      idx
    })).
    filter(pat => filterEventByPatterns(pat, event));

  if (possibleTypes.length > 0) {
    return possibleTypes.map(pat => getDataFromPattern(event, pat, useSummary));
  }

  return [ getDataFromPattern(event, { ...pattern.find(pat => pat.type === 'others')!, idx: 0 }, useSummary) ];
};

const eventsToItems = (events: CalendarEvent[], options: Options): CalendarItem[] => {
  const items = events.reduce<CalendarItem[]>((prev, event): CalendarItem[] => {
    const itemsFromEvents = eventToItem(event, options);

    return [ ...prev, ...itemsFromEvents ];
  }, []);

  return items.filter((item): boolean => Boolean(item));
};

export {
  eventsToItems
};
