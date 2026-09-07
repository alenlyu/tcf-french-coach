/**
 * Example secure AI proxy for Cloudflare Workers.
 *
 * This is the ONLY place your real Anthropic (or OpenAI-compatible) API key
 * should ever live. It is set as a Worker secret, never committed to git,
 * and never shipped to the browser.
 *
 * Deploy:
 *   npm install -g wrangler
 *   wrangler init tcf-ai-proxy      # or wrangler deploy directly with this file
 *   wrangler secret put ANTHROPIC_API_KEY
 *   wrangler deploy
 *
 * Then set VITE_AI_PROXY_URL in the frontend's .env to the deployed
 * Worker URL, e.g. https://tcf-ai-proxy.<your-subdomain>.workers.dev
 *
 * The frontend (src/services/aiService.ts) POSTs { messages: [...] } in
 * Anthropic Messages API shape and expects back { text: string }.
 */

export default {
  async fetch(request, env) {
    // Lock this down to your GitHub Pages origin in production.
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: corsHeaders })
    }

    const messages = Array.isArray(body.messages) ? body.messages : []
    const systemMessage = messages.find((m) => m.role === 'system')
    const conversation = messages.filter((m) => m.role !== 'system')

    try {
      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 700,
          system: systemMessage?.content,
          messages: conversation,
        }),
      })

      if (!upstream.ok) {
        const errText = await upstream.text()
        return new Response(JSON.stringify({ error: `Upstream error: ${errText}` }), { status: 502, headers: corsHeaders })
      }

      const data = await upstream.json()
      const text = data.content?.map((c) => c.text || '').join('\n') || ''
      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
    }
  },
}
