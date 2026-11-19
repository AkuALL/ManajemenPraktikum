import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Upload } from 'lucide-react-native';

import { FlyAwayBottomSheet } from '@/components/ui/fly-away-bottom-sheet';
import { Colors, FontFamily } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SessionSummary } from '@/types';

import {
  formatAttachmentSize,
  MAX_ATTACHMENT_SIZE_BYTES,
  saveLeaveAttachment,
  type LeaveAttachmentMeta,
} from './attachment-store';
import { useLeave } from './context';
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
  const { user } = useAuth();
  const { submitLeave } = useLeave();

  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<LeaveAttachmentMeta | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePickAttachment = async () => {
    if (submitting) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const sizeBytes = asset.size ?? 0;
      if (sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
        Alert.alert(
          'Ukuran berkas terlalu besar',
          'Ukuran lampiran maksimal 2 MB (Image / PDF).',
        );
        return;
      }

      setAttachment({
        name: asset.name,
        sizeBytes,
        mimeType: asset.mimeType ?? 'application/pdf',
        uri: asset.uri,
      });
      setErrorMessage(null);
    } catch {
      Alert.alert('Gagal memilih berkas', 'Silakan coba pilih berkas gambar atau PDF lain.');
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const validationError = validateLeaveReason(reason);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    const result = await submitLeave(session, reason);
    setSubmitting(false);

    if (result.ok) {
      if (attachment) {
        saveLeaveAttachment(
          { sessionId: session.id, userId: user?.uid, leaveId: result.request.id },
          attachment,
        );
      }
      setReason('');
      setAttachment(null);
      onClose();
      onSubmitted?.();
    } else {
      setErrorMessage(result.message);
    }
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
          onPress={() => void handleSubmit()}
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
