import { prisma } from "@/lib/prisma";

export interface VoiceDataSummary {
    userName: string;
    phoneNumber: string;
    monthlyRevenue: number;
    monthlyExpenses: number;
    balance: number;
    trustScore: number;
    emergencyScore: number;
    riskStatus: string;
    workStats: {
        customers: number;
        rate: number;
    };
}

// In-Memory Cache (Phone Number -> Summary & Expiration)
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const dataCache = new Map<string, { summary: VoiceDataSummary; expiresAt: number }>();

export function invalidateVoiceData(phoneNumber?: string) {
    if (!phoneNumber) {
        dataCache.clear();
        return;
    }

    dataCache.delete(phoneNumber);
}

/**
 * Retrieves realistic dashboard tracking data for the phone number. 
 * Heavy queries are cached so conversational turns avoid cold-start timeouts.
 */
export async function getVoiceData(phoneNumber: string): Promise<VoiceDataSummary | null> {
    try {
        if (!phoneNumber || phoneNumber === 'unknown') {
            return null;
        }

        const now = Date.now();
        const cached = dataCache.get(phoneNumber);
        if (cached && cached.expiresAt > now) {
            console.log(`[voice-db] Returning cached data for ${phoneNumber}`);
            return cached.summary;
        }

        // 1. Find the onboarded user by real phone number
        const user = await prisma.user.findUnique({ where: { phoneNumber } });

        if (!user) {
            console.log(`[voice-db] No user found for ${phoneNumber}`);
            return null;
        }

        if (user.name?.startsWith('Caller ')) {
            console.log(`[voice-db] Ignoring stale placeholder user for ${phoneNumber}`);
            return null;
        }

        // 2. Fetch Latest Financial Snapshot
        const snapshot = await prisma.financialSnapshot.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        });

        // 3. Fetch Latest Recommendations (for Trust Score)
        const recommendation = await prisma.recommendations.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        });

        // 4. Fetch Latest Forecast (for Emergency Score / safeDays)
        const forecast = await prisma.forecast.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        });

        // 5. Build Summary Structure
        const revenue = snapshot?.revenue || 0;
        const expenses = snapshot?.expenses || 0;

        const summary: VoiceDataSummary = {
            userName: user.name || 'User',
            phoneNumber: phoneNumber,
            monthlyRevenue: revenue,
            monthlyExpenses: expenses,
            balance: revenue - expenses,
            trustScore: recommendation?.score || 50,
            emergencyScore: forecast?.safeDays || 0,
            riskStatus: snapshot?.stage || "Unknown",
            workStats: {
                customers: snapshot?.customers || 0,
                rate: snapshot?.rate || 0,
            }
        };

        // Update Cache
        dataCache.set(phoneNumber, {
            summary,
            expiresAt: now + CACHE_TTL_MS
        });

        console.log(`[voice-db] Fetched and cached fresh Priority DB Data for ${phoneNumber}`);
        return summary;
    } catch (error) {
        console.error("[voice-db] Error fetching voice data:", error);
        return null; // Fail gracefully
    }
}

