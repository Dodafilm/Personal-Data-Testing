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
