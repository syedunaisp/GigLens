"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Heart, UserCheck, ExternalLink } from "lucide-react";

export default function SchemesPage() {
    const schemes = [
        {
            title: "Ayushman Bharat (PM-JAY)",
            description: "Free health coverage of up to ₹5 Lakh per family per year.",
            icon: Heart,
            color: "text-red-500",
            bg: "bg-red-50 dark:bg-red-900/20",
            benefits: [
                "Cashless treatment at 27,000+ hospitals",
                "Covers 1,900+ medical procedures",
                "No restriction on family size/age",
                "Pre-existing diseases covered from day 1"
            ],
            eligibility: "Gig workers registered on e-Shram portal",
            link: "https://setu.pmjay.gov.in/setu/"
        },
        {
            title: "e-Shram Card",
            description: "National Database of Unorganized Workers for social security benefits.",
            icon: UserCheck,
            color: "text-blue-500",
            bg: "bg-blue-50 dark:bg-blue-900/20",
            benefits: [
                "Accident Insurance Cover of ₹2 Lakh",
                "Universal Account Number (UAN)",
                "Eligibility for Pension (PM-SYM)",
                "Skill development opportunities"
            ],
            eligibility: "Any unorganized worker (16-59 years)",
            link: "https://register.eshram.gov.in/"
        },
        {
            title: "PMSBY (Accident Insurance)",
            description: "Pradhan Mantri Suraksha Bima Yojana for accidental death/disability.",
            icon: ShieldCheck,
            color: "text-green-500",
            bg: "bg-green-50 dark:bg-green-900/20",
            benefits: [
                "₹2 Lakh for accidental death",
                "₹2 Lakh for total permanent disability",
                "₹1 Lakh for partial permanent disability",
                "Very low premium: ₹20 per year"
            ],
            eligibility: "Bank account holders (18-70 years)",
            link: "https://www.jansuraksha.gov.in/"
        }
    ];

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Government Schemes</h2>
                <p className="text-muted-foreground">
                    Unlock exclusive benefits and social security coverage designed for gig workers.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {schemes.map((scheme, index) => (
                    <Card key={index} className="flex flex-col">
                        <CardHeader>
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${scheme.bg}`}>
                                <scheme.icon className={`h-6 w-6 ${scheme.color}`} />
                            </div>
                            <CardTitle className="text-xl">{scheme.title}</CardTitle>
                            <CardDescription>{scheme.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <h4 className="font-semibold text-sm mb-2">Key Benefits:</h4>
                            <ul className="space-y-2">
                                {scheme.benefits.map((benefit, i) => (
                                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                        <span className="text-green-500 mt-0.5" >✓</span>
                                        <span className="flex-1">{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-4 pt-4 border-t">
                                <h4 className="font-semibold text-sm mb-1">Eligibility:</h4>
                                <p className="text-xs text-muted-foreground">{scheme.eligibility}</p>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" variant="outline" asChild>
                                <a href={scheme.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                    Register Now <ExternalLink className="h-4 w-4" />
                                </a>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <div className="rounded-lg bg-slate-100 dark:bg-slate-900 p-6 mt-8">
                <h3 className="font-bold text-lg mb-2">Why apply?</h3>
                <p className="text-sm text-muted-foreground">
                    The Government of India has introduced several initiatives to support gig and platform workers.
                    Registering for these schemes provides a safety net against health emergencies, accidents, and
                    secures your financial future. As a GigLens user, we highly verify your profile score if you are insured.
                </p>
            </div>
        </div>
    );
}
