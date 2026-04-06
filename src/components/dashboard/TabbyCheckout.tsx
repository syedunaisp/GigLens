"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, CreditCard, Calendar, Check, Zap, ChevronRight, AlertCircle } from "lucide-react";
import { useGigFin } from "@/context/GigFinContext";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";

export function TabbyCheckout() {
    const { applyForLoan, loans } = useGigFin();
    const [amount, setAmount] = useState<number>(2000);

    const activeLoan = loans.find(l => l.status === 'active');

    const handleApply = () => {
        applyForLoan(amount);
    };

    if (activeLoan) {
        // Calculate progress (mock logic for demo as we don't track paid amount in simple loan object yet)
        const progress = 25;

        return (
            <Card className="border-none shadow-xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 text-white overflow-hidden relative">
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-white/20 blur-3xl" />

                <CardHeader className="relative z-10 pb-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-xl font-bold">
                                <ShoppingBag className="h-6 w-6 text-white" />
                                Gig-Tabby Active
                            </CardTitle>
                            <CardDescription className="text-orange-50 mt-1">
                                BNPL Plan #00{activeLoan.id.slice(0, 4)}
                            </CardDescription>
                        </div>
                        <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md">
                            Active
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="relative z-10 space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-sm text-orange-50 font-medium">Remaining Balance</p>
                                <p className="text-4xl font-bold tracking-tight">₹{activeLoan.remainingAmount.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-orange-50 font-medium">Next Due</p>
                                <p className="text-xl font-semibold">₹{activeLoan.installmentAmount.toLocaleString()}</p>
                            </div>
                        </div>
                        <Progress value={progress} className="h-2 bg-white/20 text-white" />
                        <div className="flex justify-between text-xs text-orange-50">
                            <span>25% Paid</span>
                            <span>Total Loan: ₹{(activeLoan.remainingAmount / 0.75).toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-orange-600/30 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-orange-100" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Next Installment</p>
                                <p className="text-xs text-orange-100">Due by {new Date(activeLoan.nextDueDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <Button variant="secondary" size="sm" className="bg-white text-orange-700 hover:bg-orange-50 font-bold" disabled>
                            Pay Now
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-950">
            <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-purple-600" />
                            Gig-Tabby Pay Later
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Split expenses into 4 interest-free payments.
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50 dark:bg-purple-900/20">
                        0% Interest
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">

                {/* Amount Selector */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-muted-foreground">I need</label>
                        <div className="text-2xl font-bold text-purple-600">₹{amount.toLocaleString()}</div>
                    </div>

                    <Slider
                        value={[amount]}
                        min={500}
                        max={5000}
                        step={100}
                        onValueChange={(val) => setAmount(val[0])}
                        className="py-4"
                    />

                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Min: ₹500</span>
                        <span>Max: ₹5,000</span>
                    </div>
                </div>

                {/* Timeline Visualization */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800">
                    <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                        Repayment Schedule
                    </h4>

                    <div className="relative flex justify-between">
                        {/* Connecting Line */}
                        <div className="absolute top-3 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-700 -z-10" />

                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 ring-4 ring-slate-50 dark:ring-slate-900
                                    ${i === 0 ? "bg-green-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
                                    {i === 0 ? <Check className="h-3 w-3" /> : i + 1}
                                </div>
                                <div className="text-center">
                                    <div className="text-xs font-medium">{i === 0 ? "Today" : `+${i * 2}w`}</div>
                                    <div className="text-xs font-bold mt-0.5">₹{Math.round(amount / 4)}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-dashed flex gap-2 text-xs text-muted-foreground">
                        <AlertCircle className="h-4 w-4 text-blue-500" />
                        <span>First payment of ₹{Math.round(amount / 4)} required at checkout.</span>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="bg-slate-50/50 dark:bg-slate-900/50 pt-4 pb-6">
                <Button onClick={handleApply} className="w-full h-12 text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/20 transition-all">
                    Get ₹{amount.toLocaleString()} Now
                    <ChevronRight className="ml-2 h-5 w-5 opacity-80" />
                </Button>
            </CardFooter>
        </Card>
    );
}
