import english from '../locales/ui/en.json' with { type: 'json' };
export type MessageKey = keyof typeof english;
export type UIMessages = Record<MessageKey, string>;
export const englishMessages: UIMessages = english;
/** Keys are supplied explicitly, never inferred from book prose. */
export function message(messages: UIMessages, key: MessageKey): string {
  return messages[key];
}
