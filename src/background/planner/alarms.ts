import { createLogger } from '../../shared/logger';

const logger = createLogger('PlannerAlarms');

export const ALARM_NAMES = {
  COOLDOWN: 'unstuck-nudge-cooldown',
  SNOOZE: 'unstuck-nudge-snooze',
};

/**
 * Schedules a cooldown alarm in Chrome MV3 so state persists across SW sleep (EC-004)
 */
export function scheduleCooldownAlarm(cooldownMinutes: number): void {
  if (typeof chrome === 'undefined' || !chrome.alarms?.create) return;

  chrome.alarms.create(ALARM_NAMES.COOLDOWN, {
    delayInMinutes: cooldownMinutes,
  });
  logger.info(`Scheduled cooldown alarm for ${cooldownMinutes} minutes`);
}

/**
 * Schedules a snooze alarm
 */
export function scheduleSnoozeAlarm(snoozeMinutes: number): void {
  if (typeof chrome === 'undefined' || !chrome.alarms?.create) return;

  chrome.alarms.create(ALARM_NAMES.SNOOZE, {
    delayInMinutes: snoozeMinutes,
  });
  logger.info(`Scheduled snooze alarm for ${snoozeMinutes} minutes`);
}

/**
 * Registers chrome.alarms listener
 */
export function registerAlarmListeners(onAlarmFired?: (alarmName: string) => void): () => void {
  if (typeof chrome === 'undefined' || !chrome.alarms?.onAlarm) return () => {};

  const listener = (alarm: chrome.alarms.Alarm) => {
    logger.info(`Alarm fired: ${alarm.name}`);
    if (onAlarmFired) {
      onAlarmFired(alarm.name);
    }
  };

  chrome.alarms.onAlarm.addListener(listener);
  return () => {
    chrome.alarms.onAlarm.removeListener(listener);
  };
}
