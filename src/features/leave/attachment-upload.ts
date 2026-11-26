import * as DocumentPicker from 'expo-document-picker';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { showAlert } from '@/lib/cross-platform-alert';
import { storage } from '@/lib/firebase';
import type { LeaveAttachment } from '@/types';

import {
  inferAttachmentMimeType,
  isAllowedAttachmentMimeType,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_INLINE_ATTACHMENT_BYTES,
  sanitizeAttachmentFileName,
  type LeaveAttachmentMeta,
} from './attachment-store';

export async function pickLeaveAttachment(): Promise<LeaveAttachmentMeta | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const webFile =
      'file' in asset && asset.file instanceof Blob ? asset.file : undefined;
    const sizeBytes = asset.size ?? webFile?.size ?? 0;
    const mimeType = inferAttachmentMimeType(
      asset.name,
      asset.mimeType ?? (webFile?.type || undefined),
    );

    if (!isAllowedAttachmentMimeType(mimeType)) {
      showAlert(
        'Format berkas tidak didukung',
        'Pilih berkas foto (JPG, PNG, WebP) atau dokumen PDF.',
      );
      return null;
    }

    if (sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
      showAlert(
        'Ukuran berkas terlalu besar',
        'Ukuran lampiran maksimal 2 MB (Image / PDF).',
      );
      return null;
    }

    return {
      name: asset.name,
      sizeBytes,
      mimeType,
      uri: asset.uri,
      file: webFile,
    };
  } catch {
    showAlert('Gagal memilih berkas', 'Silakan pilih berkas gambar atau PDF lain.');
    return null;
  }
}

function readBlobViaXhr(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      resolve(xhr.response as Blob);
    };
    xhr.onerror = () => {
      reject(new Error('Gagal membaca berkas lampiran dari perangkat.'));
    };
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

async function readAttachmentBlob(attachment: LeaveAttachmentMeta): Promise<Blob> {
  if (attachment.file) {
    return attachment.file;
  }

  try {
    const response = await fetch(attachment.uri);
    if (!response.ok) {
      throw new Error('fetch failed');
    }
    return await response.blob();
  } catch {
    return readBlobViaXhr(attachment.uri);
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Hasil pembacaan lampiran tidak valid.'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Gagal memproses berkas lampiran.'));
    };
    reader.readAsDataURL(blob);
  });
}

export async function uploadLeaveAttachment(params: {
  leaveId: string;
  studentId: string;
  attachment: LeaveAttachmentMeta;
}): Promise<LeaveAttachment> {
  const { leaveId, studentId, attachment } = params;
  const mimeType = inferAttachmentMimeType(attachment.name, attachment.mimeType);

  if (!isAllowedAttachmentMimeType(mimeType)) {
    throw new Error('Format lampiran harus berupa gambar atau PDF.');
  }

  const blob = await readAttachmentBlob(attachment);
  const sizeBytes = blob.size || attachment.sizeBytes;
  if (sizeBytes <= 0) {
    throw new Error('Berkas lampiran kosong atau tidak dapat dibaca.');
  }
  if (sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error('Ukuran lampiran maksimal 2 MB (Image / PDF).');
  }

  const safeName = sanitizeAttachmentFileName(attachment.name);
  const storagePath = `leaveAttachments/${studentId}/${leaveId}/${safeName}`;

  try {
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, blob, { contentType: mimeType });
    const url = await getDownloadURL(storageRef);
    return {
      name: attachment.name.trim() || safeName,
      sizeBytes,
      mimeType,
      url,
      storagePath,
    };
  } catch {
    if (sizeBytes <= MAX_INLINE_ATTACHMENT_BYTES) {
      const dataUrl = await blobToDataUrl(blob);
      if (dataUrl.length <= 950_000) {
        return {
          name: attachment.name.trim() || safeName,
          sizeBytes,
          mimeType,
          url: dataUrl,
        };
      }
    }
    throw new Error(
      'Gagal mengunggah lampiran izin. Periksa koneksi internet atau ukuran file (maksimal 2 MB).',
    );
  }
}
