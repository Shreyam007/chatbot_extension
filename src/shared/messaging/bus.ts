import { createLogger } from '../logger';
import {
  type BusRequest,
  BusRequestSchema,
  type BusResponseEnvelope,
  type BusBroadcastEvent,
  BusBroadcastEventSchema,
} from './protocol';

const logger = createLogger('MessageBus');

export class MessagingError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'MessagingError';
    this.code = code;
  }
}

/**
 * Checks if an error is due to extension reload/update (EC-003)
 * Supports Error instances, chrome.runtime.lastError plain objects, and strings
 */
export function isContextInvalidatedError(err: unknown): boolean {
  let msg = '';
  if (err instanceof Error) {
    msg = err.message;
  } else if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    msg = (err as { message: string }).message;
  } else if (typeof err === 'string') {
    msg = err;
  }

  return (
    msg.includes('Extension context invalidated') ||
    msg.includes('context invalidated') ||
    msg.includes('Receiving end does not exist')
  );
}

/**
 * Sends a typed request to the background service worker with timeout and invalidation handling
 */
export async function sendToBackground<T = unknown>(
  request: BusRequest,
  timeoutMs = 10000
): Promise<T> {
  const parseResult = BusRequestSchema.safeParse(request);
  if (!parseResult.success) {
    logger.warn('Attempted to send invalid message payload:', parseResult.error.flatten());
    throw new MessagingError('CLIENT_VALIDATION_FAILED', 'Invalid outgoing message payload');
  }

  // Check if chrome.runtime is available
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    throw new MessagingError('NO_RUNTIME', 'Chrome runtime messaging not available in this environment');
  }

  return new Promise<T>((resolve, reject) => {
    let completed = false;
    const timer = setTimeout(() => {
      if (!completed) {
        completed = true;
        reject(new MessagingError('TIMEOUT', `Message ${request.type} timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    try {
      chrome.runtime.sendMessage(request, (response: BusResponseEnvelope | undefined) => {
        clearTimeout(timer);
        if (completed) return;
        completed = true;

        const lastError = chrome.runtime.lastError;
        if (lastError) {
          if (isContextInvalidatedError(lastError)) {
            logger.debug('Extension context invalidated during messaging (EC-003):', lastError.message);
            reject(
              new MessagingError(
                'CONTEXT_INVALIDATED',
                'Extension was reloaded or updated. Please refresh the page.'
              )
            );
          } else {
            logger.debug('Runtime message error:', lastError.message);
            reject(new MessagingError('RUNTIME_ERROR', lastError.message || 'Unknown runtime error'));
          }
          return;
        }

        if (!response) {
          reject(new MessagingError('EMPTY_RESPONSE', 'Service worker returned an empty response'));
          return;
        }

        if (!response.ok) {
          reject(new MessagingError(response.error.code, response.error.message));
          return;
        }

        resolve(response.data as T);
      });
    } catch (err) {
      clearTimeout(timer);
      if (isContextInvalidatedError(err)) {
        logger.debug('Extension context invalidated (sync catch):', (err as Error).message);
        reject(
          new MessagingError(
            'CONTEXT_INVALIDATED',
            'Extension was reloaded or updated. Please refresh the page.'
          )
        );
      } else {
        reject(new MessagingError('SEND_EXCEPTION', (err as Error).message || 'Failed to send message'));
      }
    }
  });
}

export type RequestHandlers = {
  [K in BusRequest['type']]?: (
    req: Extract<BusRequest, { type: K }>,
    sender: chrome.runtime.MessageSender
  ) => Promise<unknown> | unknown;
};

/**
 * Registers the background request router with strict schema validation
 */
export function registerBackgroundRouter(handlers: RequestHandlers): () => void {
  const listener = (
    rawMessage: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (res: BusResponseEnvelope) => void
  ): boolean => {
    // Validate incoming message format
    const parsed = BusRequestSchema.safeParse(rawMessage);
    if (!parsed.success) {
      logger.debug('Received invalid or unknown message on bus:', rawMessage);
      sendResponse({
        ok: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Message did not match bus contract schema',
        },
      });
      return false;
    }

    const request = parsed.data;
    const handler = handlers[request.type];

    if (!handler) {
      logger.debug(`No handler registered for message type: ${request.type}`);
      sendResponse({
        ok: false,
        error: {
          code: 'UNHANDLED_TYPE',
          message: `No handler for request type: ${request.type}`,
        },
      });
      return false;
    }

    // Execute typed handler asynchronously
    Promise.resolve()
      .then(() => handler(request as never, sender))
      .then((data) => {
        sendResponse({ ok: true, data });
      })
      .catch((err) => {
        logger.error(`Handler error for ${request.type}:`, err);
        sendResponse({
          ok: false,
          error: {
            code: 'HANDLER_ERROR',
            message: err instanceof Error ? err.message : 'Unknown handler failure',
          },
        });
      });

    return true; // Keep channel open for async response
  };

  chrome.runtime.onMessage.addListener(listener);

  return () => {
    chrome.runtime.onMessage.removeListener(listener);
  };
}

/**
 * Broadcasts an event to all open tabs and active extension UI contexts
 */
export function broadcastEvent(event: BusBroadcastEvent): void {
  const parsed = BusBroadcastEventSchema.safeParse(event);
  if (!parsed.success) {
    logger.warn('Invalid broadcast event dropped:', parsed.error.flatten());
    return;
  }

  if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
    return;
  }

  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id !== undefined) {
        chrome.tabs.sendMessage(tab.id, event, () => {
          // Ignore lastError for tabs that don't have content scripts running
          void chrome.runtime.lastError;
        });
      }
    }
  });
}

/**
 * Listens for typed broadcast events (e.g. in content script or side panel)
 */
export function listenToBroadcastEvents(
  handler: (event: BusBroadcastEvent) => void
): () => void {
  if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) {
    return () => {};
  }

  const listener = (message: unknown): void => {
    const parsed = BusBroadcastEventSchema.safeParse(message);
    if (parsed.success) {
      handler(parsed.data);
    }
  };

  chrome.runtime.onMessage.addListener(listener);
  return () => {
    chrome.runtime.onMessage.removeListener(listener);
  };
}

