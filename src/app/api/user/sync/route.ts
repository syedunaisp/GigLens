import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { invalidateVoiceData } from "@/lib/voice-db";

// Use a shared singleton to prevent connection exhaustion in dev
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const clerkUser = await currentUser();
        if (!clerkUser) {
            return NextResponse.json({ error: "Clerk user not found" }, { status: 404 });
        }

        const body = await req.json();
        const {
            phoneNumber,
            annualIncome,
            monthlyExpenses,
            debtAmount,
            savingsRate,
            ordersPerMonth,
            gigCreditScore,
            approvalProbability,
            maxLoanAmount,
            currentBalance
        } = body;

        // Clean and validate phone number — reject if missing or not E.164
        let cleanedPhone: string | null = null;
        if (phoneNumber && typeof phoneNumber === "string") {
            const stripped = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber.replace(/\D/g, '')}`;
            // Must be "+" followed by 10-15 digits to be valid E.164
            if (/^\+[1-9]\d{9,14}$/.test(stripped)) {
                cleanedPhone = stripped;
            }
        }

        if (!cleanedPhone) {
            return NextResponse.json(
                { error: "Invalid phone number", message: "A valid E.164 phone number is required (e.g. +919030745240)." },
                { status: 400 }
            );
        }

        if (typeof annualIncome !== "number" || typeof monthlyExpenses !== "number") {
            return NextResponse.json(
                { error: "Incomplete onboarding data", message: "Annual income and monthly expenses are required to build your dashboard." },
                { status: 400 }
            );
        }

        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name = clerkUser.firstName
            ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim()
            : "User";

        // Before upserting, clear any stale records that might hold the same
        // unique email or phone under a *different* clerkId.  This can happen
        // when a user re-registers or when test data lingers in the DB.
        await prisma.user.deleteMany({
            where: {
                AND: [
                    { clerkId: { not: userId } },
                    {
                        OR: [
                            ...(cleanedPhone ? [{ phoneNumber: cleanedPhone }] : []),
                            ...(email ? [{ email: email }] : []),
                        ]
                    }
                ]
            }
        });

        // Upsert user into Prisma
        const user = await prisma.user.upsert({
            where: { clerkId: userId },
            update: {
                phoneNumber: cleanedPhone,
                name,
                email: email
            },
            create: {
                clerkId: userId,
                phoneNumber: cleanedPhone,
                name,
                email: email,
                role: "gig_worker"
            }
        });

        const monthlyRevenue = annualIncome / 12;
        const expenses = monthlyExpenses;
        const ebitda = monthlyRevenue - expenses;
        const margin = monthlyRevenue > 0 ? (ebitda / monthlyRevenue) * 100 : 0;
        const liquidityRatio = expenses > 0 && typeof currentBalance === "number"
            ? currentBalance / expenses
            : 0;
        const tasks = typeof ordersPerMonth === "number" ? ordersPerMonth : 0;
        const avgRate = tasks > 0 ? monthlyRevenue / tasks : 0;
        const normalizedTrustScore = typeof gigCreditScore === "number"
            ? Math.max(0, Math.min(100, Math.round(gigCreditScore / 9)))
            : 50;
        const probability = typeof approvalProbability === "number" ? approvalProbability : 0.5;
        const suggestedBudget = expenses;
        const safeEmi = typeof maxLoanAmount === "number" ? Math.round(maxLoanAmount / 12) : 0;
        const safeDays = expenses > 0 && typeof currentBalance === "number"
            ? Math.max(0, Math.round(currentBalance / (expenses / 30)))
            : 0;
        const dailyNet = Math.round((monthlyRevenue - expenses) / 30);
        const startBalance = typeof currentBalance === "number" ? currentBalance : Math.max(ebitda, 0);
        const baseForecast = Array.from({ length: 30 }, (_, index) => Math.max(0, startBalance + dailyNet * (index + 1)));
        const optimisticForecast = baseForecast.map(value => Math.round(value * 1.1));
        const stressedForecast = baseForecast.map(value => Math.max(0, Math.round(value * 0.85)));
        const riskStage = safeDays >= 30 ? "Stable" : safeDays >= 14 ? "Watchful" : "Struggling";

        await prisma.financialSnapshot.deleteMany({ where: { userId: user.id } });
        await prisma.recommendations.deleteMany({ where: { userId: user.id } });
        await prisma.forecast.deleteMany({ where: { userId: user.id } });

        await prisma.financialSnapshot.create({
            data: {
                userId: user.id,
                sector: "Gig Work",
                stage: riskStage,
                revenue: monthlyRevenue,
                expenses,
                ebitda,
                growth: 0,
                customers: tasks,
                rate: avgRate,
                months: 1,
                margin,
                liquidityRatio
            }
        });

        await prisma.recommendations.create({
            data: {
                userId: user.id,
                segment: riskStage === "Stable" ? "Stable Compounding Earners" : riskStage === "Watchful" ? "Recovery Builder" : "Needs Attention",
                score: normalizedTrustScore,
                leakAreas: {
                    debtAmount: typeof debtAmount === "number" ? debtAmount : 0,
                    savingsRate: typeof savingsRate === "number" ? savingsRate : 0
                },
                safeEmi,
                suggestedBudget
            }
        });

        await prisma.forecast.create({
            data: {
                userId: user.id,
                baseForecast,
                optimisticForecast,
                stressedForecast,
                safeDays,
                dailySaveTarget: Math.max(0, Math.round((expenses * 0.1) / 30))
            }
        });

        invalidateVoiceData(cleanedPhone);

        console.log(`[api/user/sync] Synced user ${userId} with phone ${cleanedPhone}`);
        return NextResponse.json({ success: true, user });

    } catch (error: unknown) {
        // Surface Prisma-specific errors for easier debugging
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            console.error(`[api/user/sync] Prisma error ${error.code}:`, error.message);
            if (error.code === "P2002") {
                const target = (error.meta?.target as string[])?.join(", ") || "unknown field";
                return NextResponse.json(
                    { error: "Duplicate record", message: `A user with this ${target} already exists.` },
                    { status: 409 }
                );
            }
        }
        console.error("[api/user/sync] Error:", error);
        return NextResponse.json({ error: "Failed to sync user" }, { status: 500 });
    }
}
