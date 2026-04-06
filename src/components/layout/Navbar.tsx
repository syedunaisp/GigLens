"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import { Bell, Menu, User as UserIcon, LayoutDashboard, Briefcase, Target, LogOut, Activity, CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
    const pathname = usePathname();
    const { user, isAuthenticated, logout } = useAuth();

    const routes = [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            href: "/dashboard",
            color: "text-sky-500",
        },
        {
            label: "Jobs",
            icon: Briefcase,
            href: "/jobs",
            color: "text-violet-500",
        },
        {
            label: "Gig-Tabby",
            icon: CreditCard,
            href: "/tabby",
            color: "text-purple-500",
        },
        {
            label: "Schemes",
            icon: ShieldCheck,
            href: "/schemes",
            color: "text-green-600",
        },
        {
            label: "Goals",
            icon: Target,
            href: "/goals",
            color: "text-orange-700",
        },
    ];

    return (
        <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-6">
                {/* Mobile Menu Trigger */}
                <div className="lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="-ml-2">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-72 p-6">
                            <div className="flex items-center gap-2 mb-8 text-primary">
                                <Activity className="h-8 w-8" />
                                <span className="font-bold text-lg">GigLens</span>
                            </div>
                            <nav className="flex flex-col gap-2">
                                {routes.map((route) => (
                                    <Link
                                        key={route.href}
                                        href={route.href}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
                                            pathname === route.href
                                                ? "bg-muted text-foreground"
                                                : "text-muted-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        <route.icon className={cn("h-5 w-5", route.color)} />
                                        {route.label}
                                    </Link>
                                ))}
                                <Button
                                    onClick={logout}
                                    variant="ghost"
                                    className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-muted/50 mt-4"
                                >
                                    <LogOut className="h-5 w-5 mr-3 text-red-500" />
                                    Logout
                                </Button>
                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Logo */}
                <Link href={isAuthenticated ? "/land" : "/"} className="flex items-center gap-2 text-primary hover:text-primary/90 transition-colors">
                    <Activity className="h-8 w-8" />
                    <span className="font-bold text-lg hidden md:block">GigLens</span>
                </Link>

                {/* Desktop Navigation */}
                {isAuthenticated && (
                    <nav className="hidden lg:flex items-center gap-6 ml-6">
                        {routes.map((route) => (
                            <Link
                                key={route.href}
                                href={route.href}
                                className={cn(
                                    "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                                    pathname === route.href
                                        ? "text-foreground"
                                        : "text-muted-foreground"
                                )}
                            >
                                <route.icon className={cn("h-4 w-4", route.color)} />
                                {route.label}
                            </Link>
                        ))}
                    </nav>
                )}
            </div>

            <div className="flex items-center gap-4">
                {isAuthenticated ? (
                    <>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative">
                                    <Bell className="h-5 w-5 text-muted-foreground" />
                                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive animate-pulse" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[300px]">
                                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <div className="max-h-[300px] overflow-y-auto">
                                    <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 focus:bg-muted cursor-pointer">
                                        <div className="flex items-center gap-2 w-full">
                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">New Scheme</Badge>
                                            <span className="text-xs text-muted-foreground ml-auto">Just now</span>
                                        </div>
                                        <p className="font-medium text-sm">Ayushman Bharat Eligibility</p>
                                        <p className="text-xs text-muted-foreground">You are eligible for ₹5 Lakh health cover. Register now via e-Shram.</p>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 focus:bg-muted cursor-pointer">
                                        <div className="flex items-center gap-2 w-full">
                                            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Insurance</Badge>
                                            <span className="text-xs text-muted-foreground ml-auto">2h ago</span>
                                        </div>
                                        <p className="font-medium text-sm">Pradhan Mantri Suraksha Bima</p>
                                        <p className="text-xs text-muted-foreground">Secure your family with ₹2 Lakh accident cover for just ₹20/year.</p>
                                    </DropdownMenuItem>
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Link href="/profile">
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <div className="bg-primary/10 p-1 rounded-full">
                                    <UserIcon className="h-5 w-5 text-primary" />
                                </div>
                            </Button>
                        </Link>
                    </>
                ) : (
                    <div className="flex items-center gap-2">
                        <Link href="/login">
                            <Button variant="ghost">Login</Button>
                        </Link>
                        <Link href="/signup">
                            <Button>Get Started</Button>
                        </Link>
                    </div>
                )}
            </div>
        </header>
    );
}
