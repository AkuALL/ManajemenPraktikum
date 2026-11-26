import { Upload, X } from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { FlyAwayBottomSheet } from '@/components/ui/fly-away-bottom-sheet';
import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { confirmAction } from '@/lib/cross-platform-alert';
import type { SessionSummary } from '@/types';

import {
    formatAttachmentSize,
    type LeaveAttachmentMeta,
} from './attachment-store';
import { pickLeaveAttachment } from './attachment-upload';
import { useLeave } from './context';
import { LeaveAttachmentPreview } from './LeaveAttachmentPreview';
import { validateLeaveReason } from './port';

type LeaveRequestBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  session: SessionSummary;
  sessionSubtitle: string;
  onSubmitted?: () => void;
};

export function LeaveRequestBottomSheet({
  visible,
  onClose,
  session,
  sessionSubtitle,
  onSubmitted,
}: LeaveRequestBottomSheetProps) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { submitLeave } = useLeave();

  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<LeaveAttachmentMeta | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePickAttachment = async () => {
    if (submitting) return;
    const picked = await pickLeaveAttachment();
    if (picked) {
      setAttachment(picked);
      setErrorMessage(null);
    }
  };

  const executeSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    setErrorMessage(null);
    const result = await submitLeave(session, reason, attachment);
    setSubmitting(false);

    if (result.ok) {
      setReason('');
      setAttachment(null);
      onClose();
      onSubmitted?.();
    } else {
      setErrorMessage(result.message);
    }
  };

  const handleSubmit = () => {
    if (submitting) return;
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

  return (
    <FlyAwayBottomSheet
      visible={visible}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="Ajukan Izin"
      subtitle={sessionSubtitle}
      dismissDisabled={submitting}
    >
      <View style={styles.form}>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Alasan izin</Text>
          <TextInput
            value={reason}
            onChangeText={(value) => {
              setReason(value);
              if (errorMessage) setErrorMessage(null);
            }}
            editable={!submitting}
            multiline
            maxLength={1000}
            accessibilityLabel="Alasan izin"
            placeholder="Tuliskan alasan ketidakhadiran Anda secara jelas..."
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
          <View style={styles.attachmentHeader}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Lampiran (opsional)
            </Text>
            <Text style={[styles.attachmentRule, { color: colors.baltic }]}>
              Image / PDF · Maks 2 MB
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={() => void handlePickAttachment()}
            style={({ pressed }) => [
              styles.attachmentBox,
              { backgroundColor: colors.balticSoft, borderColor: colors.border },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.attachmentLeft}>
              <Upload size={16} color={colors.baltic} strokeWidth={2} />
              <Text
                style={[styles.attachmentName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {attachment
                  ? `${attachment.name} · ${formatAttachmentSize(attachment.sizeBytes)}`
                  : 'Unggah surat keterangan atau bukti (opsional)'}
              </Text>
            </View>
            <Text style={[styles.attachmentAction, { color: colors.baltic }]}>
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
            accessibilityRole="alert"
            style={[
              styles.errorBox,
              { backgroundColor: colors.rosySoft, borderColor: colors.rosyBorder },
            ]}
          >
            <Text style={[styles.errorText, { color: colors.rosyDark }]}>{errorMessage}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kirim Pengajuan"
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
    </FlyAwayBottomSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 14,
    paddingBottom: 6,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
  },
  textarea: {
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
    fontFamily: FontFamily.sansRegular,
    fontSize: 13.5,
    lineHeight: 19,
  },
  attachmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attachmentRule: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11.5,
  },
  attachmentBox: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  attachmentLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachmentName: {
    flex: 1,
    fontFamily: FontFamily.sansMedium,
    fontSize: 12.5,
  },
  attachmentAction: {
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
