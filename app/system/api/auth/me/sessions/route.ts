import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import UserSessionCrudService from "@/modules/user_session/user_session.crud.service";

export async function GET(request: NextRequest) {
  try {
    const { user } = await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ["system:read"] });
    const sessions = await UserSessionCrudService.getUserSessions(user.userId);
    return NextResponse.json({ sessions });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "An error occurred" }, { status: 500 });
  }
}
