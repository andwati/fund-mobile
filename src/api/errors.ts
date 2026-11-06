/** An API failure with the server's HTTP status and its human-readable message. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Worth retrying later (offline queue): network failures and 5xx. */
  get retryable() {
    return this.status === 0 || this.status >= 500;
  }
}

export const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again.";

export function errorMessage(error: unknown, fallback = 'Something went wrong. Try again.'): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
