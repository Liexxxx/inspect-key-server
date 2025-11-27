export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Load JSON keys file from GitHub
    const json = await fetch(env.KEYS_URL).then(r => r.json());

    if (url.pathname === "/api/verify" && request.method === "POST") {
      const body = await request.json();
      const { key, hwid } = body;

      const entry = json.keys.find(k => k.key === key);
      if (!entry) {
        return Response.json({ status: "invalid", message: "Key not found" });
      }

      if (!entry.hwid) {
        entry.hwid = hwid;
        await env.UPDATE(entry); // Cloudflare KV update
        return Response.json({ status: "valid", linked: true });
      }

      if (entry.hwid !== hwid) {
        return Response.json({ status: "invalid", message: "HWID mismatch" });
      }

      return Response.json({ status: "valid", linked: true });
    }

    return new Response("Not found", { status: 404 });
  }
}
