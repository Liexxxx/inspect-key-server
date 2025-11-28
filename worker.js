export class LicenseObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.initialized = this.initialize();
  }

  async initialize() {
    let licenses = await this.state.storage.get("licenses");

    if (!licenses) {
      const res = await fetch(this.env.KEYS_URL);
      const json = await res.json();
      licenses = json.keys;
      await this.state.storage.put("licenses", licenses);
    }
  }

  async fetch(request) {
    await this.initialized;
    const { key, hwid } = await request.json();
    let licenses = await this.state.storage.get("licenses");

    if (!licenses[key]) {
      return new Response(JSON.stringify({ success: false, error: "Invalid key" }), { status: 400 });
    }

    if (licenses[key].hwid === "") {
      licenses[key].hwid = hwid;
      licenses[key].status = "locked";
      await this.state.storage.put("licenses", licenses);
      return new Response(JSON.stringify({ success: true, status: "hwid_locked" }));
    }

    if (licenses[key].hwid !== hwid) {
      return new Response(JSON.stringify({ success: false, error: "HWID mismatch" }), { status: 403 });
    }

    return new Response(JSON.stringify({ success: true, status: "valid" }));
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/verify" && request.method === "POST") {
      const id = env.LICENSE_DO.idFromName("license-storage");
      const stub = env.LICENSE_DO.get(id);
      return await stub.fetch("https://do", { method: "POST", body: request.body });
    }

    return new Response("Not found", { status: 404 });
  }
};
