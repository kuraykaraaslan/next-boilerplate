import Limiter from '@/modules_next/limiter/limiter.service.next';
import { NextRequest, NextResponse } from "next/server";
import SettingService from "@/modules/setting/setting.service";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import {
  UpdateSettingsDTO,
  GetSettingsResponseDTO,
  UpdateSettingsResponseDTO
} from "@/modules/setting/setting.dto";
import SettingMessages from "@/modules/setting/setting.messages";

export async function GET(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" });

    const settings = await SettingService.getAllAsRecord();

    const response = { success: true, settings };
    GetSettingsResponseDTO.parse(response);

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SettingMessages.FETCH_FAILED },
      { status: 500 }
    );
  }
}

async function updateSettings(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" });

    const body = await request.json();
    const parsedData = UpdateSettingsDTO.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json({
        success: false,
        message: parsedData.error.issues.map(err => err.message).join(", ")
      }, { status: 400 });
    }

    const { settings } = parsedData.data;
    const updatedArr = await SettingService.updateMany(settings);

    const updatedSettings: Record<string, string> = {};
    for (const s of updatedArr) {
      updatedSettings[s.key] = s.value;
    }

    const response = { success: true, settings: updatedSettings };
    UpdateSettingsResponseDTO.parse(response);

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SettingMessages.UPDATE_FAILED },
      { status: 500 }
    );
  }
}

export const PUT  = updateSettings;
export const POST = updateSettings;
