export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/verify" && request.method === "POST") {
      const body = await request.json();
      const { key, hwid } = body;
      let keys = await env.KV.get("keys", { type: "json" });
      if (!keys) {
        const res = await fetch(env.KEYS_URL);
        keys = await res.json();
        await env.KV.put("keys", JSON.stringify(keys));
      }
      if (!keys[key]) {
        return new Response(JSON.stringify({
          status: "invalid",
          message: "Key not found"
        }), { status: 200 });
      }
      if (!keys[key].hwid) {
        keys[key].hwid = hwid;
        await env.KV.put("keys", JSON.stringify(keys));
        return new Response(JSON.stringify({
          status: "valid",
          linked: true
        }), { status: 200 });
      }
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
