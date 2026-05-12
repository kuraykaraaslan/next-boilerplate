import Logger from '@/modules/logger';
// Original path: app/api/auth/register/route.ts

import {NextRequest, NextResponse } from "next/server";
import Limiter from "@/modules_next/limiter/limiter.service.next";
import AuthService from "@/modules/auth/auth.service";
import { RegisterDTO } from "@/modules/auth/auth.dto";
import AuthMessages from "@/modules/auth/auth.messages";

export async function POST(request: NextRequest) {
    try {

        const _rl = await Limiter.checkRateLimit(request, 'auth');

        if (_rl) return _rl;
        const parsedData = RegisterDTO.safeParse(await request.json());

        if (!parsedData.success) {
            return NextResponse.json({
                error: parsedData.error.issues.map((err: any) => err.message).join(", ")
            }, { status: 400 });
        }

        const { email, password, phone } = parsedData.data;
        
        const user = await AuthService.register({
            email,
            password,
            phone,
        });

        if (!user) {
            return NextResponse.json({ error: AuthMessages.REGISTRATION_FAILED }, { status: 400 });
        }

        return NextResponse.json({ message: AuthMessages.REGISTRATION_SUCCESSFUL }, { status: 201 });
    }

    catch (error: any) {
        Logger.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
