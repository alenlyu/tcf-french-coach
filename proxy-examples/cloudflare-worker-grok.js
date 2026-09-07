/**
 * Secure AI proxy for Cloudflare Workers, using xAI's Grok API.
 *
 * IMPORTANT — read before you deploy:
 * The Grok API is NOT free. There is a free tier for the Grok chat app
 * (grok.com / X), but the DEVELOPER API used here is pay-per-token, billed
 * through console.x.ai. New accounts typically get some free promotional
 * credit, after which you pay per token. Check current pricing yourself at
 * https://docs.x.ai before relying on this — prices change often.
 *
 * Your xAI API key is stored ONLY as a secret on Cloudflare. It is never
 * in this repository and never sent to the browser.
 *
 * Deploy:
 *   npm install -g wrangler
 *   wrangler init tcf-ai-proxy
 *   wrangler secret put XAI_API_KEY      # paste your key from console.x.ai
 *   wrangler deploy
 *
 * Then set VITE_AI_PROXY_URL in the frontend to the printed Worker URL,
 * e.g. https://tcf-ai-proxy.<your-subdomain>.workers.dev
 *
 * The frontend (src/services/aiService.ts) POSTs { messages: [...] } and
 * expects back { text: string } — this Worker converts to/from xAI's
 * OpenAI-compatible chat completions format so the frontend never needs
 * to know which AI provider is behind the proxy.
 */

const XAI_MODEL = 'grok-4-fast' // Check https://docs.x.ai/docs/models for current model names and prices.

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
    if (!env.XAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'XAI_API_KEY secret is not set on this Worker. Run: wrangler secret put XAI_API_KEY' }), { status: 500, headers: corsHeaders })
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
      const upstream = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: XAI_MODEL,
          messages, // xAI's chat completions format is OpenAI-compatible: [{role, content}, ...]
          max_tokens: 700,
        }),
      })

      if (!upstream.ok) {
        const errText = await upstream.text()
        // Surface the real upstream error instead of a generic 502, so you can
        // actually see whether it's a bad key, wrong model name, or no credits.
        return new Response(
          JSON.stringify({ error: `xAI API returned status ${upstream.status}: ${errText}` }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const data = await upstream.json()
      const text = data.choices?.[0]?.message?.content ?? ''
      if (!text) {
        return new Response(JSON.stringify({ error: 'xAI API returned an empty response.' }), { status: 502, headers: corsHeaders })
      }

      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: `Could not reach xAI: ${String(err)}` }), { status: 500, headers: corsHeaders })
    }
  },
}
