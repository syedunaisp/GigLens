"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useGigFin } from './GigFinContext';
import { getGigWorkerPrediction } from '@/lib/api';
import { useUser, useClerk } from '@clerk/nextjs';

interface User {
    email: string;
    name: string;
}

interface FinancialData {
    phoneNumber: string;
    annualIncome: number;
    monthlyExpenses: number;
    debtAmount: number;
    savingsRate: number; // as percentage 0-100
    incentives: number;
    platformCommission: number;
    weeklyHours: number;
    ordersPerMonth: number;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    onboardingComplete: boolean;
    login: (email: string, name: string) => void;
    logout: () => void;
    completeOnboarding: (data: FinancialData) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn } = useUser();
    const { signOut } = useClerk();
    const [onboardingComplete, setOnboardingComplete] = useState(false);

    const router = useRouter();
    const pathname = usePathname();
    const { updateUserProfile, initializeUserTransactions, updateAppConfig } = useGigFin();

    // Derived user object to match interface
    const user: User | null = clerkUser ? {
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        name: clerkUser.fullName || clerkUser.username || "User"
    } : null;

    // Load Onboarding State
    useEffect(() => {
        if (isClerkLoaded && isSignedIn && clerkUser) {
            const storedOnboarding = localStorage.getItem(`gigfin_onboarding_${clerkUser.id}`);
            if (storedOnboarding === 'true') {
                setOnboardingComplete(true);
            } else {
                setOnboardingComplete(false);
            }
        }
    }, [isClerkLoaded, isSignedIn, clerkUser]);

    // Route Protection
    useEffect(() => {
        if (!isClerkLoaded) return;

        // Root page handles its own auth check to prevent hydration mismatch
        if (pathname === '/') return;

        const publicRoutes = ['/signup', '/login', '/sign-in', '/sign-up'];
        const isPublicRoute = publicRoutes.some(p => pathname.startsWith(p));

        if (isSignedIn && !onboardingComplete && !pathname.startsWith('/onboarding')) {
            // Logged in but hasn't completed onboarding - force to onboarding
            router.push('/onboarding');
        } else if (isSignedIn && onboardingComplete && isPublicRoute) {
            // Logged in + onboarded + on public route - redirect to /land
            router.push('/land');
        } else if (!isSignedIn && !isPublicRoute && pathname !== '/') {
            // Not logged in and trying to access protected route (although Middleware should catch this too)
            router.push('/login');
        }
    }, [isSignedIn, onboardingComplete, pathname, isClerkLoaded, router]);

    const login = (email: string, name: string) => {
        // Legacy support: redirect to Clerk login
        router.push('/login');
    };

    const logout = async () => {
        await signOut();
        setOnboardingComplete(false);
        router.push('/');
    };

    const completeOnboarding = async (data: FinancialData) => {
        try {
            // Prepare data for ML API
            const predictionData = {
                annual_income: data.annualIncome,
                incentives: data.incentives,
                platform_commission: data.platformCommission,
                total_expenses: data.monthlyExpenses,
                weekly_work_hours: data.weeklyHours,
                orders_per_month: data.ordersPerMonth,
                debt_amount: data.debtAmount,
                savings_rate: data.savingsRate
            };

            let predictions = {
                gig_credit_score: 650,
                approval_probability: 0.5,
                max_loan_amount: 10000
            };

            // Call ML API with Fallback
            try {
                const response = await getGigWorkerPrediction(predictionData);
                // Ensure approval_probability is always a number
                const apiPredictions = { ...response.predictions };
                if (typeof apiPredictions.approval_probability === 'string') {
                    // Convert string percentages like "80%" to 0.8, or "High"/"Medium" to numbers
                    if (apiPredictions.approval_probability.includes('%')) {
                        apiPredictions.approval_probability = parseFloat(apiPredictions.approval_probability) / 100;
                    } else if (apiPredictions.approval_probability === 'High') {
                        apiPredictions.approval_probability = 0.8;
                    } else if (apiPredictions.approval_probability === 'Medium') {
                        apiPredictions.approval_probability = 0.6;
                    } else if (apiPredictions.approval_probability === 'Low') {
                        apiPredictions.approval_probability = 0.3;
                    } else {
                        apiPredictions.approval_probability = 0.5; // default
                    }
                }
                // Type assertion to ensure TypeScript knows approval_probability is now a number
                predictions = {
                    ...predictions,
                    ...apiPredictions,
                    approval_probability: apiPredictions.approval_probability as number
                };
                console.log("ML Prediction Results:", predictions);
            } catch (apiError) {
                console.warn("Backend API Failed, using local fallback:", apiError);
                // Fallback Logic: Calculate basic score locally so user isn't stuck
                const ratio = data.debtAmount / (data.annualIncome / 12);
                const safeScore = ratio > 0.5 ? 600 : 750;
                predictions.gig_credit_score = safeScore;
                predictions.approval_probability = safeScore > 700 ? 0.8 : 0.6;
                predictions.max_loan_amount = Math.round((data.annualIncome / 12) * 2);
            }

            // Sync User to Prisma Backend Route — phoneNumber is now mandatory
            try {
                const currentBalance = Math.max(Math.round(data.annualIncome / 12) - data.monthlyExpenses, 0);

                const syncRes = await fetch('/api/user/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phoneNumber: data.phoneNumber,
                        annualIncome: data.annualIncome,
                        monthlyExpenses: data.monthlyExpenses,
                        debtAmount: data.debtAmount,
                        savingsRate: data.savingsRate,
                        incentives: data.incentives,
                        platformCommission: data.platformCommission,
                        weeklyHours: data.weeklyHours,
                        ordersPerMonth: data.ordersPerMonth,
                        gigCreditScore: predictions.gig_credit_score,
                        approvalProbability: predictions.approval_probability,
                        maxLoanAmount: predictions.max_loan_amount,
                        currentBalance
                    })
                });

                if (!syncRes.ok) {
                    const syncData = await syncRes.json().catch(() => ({}));
                    console.error("User sync failed:", syncRes.status, syncData);
                    // Don't silently continue — the phone number must be in the DB
                    // for "Talk to AI Assistant" to work later
                    throw new Error(syncData.message || "Failed to save your phone number. Please try again.");
                }
            } catch (syncError) {
                // Re-throw so the outer catch block shows the alert
                if (syncError instanceof Error) throw syncError;
                console.error("Failed to sync user to database:", syncError);
                throw new Error("Failed to save your profile. Please check your connection and try again.");
            }

            // Update Global Context with Predicted values
            updateUserProfile({
                name: user?.name || 'User',
                currentBalance: Math.round(data.annualIncome / 12) - data.monthlyExpenses,
                annualIncome: data.annualIncome,
                monthlyExpenses: data.monthlyExpenses,
                occupation: 'Gig Worker',
                email: user?.email || '',
                goals: [{
                    id: 'init-1',
                    title: 'Emergency Fund',
                    targetAmount: Math.round(data.annualIncome * 0.2),
                    currentAmount: 0,
                    deadline: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
                    priority: 'High',
                    category: 'Emergency'
                }],
                // Map ML predictions to profile
                gigCreditScore: predictions.gig_credit_score,
                approvalProbability: predictions.approval_probability || "Medium",
                maxLoanAmount: predictions.max_loan_amount || 0

            });

            // Generate Synthetic Transactions based on Input
            initializeUserTransactions(data.annualIncome, data.monthlyExpenses);
            updateAppConfig({
                dailyTarget: Math.max(Math.round((data.annualIncome / 12) / 25), 100)
            });

            // Persist Onboarding Status using Clerk ID if available
            if (clerkUser) {
                localStorage.setItem(`gigfin_onboarding_${clerkUser.id}`, 'true');
            }
            setOnboardingComplete(true);

            // Redirect to /land (main hub with VoiceAgent)
            router.push('/land');
        } catch (error) {
            console.error("Onboarding Fatal Error:", error);
            alert("Something went wrong. Please try again.");
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!isSignedIn,
            onboardingComplete,
            login,
            logout,
            completeOnboarding
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
