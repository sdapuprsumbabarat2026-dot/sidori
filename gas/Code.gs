const FOLDER_NAME = "SIDORI"
const TEMP_FOLDER = "Temp"
const API_KEY = "sidori-2026"

function doGet(e) {
  const token = (e && e.parameter && e.parameter.token) || ""
  if (token) {
    const res = CacheService.getScriptCache().get("upload_" + token)
    if (res) {
      return ContentService.createTextOutput("window.__sidoriUpload_" + token + "=" + res + ";")
        .setMimeType(ContentService.MimeType.JAVASCRIPT)
    }
  }
  return sendJson({ status: "ok" })
}

function doPost(e) {
  const params = e.parameter
  if (params && params._method === "DELETE") return handleDelete(params)
  if (params && params._method === "MOVE") return handleMove(params)

  try {
    const data = params
    if (data.apiKey !== API_KEY) return sendJson({ error: "Invalid API key" }, 403)

    const { fileBase64, fileName, mimeType, year, irigationType, areaName } = data
    if (!fileBase64 || !fileName) return sendJson({ error: "Missing required fields" }, 400)

    const root = ensureFolder(FOLDER_NAME)
    let file

    if (year && irigationType && areaName) {
      const yearFolder = ensureFolder(year, root)
      const typeFolder = ensureFolder(irigationType, yearFolder)
      const areaFolder = ensureFolder(areaName, typeFolder)
      const blob = Utilities.newBlob(Utilities.base64Decode(fileBase64), mimeType || "application/octet-stream", fileName)
      file = areaFolder.createFile(blob)
    } else {
      const temp = ensureFolder(TEMP_FOLDER, root)
      const blob = Utilities.newBlob(Utilities.base64Decode(fileBase64), mimeType || "application/octet-stream", fileName)
      file = temp.createFile(blob)
    }

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
    const result = { success: true, fileId: file.getId(), fileUrl: file.getUrl() }
    if (data.token) {
      CacheService.getScriptCache().put("upload_" + data.token, JSON.stringify(result), 300)
    }
    return sendJson(result)
  } catch (err) {
    if (params.token) {
      CacheService.getScriptCache().put("upload_" + params.token, JSON.stringify({ error: err.message }), 300)
    }
    return sendJson({ error: err.message }, 500)
  }
}

function handleMove(params) {
  try {
    if (params.apiKey !== API_KEY) return sendJson({ error: "Invalid API key" }, 403)
    if (!params.fileId || !params.year || !params.irigationType || !params.areaName) {
      return sendJson({ error: "Missing required fields" }, 400)
    }
    const file = DriveApp.getFileById(params.fileId)
    const root = ensureFolder(FOLDER_NAME)
    const yearFolder = ensureFolder(params.year, root)
    const typeFolder = ensureFolder(params.irigationType, yearFolder)
    const areaFolder = ensureFolder(params.areaName, typeFolder)
    areaFolder.addFile(file)
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

function sendJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON)
}

function ensureFolder(name, parent) {
  if (parent) {
    const folders = parent.getFoldersByName(name)
    return folders.hasNext() ? folders.next() : parent.createFolder(name)
  }
  const folders = DriveApp.getFoldersByName(name)
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(name)
}
