import createClient, { type Middleware } from 'openapi-fetch';

import { ApiError, NETWORK_MESSAGE } from './errors';
import type { paths } from './schema';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(next: string | null) {
  token = next;
}

/** Called when an authenticated request comes back 401 (expired or revoked session). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

const auth: Middleware = {
  onRequest({ request }) {
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },
  // Observe only: returning the same Response makes openapi-fetch throw ("must return new Response()").
  onResponse({ response }) {
    if (response.status === 401 && token) onUnauthorized?.();
  },
};

export const client = createClient<paths>({ baseUrl: API_URL });
client.use(auth);

type Result<T> = { data?: T; error?: unknown; response: Response };

/**
 * Unwraps an openapi-fetch result: returns the data or throws an ApiError carrying the server's
 * `{ ok: false, error, status }` message. Network failures become ApiError(0, ...).
 */
export async function call<T>(request: Promise<Result<T>>): Promise<T> {
  let result: Result<T>;
  try {
    result = await request;
  } catch (cause) {
    if (__DEV__) console.warn('[api] request failed before a response was read:', cause);
    throw new ApiError(0, NETWORK_MESSAGE);
  }
  if (result.response.ok && result.data !== undefined) return result.data;
  const body = result.error as { error?: string } | undefined;
  throw new ApiError(result.response.status, body?.error ?? 'Something went wrong. Try again.');
}
