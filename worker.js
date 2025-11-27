export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/verify" && request.method === "POST") {
      const body = await request.json();
      const { key, hwid } = body;

      // Load keys.json from GitHub
      const res = await fetch(env.KEYS_URL);
      let keys = await res.json();

      if (!keys[key]) {
        return new Response(JSON.stringify({
          status: "invalid",
          message: "Key not found"
        }), { status: 200 });
      }

      // Link HWID if empty
      if (!keys[key].hwid) {
        keys[key].hwid = hwid;

        await env.KV.put("keys", JSON.stringify(keys));

        return new Response(JSON.stringify({
          status: "valid",
          linked: true
        }), { status: 200 });
      }

      // Validate HWID
      if (keys[key].hwid !== hwid) {
        return new Response(JSON.stringify({
          status: "invalid",
          message: "HWID mismatch"
        }), { status: 200 });
      }

      return new Response(JSON.stringify({
        status: "valid",
        linked: true
      }), { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  }
}
