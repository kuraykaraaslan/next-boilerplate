import { NextResponse } from "next/server";
import SettingService from "@/services/SettingService";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import { UpdateSettingsRequestSchema, GetSettingsResponseSchema, UpdateSettingsResponseSchema, GetSettingsByKeysRequestSchema, GetSettingsByKeysResponseSchema } from "@/dtos/SettingsDTO";
/**
 * GET handler for retrieving all settings.
 * @param request - The incoming request object
 * @returns A NextResponse containing the posts data or an error message
 */

export async function GET(request: NextRequest) {
    try {
        await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" });
        const body = await request.json();
        const parsedData = GetSettingsByKeysRequestSchema.safeParse(body);
        let settings: Record<string, any> = {};
        if (parsedData.success) {
            const { keys } = parsedData.data;
            settings = await SettingService.getSettingsByKeys(keys);
        } else {
            // Eğer body yoksa veya geçersizse tüm ayarları döndür
            const settingsArr = await SettingService.getSettings();
            for (const s of settingsArr) {
                settings[s.key] = s.value;
            }
        }
        const response = { success: true, settings };
        GetSettingsByKeysResponseSchema.parse(response);
        return NextResponse.json(response);
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
/**
 * POST handler for updating settings.
 * @param request - The incoming request object
 * @returns A NextResponse containing the updated settings or an error message
 */

export async function POST(request: NextRequest) {
    try {
        await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" });
        const body = await request.json();
        const parsedData = UpdateSettingsRequestSchema.safeParse(body);
        if (!parsedData.success) {
            return NextResponse.json({
                success: false,
                message: parsedData.error.issues.map(err => err.message).join(", ")
            }, { status: 400 });
        }
        const { settings } = parsedData.data;
        const updatedArr = await SettingService.updateSettings(settings);
        // Key-value objeye dönüştür
        const updatedSettings: Record<string, any> = {};
        for (const s of updatedArr) {
            updatedSettings[s.key] = s.value;
        }
        const response = { success: true, settings: updatedSettings };
        UpdateSettingsResponseSchema.parse(response);
        return NextResponse.json(response);
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
/**
 * PUT handler for retrieving specific settings by keys.
 * @param request - The incoming request object
 * @returns A NextResponse containing the requested settings or an error message
 */

export async function PUT(request: NextRequest) {
    try {
        await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" });
        const body = await request.json();
        const parsedData = GetSettingsByKeysRequestSchema.safeParse(body);
        if (!parsedData.success) {
            return NextResponse.json({
                success: false,
                message: parsedData.error.issues.map(err => err.message).join(", ")
            }, { status: 400 });
        }
        const { keys } = parsedData.data;
        const settings = await SettingService.getSettingsByKeys(keys);
        const response = { success: true, settings };
        GetSettingsByKeysResponseSchema.parse(response);
        return NextResponse.json(response);
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}