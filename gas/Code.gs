const FOLDER_NAME = "SIDORI"
const TEMP_FOLDER = "Temp"
const API_KEY = "sidori-2026"

function doGet() {
  return sendJson({ status: "ok" })
}

function doPost(e) {
  const params = e.parameter
  if (params && params._method === "DELETE") return handleDelete(params)
  if (params && params._method === "MOVE") return handleMove(params)

  try {
    const data = JSON.parse(e.postData.contents)
    if (data.apiKey !== API_KEY) return sendJson({ error: "Invalid API key" }, 403)

    const { fileBase64, fileName, mimeType } = data
    if (!fileBase64 || !fileName) {
      return sendJson({ error: "Missing required fields" }, 400)
    }

    const root = ensureFolder(FOLDER_NAME)
    const temp = ensureFolder(TEMP_FOLDER, root)

    const blob = Utilities.newBlob(Utilities.base64Decode(fileBase64), mimeType || "application/octet-stream", fileName)
    const file = temp.createFile(blob)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)

    return sendJson({ success: true, fileId: file.getId(), fileUrl: file.getUrl() })
  } catch (err) {
    return sendJson({ error: err.message }, 500)
  }
}

function handleMove(params) {
  try {
    if (params.apiKey !== API_KEY) return sendJson({ error: "Invalid API key" }, 403)
    if (!params.fileId || !params.year || !params.irigationType || !params.category) {
      return sendJson({ error: "Missing required fields" }, 400)
    }
    const file = DriveApp.getFileById(params.fileId)

    const root = ensureFolder(FOLDER_NAME)
    const yearFolder = ensureFolder(params.year, root)
    const typeFolder = ensureFolder(params.irigationType, yearFolder)
    const catFolder = ensureFolder(params.category, typeFolder)

    // Move file to categorized folder
    catFolder.addFile(file)
    file.getParents().next().removeFile(file)

    return sendJson({ success: true, fileUrl: file.getUrl() })
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

function sendJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON)
}
