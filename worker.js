export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/verify" && request.method === "POST") {
      const body = await request.json();
      const { key, hwid } = body;
      const id = env.LICENSE_DO.idFromName("license-storage");
      const stub = env.LICENSE_DO.get(id);
      return await stub.fetch("https://internal/update", {
        method: "POST",
        body: JSON.stringify({ key, hwid })
      });
    }
    return new Response("Not found", { status: 404 });
  }
}
export class LicenseObject {
  constructor(state, env) {
    this.state = state;
  }
  async fetch(request) {
    const { key, hwid } = await request.json();
    let licenses = await this.state.storage.get("licenses") || {};
    const entry = licenses[key];
    if (!entry) {
      return json({ status: "invalid", message: "Key not found" });
    }
    if (!entry.hwid) {
      entry.hwid = hwid;
      await this.state.storage.put("licenses", licenses);
      return json({ status: "valid", linked: true });
    }
    if (entry.hwid !== hwid) {
      return json({ status: "invalid", message: "HWID mismatch" });
    }
    return json({ status: "valid", linked: true });
  }
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
