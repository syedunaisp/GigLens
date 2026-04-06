"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function SchemesPopup() {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Check if we've already shown the popup specifically for this session/user
        // For demo purposes, we'll show it if it hasn't been seen in the last 24 hours
        const lastSeen = localStorage.getItem("gigfin_schemes_popup_seen");
        const now = new Date().getTime();

        if (!lastSeen || now - parseInt(lastSeen) > 24 * 60 * 60 * 1000) {
            // Delay slightly for better UX
            const timer = setTimeout(() => setOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setOpen(false);
        localStorage.setItem("gigfin_schemes_popup_seen", new Date().getTime().toString());
    };

    const handleCheckEligibility = () => {
        handleClose();
        router.push("/schemes");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="mx-auto bg-green-100 p-3 rounded-full mb-2 w-fit">
                        <ShieldCheck className="h-8 w-8 text-green-600" />
                    </div>
                    <DialogTitle className="text-center text-xl">
                        Free ₹5 Lakh Health Cover
                    </DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        Did you know gig workers are now eligible for <strong>Ayushman Bharat</strong> benefits?
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg text-sm space-y-2 border">
                    <div className="flex items-start gap-2">
                        <span className="text-green-500">✓</span>
                        <span>Free hospitalization up to ₹5 Lakhs/year</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-green-500">✓</span>
                        <span>Covers you and your family</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-green-500">✓</span>
                        <span>Cashless treatment at 27,000+ hospitals</span>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-col gap-2 mt-2">
                    <Button onClick={handleCheckEligibility} className="w-full bg-green-600 hover:bg-green-700 text-white">
                        Check Eligibility & Apply
                    </Button>
                    <Button variant="ghost" onClick={handleClose} className="w-full">
                        Remind Me Later
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
