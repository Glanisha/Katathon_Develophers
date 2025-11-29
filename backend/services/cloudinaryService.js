// backend/services/cloudinaryService.js
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadLocalFile(path, folder = 'safewalk') {
  const res = await cloudinary.uploader.upload(path, { folder });
  try { fs.unlinkSync(path); } catch(_) {}
  return res;
}

module.exports = { uploadLocalFile, cloudinary };
