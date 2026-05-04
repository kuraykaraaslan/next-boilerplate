import Logger from '@/libs/logger';
// Original path: app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import SSOService from "@/modules/auth_sso/auth_sso.service";
import Limiter from "@/libs/limiter";
import { GenerateAuthUrlDTO } from "@/modules/auth_sso/auth_sso.dto";
import SSOMessages from "@/modules/auth_sso/auth_sso.messages";
import AuthMessages from "@/modules/auth/auth.messages";
import { SSOProvider } from "@/modules/auth_sso/auth_sso.enums";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  
  const parsedData = GenerateAuthUrlDTO.safeParse({ provider });
  
  if (!parsedData.success) {
    Logger.error("Invalid provider parameter:", parsedData.error);
    return NextResponse.json({
      message: parsedData.error.issues.map((err: any) => err.message).join(", ")
    }, { status: 400 });
  }

  try {
    await Limiter.checkRateLimit(request);

    if (!SSOService.isProviderEnabled(provider)) {
      return NextResponse.json(
        { message: SSOMessages.INVALID_PROVIDER },
        { status: 400 }
      );
    }

    const url = await SSOService.generateAuthUrl(provider as SSOProvider);

    return NextResponse.json({ url });

  } catch (error: any) {

    Logger.error(`Error generating SSO link for ${provider}:`, error);
    
    return NextResponse.json(
      { message: AuthMessages.SSO_GENERATION_FAILED },
      { status: 500 }
    );
  }
}




