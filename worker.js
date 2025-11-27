export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/verify" && request.method === "POST") {
      const body = await request.json();
      const { key, hwid } = body;

      const kv = env.KEYS; // use KV instead of DB
      const stored = await kv.get(key, { type: "json" });

      if (!stored) {
        return Response.json({ status: "invalid", message: "Key not found" });
      }

      // First-time HWID bind
      if (!stored.hwid) {
        await kv.put(key, JSON.stringify({ hwid }));
        return Response.json({ status: "valid", linked: true });
      }

      // HWID mismatch
      if (stored.hwid !== hwid) {
        return Response.json({ status: "invalid", message: "HWID mismatch" });
      }

      return Response.json({ status: "valid", linked: true });
    }

    return new Response("Not found", { status: 404 });
  }
};
