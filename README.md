<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Math Tutor

An image-based calculus tutor powered by Gemini.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Create an Upstash Redis database and set these server-only values in `.env.local`:

   ```env
   GEMINI_API_KEY=your-gemini-key
   UPSTASH_REDIS_REST_URL=your-upstash-url
   UPSTASH_REDIS_REST_TOKEN=your-upstash-token
   ```

3. Run the full application, including Vercel Functions:
   `npm run dev`

## Deploy To Vercel

1. Import the repository into Vercel.
2. Add `GEMINI_API_KEY`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN` in Project Settings → Environment Variables.
3. Set each value for Production. Add them to Preview only if preview deployments should be functional.
4. Deploy. Gemini calls are made only by `/api/chat` and `/api/glossary`; the browser bundle never receives the API key.

The public endpoints are rate limited per IP: 20 chat requests per 10 minutes and 60 glossary requests per 10 minutes.
Set Gemini budget alerts and quota limits as an additional cost safeguard. Per-IP limits do not prevent distributed abuse.
