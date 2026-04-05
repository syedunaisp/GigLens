/**
 * Pattern Extractor for Voice AI
 * 
 * Detects simple patterns in user speech to extract and update profile data.
 * Uses regex — no ML, no NLP libraries, stays lightweight.
 */

import { VoiceUserProfile } from './voice-user-store';

export interface ExtractedData {
    updates: Partial<Omit<VoiceUserProfile, 'phoneNumber' | 'createdAt' | 'updatedAt'>>;
    detected: string[]; // Human-readable list of what was detected
}

/**
 * Extract profile data from user speech input.
 * Returns any fields that should be updated on the user profile.
 */
export function extractProfileData(speech: string): ExtractedData {
    const lower = speech.toLowerCase();
    const updates: ExtractedData['updates'] = {};
    const detected: string[] = [];

    // ── Income detection ────────────────────────────────────
    // "I earn 15000" / "my income is 15,000" / "I make 15000 per month" / "salary is 20000"
    const incomePatterns = [
        /(?:i\s+(?:earn|make)|my\s+(?:income|salary|earning)\s+is)\s+(?:about\s+|around\s+|approximately\s+)?(?:rs\.?\s*|₹\s*|rupees?\s*)?(\d[\d,]*)/i,
        /(?:income|salary|earning)(?:\s+is)?\s+(?:about\s+|around\s+)?(?:rs\.?\s*|₹\s*|rupees?\s*)?(\d[\d,]*)/i,
        /(\d[\d,]*)\s*(?:rupees?\s*)?(?:per\s+month|monthly|a\s+month)/i,
    ];

    for (const pattern of incomePatterns) {
        const match = speech.match(pattern);
        if (match) {
            const value = parseInt(match[1].replace(/,/g, ''), 10);
            if (value > 0 && value < 10000000) { // Sanity check: 0 < income < 1 crore
                updates.monthlyIncome = value;
                detected.push(`monthly income: ₹${value.toLocaleString('en-IN')}`);
            }
            break;
        }
    }

    // ── Expenses detection ──────────────────────────────────
    // "I spend 8000" / "my expenses are 10000" / "I spend about 5000 per month"
    const expensePatterns = [
        /(?:i\s+spend|my\s+(?:expenses?|spending)\s+(?:is|are))\s+(?:about\s+|around\s+)?(?:rs\.?\s*|₹\s*|rupees?\s*)?(\d[\d,]*)/i,
        /(?:expenses?|spending)(?:\s+(?:is|are))?\s+(?:about\s+|around\s+)?(?:rs\.?\s*|₹\s*|rupees?\s*)?(\d[\d,]*)/i,
    ];

    for (const pattern of expensePatterns) {
        const match = speech.match(pattern);
        if (match) {
            const value = parseInt(match[1].replace(/,/g, ''), 10);
            if (value > 0 && value < 10000000) {
                updates.monthlyExpenses = value;
                detected.push(`monthly expenses: ₹${value.toLocaleString('en-IN')}`);
            }
            break;
        }
    }

    // ── Name detection ──────────────────────────────────────
    // "my name is Ravi" / "I am Ravi" / "call me Ravi"
    const namePatterns = [
        /(?:my\s+name\s+is|i\s+am|call\s+me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    ];

    for (const pattern of namePatterns) {
        const match = speech.match(pattern);
        if (match) {
            updates.name = match[1].trim();
            detected.push(`name: ${updates.name}`);
            break;
        }
    }

    // ── Occupation detection ────────────────────────────────
    // "I am a driver" / "I work as a delivery person" / "I do delivery"
    const occupationPatterns = [
        /(?:i\s+(?:am\s+a|work\s+as\s+(?:a\s+)?)|my\s+(?:job|work|occupation)\s+is\s+(?:a\s+)?)([\w\s]+?)(?:\.|,|$)/i,
        /i\s+do\s+([\w\s]+?)(?:\s+work)?(?:\.|,|$)/i,
    ];

    for (const pattern of occupationPatterns) {
        const match = speech.match(pattern);
        if (match) {
            const occupation = match[1].trim();
            if (occupation.length > 1 && occupation.length < 50) {
                updates.occupation = occupation;
                detected.push(`occupation: ${occupation}`);
            }
            break;
        }
    }

    // ── Savings goal detection ──────────────────────────────
    // "I want to save 5000" / "my savings goal is 10000"
    const savingsPatterns = [
        /(?:i\s+want\s+to\s+save|(?:my\s+)?savings?\s+goal\s+is|save\s+(?:about\s+|around\s+)?)\s*(?:rs\.?\s*|₹\s*|rupees?\s*)?(\d[\d,]*)/i,
    ];

    for (const pattern of savingsPatterns) {
        const match = speech.match(pattern);
        if (match) {
            const value = parseInt(match[1].replace(/,/g, ''), 10);
            if (value > 0 && value < 10000000) {
                updates.savingsGoal = value;
                detected.push(`savings goal: ₹${value.toLocaleString('en-IN')}`);
            }
            break;
        }
    }

    // ── City detection ──────────────────────────────────────
    // "I live in Hyderabad" / "I am from Mumbai"
    const cityPatterns = [
        /(?:i\s+(?:live|stay|am)\s+(?:in|from))\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    ];

    for (const pattern of cityPatterns) {
        const match = speech.match(pattern);
        if (match) {
            updates.city = match[1].trim();
            detected.push(`city: ${updates.city}`);
            break;
        }
    }

    // ── Risk score heuristic ────────────────────────────────
    // Auto-compute if we have both income and expenses
    if (updates.monthlyIncome && updates.monthlyExpenses) {
        const ratio = updates.monthlyExpenses / updates.monthlyIncome;
        if (ratio < 0.5) updates.riskScore = 85;      // Low risk
        else if (ratio < 0.7) updates.riskScore = 65;  // Moderate
        else if (ratio < 0.9) updates.riskScore = 40;  // High
        else updates.riskScore = 20;                    // Critical
    }

    if (detected.length > 0 && !lower.includes('what') && !lower.includes('how') && !lower.includes('tell')) {
        console.log(`[pattern-extractor] Detected: ${detected.join(', ')}`);
    }

    return { updates, detected };
}
