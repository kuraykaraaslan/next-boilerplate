import { NextResponse } from "next/server";
import SettingService from "@/services/SettingService";

// Public olarak erişilebilir ayarlar (auth gerektirmez)
const PUBLIC_SETTINGS_KEYS = [
    'i18nLanguages',
    'defaultLanguage',
    'siteName',
    'siteDescription',
    'logoUrl',
    'faviconUrl',
];

export async function GET() {
    try {
        const settings = await SettingService.getSettingsByKeys(PUBLIC_SETTINGS_KEYS);
        return NextResponse.json({ success: true, settings });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
