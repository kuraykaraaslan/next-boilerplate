// types/global.d.ts veya tanımladığın yer
import { NextRequest as OriginalNextRequest } from 'next/server'
import SafeUser from './types/SafeUser'

declare global {
    interface NextRequest extends OriginalNextRequest {
        user?: SafeUser 
    }
}