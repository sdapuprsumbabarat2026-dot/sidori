export default async function handler(req, res) {
  const { searchParams } = new URL(req.url, "http://localhost");
  const target = searchParams.get("target");

  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);
  const raw = Buffer.concat(buffers);

  try {
    const params = new URLSearchParams();
    for (const [k, v] of searchParams) {
      if (k !== "target") params.set(k, v);
    }

    if (raw.length > 0 && searchParams.get("_binary") === "1") {
      params.set("fileBase64", raw.toString("base64"));
    } else {
      const existing = raw.toString();
      for (const [k, v] of new URLSearchParams(existing)) {
        if (!params.has(k)) params.set(k, v);
      }
    }

    const response = await fetch(target, {
      method: req.method || "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      redirect: "follow",
    });
    const text = await response.text();
    res.status(response.status).json(JSON.parse(text));
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}
