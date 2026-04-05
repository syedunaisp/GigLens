/**
 * In-Memory User Store for Voice AI
 * 
 * Stores user profiles keyed by phone number.
 * No database dependency — fast, reliable, zero setup.
 * Data persists for the lifetime of the server process.
 */

export interface VoiceUserProfile {
    phoneNumber: string;
    name: string | null;
    monthlyIncome: number | null;
    monthlyExpenses: number | null;
    occupation: string | null;
    riskScore: number | null;
    savingsGoal: number | null;
    city: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// In-memory store: phone number → user profile
const userStore = new Map<string, VoiceUserProfile>();

/**
 * Get or create a user profile by phone number.
 */
export function getOrCreateUser(phoneNumber: string): VoiceUserProfile {
    const existing = userStore.get(phoneNumber);
    if (existing) return existing;

    const newUser: VoiceUserProfile = {
        phoneNumber,
        name: null,
        monthlyIncome: null,
        monthlyExpenses: null,
        occupation: null,
        riskScore: null,
        savingsGoal: null,
        city: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    userStore.set(phoneNumber, newUser);
    console.log(`[voice-user-store] New user created: ${phoneNumber}`);
    return newUser;
}

/**
 * Update fields on a user profile. Only updates non-undefined fields.
 */
export function updateUser(phoneNumber: string, updates: Partial<Omit<VoiceUserProfile, 'phoneNumber' | 'createdAt' | 'updatedAt'>>): VoiceUserProfile {
    const user = getOrCreateUser(phoneNumber);

    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (user as any)[key] = value;
        }
    }

    user.updatedAt = new Date();
    userStore.set(phoneNumber, user);
    console.log(`[voice-user-store] User updated: ${phoneNumber}`, updates);
    return user;
}

/**
 * Build a human-readable summary of the user's profile for the AI prompt.
 */
export function getUserSummary(user: VoiceUserProfile): string {
    const parts: string[] = [];

    if (user.name) parts.push(`Name: ${user.name}`);
    parts.push(`Phone: ${user.phoneNumber}`);
    if (user.monthlyIncome !== null) parts.push(`Monthly Income: ₹${user.monthlyIncome.toLocaleString('en-IN')}`);
    if (user.monthlyExpenses !== null) parts.push(`Monthly Expenses: ₹${user.monthlyExpenses.toLocaleString('en-IN')}`);
    if (user.occupation) parts.push(`Occupation: ${user.occupation}`);
    if (user.savingsGoal !== null) parts.push(`Savings Goal: ₹${user.savingsGoal.toLocaleString('en-IN')}`);
    if (user.city) parts.push(`City: ${user.city}`);

    if (user.monthlyIncome !== null && user.monthlyExpenses !== null) {
        const savings = user.monthlyIncome - user.monthlyExpenses;
        parts.push(`Monthly Savings: ₹${savings.toLocaleString('en-IN')}`);
        const savingsRate = Math.round((savings / user.monthlyIncome) * 100);
        parts.push(`Savings Rate: ${savingsRate}%`);
    }

    if (user.riskScore !== null) {
        const riskLabel = user.riskScore >= 70 ? 'Low Risk' : user.riskScore >= 40 ? 'Moderate Risk' : 'High Risk';
        parts.push(`Risk Score: ${user.riskScore}/100 (${riskLabel})`);
    }

    if (parts.length <= 1) {
        return 'No profile data available yet. This is a new user.';
    }

    return parts.join('\n');
}

/**
 * Get total number of stored users (for debugging).
 */
export function getUserCount(): number {
    return userStore.size;
}
