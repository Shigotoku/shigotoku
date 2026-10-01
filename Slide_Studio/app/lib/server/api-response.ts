import { ApiError } from '@/lib/server/request-auth';
import { NextResponse } from 'next/server';

export function jsonError(err: unknown, requestId: string) {
  if (err instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          requestId,
          retryable: err.retryable,
        },
      },
      { status: err.status, headers: { 'x-request-id': requestId } },
    );
  }

  console.error(err);
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL',
        message: '内部エラーが発生しました。',
        requestId,
        retryable: true,
      },
    },
    { status: 500, headers: { 'x-request-id': requestId } },
  );
}
