import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MapPin, RefreshCw, Zap } from 'lucide-react-native';

import { parseQrPayload } from '@/features/attendance/qr-service';
import { useAttendance } from '@/features/attendance';
import { useAttendanceLocation } from '@/features/attendance/useAttendanceLocation';
import { resolveSessionLocationSummary } from '@/features/attendance/lab-location-fallback';
import { useAuth } from '@/features/auth';
import { useLabs } from '@/features/labs/firestore-labs';
import { APP_ROUTES } from '@/features/navigation';
import { usePracticum } from '@/features/practicum';
import { Colors, FontFamily, MaxContentWidth } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { evaluateGeofence, formatDistanceMeters } from '@/utils/haversine';

export default function ScanQrScreen() {
  const router = useRouter();
  const { sessionId: paramSessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { labs } = useLabs();
  const { sessions } = usePracticum();
  const { records, submitAttendance } = useAttendance();
  const location = useAttendanceLocation(user?.role === 'student');
  const [permission, requestPermission] = useCameraPermissions();
  const scanLock = useRef(false);
  const [flashOn, setFlashOn] = useState(false);
  const [rawQr, setRawQr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const activeSession = useMemo(() => {
    const requested =
      typeof paramSessionId === 'string' && paramSessionId.trim()
        ? sessions.find((item) => item.id === paramSessionId.trim() && item.status === 'open')
        : undefined;
    return requested ?? sessions.find((item) => item.status === 'open') ?? null;
  }, [paramSessionId, sessions]);
  const existing = activeSession ? records.some((record) => record.sessionId === activeSession.id) : false;
  const lab = useMemo(() => (activeSession ? resolveSessionLocationSummary(activeSession, labs) : null), [activeSession, labs]);
  const requiredRadius = lab?.summary.radiusMeters ?? 10;
  const geofence = useMemo(() => lab ? evaluateGeofence({ userCoords: location.coords, labCoords: lab.summary, radiusMeters: requiredRadius }) : null, [lab, location.coords, requiredRadius]);
  const distanceLabel =
    geofence && Number.isFinite(geofence.distanceMeters)
      ? formatDistanceMeters(geofence.distanceMeters)
      : '--';
  const remainingMeters =
    geofence && Number.isFinite(geofence.distanceMeters)
      ? Math.max(1, Math.ceil(geofence.distanceMeters - requiredRadius))
      : null;

  const submitQr = async (value: string) => {
    if (scanLock.current || existing || submitting) return;
    scanLock.current = true;
    if (!activeSession) {
      setFeedback({ tone: 'error', text: 'Belum ada sesi praktikum yang dibuka.' });
      return;
    }
    const parsed = parseQrPayload(value);
    if (!parsed || parsed.sessionId !== activeSession.id) {
      setFeedback({ tone: 'error', text: 'QR tidak valid atau bukan untuk sesi praktikum yang sedang dibuka.' });
      return;
    }
    if (!geofence?.userCoords || !geofence.isWithinRadius) {
      setFeedback({ tone: 'error', text: `Presensi QR hanya tersedia dalam radius ${requiredRadius} meter dari laboratorium. Pastikan GPS sudah akurat.` });
      return;
    }
    setSubmitting(true); setFeedback(null);
    try {
      const result = await submitAttendance(
        { id: activeSession.id, classId: activeSession.classId, status: activeSession.status },
        {
          latitude: geofence.userCoords.latitude, longitude: geofence.userCoords.longitude,
          accuracy: geofence.userCoords.accuracy ?? 0, distanceMeters: geofence.distanceMeters,
          isWithinRadius: geofence.isWithinRadius,
        },
        parsed.token,
      );
      if (result.ok) {
        setFeedback({ tone: 'success', text: `Presensi QR berhasil dicatat beserta verifikasi radius ${requiredRadius} meter.` });

      } else setFeedback({ tone: 'error', text: result.message });
    } catch {
      setFeedback({ tone: 'error', text: 'Terjadi kesalahan saat mencatat presensi. Silakan coba lagi.' });
    } finally { setSubmitting(false); }
  };

  if (user?.role !== 'student') return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={[styles.title, { color: colors.textPrimary }]}>Scan QR hanya untuk Praktikan.</Text></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.top}><Pressable onPress={() => router.back()}><ChevronLeft color="#FCFCFA" size={22} /></Pressable><Text style={styles.topTitle}>Scan QR Presensi</Text><Pressable onPress={() => setFlashOn((value) => !value)}><Zap color={flashOn ? '#F8D36B' : '#BCE8F2'} size={20} /></Pressable></View>
        <View style={styles.cameraWrap}>
          {!permission ? <ActivityIndicator color="#FCFCFA" /> : !permission.granted ? (
            <View style={styles.permissionBox}><Text style={styles.permissionText}>Kamera diperlukan untuk memindai QR asisten.</Text><Pressable onPress={() => void requestPermission()} style={styles.cameraButton}><Text style={styles.cameraButtonText}>Izinkan Kamera</Text></Pressable></View>
          ) : (
            <CameraView style={styles.camera} facing="back" enableTorch={flashOn} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={submitting || existing || feedback ? undefined : ({ data }) => { setRawQr(data); void submitQr(data); }} />
          )}
        </View>
        <Text style={styles.prompt}>Arahkan kamera ke QR asisten. QR hanya berlaku 5 menit.</Text>
        <View style={styles.radiusCard}>
          <View style={styles.radiusHeader}>
            <View style={styles.radiusTitleRow}>
              <MapPin size={15} color="#1FA7C1" />
              <Text style={styles.radiusTitle}>Radius dari Titik Lab</Text>
            </View>
            <View
              style={[
                styles.radiusBadge,
                geofence?.isWithinRadius ? styles.badgeOk : styles.badgeWarn,
              ]}
            >
              <Text
                style={[
                  styles.radiusBadgeText,
                  geofence?.isWithinRadius ? styles.badgeOkText : styles.badgeWarnText,
                ]}
              >
                {geofence?.isWithinRadius
                  ? 'Dalam Radius'
                  : location.status === 'ready'
                    ? 'Di Luar Radius'
                    : 'Menunggu GPS'}
              </Text>
            </View>
          </View>
          <View style={styles.radiusMetricsRow}>
            <View>
              <Text style={styles.metricLabel}>Jarak Anda</Text>
              <Text
                style={[
                  styles.metricValue,
                  { color: geofence?.isWithinRadius ? '#3BD2A2' : '#F27D65' },
                ]}
              >
                {distanceLabel}
              </Text>
            </View>
            <View style={styles.radiusLimitBox}>
              <Text style={styles.metricLabel}>Batas Maksimal</Text>
              <Text style={styles.limitValue}>Maks. {requiredRadius} m</Text>
            </View>
          </View>
          <Text style={styles.targetText}>
            Titik lab: {lab?.summary.locationName ?? '-'}{lab?.building ? ` · ${lab.building}` : ''}
          </Text>
          {location.status === 'ready' && geofence && !geofence.isWithinRadius && remainingMeters !== null ? (
            <Text style={styles.warnHint}>
              Mendekatlah sekitar {remainingMeters} m lagi agar scan QR dapat diterima.
            </Text>
          ) : location.errorMessage ? (
            <Text style={styles.warnHint}>{location.errorMessage}</Text>
          ) : null}
          <Pressable
            disabled={location.isRefreshing}
            onPress={() => void location.refreshLocation()}
            style={({ pressed }) => [styles.refreshGpsBtn, pressed && styles.pressed]}
          >
            <RefreshCw size={13} color="#BCE8F2" />
            <Text style={styles.refreshGpsText}>
              {location.isRefreshing ? 'Memperbarui GPS...' : 'Perbarui Koordinat GPS'}
            </Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          <Text style={styles.title}>{activeSession ? activeSession.courseName ?? activeSession.title : 'Belum ada sesi dibuka'}</Text>
          <Text style={styles.meta}>
            {activeSession
              ? `${activeSession.title}${activeSession.className ? ` · ${activeSession.className}` : ''}`
              : 'Minta asisten membuka sesi praktikum terlebih dahulu.'}
          </Text>
          <TextInput value={rawQr} onChangeText={setRawQr} autoCapitalize="characters" placeholder="Tempel payload QR bila kamera bermasalah" placeholderTextColor="#7A8A98" style={styles.input} editable={!submitting && !existing} />
          <Pressable disabled={!rawQr || submitting || existing} onPress={() => void submitQr(rawQr)} style={({ pressed }) => [styles.submit, (!rawQr || existing) && styles.disabled, pressed && styles.pressed]}>{submitting ? <ActivityIndicator color="#FCFCFA" /> : <Text style={styles.submitText}>{existing ? 'Sudah Hadir' : 'Validasi & Presensi'}</Text>}</Pressable>

        </View>
      </ScrollView>
      <Modal visible={feedback !== null} transparent animationType="fade" onRequestClose={() => {
        if (feedback?.tone === 'success') router.replace(APP_ROUTES.STUDENT_ATTENDANCE as never);
        else { setFeedback(null); scanLock.current = false; }
      }}>
        <View style={styles.overlay}>
          <View style={styles.dialog} accessibilityRole="alert">
            <Text style={[styles.dialogTitle, { color: feedback?.tone === 'success' ? '#11754A' : '#B23A2B' }]}>
              {feedback?.tone === 'success' ? 'Presensi berhasil' : 'Presensi gagal'}
            </Text>
            <Text style={styles.dialogMessage}>{feedback?.text}</Text>
            <Pressable style={styles.submit} onPress={() => {
              if (feedback?.tone === 'success') router.replace(APP_ROUTES.STUDENT_ATTENDANCE as never);
              else { setFeedback(null); scanLock.current = false; }
            }}><Text style={styles.submitText}>{feedback?.tone === 'success' ? 'Lihat presensi' : 'Coba lagi'}</Text></Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: '#FCFCFA', borderRadius: 20, padding: 20, gap: 16 },
  dialogTitle: { fontFamily: FontFamily.displayBold, fontSize: 19 },
  dialogMessage: { fontFamily: FontFamily.sansRegular, fontSize: 14, lineHeight: 21, color: '#4E6273' },
  screen: { flex: 1, backgroundColor: '#0D2336' }, content: { flexGrow: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 18, gap: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, topTitle: { color: '#FCFCFA', fontFamily: FontFamily.displayBold, fontSize: 17 },
  cameraWrap: { height: 260, overflow: 'hidden', borderRadius: 24, backgroundColor: '#163B55', justifyContent: 'center' }, camera: { flex: 1 },
  permissionBox: { padding: 24, alignItems: 'center', gap: 14 }, permissionText: { color: '#FCFCFA', fontFamily: FontFamily.sansRegular, textAlign: 'center' },
  cameraButton: { backgroundColor: '#1FA7C1', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11 }, cameraButtonText: { color: '#FCFCFA', fontFamily: FontFamily.sansBold },
  prompt: { color: '#BCE8F2', textAlign: 'center', fontFamily: FontFamily.sansRegular, fontSize: 12.5 },
  radiusCard: { backgroundColor: '#122E46', borderRadius: 20, padding: 14, gap: 10, borderWidth: 1, borderColor: '#1E4668' },
  radiusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  radiusTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radiusTitle: { color: '#FCFCFA', fontFamily: FontFamily.sansBold, fontSize: 13.5 },
  radiusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeOk: { backgroundColor: 'rgba(59, 210, 162, 0.18)' },
  badgeWarn: { backgroundColor: 'rgba(213, 80, 54, 0.24)' },
  radiusBadgeText: { fontFamily: FontFamily.sansBold, fontSize: 11 },
  badgeOkText: { color: '#3BD2A2' },
  badgeWarnText: { color: '#F27D65' },
  radiusMetricsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { color: '#8FB2C9', fontFamily: FontFamily.sansRegular, fontSize: 11.5 },
  metricValue: { fontFamily: FontFamily.displayBold, fontSize: 22, marginTop: 2 },
  radiusLimitBox: { backgroundColor: '#0D2336', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'flex-end' },
  limitValue: { color: '#FCFCFA', fontFamily: FontFamily.sansBold, fontSize: 13.5, marginTop: 2 },
  targetText: { color: '#BCE8F2', fontFamily: FontFamily.sansRegular, fontSize: 12 },
  warnHint: { color: '#F8B09E', fontFamily: FontFamily.sansRegular, fontSize: 12, lineHeight: 17 },
  refreshGpsBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#163B55' },
  refreshGpsText: { color: '#BCE8F2', fontFamily: FontFamily.sansSemiBold, fontSize: 12 },
  card: { backgroundColor: '#FCFCFA', borderRadius: 22, padding: 16, gap: 11 },
  title: { color: '#0D2336', fontFamily: FontFamily.displayBold, fontSize: 16 }, meta: { color: '#4E6273', fontFamily: FontFamily.sansRegular, fontSize: 12.5 }, input: { backgroundColor: '#EEF3F5', borderRadius: 13, paddingHorizontal: 12, minHeight: 46, fontFamily: FontFamily.monoMedium, color: '#0D2336', fontSize: 12 },
  submit: { backgroundColor: '#D55036', borderRadius: 14, minHeight: 46, alignItems: 'center', justifyContent: 'center' }, submitText: { color: '#FCFCFA', fontFamily: FontFamily.sansBold }, disabled: { opacity: 0.55 }, feedback: { fontFamily: FontFamily.sansSemiBold, fontSize: 12, lineHeight: 17 }, pressed: { opacity: 0.78 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
