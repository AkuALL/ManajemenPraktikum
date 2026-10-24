import { useState, useCallback } from 'react';
import {
  LabSession,
  SessionActionType,
  SessionStatus,
  UserRole,
} from '@/types';
import { ActionFeedbackMessage } from '@/components/assistant/assistant-action-feedback';

export interface UseSessionActionsOptions {
  role: UserRole;
  session: LabSession;
  onStatusChange?: (sessionId: string, newStatus: SessionStatus) => void;
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

  // Confirm action in modal
  const handleConfirmAction = useCallback(() => {
    if (!activeAction) return;

    setIsProcessing(true);

    // Format waktu lokal saat ini
    const now = new Date();
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')} WIB`;

    if (activeAction === 'open') {
      onStatusChange?.(session.id, 'open');
      setFeedback({
        type: 'success',
        message: 'Sesi berhasil dibuka. Praktikan dapat mulai melakukan presensi.',
        timestamp: timeFormatted,
      });
    } else if (activeAction === 'close') {
      onStatusChange?.(session.id, 'closed');
      setFeedback({
        type: 'success',
        message: 'Sesi praktikum telah ditutup. Presensi baru telah dinonaktifkan.',
        timestamp: timeFormatted,
      });
    }

    setIsProcessing(false);
    setModalVisible(false);
    setActiveAction(null);
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
