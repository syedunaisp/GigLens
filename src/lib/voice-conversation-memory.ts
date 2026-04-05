/**
 * In-Memory Conversation Memory for Voice AI
 * 
 * Stores recent conversation history per user (keyed by phone number).
 * Maintains the last N messages for context-aware AI responses.
 * No database dependency.
 */

export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

// phone number → conversation history
const conversationStore = new Map<string, ConversationMessage[]>();

const MAX_HISTORY = 10; // Keep last 10 messages (5 exchanges)

/**
 * Add a message to a user's conversation history.
 */
export function addMessage(phoneNumber: string, role: 'user' | 'assistant', content: string): void {
    if (!conversationStore.has(phoneNumber)) {
        conversationStore.set(phoneNumber, []);
    }

    const history = conversationStore.get(phoneNumber)!;
    history.push({ role, content, timestamp: new Date() });

    // Trim to max history length
    if (history.length > MAX_HISTORY) {
        history.splice(0, history.length - MAX_HISTORY);
    }
}

/**
 * Get conversation history for a user.
 * Returns messages formatted for the AI model's messages array.
 */
export function getHistory(phoneNumber: string): Array<{ role: 'user' | 'assistant'; content: string }> {
    const history = conversationStore.get(phoneNumber) || [];
    return history.map(({ role, content }) => ({ role, content }));
}

/**
 * Get the last user message (for pattern detection).
 */
export function getLastUserMessage(phoneNumber: string): string | null {
    const history = conversationStore.get(phoneNumber) || [];
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].role === 'user') return history[i].content;
    }
    return null;
}

/**
 * Clear conversation history for a user.
 */
export function clearHistory(phoneNumber: string): void {
    conversationStore.delete(phoneNumber);
}

/**
 * Get message count for a user (for debugging).
 */
export function getMessageCount(phoneNumber: string): number {
    return conversationStore.get(phoneNumber)?.length || 0;
}
