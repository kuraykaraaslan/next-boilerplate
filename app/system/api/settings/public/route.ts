import Limiter from '@/modules_next/limiter/limiter.service.next';
import { NextRequest, NextResponse } from "next/server";
import SettingService from "@/modules/setting/setting.service";

// Public olarak erişilebilir ayarlar (auth gerektirmez)
const PUBLIC_SETTINGS_KEYS = [
    'i18nLanguages',
    'defaultLanguage',
    'siteName',
    'siteDescription',
    'logoUrl',
    'faviconUrl',
];

export async function GET(request: NextRequest) {
    try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

        const settings = await SettingService.getByKeys(PUBLIC_SETTINGS_KEYS);
        return NextResponse.json({ success: true, settings });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
