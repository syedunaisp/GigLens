"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2, TrendingUp, Wallet, PiggyBank, Briefcase } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

import { CsvUploader } from "@/components/analysis/CsvUploader";
import { parseCsv } from "@/lib/csv";

export default function OnboardingPage() {
    const { completeOnboarding } = useAuth();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [phoneError, setPhoneError] = useState("");

    const [formData, setFormData] = useState({
        phoneNumber: "",
        annualIncome: 300000,
        monthlyExpenses: 15000,
        debtAmount: 0,
        savingsRate: 10,
        incentives: 2000,
        platformCommission: 20,
        weeklyHours: 40,
        ordersPerMonth: 120
    });

    // E.164 validation: must start with + followed by 10-15 digits (e.g. +919030745240)
    const isValidE164 = (phone: string) => /^\+[1-9]\d{9,14}$/.test(phone);

    const handleChange = (field: string, value: number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleChangeString = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCsvUpload = async (file: File) => {
        try {
            const parsed = await parseCsv(file);
            setFormData(prev => ({
                ...prev,
                annualIncome: Math.round(parsed.totalRevenue * 12),
                monthlyExpenses: Math.round(parsed.totalExpenses)
            }));
        } catch (error) {
            console.error("Error parsing CSV:", error);
        }
    };

    const handleSubmit = async () => {
        // Validate phone number before proceeding
        if (!formData.phoneNumber.trim()) {
            setPhoneError("Phone number is required.");
            return;
        }
        if (!isValidE164(formData.phoneNumber.trim())) {
            setPhoneError("Enter a valid phone number in E.164 format (e.g. +919030745240).");
            return;
        }
        setPhoneError("");

        setIsAnalyzing(true);
        // Simulate ML Analysis Delay
        await new Promise(resolve => setTimeout(resolve, 2500));

        completeOnboarding({
            phoneNumber: formData.phoneNumber.trim(),
            annualIncome: formData.annualIncome,
            monthlyExpenses: formData.monthlyExpenses,
            debtAmount: formData.debtAmount,
            savingsRate: formData.savingsRate,
            incentives: formData.incentives,
            platformCommission: formData.platformCommission,
            weeklyHours: formData.weeklyHours,
            ordersPerMonth: formData.ordersPerMonth
        });
    };

    if (isAnalyzing) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 space-y-6">
                <div className="relative">
                    <div className="h-24 w-24 rounded-full border-4 border-slate-200 border-t-primary animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <TrendingUp className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Analyzing Financial Profile...</h2>
                    <p className="text-muted-foreground">Processing 8 data points to generate your GigLens Score</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">Build Your Financial Profile</h1>
                    <p className="text-muted-foreground">Help our AI understand your gig economy patterns</p>
                </div>

                <Card className="border-dashed border-2 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-base">Auto-fill with Bank Statement</CardTitle>
                        <CardDescription>Upload your statement (CSV) to instantly populate these fields.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CsvUploader onUpload={handleCsvUpload} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-blue-500" />
                            Income & Earnings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Phone Number <span className="text-red-500">*</span> <span className="text-xs text-muted-foreground">(E.164 format, e.g. +91...)</span></Label>
                            <Input
                                type="tel"
                                placeholder="+919030745240"
                                value={formData.phoneNumber}
                                onChange={(e) => {
                                    handleChangeString('phoneNumber', e.target.value);
                                    if (phoneError) setPhoneError("");
                                }}
                                className={phoneError ? "border-red-500 focus-visible:ring-red-500" : ""}
                                required
                            />
                            {phoneError && (
                                <p className="text-sm text-red-500">{phoneError}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Annual Income Estimate</Label>
                                <span className="font-bold text-blue-600" suppressHydrationWarning>₹{formData.annualIncome.toLocaleString()}</span>
                            </div>
                            <Slider
                                value={[formData.annualIncome]}
                                min={100000}
                                max={2000000}
                                step={10000}
                                onValueChange={(vals) => handleChange('annualIncome', vals[0])}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Avg Monthly Incentives (₹)</Label>
                                <Input
                                    type="number"
                                    value={formData.incentives}
                                    onChange={(e) => handleChange('incentives', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Platform Commission (%)</Label>
                                <Input
                                    type="number"
                                    value={formData.platformCommission}
                                    onChange={(e) => handleChange('platformCommission', Number(e.target.value))}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PiggyBank className="h-5 w-5 text-green-500" />
                            Expenses & Savings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Monthly Expenses (₹)</Label>
                            <Input
                                type="number"
                                value={formData.monthlyExpenses}
                                onChange={(e) => handleChange('monthlyExpenses', Number(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Current Debt / Loans (₹)</Label>
                            <Input
                                type="number"
                                value={formData.debtAmount}
                                onChange={(e) => handleChange('debtAmount', Number(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Target Savings Rate (%)</Label>
                                <span className="font-bold text-green-600">{formData.savingsRate}%</span>
                            </div>
                            <Slider
                                value={[formData.savingsRate]}
                                min={0}
                                max={50}
                                step={1}
                                onValueChange={(vals) => handleChange('savingsRate', vals[0])}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-orange-500" />
                            Work Patterns
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Weekly Work Hours</Label>
                            <Input
                                type="number"
                                value={formData.weeklyHours}
                                onChange={(e) => handleChange('weeklyHours', Number(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Orders Per Month</Label>
                            <Input
                                type="number"
                                value={formData.ordersPerMonth}
                                onChange={(e) => handleChange('ordersPerMonth', Number(e.target.value))}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Button
                    size="lg"
                    className="w-full text-lg font-bold h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                    onClick={handleSubmit}
                >
                    Run Financial Health Check & Enter Dashboard
                </Button>
            </div>
        </div>
    );
}
