export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/verify" && request.method === "POST") {
      const body = await request.json();
      const { key, hwid } = body;

      // Load keys.json from GitHub
      const githubUrl = `https://raw.githubusercontent.com/${env.GH_REPO}/main/${env.GH_FILE}`;
      const res = await fetch(githubUrl);
      let keys = await res.json();

      if (!keys[key]) {
        return json({ status: "invalid", message: "Key not found" });
      }

      // If HWID is empty -> link it AND save to GitHub
      if (!keys[key].hwid) {
        keys[key].hwid = hwid;

        await updateGithubFile(env, keys);

        return json({ status: "valid", linked: true });
      }

      // HWID mismatch
      if (keys[key].hwid !== hwid) {
        return json({ status: "invalid", message: "HWID mismatch" });
      }

      return json({ status: "valid", linked: true });
    }

    return new Response("Not found", { status: 404 });
  }
}

function json(obj) {
  return new Response(JSON.stringify(obj), { status: 200 });
}

// 🔥 Write updated JSON back to GitHub
async function updateGithubFile(env, keys) {
  const apiUrl = `https://api.github.com/repos/${env.GH_REPO}/contents/${env.GH_FILE}`;

  // First: get the file SHA
  const getFile = await fetch(apiUrl, {
    headers: {
      "Authorization": `Bearer ${env.GH_TOKEN}`,
      "Accept": "application/vnd.github+json"
    }
  });

  const fileData = await getFile.json();
  const sha = fileData.sha;

  // Second: upload new content
  await fetch(apiUrl, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${env.GH_TOKEN}`,
      "Accept": "application/vnd.github+json"
    },
    body: JSON.stringify({
      message: "Update HWID link",
      content: btoa(JSON.stringify(keys, null, 2)),
      sha: sha
    })
  });
}
