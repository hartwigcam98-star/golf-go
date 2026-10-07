// Golf Go "Ask" — answers a player's question with Claude, using the game guide as the system prompt.
// Secrets (set from GitHub Actions, never in the game): ANTHROPIC_API_KEY. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GUIDE } from "./guide.ts";

const MODEL = "claude-sonnet-5-5";
const DAILY_CAP = 200;       // questions per day across everyone
const PLAYER_HOURLY = 6;     // per player per hour
const IP_HOURLY = 12;        // per network per hour
const MAX_Q = 400;           // characters

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function sha(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let body: { q?: string; pid?: string; ver?: string; ctx?: string };
  try { body = await req.json(); } catch { return json({ error: "bad request" }, 400); }
  const q = String(body.q || "").trim().slice(0, MAX_Q);
  const pid = String(body.pid || "anon").slice(0, 40);
  if (q.length < 3) return json({ error: "Ask a question first." }, 400);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "not configured", queue: true }, 503);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const iph = await sha("golfgo|" + ip);
  const now = Date.now(), dayAgo = new Date(now - 864e5).toISOString(), hourAgo = new Date(now - 36e5).toISOString();

  // limits
  const c = async (f: (x: any) => any) => { const { count } = await f(sb.from("ask_log").select("id", { count: "exact", head: true })); return count || 0; };
  if (await c((x) => x.gte("created_at", dayAgo)) >= DAILY_CAP)
    return json({ error: "Lots of questions today! Try again tomorrow, or send it as feedback from the pause screen.", queue: true }, 429);
  if (await c((x) => x.eq("pid", pid).gte("created_at", hourAgo)) >= PLAYER_HOURLY ||
      await c((x) => x.eq("iph", iph).gte("created_at", hourAgo)) >= IP_HOURLY)
    return json({ error: "That's a lot of questions in an hour. Give it a little while and ask again." }, 429);

  // Claude
  let a = "", usage: any = {};
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 450,
        system: [{ type: "text", text: GUIDE, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: (body.ctx ? `[Player is on: ${String(body.ctx).slice(0, 120)}]\n` : "") + q }],
      }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error?.message || ("HTTP " + r.status));
    a = (d.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
    usage = d.usage || {};
  } catch (e) {
    await sb.from("ask_log").insert({ pid, iph, q, a: null, err: String(e).slice(0, 300), ver: body.ver || null });
    return json({ error: "Couldn't reach the help desk just now.", queue: true }, 502);
  }
  await sb.from("ask_log").insert({
    pid, iph, q, a, ver: body.ver || null,
    in_tok: usage.input_tokens ?? null, out_tok: usage.output_tokens ?? null,
    cache_read: usage.cache_read_input_tokens ?? null, cache_write: usage.cache_creation_input_tokens ?? null,
  });
  return json({ a });
});
