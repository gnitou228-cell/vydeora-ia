const fs = require('fs');
const path = require('path');
const db = require('./db');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'avatars');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function handleAvatarUpload(userId, dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    throw new Error('Données d\'image manquantes ou invalides.');
  }

  // Expect format: data:image/(png|jpeg|jpg|webp);base64,...
  const matches = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!matches) {
    throw new Error('Format d\'image non supporté. Veuillez choisir une image PNG, JPEG ou WEBP.');
  }

  const rawExt = matches[1].toLowerCase();
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
  const base64Data = matches[2];

  const buffer = Buffer.from(base64Data, 'base64');
  const maxSize = 5 * 1024 * 1024; // 5 MB

  if (buffer.length > maxSize) {
    throw new Error('L\'image dépasse la taille maximale autorisée de 5 Mo.');
  }

  // Delete previous avatar file if exists
  const currentProfile = db.getProfile(userId);
  if (currentProfile && currentProfile.avatarUrl) {
    try {
      const oldFilename = path.basename(currentProfile.avatarUrl);
      const oldPath = path.join(UPLOADS_DIR, oldFilename);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    } catch (e) {
      console.warn('Could not remove previous avatar:', e.message);
    }
  }

  const newFilename = `avatar-${userId}-${Date.now()}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, newFilename);
  fs.writeFileSync(filePath, buffer);

  const publicUrl = `/uploads/avatars/${newFilename}`;
  const updatedProfile = db.updateProfile(userId, { avatarUrl: publicUrl });

  return {
    success: true,
    avatarUrl: publicUrl,
    profile: updatedProfile
  };
}

function handleAvatarDelete(userId) {
  const currentProfile = db.getProfile(userId);
  if (currentProfile && currentProfile.avatarUrl) {
    try {
      const filename = path.basename(currentProfile.avatarUrl);
      const filePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.warn('Could not delete avatar file:', e.message);
    }
  }

  const updatedProfile = db.updateProfile(userId, { avatarUrl: null });
  return {
    success: true,
    avatarUrl: null,
    profile: updatedProfile
  };
}

module.exports = {
  handleAvatarUpload,
  handleAvatarDelete
};
