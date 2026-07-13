const FOLDER_NAME = "SIDORI"
const API_KEY = "sidori-2026"

function doGet(e) {
  return sendJson({ status: "ok" })
}

function doPost(e) {
  const params = e.parameter
  if (params && params._method === "DELETE") return handleDelete(params)
  try {
    const data = JSON.parse(e.postData.contents)
    if (data.apiKey !== API_KEY) return sendJson({ error: "Invalid API key" }, 403)

    const { fileBase64, fileName, mimeType, irigationType, category, year } = data
    if (!fileBase64 || !fileName || !irigationType) {
      return sendJson({ error: "Missing required fields" }, 400)
    }

    const catName = category || "Uncategorized"

    // Create folder structure: SIDORI / {year} / {irigationType} / {category}
    const root = ensureFolder(FOLDER_NAME)
    const yearFolder = ensureFolder(year, root)
    const typeFolder = ensureFolder(irigationType, yearFolder)
    const catFolder = ensureFolder(catName, typeFolder)

    const blob = Utilities.newBlob(Utilities.base64Decode(fileBase64), mimeType || "application/octet-stream", fileName)
    const file = catFolder.createFile(blob)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)

    return sendJson({ success: true, fileId: file.getId(), fileUrl: file.getUrl() })
  } catch (err) {
    return sendJson({ error: err.message }, 500)
  }
}

function handleDelete(params) {
  try {
    if (params.apiKey !== API_KEY) return sendJson({ error: "Invalid API key" }, 403)
    if (!params.fileId) return sendJson({ error: "fileId required" }, 400)
    const file = DriveApp.getFileById(params.fileId)
    file.setTrashed(true)
    return sendJson({ success: true })
  } catch (err) {
    return sendJson({ error: err.message }, 500)
  }
}

function ensureFolder(name, parent) {
  if (parent) {
    const folders = parent.getFoldersByName(name)
    return folders.hasNext() ? folders.next() : parent.createFolder(name)
  }
  const folders = DriveApp.getFoldersByName(name)
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(name)
}

function sendJson(data, status) {
  const output = ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON)
  return output
}
