export default async function handler(req, res) {
  const { searchParams } = new URL(req.url, "http://localhost");
  const target = searchParams.get("target");

  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);
  const body = Buffer.concat(buffers).toString();

  try {
    const response = await fetch(target, {
      method: req.method || "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      redirect: "follow",
    });
    const text = await response.text();
    res.status(response.status).json(JSON.parse(text));
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}
