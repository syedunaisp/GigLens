# Deployment Checklist

## 1. Database (Ready ✅)
Your database is hosted on Supabase (`postgresql://...supabase.com...`).
- **Action**: No code changes needed.
- **Task**: Add `DATABASE_URL` to your deployment environment variables.

## 2. Environment Variables (Required ⚠️)
Copy these from `.env.local` to your Vercel/Netlify settings:
- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `GROQ_API_KEY`

## 3. Python Backend (Action Needed 🛑)
Your app tries to reach `http://localhost:8000` for ML predictions (`src/lib/api.ts`).
- **The Issue**: Vercel cannot reach your localhost.
- **The Voice Agent**: Since we moved Voice Logic to Next.js (`/api/voice`), **Voice will work fine** without the Python backend.
- **The ML Model**: features like "Leak Detection" or "Approval Probability" might fail if they rely on the Python API.

**Recommendation**: Deploy Next.js first. The site will work, Voice will work. ignore ML errors for now.
