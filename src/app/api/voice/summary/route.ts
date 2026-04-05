import { NextRequest, NextResponse } from 'next/server';
import { getVoiceData } from '@/lib/voice-db';

export const dynamic = 'force-dynamic'; // Ensure no caching for real-time data

export async function GET(req: NextRequest) {
    try {
        // Since we now require a phone number to fetch data, we look for it in the query
        const urlOptions = new URL(req.url);
        const phoneNumber = urlOptions.searchParams.get('phone') || '+910000000000'; // Fallback to a demo user
        
        const data = await getVoiceData(phoneNumber);

        if (!data) {
            return NextResponse.json(
                { error: "No user data found. Please ensure database has seed data." },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: "Voice Agent Data Ready",
            data: data
        });

    } catch (error) {
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
