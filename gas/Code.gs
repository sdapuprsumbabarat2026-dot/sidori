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
  const isIframe = params && params._format === "iframe"

  try {
    const data = params
    if (data.apiKey !== API_KEY) return respond(isIframe, { error: "Invalid API key" }, 403)

    const { fileBase64, fileName, mimeType, year, irigationType, areaName } = data
    if (!fileBase64 || !fileName) return respond(isIframe, { error: "Missing required fields" }, 400)

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
    return respond(isIframe, { success: true, fileId: file.getId(), fileUrl: file.getUrl() })
  } catch (err) {
    return respond(isIframe, { error: err.message }, 500)
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

function respond(iframe, data, status) {
  if (iframe) return sendHtmlResult(data)
  return sendJson(data, status)
}

function sendHtmlResult(data) {
  const base = "https://sidori.vercel.app/upload-callback.html"
  const url = base + "?result=" + encodeURIComponent(JSON.stringify(data))
  const html = '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=' + url + '"></head><body>Uploading...</body></html>'
  return ContentService.createTextOutput(html).setMimeType(ContentService.MimeType.HTML)
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
