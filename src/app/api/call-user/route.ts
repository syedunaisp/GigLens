import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';

// Prisma Setup
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Twilio Setup
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export async function POST(req: NextRequest) {
    try {
        // 1. Authenticate User
        const { userId } = await auth();
        
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Fetch user's phone number securely from Database
        const user = await prisma.user.findUnique({
            where: { clerkId: userId }
        });

        if (!user || !user.phoneNumber) {
            // Cannot call user if they never provided a phone number or synced
            return NextResponse.json(
                { error: "Phone number required", message: "Please add your phone number in profile setup." },
                { status: 400 }
            );
        }

        const callerPhone = user.phoneNumber;

        // 3. Extract public URL dynamically from incoming request headers.
        //    When running behind ngrok, the x-forwarded-host header carries the
        //    ngrok subdomain (e.g. abc123.ngrok-free.app).  In production it will
        //    carry the real domain.  We always enforce HTTPS because Twilio
        //    requires a publicly-reachable HTTPS webhook URL.
        const host = req.headers.get("x-forwarded-host") || req.headers.get("host");

        if (!host) {
            return NextResponse.json({ error: "Could not determine host header" }, { status: 400 });
        }

        // Twilio cannot reach localhost — reject early so the developer gets a
        // clear error instead of a cryptic Twilio failure minutes later.
        if (host.includes("localhost") || host.includes("127.0.0.1")) {
            return NextResponse.json(
                {
                    error: "Public URL required",
                    message: "Twilio cannot reach localhost. Please access the app through your ngrok public URL."
                },
                { status: 400 }
            );
        }

        // Always HTTPS — ngrok, Vercel, and any production reverse-proxy
        // terminate TLS before the request reaches Next.js.
        const baseUrl = `https://${host}`;
        const webhookUrl = `${baseUrl}/api/voice`;

        console.log(`[/api/call-user] Initiating authenticated call to ${callerPhone} via ${webhookUrl}`);

        // 4. Trigger the Outbound Call
        if (!accountSid || !authToken || !twilioNumber) {
            throw new Error("Missing Twilio credentials in environment variables.");
        }

        const call = await client.calls.create({
            url: webhookUrl,
            to: callerPhone,
            from: twilioNumber,
        });

        return NextResponse.json({
            success: true,
            message: "Call initiated successfully",
            callSid: call.sid
        });

    } catch (error: any) {
        console.error('[/api/call-user] Error triggering call:', error);
        return NextResponse.json(
            { error: "Failed to initiate call", details: error.message },
            { status: 500 }
        );
    }
}
