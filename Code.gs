var CONFIG = { SHEET_ID: '167dcyovg1owOpLKBArvYVqL0j0p8ePd3TO_1nly5O_0' }; // isi ID spreadsheet jika standalone

function getSS_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss && CONFIG.SHEET_ID) ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  if (!ss) throw new Error('Spreadsheet tidak ditemukan — pastikan script bound ke sheet atau isi CONFIG.SHEET_ID');
  return ss;
}

function doGet() {
  setupSheet_();
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', app: 'SIDORI' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var token = data.token || '';
    var result;
    switch (data.action) {
      case 'login': result = auth_login(data.email, data.password); break;
      case 'checkSession': result = auth_checkSession(token); break;
      case 'logout': auth_logout(token); result = { success: true }; break;
      case 'users_list': result = users_list(token); break;
      case 'users_create': result = users_create(token, data.data); break;
      case 'users_delete': result = users_delete(token, data.email); break;
      case 'kategori_list': result = kategori_list(token); break;
      case 'kategori_create': result = kategori_create(token, data.nama); break;
      case 'kategori_delete': result = kategori_delete(token, data.id); break;
      case 'dokumen_list': result = dokumen_list(token, data.filter || {}); break;
      case 'dokumen_get': result = dokumen_get(token, data.id); break;
      case 'dokumen_create': result = dokumen_create(token, data.data); break;
      case 'dokumen_update': result = dokumen_update(token, data.id, data.data); break;
      case 'dokumen_delete': result = dokumen_delete(token, data.id); break;
      case 'upload': result = upload_file(token, data); break;
      case 'changePassword': result = auth_changePassword(token, data); break;
      default: result = { error: 'Unknown action' };
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function setupSheet_() {
  const ss = getSS_();
  ['Users', 'Kategori', 'Dokumen'].forEach(name => {
    try { ss.insertSheet(name); } catch (e) { /* exists */ }
  });
  const users = ss.getSheetByName('Users');
  if (users.getLastRow() === 0) {
    users.appendRow(['email', 'nama', 'role']);
  }
  const kategori = ss.getSheetByName('Kategori');
  if (kategori.getLastRow() === 0) {
    kategori.appendRow(['id', 'nama']);
  }
  const dokumen = ss.getSheetByName('Dokumen');
  if (dokumen.getLastRow() === 0) {
    dokumen.appendRow(['id', 'nama', 'kategoriId', 'noDokumen', 'tanggal', 'tahunAnggaran', 'status', 'fileUrl', 'uploaderEmail', 'createdAt']);
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

var SESSION_KEY = 'sidori_session';

function auth_login(email, password) {
  var ss = getSS_();
  var users = ss.getSheetByName('Users').getDataRange().getValues();
  var props = PropertiesService.getScriptProperties();
  var storedPass = props.getProperty('pass_' + email);

  for (var i = 1; i < users.length; i++) {
    var row = users[i];
    if (row[0] === email && storedPass && storedPass === password) {
      var token = Utilities.getUuid();
      props.setProperty(SESSION_KEY + '_' + token, JSON.stringify({
        email: row[0],
        nama: row[1],
        role: row[2]
      }));
      props.setProperty('user_' + email + '_token', token);
      return { success: true, token: token, user: { email: row[0], nama: row[1], role: row[2] } };
    }
  }
  // First-time login: seed admin if empty
  if (users.length === 1 && email === 'admin' && password === 'admin123') {
    users.push(['admin', 'Administrator', 'Admin']);
    ss.getSheetByName('Users').appendRow(['admin', 'Administrator', 'Admin']);
    props.setProperty('pass_admin', 'admin123');
    var token = Utilities.getUuid();
    props.setProperty(SESSION_KEY + '_' + token, JSON.stringify({
      email: 'admin', nama: 'Administrator', role: 'Admin'
    }));
    return { success: true, token: token, user: { email: 'admin', nama: 'Administrator', role: 'Admin' } };
  }
  return { success: false, error: 'Email atau password salah' };
}

function auth_checkSession(token) {
  var props = PropertiesService.getScriptProperties();
  var data = props.getProperty(SESSION_KEY + '_' + token);
  if (data) {
    return JSON.parse(data);
  }
  return null;
}

function auth_logout(token) {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty(SESSION_KEY + '_' + token);
}

function auth_getUser(token) {
  return auth_checkSession(token);
}

function auth_changePassword(token, data) {
  var user = auth_checkSession(token);
  if (!user) return { error: 'Unauthorized' };
  var props = PropertiesService.getScriptProperties();
  var storedPass = props.getProperty('pass_' + user.email);
  if (!storedPass || storedPass !== data.oldPassword) return { error: 'Password lama salah' };
  if (!data.newPassword || data.newPassword.length < 6) return { error: 'Password baru minimal 6 karakter' };
  props.setProperty('pass_' + user.email, data.newPassword);
  return { success: true };
}

function users_create(token, data) {
  var user = auth_checkSession(token);
  if (!user || user.role !== 'Admin') return { error: 'Unauthorized' };
  var ss = getSS_();
  ss.getSheetByName('Users').appendRow([data.email, data.nama, data.role]);
  var props = PropertiesService.getScriptProperties();
  props.setProperty('pass_' + data.email, data.password);
  return { success: true };
}

function users_list(token) {
  var user = auth_checkSession(token);
  if (!user || user.role !== 'Admin') return { error: 'Unauthorized' };
  var data = getSS_()
    .getSheetByName('Users').getDataRange().getValues();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    result.push({ email: data[i][0], nama: data[i][1], role: data[i][2] });
  }
  return result;
}

function users_delete(token, email) {
  var user = auth_checkSession(token);
  if (!user || user.role !== 'Admin') return { error: 'Unauthorized' };
  var ss = getSS_();
  var sheet = ss.getSheetByName('Users');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      sheet.deleteRow(i + 1);
      PropertiesService.getScriptProperties().deleteProperty('pass_' + email);
      return { success: true };
    }
  }
  return { error: 'User not found' };
}

function kategori_list(token) {
  if (!auth_checkSession(token)) return { error: 'Unauthorized' };
  var data = getSS_()
    .getSheetByName('Kategori').getDataRange().getValues();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    result.push({ id: data[i][0].toString(), nama: data[i][1] });
  }
  return result;
}

function kategori_create(token, nama) {
  var user = auth_checkSession(token);
  if (!user || user.role !== 'Admin') return { error: 'Unauthorized' };
  var sheet = getSS_().getSheetByName('Kategori');
  var newId = sheet.getLastRow();
  sheet.appendRow([newId, nama]);
  return { success: true, id: newId };
}

function kategori_delete(token, id) {
  var user = auth_checkSession(token);
  if (!user || user.role !== 'Admin') return { error: 'Unauthorized' };
  var sheet = getSS_().getSheetByName('Kategori');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === id.toString()) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { error: 'Not found' };
}

function dokumen_list(token, filter) {
  if (!auth_checkSession(token)) return { error: 'Unauthorized' };
  filter = filter || {};
  var data = getSS_()
    .getSheetByName('Dokumen').getDataRange().getValues();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var doc = {
      id: row[0].toString(),
      nama: row[1],
      kategoriId: row[2] ? row[2].toString() : '',
      noDokumen: row[3],
      tanggal: row[4],
      tahunAnggaran: row[5] ? row[5].toString() : '',
      status: row[6] || 'Draft',
      fileUrl: row[7],
      uploaderEmail: row[8],
      createdAt: row[9]
    };
    if (filter.kategoriId && doc.kategoriId !== filter.kategoriId) continue;
    if (filter.tahunAnggaran && doc.tahunAnggaran !== filter.tahunAnggaran) continue;
    if (filter.status && doc.status !== filter.status) continue;
    if (filter.search) {
      var q = filter.search.toLowerCase();
      if (doc.nama.toLowerCase().indexOf(q) === -1 &&
          (doc.noDokumen || '').toLowerCase().indexOf(q) === -1) continue;
    }
    result.push(doc);
  }
  return result;
}

function dokumen_create(token, data) {
  var user = auth_checkSession(token);
  if (!user || (user.role !== 'Admin' && user.role !== 'Operator')) return { error: 'Unauthorized' };
  var sheet = getSS_().getSheetByName('Dokumen');
  var newId = sheet.getLastRow();
  sheet.appendRow([
    newId,
    data.nama,
    data.kategoriId,
    data.noDokumen,
    data.tanggal,
    data.tahunAnggaran,
    data.status || 'Draft',
    data.fileUrl || '',
    user.email,
    new Date().toISOString()
  ]);
  return { success: true, id: newId };
}

function dokumen_update(token, id, data) {
  var user = auth_checkSession(token);
  if (!user || (user.role !== 'Admin' && user.role !== 'Operator')) return { error: 'Unauthorized' };
  var sheet = getSS_().getSheetByName('Dokumen');
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0].toString() === id.toString()) {
      if (data.nama !== undefined) sheet.getRange(i + 1, 2).setValue(data.nama);
      if (data.kategoriId !== undefined) sheet.getRange(i + 1, 3).setValue(data.kategoriId);
      if (data.noDokumen !== undefined) sheet.getRange(i + 1, 4).setValue(data.noDokumen);
      if (data.tanggal !== undefined) sheet.getRange(i + 1, 5).setValue(data.tanggal);
      if (data.tahunAnggaran !== undefined) sheet.getRange(i + 1, 6).setValue(data.tahunAnggaran);
      if (data.status !== undefined) sheet.getRange(i + 1, 7).setValue(data.status);
      if (data.fileUrl !== undefined) sheet.getRange(i + 1, 8).setValue(data.fileUrl);
      return { success: true };
    }
  }
  return { error: 'Not found' };
}

function dokumen_delete(token, id) {
  var user = auth_checkSession(token);
  if (!user || (user.role !== 'Admin' && user.role !== 'Operator')) return { error: 'Unauthorized' };
  var sheet = getSS_().getSheetByName('Dokumen');
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0].toString() === id.toString()) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { error: 'Not found' };
}

function upload_file(token, data) {
  var user = auth_checkSession(token);
  if (!user || (user.role !== 'Admin' && user.role !== 'Operator')) return { error: 'Unauthorized' };
  try {
    var folderName = 'SIDORI';
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    var blob = Utilities.newBlob(
      Utilities.base64Decode(data.base64),
      data.mimeType || 'application/octet-stream',
      data.filename || 'file'
    );
    var file = folder.createFile(blob);
    return { success: true, fileUrl: file.getUrl(), fileId: file.getId() };
  } catch (e) {
    return { error: e.toString() };
  }
}

function dokumen_get(token, id) {
  if (!auth_checkSession(token)) return { error: 'Unauthorized' };
  var data = getSS_()
    .getSheetByName('Dokumen').getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === id.toString()) {
      var row = data[i];
      return {
        id: row[0].toString(), nama: row[1], kategoriId: row[2] ? row[2].toString() : '',
        noDokumen: row[3], tanggal: row[4], tahunAnggaran: row[5] ? row[5].toString() : '',
        status: row[6] || 'Draft', fileUrl: row[7], uploaderEmail: row[8], createdAt: row[9]
      };
    }
  }
  return { error: 'Not found' };
}
