// @ts-nocheck
export interface Env {
  DB: D1Database;
  POKER_ROOM: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Admin Login
    if (url.pathname === "/api/admin/login" && request.method === "POST") {
      const { username, password } = await request.json() as any;
      const admin = await env.DB.prepare(
        "SELECT * FROM admins WHERE username = ? AND password = ?"
      ).bind(username, password).first();

      if (admin) {
        return Response.json({ success: true, token: btoa(username + ":" + password) }, { headers: corsHeaders });
      }
      return Response.json({ success: false, message: "Invalid credentials" }, { status: 401, headers: corsHeaders });
    }

    // Get Users
    if (url.pathname === "/api/admin/users" && request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT * FROM users").all();
      return Response.json(results, { headers: corsHeaders });
    }

    // Kick User
    if (url.pathname === "/api/admin/kick" && request.method === "POST") {
      const { userId } = await request.json() as any;
      await env.DB.prepare("UPDATE users SET status = 'kicked' WHERE id = ?").bind(userId).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }

    // Get Games
    if (url.pathname === "/api/admin/games" && request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT * FROM games").all();
      return Response.json(results, { headers: corsHeaders });
    }

    // Durable Object Game Logic (Example)
    if (url.pathname.startsWith("/api/game/")) {
      const id = env.POKER_ROOM.idFromName("global-room");
      const obj = env.POKER_ROOM.get(id);
      return obj.fetch(request);
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};

// Durable Object Class
export class PokerRoom {
  state: DurableObjectState;
  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request) {
    // Implement real-time game logic here
    return new Response("Poker Room State");
  }
}
