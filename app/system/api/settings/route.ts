import Limiter from '@/libs/limiter';
import { NextRequest, NextResponse } from "next/server";
import SettingService from "@/modules/setting/setting.service";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import {
  GetSettingsByKeysDTO,
  UpdateSettingsDTO,
  GetSettingsResponseDTO,
  UpdateSettingsResponseDTO
} from "@/modules/setting/setting.dto";
import SettingMessages from "@/modules/setting/setting.messages";

export async function GET(request: NextRequest) {
  try {
    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" });

    let settings: Record<string, string> = {};

    // Check if request has body with keys
    try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

      const body = await request.json();
      const parsedData = GetSettingsByKeysDTO.safeParse(body);

      if (parsedData.success) {
        settings = await SettingService.getByKeys(parsedData.data.keys);
      } else {
        settings = await SettingService.getAllAsRecord();
      }
    } catch {
      // No body or invalid JSON - return all settings
      settings = await SettingService.getAllAsRecord();
    }

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

export async function POST(request: NextRequest) {
  try {
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

    // Convert to key-value object
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

export async function PUT(request: NextRequest) {
  try {
    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" });

    const body = await request.json();
    const parsedData = GetSettingsByKeysDTO.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json({
        success: false,
        message: parsedData.error.issues.map(err => err.message).join(", ")
      }, { status: 400 });
    }

    const { keys } = parsedData.data;
    const settings = await SettingService.getByKeys(keys);

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
