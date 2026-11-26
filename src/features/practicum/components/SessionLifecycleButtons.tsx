import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CheckCircle2, Play, Square, Trash2 } from 'lucide-react-native';

import { FlyAwayBottomSheet } from '@/components/ui/fly-away-bottom-sheet';
import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { checkSessionStartWindow } from '../sequence';
import type { PracticumSession } from '../types';

type LifecycleAction = 'open' | 'close' | 'delete';

interface SessionLifecycleButtonsProps {
  session: PracticumSession;
  isAssistant: boolean;
  onOpenSession: (sessionId: string) => Promise<void>;
  onCloseSession: (sessionId: string) => Promise<void>;
  onDeleteSession?: (sessionId: string) => Promise<void>;
  onBusyChange?: (isBusy: boolean) => void;
}

export function SessionLifecycleButtons({
  session,
  isAssistant,
  onOpenSession,
  onCloseSession,
  onDeleteSession,
  onBusyChange,
}: SessionLifecycleButtonsProps) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<LifecycleAction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (session.status !== 'scheduled') return;
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [session.status, session.startsAt, session.endsAt]);

  if (!isAssistant) {
    return null;
  }

  const startWindow = checkSessionStartWindow(session, new Date(nowMs));
  const openDisabled = loading || !startWindow.canOpen;

  const openConfirmSheet = (action: LifecycleAction) => {
    if (loading) return;
    setErrorMessage(null);
    setPendingAction(action);
  };

  const handleConfirm = async () => {
    if (!pendingAction || loading) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      onBusyChange?.(true);

      if (pendingAction === 'open') {
        await onOpenSession(session.id);
      } else if (pendingAction === 'close') {
        await onCloseSession(session.id);
      } else if (pendingAction === 'delete' && onDeleteSession) {
        await onDeleteSession(session.id);
      }

      setPendingAction(null);
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Terjadi kesalahan saat memperbarui sesi.');
    } finally {
      setLoading(false);
      onBusyChange?.(false);
    }
  };

  const sheetMeta =
    pendingAction === 'open'
      ? {
          title: 'Buka Sesi Praktikum',
          subtitle: session.title,
          body: `Buka sesi "${session.title}" sekarang? Praktikan yang terdaftar akan dapat melakukan presensi kehadiran secara real-time.`,
          confirmText: 'Buka Sesi',
          confirmBg: colors.pacific,
        }
      : pendingAction === 'close'
        ? {
            title: 'Tutup Sesi Praktikum',
            subtitle: session.title,
            body: 'Tutup sesi praktikum ini? Praktikan tidak dapat mencatat presensi baru setelah sesi ditutup dan selesai.',
            confirmText: 'Tutup Sesi',
            confirmBg: colors.rosy,
          }
        : pendingAction === 'delete'
          ? {
              title: 'Hapus Sesi Praktikum',
              subtitle: session.title,
              body: `Yakin ingin menghapus sesi "${session.title}"? Tindakan ini tidak dapat dibatalkan.`,
              confirmText: 'Hapus Sesi',
              confirmBg: colors.rosy,
            }
          : null;

  return (
    <View style={styles.container}>
      {session.status === 'scheduled' ? (
        <View style={styles.buttonGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: openDisabled }}
            onPress={() => openConfirmSheet('open')}
            disabled={openDisabled}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: startWindow.canOpen ? colors.pacific : colors.disabledSurface,
              },
              pressed && !openDisabled && styles.pressed,
            ]}
          >
            {loading && pendingAction === 'open' ? (
              <ActivityIndicator color="#FCFCFA" size="small" />
            ) : (
              <>
                <Play
                  size={14}
                  color={startWindow.canOpen ? '#FCFCFA' : colors.disabledText}
                  strokeWidth={2.3}
                />
                <Text
                  style={[
                    styles.primaryButtonText,
                    !startWindow.canOpen && { color: colors.disabledText },
                  ]}
                >
                  Buka Sesi Praktikum
                </Text>
              </>
            )}
          </Pressable>

          {!startWindow.canOpen && startWindow.reason ? (
            <View
              style={[
                styles.windowInfoBox,
                { backgroundColor: colors.balticSoft, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.windowInfoText, { color: colors.textSecondary }]}>
                {startWindow.reason}
              </Text>
            </View>
          ) : null}

          {onDeleteSession ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => openConfirmSheet('delete')}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.rosy },
                pressed && styles.pressed,
              ]}
            >
              <Trash2 size={15} color="#FCFCFA" strokeWidth={2.1} />
              <Text style={styles.primaryButtonText}>Hapus Sesi</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {session.status === 'open' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => openConfirmSheet('close')}
          disabled={loading}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.baltic },
            pressed && styles.pressed,
          ]}
        >
          {loading && pendingAction === 'close' ? (
            <ActivityIndicator color="#FCFCFA" size="small" />
          ) : (
            <>
              <Square size={14} color="#FCFCFA" strokeWidth={2.2} />
              <Text style={styles.primaryButtonText}>Tutup Sesi Praktikum</Text>
            </>
          )}
        </Pressable>
      ) : null}

      {session.status === 'closed' ? (
        <View
          style={[
            styles.closedNotice,
            { backgroundColor: colors.pacificSoft, borderColor: colors.pacificLight },
          ]}
        >
          <CheckCircle2 size={15} color={colors.pacificDark} strokeWidth={2.1} />
          <Text style={[styles.closedText, { color: colors.pacificDark }]}>
            Sesi ini telah ditutup dan selesai.
          </Text>
        </View>
      ) : null}

      <FlyAwayBottomSheet
        visible={Boolean(pendingAction)}
        onClose={() => {
          if (!loading) {
            setPendingAction(null);
            setErrorMessage(null);
          }
        }}
        title={sheetMeta?.title ?? 'Konfirmasi Sesi'}
        subtitle={sheetMeta?.subtitle}
        dismissDisabled={loading}
        maxHeight="52%"
      >
        <View style={styles.sheetBody}>
          {sheetMeta ? (
            <Text style={[styles.sheetDescription, { color: colors.textSecondary }]}>
              {sheetMeta.body}
            </Text>
          ) : null}

          {errorMessage ? (
            <View
              accessibilityRole="alert"
              style={[
                styles.errorBox,
                { backgroundColor: colors.rosySoft, borderColor: colors.rosyBorder },
              ]}
            >
              <Text style={[styles.errorText, { color: colors.rosyDark }]}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <View style={styles.sheetActions}>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={() => {
                setPendingAction(null);
                setErrorMessage(null);
              }}
              style={({ pressed }) => [
                styles.cancelBtn,
                { backgroundColor: colors.background, borderColor: colors.border },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Batal</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={() => void handleConfirm()}
              style={({ pressed }) => [
                styles.confirmBtn,
                { backgroundColor: sheetMeta?.confirmBg ?? colors.baltic },
                pressed && styles.pressed,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FCFCFA" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>
                  {sheetMeta?.confirmText ?? 'Lanjutkan'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </FlyAwayBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    width: '100%',
  },
  buttonGroup: {
    gap: 8,
  },
  primaryButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FCFCFA',
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
  },
  windowInfoBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  windowInfoText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    lineHeight: 17,
  },
  closedNotice: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  closedText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12.5,
  },
  sheetBody: {
    gap: 14,
    paddingBottom: 6,
  },
  sheetDescription: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13.5,
    lineHeight: 20,
  },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  errorText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12.5,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
  },
  confirmBtn: {
    flex: 1.3,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
    color: '#FCFCFA',
  },
  pressed: {
    opacity: 0.78,
  },
});
