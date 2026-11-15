import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { PracticumSession } from '../types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SessionLifecycleButtonsProps {
  session: PracticumSession;
  isAssistant: boolean;
  onOpenSession: (sessionId: string) => Promise<void>;
  onCloseSession: (sessionId: string) => Promise<void>;
  onDeleteSession?: (sessionId: string) => Promise<void>;
}

export function SessionLifecycleButtons({
  session,
  isAssistant,
  onOpenSession,
  onCloseSession,
  onDeleteSession,
}: SessionLifecycleButtonsProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [loading, setLoading] = useState(false);

  if (!isAssistant) {
    return null;
  }

  const handleOpen = () => {
    Alert.alert(
      'Buka Sesi Praktikum',
      `Buka sesi "${session.title}" sekarang? Praktikan yang terdaftar akan dapat melakukan presensi kehadiran secara real-time.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Buka Sesi',
          onPress: async () => {
            try {
              setLoading(true);
              await onOpenSession(session.id);
            } catch (err: any) {
              Alert.alert('Gagal Membuka Sesi', err.message ?? 'Terjadi kesalahan');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleClose = () => {
    Alert.alert(
      'Tutup Sesi Praktikum',
      'Tutup sesi praktikum ini? Catatan: Sesuai aturan bisnis Sprint 2, sesi yang telah ditutup tidak dapat dibuka kembali.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Tutup Sesi',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await onCloseSession(session.id);
            } catch (err: any) {
              Alert.alert('Gagal Menutup Sesi', err.message ?? 'Terjadi kesalahan');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    if (!onDeleteSession) return;
    Alert.alert(
      'Hapus Sesi Praktikum',
      `Yakin ingin menghapus sesi "${session.title}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Sesi',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await onDeleteSession(session.id);
            } catch (err: any) {
              Alert.alert('Gagal Menghapus Sesi', err.message ?? 'Terjadi kesalahan');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {session.status === 'scheduled' && (
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: '#10b981' }]}
            onPress={handleOpen}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>▶ Buka Sesi Praktikum</Text>
            )}
          </TouchableOpacity>

          {onDeleteSession && (
            <TouchableOpacity
              style={[styles.dangerOutlineButton, { borderColor: '#ef4444' }]}
              onPress={handleDelete}
              disabled={loading}
            >
              <Text style={{ color: '#ef4444', fontWeight: '600', fontSize: 13 }}>
                Hapus Sesi
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {session.status === 'open' && (
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: '#f59e0b' }]}
          onPress={handleClose}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>⏹ Tutup Sesi Praktikum</Text>
          )}
        </TouchableOpacity>
      )}

      {session.status === 'closed' && (
        <View
          style={[
            styles.closedNotice,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.closedText, { color: colors.textSecondary }]}>
            ✓ Sesi ini telah ditutup dan selesai.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: '100%',
  },
  buttonGroup: {
    gap: 8,
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  dangerOutlineButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedNotice: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  closedText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
