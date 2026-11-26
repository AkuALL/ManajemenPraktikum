import { useLocalSearchParams, useRouter } from 'expo-router';
import { Upload, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { SubScreenHeader } from '@/components/ui/app-header';
import { Colors, FontFamily, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import {
    formatAttachmentSize,
    LeaveAttachmentPreview,
    pickLeaveAttachment,
    useLeave,
    type LeaveAttachmentMeta,
} from '@/features/leave';
import { validateLeaveReason } from '@/features/leave/port';
import { APP_ROUTES } from '@/features/navigation';
import { formatSessionTime, usePracticum } from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { confirmAction } from '@/lib/cross-platform-alert';

export default function LeaveRequestScreen() {
  const router = useRouter();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const { user } = useAuth();
  const { sessions } = usePracticum();
  const { requests, submitLeave } = useLeave();

  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<LeaveAttachmentMeta | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const targetSession = useMemo(() => {
    if (sessionId) {
      return sessions.find((s) => s.id === sessionId) ?? null;
    }
    const existingIds = new Set(requests.map((r) => r.sessionId));
    return (
      sessions.find(
        (s) =>
          (s.status === 'scheduled' || s.status === 'open') && !existingIds.has(s.id),
      ) ?? null
    );
  }, [requests, sessionId, sessions]);

  const existingRequest = targetSession
    ? requests.find((r) => r.sessionId === targetSession.id)
    : undefined;

  const handlePickAttachment = async () => {
    if (submitting) return;
    const picked = await pickLeaveAttachment();
    if (picked) {
      setAttachment(picked);
      setErrorMessage(null);
    }
  };

  const executeSubmit = async () => {
    if (!targetSession || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);
    const result = await submitLeave(
      {
        id: targetSession.id,
        classId: targetSession.classId,
        status: targetSession.status,
      },
      reason,
      attachment,
    );
    setSubmitting(false);

    if (result.ok) {
      router.replace(APP_ROUTES.STUDENT_ATTENDANCE as never);
    } else {
      setErrorMessage(result.message);
    }
  };

  const handleSubmit = () => {
    if (!targetSession || submitting) return;
    const validationError = validateLeaveReason(reason);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    confirmAction({
      title: 'Kirim Pengajuan Izin?',
      message:
        'Pengajuan izin yang sudah dikirim tidak dapat diubah atau dibatalkan. Pastikan alasan sudah sesuai.',
      confirmText: 'Kirim Izin',
      destructive: false,
      onConfirm: () => void executeSubmit(),
    });
  };

  const subtitle = targetSession
    ? `${targetSession.courseName ?? targetSession.className ?? 'Praktikum'} · ${targetSession.title} · ${formatSessionTime(targetSession.startsAt)}`
    : 'Pilih sesi dari Detail Sesi untuk mengajukan izin';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SubScreenHeader
          backLabel="Detail Sesi"
          onBack={() => router.back()}
          title="Ajukan Izin"
          subtitle={subtitle}
          rightBadgeLabel={`NIM ${user?.identifier ?? '-'}`}
          rightBadgeTone="mono"
        />

        <View style={styles.bodyContainer}>
          {!targetSession ? (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Tidak ada sesi aktif untuk izin
              </Text>
              <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                Buka salah satu sesi terjadwal atau berlangsung pada halaman Beranda, lalu tekan Ajukan Izin.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace(APP_ROUTES.STUDENT_ATTENDANCE as never)}
                style={({ pressed }) => [
                  styles.submitBtn,
                  { backgroundColor: colors.baltic },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.submitBtnText}>Lihat Status di Riwayat</Text>
              </Pressable>
            </View>
          ) : existingRequest ? (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Izin sudah diajukan
              </Text>
              <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                Pengajuan izin Anda untuk sesi ini berstatus{' '}
                {existingRequest.status === 'approved'
                  ? 'Disetujui'
                  : existingRequest.status === 'rejected'
                    ? 'Ditolak'
                    : 'Pending'}
                .
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace(APP_ROUTES.STUDENT_ATTENDANCE as never)}
                style={({ pressed }) => [
                  styles.submitBtn,
                  { backgroundColor: colors.baltic },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.submitBtnText}>Pantau Status di Riwayat</Text>
              </Pressable>
            </View>
          ) : (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Formulir izin praktikum
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Alasan izin
                </Text>
                <TextInput
                  value={reason}
                  onChangeText={(value) => {
                    setReason(value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  editable={!submitting}
                  multiline
                  maxLength={1000}
                  placeholder="Tuliskan alasan ketidakhadiran Anda..."
                  placeholderTextColor={colors.textSubtle}
                  style={[
                    styles.textarea,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.attachHeader}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    Lampiran surat (opsional)
                  </Text>
                  <Text style={[styles.attachRule, { color: colors.baltic }]}>
                    Image / PDF · Maks 2 MB
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  disabled={submitting}
                  onPress={() => void handlePickAttachment()}
                  style={({ pressed }) => [
                    styles.attachRow,
                    { backgroundColor: colors.balticSoft, borderColor: colors.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.attachLeft}>
                    <Upload size={16} color={colors.baltic} strokeWidth={2} />
                    <Text
                      style={[styles.attachName, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {attachment
                        ? `${attachment.name} · ${formatAttachmentSize(attachment.sizeBytes)}`
                        : 'Pilih dokumen gambar atau PDF'}
                    </Text>
                  </View>
                  <Text style={[styles.attachAction, { color: colors.baltic }]}>
                    {attachment ? 'Ganti' : 'Pilih'}
                  </Text>
                </Pressable>

                {attachment ? (
                  <View style={styles.previewWrap}>
                    <View style={styles.previewBox}>
                      <LeaveAttachmentPreview attachment={attachment} compact />
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Hapus lampiran"
                      disabled={submitting}
                      onPress={() => setAttachment(null)}
                      hitSlop={8}
                      style={({ pressed }) => [styles.clearAttachBtn, pressed && styles.pressed]}
                    >
                      <X size={16} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                ) : null}
              </View>

              {errorMessage ? (
                <View
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

              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.submitBtn,
                  { backgroundColor: submitting ? colors.disabledSurface : colors.rosy },
                  pressed && !submitting && styles.pressed,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.disabledText} />
                ) : (
                  <Text style={styles.submitBtnText}>Kirim Pengajuan</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 14,
  },
  bodyContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 14,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  cardTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16.5,
  },
  bodyText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13.5,
    lineHeight: 19,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
  },
  textarea: {
    minHeight: 100,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
    fontFamily: FontFamily.sansRegular,
    fontSize: 13.5,
    lineHeight: 19,
  },
  attachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attachRule: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11.5,
  },
  attachRow: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  attachLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachName: {
    flex: 1,
    fontFamily: FontFamily.sansMedium,
    fontSize: 12.5,
  },
  attachAction: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
  },
  previewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewBox: {
    flex: 1,
  },
  clearAttachBtn: {
    padding: 6,
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
  submitBtn: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: '#FCFCFA',
  },
  pressed: {
    opacity: 0.8,
  },
});
