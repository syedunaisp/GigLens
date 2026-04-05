import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

/**
 * POST /api/call
 * 
 * Triggers an outbound voice call via Twilio.
 * Once the user answers, Twilio fetches TwiML from /api/voice.
 * 
 * Request body:
 *   - to: string       (required) Recipient phone number in E.164 format
 *   - baseUrl: string   (required) Public base URL (ngrok or deployed URL)
 * 
 * Response:
 *   - success: boolean
 *   - callSid: string   (on success)
 *   - error: string     (on failure)
 */

// E.164 phone number validation: + followed by 10-15 digits
const E164_REGEX = /^\+[1-9]\d{9,14}$/;

export async function POST(request: NextRequest) {
    // 1. Validate environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhoneNumber) {
        console.error('[/api/call] Missing Twilio credentials in environment variables.');
        return NextResponse.json(
            {
                success: false,
                error: 'Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env.local',
            },
            { status: 500 }
        );
    }

    // 2. Parse and validate request body
    let body: { to?: string; baseUrl?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid JSON in request body.' },
            { status: 400 }
        );
    }

    const { to, baseUrl } = body;

    if (!to) {
        return NextResponse.json(
            { success: false, error: 'Missing required field: "to" (recipient phone number).' },
            { status: 400 }
        );
    }

    if (!E164_REGEX.test(to)) {
        return NextResponse.json(
            {
                success: false,
                error: `Invalid phone number format. Must be E.164 format (e.g., +91XXXXXXXXXX). Received: "${to}"`,
            },
            { status: 400 }
        );
    }

    if (!baseUrl) {
        return NextResponse.json(
            {
                success: false,
                error: 'Missing required field: "baseUrl" (public URL for Twilio webhook, e.g., your ngrok URL).',
            },
            { status: 400 }
        );
    }

    // 3. Initialize Twilio client
    let client: twilio.Twilio;
    try {
        client = twilio(accountSid, authToken);
    } catch (err) {
        console.error('[/api/call] Failed to initialize Twilio client:', err);
        return NextResponse.json(
            { success: false, error: 'Failed to initialize Twilio client.' },
            { status: 500 }
        );
    }

    // 4. Trigger the outbound call
    try {
        const voiceWebhookUrl = `${baseUrl.replace(/\/+$/, '')}/api/voice`;

        console.log(`[/api/call] Initiating call: to=${to}, from=${twilioPhoneNumber}, webhook=${voiceWebhookUrl}`);

        const call = await client.calls.create({
            to,
            from: twilioPhoneNumber,
            url: voiceWebhookUrl,
            method: 'POST',
        });

        console.log(`[/api/call] Call initiated successfully. SID: ${call.sid}`);

        return NextResponse.json({
            success: true,
            callSid: call.sid,
            message: `Call initiated to ${to}. Twilio will fetch TwiML from ${voiceWebhookUrl} when answered.`,
        });
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('[/api/call] Failed to create call:', errorMessage);

        // Provide helpful hints for common Twilio errors
        let hint = '';
        if (errorMessage.includes('unverified')) {
            hint = ' Hint: On trial accounts, the "to" number must be a Verified Caller ID in your Twilio Console.';
        } else if (errorMessage.includes('not a valid phone number')) {
            hint = ' Hint: Ensure the phone number is in E.164 format (e.g., +91XXXXXXXXXX).';
        } else if (errorMessage.includes('authenticate')) {
            hint = ' Hint: Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env.local.';
        }

        return NextResponse.json(
            {
                success: false,
                error: `${errorMessage}${hint}`,
            },
            { status: 500 }
        );
    }
}

// GET endpoint for health check
export async function GET() {
    const hasCredentials =
        !!process.env.TWILIO_ACCOUNT_SID &&
        !!process.env.TWILIO_AUTH_TOKEN &&
        !!process.env.TWILIO_PHONE_NUMBER;

    return NextResponse.json({
        status: 'ok',
        service: 'twilio-outbound-call',
        credentialsConfigured: hasCredentials,
        usage: 'POST /api/call with { "to": "+91XXXXXXXXXX", "baseUrl": "https://your-ngrok-url.ngrok.io" }',
    });
}
