const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const UPLOAD_BASE_DIR = path.join(__dirname, '../../uploads');
const CHAT_IMAGES_DIR = path.join(UPLOAD_BASE_DIR, 'chat/images');
const CHAT_FILES_DIR = path.join(UPLOAD_BASE_DIR, 'chat/files');

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'zip', 'rar'];

async function ensureDirectories() {
  try {
    await fs.mkdir(CHAT_IMAGES_DIR, { recursive: true });
    await fs.mkdir(CHAT_FILES_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating directories:', error);
  }
}

function getFileExtension(fileName) {
  if (!fileName || fileName.lastIndexOf('.') === -1) {
    return null;
  }
  return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
}

function isImageFile(fileName) {
  const extension = getFileExtension(fileName);
  return extension && IMAGE_EXTENSIONS.includes(extension);
}

async function saveChatFile(fileData, originalFileName) {
  if (!fileData || !originalFileName) {
    return null;
  }

  await ensureDirectories();

  const extension = getFileExtension(originalFileName);
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    console.warn('Disallowed file type:', originalFileName);
    return null;
  }

  const isImage = isImageFile(originalFileName);
  const uniqueId = crypto.randomBytes(16).toString('hex');
  const uniqueFileName = `${uniqueId}.${extension}`;
  const subDir = isImage ? 'chat/images' : 'chat/files';
  const filePath = path.join(UPLOAD_BASE_DIR, subDir, uniqueFileName);

  try {
    await fs.writeFile(filePath, fileData);
    return path.relative(path.join(__dirname, '../..'), filePath).replace(/\\/g, '/');
  } catch (error) {
    console.error('Error saving file:', error);
    return null;
  }
}

function getFileType(fileName) {
  const extension = getFileExtension(fileName);
  if (!extension) {
    return 'application/octet-stream';
  }

  const mimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    bmp: 'image/bmp',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/msword',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.ms-excel',
    txt: 'text/plain',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed'
  };

  return mimeTypes[extension] || 'application/octet-stream';
}

module.exports = { saveChatFile, getFileType, isImageFile };

