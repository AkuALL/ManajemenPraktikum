import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CheckCircle2, Play, Square, Trash2 } from 'lucide-react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type { PracticumSession } from '../types';

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

  if (!isAssistant) {
    return null;
  }

  const handleOpen = () => {
    if (loading) return;

    Alert.alert(
      'Buka Sesi Praktikum',
      `Buka sesi "${session.title}" sekarang? Praktikan yang terdaftar akan dapat melakukan presensi kehadiran secara real-time.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Buka Sesi',
          onPress: () => {
            void (async () => {
              if (loading) return;
              try {
                setLoading(true);
                onBusyChange?.(true);
                await onOpenSession(session.id);
              } catch (err: any) {
                Alert.alert('Gagal Membuka Sesi', err.message ?? 'Terjadi kesalahan');
              } finally {
                setLoading(false);
                onBusyChange?.(false);
              }
            })();
          },
        },
      ],
    );
  };

  const handleClose = () => {
    if (loading) return;

    Alert.alert(
      'Tutup Sesi Praktikum',
      'Tutup sesi praktikum ini? Sesi yang telah ditutup tidak dapat dibuka kembali.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Tutup Sesi',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (loading) return;
              try {
                setLoading(true);
                onBusyChange?.(true);
                await onCloseSession(session.id);
              } catch (err: any) {
                Alert.alert('Gagal Menutup Sesi', err.message ?? 'Terjadi kesalahan');
              } finally {
                setLoading(false);
                onBusyChange?.(false);
              }
            })();
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    if (!onDeleteSession || loading) return;
    Alert.alert(
      'Hapus Sesi Praktikum',
      `Yakin ingin menghapus sesi "${session.title}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Sesi',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (loading) return;
              try {
                setLoading(true);
                onBusyChange?.(true);
                await onDeleteSession(session.id);
              } catch (err: any) {
                Alert.alert('Gagal Menghapus Sesi', err.message ?? 'Terjadi kesalahan');
              } finally {
                setLoading(false);
                onBusyChange?.(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {session.status === 'scheduled' ? (
        <View style={styles.buttonGroup}>
          <Pressable
            accessibilityRole="button"
            onPress={handleOpen}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.pacific },
              pressed && styles.pressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FCFCFA" size="small" />
            ) : (
              <>
                <Play size={14} color="#FCFCFA" strokeWidth={2.3} />
                <Text style={styles.primaryButtonText}>Buka Sesi Praktikum</Text>
              </>
            )}
          </Pressable>

          {onDeleteSession ? (
            <Pressable
              accessibilityRole="button"
              onPress={handleDelete}
              disabled={loading}
              style={({ pressed }) => [
                styles.dangerOutlineButton,
                { backgroundColor: colors.rosySoft, borderColor: colors.rosyBorder },
                pressed && styles.pressed,
              ]}
            >
              <Trash2 size={14} color={colors.rosyDark} strokeWidth={2.1} />
              <Text style={[styles.dangerOutlineText, { color: colors.rosyDark }]}>
                Hapus Sesi
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {session.status === 'open' ? (
        <Pressable
          accessibilityRole="button"
          onPress={handleClose}
          disabled={loading}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.baltic },
            pressed && styles.pressed,
          ]}
        >
          {loading ? (
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
  dangerOutlineButton: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dangerOutlineText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
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
  pressed: {
    opacity: 0.78,
  },
});
