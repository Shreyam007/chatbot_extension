import { z } from 'zod';

export const EventTypeSchema = z.enum([
  'nudge_offered',
  'nudge_accepted',
  'nudge_dismissed',
  'nudge_ignored',
  'hint_requested',
  'hint_delivered',
  'feedback_submitted',
  'problem_solved',
  'error_encountered',
  'problem_opened',
  'hint_viewed',
  'solution_viewed',
  'chat_message',
]);

export const EventLogEntrySchema = z.object({
  id: z.string().min(1),
  timestamp: z.number().int().positive(),
  type: EventTypeSchema,
  contextHash: z.string().min(1),
  title: z.string().min(1),
  details: z.record(z.string(), z.unknown()).default({}),
});

export const EventLogSchema = z.array(EventLogEntrySchema);

export type EventType = z.infer<typeof EventTypeSchema>;
export type EventLogEntry = z.infer<typeof EventLogEntrySchema>;
export type EventLog = z.infer<typeof EventLogSchema>;
