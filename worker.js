export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/verify" && request.method === "POST") {
      const body = await request.json();
      const { key, hwid } = body;

      // Load keys from KV
      let keysText = await env.KV.get("keys");
      let keys;

      if (!keysText) {
        // First-time load from GitHub if KV is empty
        const res = await fetch(env.KEYS_URL);
        keys = await res.json();

        // Save copy into KV so we can write changes later
        await env.KV.put("keys", JSON.stringify(keys));
      } else {
        keys = JSON.parse(keysText);
      }

      // Check if key exists
      if (!keys[key]) {
        return new Response(JSON.stringify({
          status: "invalid",
          message: "Key not found"
        }), { status: 200 });
      }

      // ----- HWID LINKING -----
      if (!keys[key].hwid || keys[key].hwid === "") {
        // Link this PC's HWID
        keys[key].hwid = hwid;

        // SAVE BACK TO KV (this is the part you were missing!)
        await env.KV.put("keys", JSON.stringify(keys));

        return new Response(JSON.stringify({
          status: "valid",
          linked: true
        }), { status: 200 });
      }

      // ----- HWID CHECK -----
      if (keys[key].hwid !== hwid) {
        return new Response(JSON.stringify({
          status: "invalid",
          message: "HWID mismatch"
        }), { status: 200 });
      }

      // HWID matches
      return new Response(JSON.stringify({
        status: "valid",
        linked: true
      }), { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  }
}
