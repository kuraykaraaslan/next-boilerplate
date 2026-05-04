import { NextRequest, NextResponse } from 'next/server';
import { SystemDataSource } from '@/libs/typeorm';
import redis from '@/libs/redis';

export async function GET() {
  try {
    await SystemDataSource.query('SELECT 1');
    await redis.ping();
    return NextResponse.json({ status: 'ok', db: 'ok', redis: 'ok' });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', error: error.message },
      { status: 503 }
    );
  }
}
