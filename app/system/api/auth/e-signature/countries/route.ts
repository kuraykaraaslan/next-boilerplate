import { NextResponse } from 'next/server';
import Logger from '@/modules/logger';
import ESignatureService from '@/modules/e_signature/e_signature.service';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: ESignatureService.listCountryHints(),
    });
  } catch (err) {
    Logger.error(`e-signature countries failed: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to load e-signature country hints' } },
      { status: 500 },
    );
  }
}
