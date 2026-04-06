"use client";

import dynamic from 'next/dynamic';
import { useGigFin } from "@/context/GigFinContext";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ScoreCard } from "@/components/dashboard/ScoreCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { CreditScore } from "@/components/dashboard/CreditScore";
import { StreakHeader } from "@/components/dashboard/StreakHeader";
import { DollarSign, CreditCard, Droplets, Loader2 } from "lucide-react";

const AdvancedFeaturesGrid = dynamic(() => import("@/components/dashboard/AdvancedFeaturesGrid").then(mod => mod.AdvancedFeaturesGrid), { ssr: false });
const QuickAddTransaction = dynamic(() => import("@/components/dashboard/QuickAddTransaction").then(mod => mod.QuickAddTransaction), { ssr: false });
import { SchemesPopup } from "@/components/dashboard/SchemesPopup";

export default function DashboardPage() {
    const { transactions, userProfile, calculateKarmaScore } = useGigFin();
    const { t } = useLanguage();

    if (!userProfile) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading Financial Profile...</span>
            </div>
        );
    }

    // Derived Metrics
    const karmaScore = calculateKarmaScore();

    // Calculate Streak
    const streak = userProfile.appStreak || 0;

    // Calculate Financials
    const totalRevenue = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const expenseRatio = totalRevenue > 0 ? totalExpenses / totalRevenue : 0;

    return (
        <div className="space-y-6">
            <SchemesPopup />
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">{t.dashboard}</h2>
                <div className="flex items-center space-x-2">
                    <LanguageToggle />
                </div>
            </div>

            {/* Streak & Level Header */}
            <StreakHeader streak={streak} />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <ScoreCard title={t.trust} score={karmaScore} segment="Growth Striver" />

                <MetricCard
                    title={t.current_balance}
                    value={`₹${userProfile.currentBalance.toLocaleString()}`}
                    description={t.available_liquidity}
                    icon={DollarSign}
                />

                <MetricCard
                    title={t.expense_ratio}
                    value={`${(expenseRatio * 100).toFixed(1)}%`}
                    description="Target: < 50%"
                    icon={CreditCard}
                />

                <MetricCard
                    title={t.earned}
                    value={`₹${(totalRevenue - totalExpenses).toLocaleString()}`}
                    description={`${t.earned} - ${t.spent}`}
                    icon={Droplets}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 space-y-4">
                    <CreditScore title={t.support} score={userProfile.gigCreditScore} />
                    <RevenueChart title={t.earned} />
                </div>

                <div className="col-span-3 grid gap-4">
                    <QuickAddTransaction />

                    {/* Recent Activity */}
                    <div className="rounded-xl border bg-card text-card-foreground shadow">
                        <div className="flex flex-col space-y-1.5 p-6">
                            <h3 className="font-semibold leading-none tracking-tight">Recent Activity</h3>
                        </div>
                        <div className="p-6 pt-0">
                            <div className="space-y-4">
                                {transactions.slice(0, 5).map((t) => (
                                    <div key={t.id} className="flex items-center">
                                        <div className="ml-4 space-y-1">
                                            <p className="text-sm font-medium leading-none">{t.category}</p>
                                            <p className="text-sm text-muted-foreground">{t.date}</p>
                                        </div>
                                        <div className={`ml-auto font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.type === 'income' ? '+' : '-'}₹{t.amount}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Financial Scientist Section */}
            <AdvancedFeaturesGrid title={t.voice_help} />
        </div>
    );
}
