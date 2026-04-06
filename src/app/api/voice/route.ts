import { NextRequest, NextResponse } from 'next/server';
import { getVoiceData, VoiceDataSummary } from '@/lib/voice-db';
import { addMessage, getHistory } from '@/lib/voice-conversation-memory';
import { extractProfileData } from '@/lib/voice-pattern-extractor';

// Prevent Next.js from caching this route
export const dynamic = 'force-dynamic';

// ─── Constants ──────────────────────────────────────────────────────
const WELCOME_MESSAGE = "Hello! I'm your GigLens financial assistant. I have your dashboard open in front of me. What would you like to know about your finances or gig work?";
const NO_SPEECH_MESSAGE = "I didn't catch that. Could you please repeat?";
const ERROR_MESSAGE = "Sorry, something went wrong. Please try again.";

/**
 * Build the system prompt with DB dashboard context and conversation history.
 */
function buildPersonalizedPrompt(dashboard: VoiceDataSummary | null, detectedUpdates: string[]): string {
    let contextNote = '';
    if (detectedUpdates.length > 0) {
        contextNote = `\n\nNote: The user just shared new conversational context: ${detectedUpdates.join(', ')}. Acknowledge this nicely, but remember the DASHBOARD DATA below is the ultimate source of truth.`;
    }

    let dashboardDataStr = "Dashboard Data is currently unavailable. Ask the user to share their numbers.";
    if (dashboard) {
        dashboardDataStr = `
- User Name: ${dashboard.userName}
- Monthly Income: ₹${dashboard.monthlyRevenue.toLocaleString('en-IN')}
- Expenses: ₹${dashboard.monthlyExpenses.toLocaleString('en-IN')}
- Balance: ₹${dashboard.balance.toLocaleString('en-IN')}
- Trust Score: ${dashboard.trustScore}/100
- Emergency Score (Safe Days): ${dashboard.emergencyScore} days
- Risk Status: ${dashboard.riskStatus}
- Work Stats: ${dashboard.workStats.customers} tasks/customers at approx ₹${Math.round(dashboard.workStats.rate)} avg rate.
`;
    }

    return `You are GigLens AI, a personalized financial assistant for gig workers in India, speaking over a phone call.

USER DASHBOARD DATA (SOURCE OF TRUTH):
${dashboardDataStr}

RULES:
1. Keep responses to 1-2 sentences maximum — this is a phone call.
2. Be warm, supportive, and use the user's name if known.
3. ALWAYS rely on the USER DASHBOARD DATA for financial numbers. Never make up numbers.
4. Give practical financial tips tailored to their data. E.g. If balance is low, warn them gracefully. If trust score is high, congratulate them.
5. Never use markdown, bullet points, or formatting — speak naturally.
6. Mention amounts in rupees.
7. Do not say "as an AI" or similar disclaimers.
8. End responses naturally — ask a short follow-up question if it keeps the conversation engaging.${contextNote}`;
}

// ─── Fallback TwiML ────────────────────────────────────────────────
const FALLBACK_TWIML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">${ERROR_MESSAGE}</Say>
    <Gather input="speech" timeout="7" speechTimeout="auto" action="/api/voice" method="POST">
        <Say voice="alice">Please try speaking again.</Say>
    </Gather>
    <Say voice="alice">Goodbye.</Say>
</Response>`;

// ─── Helpers ────────────────────────────────────────────────────────

function twimlResponse(twiml: string): NextResponse {
    return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    });
}

function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function conversationalTwiml(message: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="speech" timeout="7" speechTimeout="auto" action="/api/voice" method="POST">
        <Say voice="alice">${escapeXml(message)}</Say>
    </Gather>
    <Say voice="alice">I didn't hear anything. Goodbye.</Say>
</Response>`;
}

function normalizePhone(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.startsWith('+') ? trimmed : `+${trimmed.replace(/\D/g, '')}`;
}

function resolveParticipantPhone(formData: Record<string, string>): string {
    // For outbound calls initiated by Twilio:
    // - From = Twilio number
    // - To / Called = end user's phone number
    // For inbound calls, To is our Twilio number and From is the user.
    // Our current product flow is outbound, so prefer To/Called first.
    return (
        normalizePhone(formData['To']) ||
        normalizePhone(formData['Called']) ||
        normalizePhone(formData['Caller']) ||
        normalizePhone(formData['From']) ||
        'unknown'
    );
}

async function parseTwilioFormData(request: NextRequest): Promise<Record<string, string>> {
    try {
        const text = await request.text();
        const params = new URLSearchParams(text);
        const data: Record<string, string> = {};
        params.forEach((value, key) => { data[key] = value; });
        return data;
    } catch {
        return {};
    }
}

async function getAIResponse(
    userMessage: string,
    systemPrompt: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string | null> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        console.error('[/api/voice] GROQ_API_KEY not configured');
        return null;
    }

    try {
        const messages = [
            { role: 'system' as const, content: systemPrompt },
            ...conversationHistory,
            // Twilio sometimes passes silence or background noise as small garbage strings. Provide a safety fallback.
            { role: 'user' as const, content: userMessage || 'Hello' },
        ];

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages,
                temperature: 0.6,
                max_tokens: 150,
                top_p: 0.9,
            }),
        });

        if (!response.ok) {
            console.error('[/api/voice] Groq API error:', response.status);
            return null;
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || null;
    } catch (err) {
        console.error('[/api/voice] Groq API call failed:', err);
        return null;
    }
}

// ─── Route Handlers ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        // 1. Parse Twilio form data
        const formData = await parseTwilioFormData(request);
        const speechResult = formData['SpeechResult'] || null;
        const participantPhone = resolveParticipantPhone(formData);
        const callSid = formData['CallSid'] || 'unknown';

        console.log(`[/api/voice] CallSid=${callSid}, To=${formData['To'] || 'n/a'}, From=${formData['From'] || 'n/a'}, ResolvedUser=${participantPhone}, Speech=${speechResult ? `"${speechResult}"` : 'null'}`);

        // 2. Fetch Real Dashboard Data (Uses Cached DB Layer)
        const dashboardData = participantPhone === 'unknown' ? null : await getVoiceData(participantPhone);

        // 3. Initial call — no speech yet
        if (!speechResult) {
            let greeting = WELCOME_MESSAGE;
            if (dashboardData && dashboardData.userName && dashboardData.userName !== 'User') {
                greeting = `Hello ${dashboardData.userName}! Welcome back to GigLens. I have your dashboard metrics pulled up. What would you like to discuss today?`;
            }
            console.log(`[/api/voice] Initial call for ${participantPhone}`);
            return twimlResponse(conversationalTwiml(greeting));
        }

        // 4. Empty speech
        if (!speechResult.trim()) {
            return twimlResponse(conversationalTwiml(NO_SPEECH_MESSAGE));
        }

        // 5. Still extract loose pattern updates (for conversational hybrid memory)
        const { detected } = extractProfileData(speechResult);
        
        // 6. Store user message in conversation memory
        addMessage(participantPhone, 'user', speechResult);

        // 7. Build personalized AI prompt using the DASHBOARD DATA as Source of Truth
        const systemPrompt = buildPersonalizedPrompt(dashboardData, detected);
        const history = getHistory(participantPhone);

        // 8. Get AI response with full context
        console.log(`[/api/voice] Generating AI response for: "${speechResult}"`);
        const aiResponse = await getAIResponse(speechResult, systemPrompt, history);

        if (aiResponse) {
            // Store assistant response in memory
            addMessage(participantPhone, 'assistant', aiResponse);
            console.log(`[/api/voice] AI response: "${aiResponse}"`);
            return twimlResponse(conversationalTwiml(aiResponse));
        }

        // 9. AI failed — graceful fallback
        const fallbackMsg = `I heard you, but I'm having trouble processing that right now. Could you try asking again?`;
        addMessage(participantPhone, 'assistant', fallbackMsg);
        return twimlResponse(conversationalTwiml(fallbackMsg));

    } catch (err) {
        console.error('[/api/voice] CRITICAL ERROR:', err);
        return twimlResponse(FALLBACK_TWIML);
    }
}

// GET — health check
export async function GET() {
    try {
        return twimlResponse(conversationalTwiml('GigLens voice service is active.'));
    } catch {
        return twimlResponse(FALLBACK_TWIML);
    }
}
