import { NextResponse } from 'next/server';

/**
 * Safely parse the JSON body of a request.
 * Returns the parsed value or a 400 NextResponse on failure.
 */
export async function parseJsonBody<T>(request: Request): Promise<T | NextResponse> {
  try {
    return await request.json() as T;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}

/**
 * Type guard to check if a parseJsonBody result is an error response.
 */
export function isErrorResponse(result: unknown): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Mask an API key, showing only the first 4 and last 4 characters.
 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

/**
 * Return a generic error to the client while logging the real error server-side.
 */
export function safeErrorResponse(userMessage: string, status: number, internalError?: unknown): NextResponse {
  if (internalError) console.error(userMessage, internalError);
  return NextResponse.json({ error: userMessage }, { status });
}
