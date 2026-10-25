import { useState, useCallback } from 'react';
import {
  LabSession,
  SessionActionType,
  SessionStatus,
  UserRole,
} from '@/types';
import { ActionFeedbackMessage } from '@/components/assistant/assistant-action-feedback';

/**
 * Callback untuk perubahan status sesi.
 * Return value menentukan apakah perubahan berhasil:
 * - `void` / `undefined` / `true` → berhasil
 * - `false` → ditolak
 * - `{ success: false, message?: string }` → ditolak dengan pesan opsional
 * - throw Error → gagal
 */
export type StatusChangeCallback = (
  sessionId: string,
  newStatus: SessionStatus,
) =>
  | void
  | boolean
  | { success: boolean; message?: string }
  | Promise<void | boolean | { success: boolean; message?: string }>;

export interface UseSessionActionsOptions {
  role: UserRole;
  session: LabSession;
  onStatusChange?: StatusChangeCallback;
}

/** Cek apakah hasil callback mengindikasikan penolakan / kegagalan. */
function isRejected(
  result: void | boolean | { success: boolean; message?: string } | undefined,
): result is false | { success: false; message?: string } {
  if (result === false) return true;
  if (result && typeof result === 'object' && result.success === false) return true;
  return false;
}

/** Ambil pesan kustom dari hasil penolakan, jika ada. */
function getRejectionMessage(
  result: void | boolean | { success: boolean; message?: string } | undefined,
): string | undefined {
  if (result && typeof result === 'object' && 'message' in result) {
    return result.message;
  }
  return undefined;
}

export function useSessionActions({
  role,
  session,
  onStatusChange,
}: UseSessionActionsOptions) {
  const [modalVisible, setModalVisible] = useState(false);
  const [activeAction, setActiveAction] = useState<SessionActionType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedbackMessage | null>(null);

  const isAssistant = role === 'assistant';

  // Request to open session
  const requestOpenSession = useCallback(() => {
    if (!isAssistant) {
      setFeedback({
        type: 'error',
        message: 'Aksi ditolak: Hanya Asisten yang berhak membuka sesi.',
      });
      return;
    }

    if (session.status !== 'upcoming') {
      setFeedback({
        type: 'info',
        message:
          session.status === 'open'
            ? 'Sesi sudah dalam status Berlangsung.'
            : 'Sesi sudah selesai dan tidak dapat dibuka kembali.',
      });
      return;
    }

    setActiveAction('open');
    setModalVisible(true);
  }, [isAssistant, session.status]);

  // Request to close session
  const requestCloseSession = useCallback(() => {
    if (!isAssistant) {
      setFeedback({
        type: 'error',
        message: 'Aksi ditolak: Hanya Asisten yang berhak menutup sesi.',
      });
      return;
    }

    if (session.status !== 'open') {
      setFeedback({
        type: 'info',
        message:
          session.status === 'upcoming'
            ? 'Sesi belum dibuka sehingga tidak dapat ditutup.'
            : 'Sesi sudah berstatus Selesai.',
      });
      return;
    }

    setActiveAction('close');
    setModalVisible(true);
  }, [isAssistant, session.status]);

  // Cancel action in modal
  const handleCancelModal = useCallback(() => {
    setModalVisible(false);
    setActiveAction(null);
  }, []);

  // Confirm action in modal — async untuk menangani callback yang mengembalikan Promise
  const handleConfirmAction = useCallback(async () => {
    if (!activeAction) return;

    setIsProcessing(true);

    const now = new Date();
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')} WIB`;

    const newStatus: SessionStatus = activeAction === 'open' ? 'open' : 'closed';

    try {
      // Eksekusi callback dan tangkap hasilnya
      const result = await onStatusChange?.(session.id, newStatus);

      // Periksa apakah callback menolak / gagal
      if (isRejected(result)) {
        const customMessage = getRejectionMessage(result);
        setFeedback({
          type: 'error',
          message:
            customMessage ||
            (activeAction === 'open'
              ? 'Gagal membuka sesi. Perubahan status ditolak.'
              : 'Gagal menutup sesi. Perubahan status ditolak.'),
          timestamp: timeFormatted,
        });
      } else {
        // Callback berhasil (void, true, atau { success: true })
        setFeedback({
          type: 'success',
          message:
            activeAction === 'open'
              ? 'Sesi berhasil dibuka. Praktikan dapat mulai melakukan presensi.'
              : 'Sesi praktikum telah ditutup. Presensi baru telah dinonaktifkan.',
          timestamp: timeFormatted,
        });
      }
    } catch (error: unknown) {
      // Callback melempar error — tampilkan pesan kegagalan
      const errorMessage =
        error instanceof Error ? error.message : 'Terjadi kesalahan tak terduga.';
      setFeedback({
        type: 'error',
        message:
          activeAction === 'open'
            ? `Gagal membuka sesi: ${errorMessage}`
            : `Gagal menutup sesi: ${errorMessage}`,
        timestamp: timeFormatted,
      });
    } finally {
      setIsProcessing(false);
      setModalVisible(false);
      setActiveAction(null);
    }
  }, [activeAction, onStatusChange, session.id]);

  const dismissFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  return {
    isAssistant,
    modalVisible,
    activeAction,
    isProcessing,
    feedback,
    requestOpenSession,
    requestCloseSession,
    handleCancelModal,
    handleConfirmAction,
    dismissFeedback,
  };
}
