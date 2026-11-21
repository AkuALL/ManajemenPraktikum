import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Colors, FontFamily } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import {
  buildQrPayload,
  createSessionQrChallenge,
  getSessionQrChallenge,
  type SessionQrChallenge,
} from '@/features/attendance/qr-service';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FlyAwayBottomSheet } from './fly-away-bottom-sheet';

type QrSessionBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  sessionId: string;
  classId?: string;
  sessionTitle: string;
  subtitle: string;
  sessionStatus?: 'scheduled' | 'open' | 'closed';
  onOpenSession?: () => Promise<void>;
};

function formatRemaining(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** QR asli: token disimpan privat pada Firestore dan berlaku lima menit. */
export function QrSessionBottomSheet({
  visible, onClose, sessionId, classId, sessionTitle, subtitle, sessionStatus = 'open', onOpenSession,
}: QrSessionBottomSheetProps) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<SessionQrChallenge | null>(null);
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible || !classId || user?.role !== 'assistant') return;
    let alive = true;
    void getSessionQrChallenge(sessionId)
      .then((current) => {
        if (!alive) return;
        setError(null);
        if (current?.classId === classId) {
          setChallenge(current);
          setNow(Date.now());
        } else {
          setChallenge(null);
        }
      })
      .catch(() => {
        if (alive) setError('QR belum dapat dimuat. Buat QR baru atau pastikan Firestore Rules sudah di-deploy.');
      });
    return () => { alive = false; };
  }, [classId, sessionId, user?.role, visible]);

  const remainingMs = challenge ? challenge.expiresAtMs - now : 0;
  const isExpired = !challenge || remainingMs <= 0;
  const payload = useMemo(() => challenge && !isExpired ? buildQrPayload(challenge) : null, [challenge, isExpired]);

  const generate = async () => {
    if (!classId || user?.role !== 'assistant') return;
    setLoading(true); setError(null);
    try {
      setChallenge(await createSessionQrChallenge({ sessionId, classId, assistantId: user.uid }));
      setNow(Date.now());
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (code === 'unavailable' || code === 'deadline-exceeded') {
        setError('Koneksi ke server terputus. Periksa jaringan lalu coba buat QR lagi.');
      } else if (code === 'permission-denied') {
        setError(
          'Akses ditolak Firestore (permission-denied). Pastikan sesi berstatus open, Anda Asisten kelas ini, jam perangkat sinkron, dan firestore.rules terbaru sudah di-deploy.',
        );
      } else {
        setError('QR tidak dapat dibuat. Pastikan sesi sudah dibuka dan Anda adalah Asisten kelas ini.');
      }
    } finally { setLoading(false); }
  };

  const openSession = async () => {
    if (!onOpenSession) return;
    setLoading(true);
    try { await onOpenSession(); } finally { setLoading(false); }
  };

  return (
    <FlyAwayBottomSheet visible={visible} onClose={onClose} title="QR Presensi Sesi" subtitle={`${sessionTitle} · ${subtitle}`}>
      <View style={styles.content}>
        {sessionStatus === 'scheduled' ? (
          <Pressable accessibilityRole="button" disabled={loading || !onOpenSession} onPress={() => void openSession()} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.rosy }, pressed && styles.pressed]}>
            {loading ? <ActivityIndicator color="#FCFCFA" /> : <Text style={styles.primaryText}>Buka Sesi & Buat QR</Text>}
          </Pressable>
        ) : sessionStatus === 'closed' ? (
          <Text style={[styles.notice, { color: colors.rosyDark }]}>Sesi sudah ditutup; QR tidak dapat dibuat.</Text>
        ) : !classId ? (
          <Text style={[styles.notice, { color: colors.rosyDark }]}>Data kelas sesi belum lengkap. QR tidak dapat diamankan.</Text>
        ) : payload ? (
          <View style={[styles.qrPanel, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.qrFrame, { borderColor: colors.border }]}><QRCode value={payload} size={184} backgroundColor="#FCFCFA" color="#0D2336" /></View>
            <Text style={[styles.codeLabel, { color: colors.textPrimary }]}>QR aktif untuk presensi radius 10 m</Text>
            <Text style={[styles.timer, { color: colors.rosyDark }]}>Berlaku {formatRemaining(remainingMs)} menit</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>Token tidak dapat dipakai lagi setelah masa berlaku berakhir.</Text>
          </View>
        ) : (
          <View style={[styles.qrPanel, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.codeLabel, { color: colors.textPrimary }]}>Belum ada QR aktif</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>Buat QR ketika praktikan sudah berada di laboratorium.</Text>
          </View>
        )}
        {sessionStatus === 'open' && classId ? (
          <Pressable accessibilityRole="button" disabled={loading} onPress={() => void generate()} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.baltic }, pressed && styles.pressed]}>
            {loading ? <ActivityIndicator color="#FCFCFA" /> : <Text style={styles.primaryText}>{isExpired ? 'Buat QR Baru (5 Menit)' : 'Perbarui QR (5 Menit)'}</Text>}
          </Pressable>
        ) : null}
        {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.rosyDark }]}>{error}</Text> : null}
      </View>
    </FlyAwayBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 8 }, qrPanel: { borderWidth: 1, borderRadius: 20, padding: 18, alignItems: 'center', gap: 9 },
  qrFrame: { backgroundColor: '#FCFCFA', padding: 12, borderRadius: 18, borderWidth: 1 }, codeLabel: { fontFamily: FontFamily.sansBold, fontSize: 14, textAlign: 'center' },
  timer: { fontFamily: FontFamily.monoMedium, fontSize: 15, fontVariant: ['tabular-nums'] }, hint: { fontFamily: FontFamily.sansRegular, fontSize: 12, textAlign: 'center', lineHeight: 17 },
  notice: { fontFamily: FontFamily.sansSemiBold, fontSize: 13, textAlign: 'center', padding: 12 }, primaryButton: { minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  primaryText: { color: '#FCFCFA', fontFamily: FontFamily.sansBold, fontSize: 13.5 }, error: { fontFamily: FontFamily.sansSemiBold, fontSize: 12, textAlign: 'center' }, pressed: { opacity: 0.78 },
});
