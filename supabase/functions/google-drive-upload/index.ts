import "jsr:@supabase/functions-js/edge-runtime.d.ts"

interface UploadPayload {
  fileBase64: string
  fileName: string
  mimeType: string
  areaId: string
  categoryId: string
  uploadedBy: string
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type, Authorization" } })
  }

  try {
    const { fileBase64, fileName, mimeType, areaId, categoryId, uploadedBy }: UploadPayload = await req.json()

    // Validate
    if (!fileBase64 || !fileName) {
      return new Response(JSON.stringify({ error: "fileBase64 dan fileName wajib" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    // Google Drive config — set via Supabase secrets
    const serviceAccountKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY")
    const driveFolderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID")

    if (!serviceAccountKey || !driveFolderId) {
      return new Response(JSON.stringify({ error: "Google Drive belum dikonfigurasi. Set GOOGLE_SERVICE_ACCOUNT_KEY dan GOOGLE_DRIVE_FOLDER_ID" }), { status: 500, headers: { "Content-Type": "application/json" } })
    }

    const sa = JSON.parse(serviceAccountKey)
    const now = Math.floor(Date.now() / 1000)
    const jwt = await createJwt(sa, now)

    // Get access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    })
    const { access_token } = await tokenRes.json()
    if (!access_token) {
      return new Response(JSON.stringify({ error: "Gagal mendapatkan akses token Google" }), { status: 500, headers: { "Content-Type": "application/json" } })
    }

    // Upload to Google Drive
    const boundary = "sidori_upload_boundary"
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: `${Date.now()}_${fileName}`, parents: [driveFolderId] })}\r\n--${boundary}\r\nContent-Type: ${mimeType || "application/octet-stream"}\r\nContent-Transfer-Encoding: base64\r\n\r\n${fileBase64}\r\n--${boundary}--`

    const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    })

    const fileData = await uploadRes.json()
    if (!fileData.id) {
      return new Response(JSON.stringify({ error: "Upload gagal", detail: fileData }), { status: 500, headers: { "Content-Type": "application/json" } })
    }

    // Make publicly viewable
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    })

    const fileUrl = `https://drive.google.com/file/d/${fileData.id}/view`

    return new Response(JSON.stringify({ success: true, fileId: fileData.id, fileUrl }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
  }
})

async function createJwt(sa: any, now: number): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" }
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }
  const b64 = (o: any) => btoa(JSON.stringify(o)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
  const msg = `${b64(header)}.${b64(claim)}`
  const key = await crypto.subtle.importKey("pkcs8", str2ab(sa.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"])
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(msg))
  return `${msg}.${b64(new Uint8Array(sig))}`
}

function str2ab(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----.*?-----/g, "").replace(/\s/g, "")
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer
}
