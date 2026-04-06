"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobCard } from "@/components/jobs/JobCard";
import { CareerPath } from "@/components/jobs/CareerPath";
import { MOCK_JOBS } from "@/data/mockJobs";
import { useGigFin } from "@/context/GigFinContext";
import { Briefcase, TrendingUp } from "lucide-react";

export default function JobsPage() {
    const { userProfile } = useGigFin();
    const [activeTab, setActiveTab] = useState("feed");

    // Simple Matching Logic
    const matchedJobs = MOCK_JOBS.map(job => {
        let matchReason = undefined;
        let score = 0;

        // Logic 1: High Consistency -> Quick Commerce
        if (job.requirements.minConsistency && userProfile.gigCreditScore > 600) {
            matchReason = "Matches your high consistency";
            score += 10;
        }

        // Logic 2: Bike Owner
        if (job.requirements.requiresBike) {
            // Assuming user has bike for demo
            score += 5;
        }

        return { ...job, matchReason, score };
    }).sort((a, b) => b.score - a.score);

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Career Growth</h2>
            </div>

            <Tabs defaultValue="feed" className="w-full" onValueChange={setActiveTab}>
                <div className="py-2">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="feed" className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            Jobs For You
                        </TabsTrigger>
                        <TabsTrigger value="career" className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Career Path
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="feed" className="mt-4 space-y-4">
                    {matchedJobs.map(job => (
                        <JobCard key={job.id} job={job} matchReason={job.matchReason} />
                    ))}
                </TabsContent>

                <TabsContent value="career" className="mt-4">
                    <CareerPath />
                </TabsContent>
            </Tabs>
        </div>
    );
}
