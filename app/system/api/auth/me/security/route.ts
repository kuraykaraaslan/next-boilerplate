import Logger from '@/libs/logger';
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import AuthMessages from "@/modules/auth/auth.messages";
import UserSecurityService from "@/modules/user_security/user_security.service";

export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const { user } = await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ["system:read"] });

    const userSecurity = await UserSecurityService.getSafeByUserId(user.userId); // HAD TO BE SAFE


    return NextResponse.json({ 
       
      message: AuthMessages.SECURITY_SETTINGS_RETRIEVED, 
      userSecurity 
    });

  } catch (err: any) {
    Logger.error("Get Security Error:");
    
    return NextResponse.json({
      message: err.message || AuthMessages.SECURITY_SETTINGS_RETRIEVED
    }, { status: 500 });
  }
}
