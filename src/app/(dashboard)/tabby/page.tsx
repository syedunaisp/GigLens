"use client";

import { TabbyCheckout } from "@/components/dashboard/TabbyCheckout";

export default function TabbyPage() {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Gig-Tabby</h2>
                <p className="text-muted-foreground">Buy now, pay later with 0% interest for gig workers.</p>
            </div>
            <div className="w-full max-w-md">
                <TabbyCheckout />
            </div>
        </div>
    );
}
