import type { TFunction } from 'i18next';

// Stable backend error strings (service-layer `var` errors in
// backend/internal/service) mapped to i18n keys, so auth failures surface in
// the user's language instead of the raw English message from the server.
const BACKEND_ERROR_KEYS: Record<string, string> = {
  'invalid username or password': 'auth.errInvalidCredentials',
  'username already exists': 'auth.errUsernameTaken',
  'username and password length >= 6 are required': 'auth.errInvalidInput',
  'current password is incorrect': 'auth.errWrongPassword',
};

// Localizes a backend error message: returns the translation for a known
// message, the raw message when it is present but unrecognized, or the
// fallback key's translation when no message was provided.
export function apiErrorMessage(t: TFunction, message: string | undefined, fallbackKey: string): string {
  if (!message) return t(fallbackKey);
  const key = BACKEND_ERROR_KEYS[message.trim().toLowerCase()];
  return key ? t(key) : message;
}
