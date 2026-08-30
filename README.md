<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Math Tutor

An image-based AP Calculus and AP Physics C: Mechanics tutor powered by Gemini.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set this server-only value in `.env.local`:

   ```env
   GEMINI_API_KEY=your-gemini-key
   ```

3. Run the full application, including Vercel Functions:
   `npm run dev`

## Deploy To Vercel

1. Import the repository into Vercel.
2. Add `GEMINI_API_KEY` in Project Settings → Environment Variables.
3. Set it for Production. Add it to Preview only if preview deployments should be functional.
4. Deploy. Gemini calls are made only by `/api/chat` and `/api/glossary`; the browser bundle never receives the API key.

The public endpoints do not require sign-in or apply application-level rate limits. Set Gemini budget alerts and quota limits so unexpected use is capped.
