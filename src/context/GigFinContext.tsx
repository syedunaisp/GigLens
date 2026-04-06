"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';

// --- Types ---

export interface Transaction {
    id: string;
    type: 'income' | 'expense' | 'withdrawal';
    amount: number;
    category: string;
    date: string; // YYYY-MM-DD
    description?: string;
}

export interface Loan {
    id: string;
    totalAmount: number;
    remainingAmount: number;
    installmentAmount: number;
    nextDueDate: string;
    status: 'active' | 'paid' | 'defaulted';
}

export interface BankDetails {
    accountNo: string;
    ifsc: string;
    bankName: string;
}

export interface Goal {
    id: string;
    title: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string; // YYYY-MM-DD
    priority: 'High' | 'Medium' | 'Low';
    category: 'Personal' | 'Emergency' | 'Travel' | 'Gadget' | 'Work';
}

export interface UserProfile {
    name: string;
    age: number;
    gender: string;
    occupation: string;
    email: string;
    location: string;
    bankDetails: BankDetails;
    currentBalance: number; // Acts as walletBalance
    goals: Goal[];
    appStreak: number;
    theme: 'dark' | 'light';
    annualIncome: number;
    monthlyExpenses: number;
    // ML Predicted Fields
    gigCreditScore: number;
    approvalProbability: number | string;
    maxLoanAmount: number;
}

export interface AppConfig {
    fuelPrice: number;
    dailyTarget: number;
}

interface GigFinContextType {
    transactions: Transaction[];
    loans: Loan[];
    userProfile: UserProfile;
    appConfig: AppConfig;
    isDataLoaded: boolean; // Indicates if localStorage data has been loaded
    addTransaction: (data: Omit<Transaction, 'id'>) => void;
    applyForLoan: (amount: number) => void;
    withdrawMoney: (amount: number) => { success: boolean; message: string };
    calculateKarmaScore: () => number;
    updateAppConfig: (config: Partial<AppConfig>) => void;
    updateUserProfile: (profile: Partial<UserProfile>) => void;
    toggleTheme: () => void;
    initializeUserTransactions: (income: number, expenses: number) => void;
}

// --- Initial Data ---

const INITIAL_TRANSACTIONS: Transaction[] = [];

function createInitialProfile(name?: string, email?: string): UserProfile {
    return {
        name: name || 'User',
        age: 28,
        gender: 'Prefer not to say',
        occupation: 'Gig Worker',
        email: email || '',
        location: 'India',
        bankDetails: {
            accountNo: '',
            ifsc: '',
            bankName: ''
        },
        currentBalance: 0,
        goals: [],
        appStreak: 0,
        theme: 'light',
        annualIncome: 0,
        monthlyExpenses: 0,
        gigCreditScore: 0,
        approvalProbability: 0,
        maxLoanAmount: 0
    };
}

const INITIAL_CONFIG: AppConfig = {
    fuelPrice: 102,
    dailyTarget: 800,
};

// --- Context ---

const GigFinContext = createContext<GigFinContextType | undefined>(undefined);

export function GigFinProvider({ children }: { children: ReactNode }) {
    const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn } = useUser();
    const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile>(createInitialProfile());
    const [appConfig, setAppConfig] = useState<AppConfig>(INITIAL_CONFIG);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load per-user state from LocalStorage
    useEffect(() => {
        if (!isClerkLoaded) return;

        const baseProfile = createInitialProfile(
            clerkUser?.fullName || clerkUser?.username || 'User',
            clerkUser?.primaryEmailAddress?.emailAddress || ''
        );

        if (!isSignedIn || !clerkUser) {
            setTransactions(INITIAL_TRANSACTIONS);
            setLoans([]);
            setUserProfile(baseProfile);
            setAppConfig(INITIAL_CONFIG);
            setIsLoaded(true);
            return;
        }

        const storageKey = `gigfin_data_${clerkUser.id}`;
        const savedData = localStorage.getItem(storageKey);

        if (savedData) {
            try {
                const parsed = JSON.parse(savedData) as {
                    transactions?: Transaction[];
                    loans?: Loan[];
                    userProfile?: UserProfile;
                    appConfig?: AppConfig;
                };
                setTransactions(parsed.transactions || INITIAL_TRANSACTIONS);
                setLoans(parsed.loans || []);
                setUserProfile({ ...baseProfile, ...parsed.userProfile });
                setAppConfig(parsed.appConfig || INITIAL_CONFIG);
            } catch (e) {
                console.error('Failed to load data', e);
                setTransactions(INITIAL_TRANSACTIONS);
                setLoans([]);
                setUserProfile(baseProfile);
                setAppConfig(INITIAL_CONFIG);
            }
        } else {
            setTransactions(INITIAL_TRANSACTIONS);
            setLoans([]);
            setUserProfile(baseProfile);
            setAppConfig(INITIAL_CONFIG);
        }

        setIsLoaded(true);
    }, [isClerkLoaded, isSignedIn, clerkUser]);

    // Save to user-scoped LocalStorage
    useEffect(() => {
        if (!isLoaded || !clerkUser) return;

        localStorage.setItem(`gigfin_data_${clerkUser.id}`, JSON.stringify({
            transactions,
            loans,
            userProfile,
            appConfig
        }));
    }, [transactions, loans, userProfile, appConfig, isLoaded, clerkUser]);

    // Theme Effect
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(userProfile.theme);
    }, [userProfile.theme]);

    // --- Logic Layer ---

    const calculateKarmaScore = () => {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);

        const recentTx = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= sevenDaysAgo && tDate <= today && t.type === 'income';
        });

        const uniqueDaysWorked = new Set(recentTx.filter(t => t.amount > 0).map(t => t.date)).size;
        const consistencyScore = (uniqueDaysWorked / 7) * 40;

        const totalEarnings = recentTx.reduce((sum, t) => sum + t.amount, 0);
        const avgEarnings = uniqueDaysWorked > 0 ? totalEarnings / uniqueDaysWorked : 0;
        const performanceScore = avgEarnings >= appConfig.dailyTarget ? 30 : (avgEarnings > 0 ? 15 : 0);

        // Simple streak calculation
        const loyaltyScore = Math.min(userProfile.appStreak * 2, 30);

        return Math.min(Math.round(consistencyScore + performanceScore + loyaltyScore), 100);
    };

    const addTransaction = (data: Omit<Transaction, 'id'>) => {
        const newTx: Transaction = { ...data, id: Date.now().toString() };
        setTransactions(prev => [newTx, ...prev]);

        if (data.type === 'income') {
            setUserProfile(prev => ({ ...prev, currentBalance: prev.currentBalance + data.amount }));
        } else {
            setUserProfile(prev => ({ ...prev, currentBalance: prev.currentBalance - data.amount }));
        }
    };

    const applyForLoan = (amount: number) => {
        if (userProfile.currentBalance <= 0) {
            alert("Insufficient balance history to approve loan.");
            return;
        }

        const newLoan: Loan = {
            id: Date.now().toString(),
            totalAmount: amount,
            remainingAmount: amount,
            installmentAmount: amount / 4,
            nextDueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            status: 'active'
        };

        setLoans(prev => [...prev, newLoan]);

        addTransaction({
            type: 'income',
            amount: amount,
            category: 'Gig-Tabby Loan',
            date: new Date().toISOString().split('T')[0],
            description: 'Loan Disbursement'
        });
    };

    const withdrawMoney = (amount: number): { success: boolean; message: string } => {
        if (amount > userProfile.currentBalance) {
            return { success: false, message: 'Insufficient Funds' };
        }

        addTransaction({
            type: 'withdrawal',
            category: 'Salary Transfer',
            amount: amount,
            date: new Date().toISOString().split('T')[0],
            description: 'Instant Withdrawal'
        });

        return { success: true, message: 'Transfer Initiated' };
    };

    const updateAppConfig = (config: Partial<AppConfig>) => {
        setAppConfig(prev => ({ ...prev, ...config }));
    };

    const updateUserProfile = (profile: Partial<UserProfile>) => {
        setUserProfile(prev => ({ ...prev, ...profile }));
    };

    const toggleTheme = () => {
        setUserProfile(prev => ({
            ...prev,
            theme: prev.theme === 'light' ? 'dark' : 'light'
        }));
    };

    const initializeUserTransactions = (annualIncome: number, monthlyExpenses: number) => {
        const newTransactions: Transaction[] = [];
        const today = new Date();
        const monthlyIncome = Math.round(annualIncome / 12);

        // Deterministic generation: STRICTLY matches the Monthly Income
        // We simulate 30 days. We want the SUM of income transactions to equal monthlyIncome.
        // Let's assume 25 working days.
        const workingDays = 25;
        const baseDailyIncome = Math.floor(monthlyIncome / workingDays);
        const remainderIncome = monthlyIncome - (baseDailyIncome * workingDays);

        const dailyExpense = Math.floor(monthlyExpenses / 30);
        const remainderExpense = monthlyExpenses - (dailyExpense * 30);

        let incomeAccumulator = 0;
        let expenseAccumulator = 0;

        // Generate last 30 days of activity
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            // Add Income (Work 25 days out of 30)
            // Skip indices 6, 13, 20, 27 (Rest days)
            if (i !== 6 && i !== 13 && i !== 20 && i !== 27 && i !== 28) {
                let amount = baseDailyIncome;
                // Distribute remainder on first few days
                if (incomeAccumulator < monthlyIncome) {
                    if (remainderIncome > 0 && i < remainderIncome) amount += 1;
                }

                newTransactions.push({
                    id: `inc-${i}`,
                    type: 'income',
                    amount: amount,
                    category: 'Uber',
                    date: dateStr,
                    description: 'Daily Payout'
                });
                incomeAccumulator += amount;
            }

            // Add Daily Expense
            let expenseAmount = dailyExpense;
            if (i < remainderExpense) expenseAmount += 1;

            if (expenseAmount > 0) {
                newTransactions.push({
                    id: `exp-${i}`,
                    type: 'expense',
                    amount: expenseAmount,
                    category: i % 2 === 0 ? 'Fuel' : 'Food',
                    date: dateStr,
                    description: i % 2 === 0 ? 'Petrol' : 'Lunch'
                });
                expenseAccumulator += expenseAmount;
            }
        }

        setTransactions(newTransactions);

        // Critical: Update Balance immediately to reflect this history
        const estimatedBalance = incomeAccumulator - expenseAccumulator;
        setUserProfile(prev => ({
            ...prev,
            currentBalance: Math.max(estimatedBalance, 1000)
        }));
    };

    return (
        <GigFinContext.Provider value={{
            transactions,
            loans,
            userProfile,
            appConfig,
            isDataLoaded: isLoaded,
            addTransaction,
            applyForLoan,
            withdrawMoney,
            calculateKarmaScore,
            updateAppConfig,
            updateUserProfile,
            toggleTheme,
            initializeUserTransactions
        }}>
            {children}
        </GigFinContext.Provider>
    );
}

export const useGigFin = () => {
    const context = useContext(GigFinContext);
    if (context === undefined) {
        throw new Error('useGigFin must be used within a GigFinProvider');
    }
    return context;
};
