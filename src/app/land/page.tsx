"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import VoiceAgent from "@/components/VoiceAgent";
import { Activity, Shield, TrendingUp, ArrowRight, Phone, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

export default function LandingPage() {
    const router = useRouter();
    const { language, toggleLanguage, setLanguage, t } = useLanguage();

    const [callStatus, setCallStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [callMessage, setCallMessage] = useState("");

    const handleTalkToAssistant = async () => {
        setCallStatus("loading");
        setCallMessage("");

        try {
            const res = await fetch("/api/call-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();

            if (!res.ok) {
                // Surface backend error messages (e.g. "Please add your phone number")
                setCallStatus("error");
                setCallMessage(data.message || data.error || "Failed to initiate call.");
                return;
            }

            setCallStatus("success");
            setCallMessage("Call initiated! You will receive a call shortly.");

            // Reset back to idle after 6 seconds
            setTimeout(() => {
                setCallStatus("idle");
                setCallMessage("");
            }, 6000);
        } catch (err) {
            setCallStatus("error");
            setCallMessage("Network error. Please try again.");
        }
    };

    const dismissCallMessage = () => {
        setCallStatus("idle");
        setCallMessage("");
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col font-sans">
            {/* Navbar */}
            {/* Navbar */}
            <Navbar />

            {/* Hero Section */}
            <main className="flex-1">
                <section className="container mx-auto px-6 py-20 flex flex-col items-center text-center space-y-8">
                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl">
                        See Your Financial Future <span className="text-orange-600">Clearly</span>.
                    </h1>

                    <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                        A smart stability system for India's gig workforce. Understand earnings, detect leakage, and forecast cashflow with GigLens.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                        <Link href="/dashboard">
                            <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white min-w-[160px] h-12 text-lg">
                                Get Started <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link href="/demo">
                            <Button size="lg" variant="outline" className="min-w-[160px] h-12 text-lg">
                                View Demo
                            </Button>
                        </Link>
                    </div>

                    {/* Voice Agent - Integrated Centrally */}
                    <div className="w-full max-w-md mt-12 p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <p className="text-sm font-medium text-slate-500 mb-4 uppercase tracking-wider">Or just ask GigLens</p>
                        <div className="flex justify-center">
                            <VoiceAgent variant="landing" />
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="container mx-auto px-6 py-16">
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* GigLens Scorecard */}
                        <Card className="hover:shadow-lg transition-all hover:border-orange-200 group">
                            <CardContent className="p-8 space-y-4">
                                <div className="h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                                    <Activity className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">GigLens Scorecard</h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Get a comprehensive financial health score based on margin, liquidity, and stability.
                                </p>
                            </CardContent>
                        </Card>

                        {/* LeakShield Guardrails */}
                        <Card className="hover:shadow-lg transition-all hover:border-orange-200 group">
                            <CardContent className="p-8 space-y-4">
                                <div className="h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                                    <Shield className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">LeakShield Guardrails</h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Detect budget leaks and get smart alerts to stay within safe EMI limits.
                                </p>
                            </CardContent>
                        </Card>

                        {/* FlowForward */}
                        <Card className="hover:shadow-lg transition-all hover:border-orange-200 group">
                            <CardContent className="p-8 space-y-4">
                                <div className="h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                                    <TrendingUp className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">FlowForward</h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Behavioral cashflow forecasting to predict safe days and savings targets.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t bg-slate-50 dark:bg-slate-950 py-12">
                <div className="container mx-auto px-6 text-center text-slate-500 text-sm">
                    <p>© 2024 GigLens. All rights reserved.</p>
                </div>
            </footer>

            {/* Sticky "Talk to AI Assistant" Button */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
                {/* Status Toast */}
                {callMessage && (
                    <div
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-xs animate-in fade-in slide-in-from-bottom-2 ${
                            callStatus === "error"
                                ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                                : "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                        }`}
                    >
                        <span>{callMessage}</span>
                        <button
                            onClick={dismissCallMessage}
                            className="ml-1 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                            aria-label="Dismiss"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}

                {/* Call Button */}
                <Button
                    onClick={handleTalkToAssistant}
                    disabled={callStatus === "loading"}
                    size="lg"
                    className="h-14 px-6 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-xl hover:shadow-2xl transition-all text-base font-semibold disabled:opacity-80"
                >
                    {callStatus === "loading" ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Connecting...
                        </>
                    ) : (
                        <>
                            <Phone className="mr-2 h-5 w-5" />
                            Talk to AI Assistant
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
