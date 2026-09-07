/**
 * Secure AI proxy for Cloudflare Workers, using Google's Gemini API.
 *
 * WHY THIS ONE: Gemini's free tier (via Google AI Studio) does not require
 * a credit card and gives real daily usage (roughly 10-15 requests/minute,
 * a few hundred requests/day on the Flash model as of 2026 — exact numbers
 * change, check your own limits at aistudio.google.com/rate-limit). That's
 * comfortably enough for one person's daily French practice.
 *
 * Your Gemini API key is stored ONLY as a secret on Cloudflare. It is never
 * in this repository and never sent to the browser.
 *
 * Deploy:
 *   1. Get a free key: https://aistudio.google.com/app/apikey
 *   2. npm install -g wrangler
 *   3. wrangler init tcf-ai-proxy
 *   4. wrangler secret put GEMINI_API_KEY      (paste the key from step 1)
 *   5. wrangler deploy
 *
 * Then set VITE_AI_PROXY_URL in the frontend to the printed Worker URL,
 * e.g. https://tcf-ai-proxy.<your-subdomain>.workers.dev
 *
 * The frontend (src/services/aiService.ts) POSTs { messages: [...] } and
 * expects back { text: string } — this Worker calls Gemini's
 * OpenAI-compatible endpoint so the frontend never needs to know which
 * AI provider is behind the proxy.
 */

const GEMINI_MODEL = 'gemini-2.5-flash' // Free-tier-friendly. Check https://ai.google.dev/gemini-api/docs/models for current options.

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // For production, replace * with your exact GitHub Pages URL.
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), { status: 405, headers: corsHeaders })
    }
    if (!env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY secret is not set on this Worker. Run: wrangler secret put GEMINI_API_KEY' }), { status: 500, headers: corsHeaders })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body sent to the proxy.' }), { status: 400, headers: corsHeaders })
    }

    const messages = Array.isArray(body.messages) ? body.messages : []
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided.' }), { status: 400, headers: corsHeaders })
    }

    try {
      const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.GEMINI_API_KEY}`,
        },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          messages, // Gemini's OpenAI-compatible endpoint accepts [{role, content}, ...] directly.
          max_tokens: 700,
        }),
      })

      if (!upstream.ok) {
        const errText = await upstream.text()
        // Return the real upstream error so you can see whether it's a bad
        // key, a rate limit (429), or something else — instead of a blind 502.
        return new Response(
          JSON.stringify({ error: `Gemini API returned status ${upstream.status}: ${errText}` }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const data = await upstream.json()
      const text = data.choices?.[0]?.message?.content ?? ''
      if (!text) {
        return new Response(JSON.stringify({ error: 'Gemini API returned an empty response.' }), { status: 502, headers: corsHeaders })
      }

      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: `Could not reach Gemini: ${String(err)}` }), { status: 500, headers: corsHeaders })
    }
  },
}
