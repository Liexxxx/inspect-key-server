export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/verify" && request.method === "POST") {
      const body = await request.json();
      const { key, hwid } = body;

      // 1. Try to load from KV
      let keys = await env.KV.get("keys", { type: "json" });

      // 2. If KV is empty → pull from GitHub and save to KV
      if (!keys) {
        const res = await fetch(env.KEYS_URL);
        keys = await res.json();

        // Save initial GitHub version into KV
        await env.KV.put("keys", JSON.stringify(keys));
      }

      // 3. Check for key existence
      if (!keys[key]) {
        return new Response(JSON.stringify({
          status: "invalid",
          message: "Key not found"
        }), { status: 200 });
      }

      // 4. Link HWID if empty
      if (!keys[key].hwid) {
        keys[key].hwid = hwid;

        // 🔥 Save updated HWID permanently
        await env.KV.put("keys", JSON.stringify(keys));

        return new Response(JSON.stringify({
          status: "valid",
          linked: true
        }), { status: 200 });
      }

      // 5. Validate HWID
      if (keys[key].hwid !== hwid) {
        return new Response(JSON.stringify({
          status: "invalid",
          message: "HWID mismatch"
        }), { status: 200 });
      }

      // All good
      return new Response(JSON.stringify({
        status: "valid",
        linked: true
      }), { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  }
}
