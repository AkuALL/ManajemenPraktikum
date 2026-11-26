import { Image } from 'expo-image';
import { openBrowserAsync } from 'expo-web-browser';
import { ExternalLink, FileText, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { showAlert } from '@/lib/cross-platform-alert';

import { formatAttachmentSize, type LeaveAttachmentMeta } from './attachment-store';

type LeaveAttachmentPreviewProps = {
  attachment: LeaveAttachmentMeta;
  compact?: boolean;
};

export function LeaveAttachmentPreview({
  attachment,
  compact = false,
}: LeaveAttachmentPreviewProps) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const [modalVisible, setModalVisible] = useState(false);

  const sourceUri = attachment.url ?? attachment.uri;
  const isImage = attachment.mimeType.trim().toLowerCase().startsWith('image/');
  const isRemoteUrl = sourceUri.startsWith('https://') || sourceUri.startsWith('http://');

  const openDocument = async () => {
    if (!sourceUri) {
      showAlert('Lampiran tidak tersedia', 'Berkas lampiran belum dapat dibuka.');
      return;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(sourceUri, '_blank', 'noopener,noreferrer');
      return;
    }

    if (isRemoteUrl) {
      try {
        await openBrowserAsync(sourceUri);
        return;
      } catch {
        // Fall through to Linking.openURL if WebBrowser cannot open.
      }
    }

    try {
      await Linking.openURL(sourceUri);
    } catch {
      showAlert(
        'Lampiran tidak dapat dibuka',
        'Silakan buka lampiran melalui aplikasi peramban atau perangkat yang didukung.',
      );
    }
  };

  if (isImage) {
    return (
      <>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Lihat foto lampiran ${attachment.name}`}
          onPress={() => setModalVisible(true)}
          style={({ pressed }) => [
            styles.imageCard,
            compact && styles.imageCardCompact,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <Image
            source={{ uri: sourceUri }}
            contentFit="cover"
            style={compact ? styles.thumbCompact : styles.thumb}
          />
          <View style={styles.metaCol}>
            <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>
              {attachment.name}
            </Text>
            <Text style={[styles.fileMeta, { color: colors.textSecondary }]} numberOfLines={1}>
              Bukti foto · {formatAttachmentSize(attachment.sizeBytes)} · Ketuk untuk lihat
            </Text>
          </View>
        </Pressable>

        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleGroup}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {attachment.name}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {formatAttachmentSize(attachment.sizeBytes)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tutup pratinjau foto"
                onPress={() => setModalVisible(false)}
                style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              >
                <X size={20} color="#FCFCFA" />
              </Pressable>
            </View>

            <View style={styles.modalImageWrap}>
              <Image
                source={{ uri: sourceUri }}
                contentFit="contain"
                style={styles.modalImage}
              />
            </View>

            {isRemoteUrl ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void openDocument()}
                style={({ pressed }) => [styles.browserBtn, pressed && styles.pressed]}
              >
                <ExternalLink size={15} color="#FCFCFA" />
                <Text style={styles.browserBtnText}>Buka di Browser</Text>
              </Pressable>
            ) : null}
          </View>
        </Modal>
      </>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Buka lampiran ${attachment.name}`}
      onPress={() => void openDocument()}
      style={({ pressed }) => [
        styles.docChip,
        { backgroundColor: colors.balticSoft, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.docLeft}>
        <FileText size={15} color={colors.baltic} strokeWidth={2} />
        <Text style={[styles.docChipText, { color: colors.baltic }]} numberOfLines={1}>
          {attachment.name} · {formatAttachmentSize(attachment.sizeBytes)}
        </Text>
      </View>
      <Text style={[styles.docAction, { color: colors.baltic }]}>Buka</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  imageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
  },
  imageCardCompact: {
    padding: 6,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  thumbCompact: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  metaCol: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12.5,
  },
  fileMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11.5,
  },
  docChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  docLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  docChipText: {
    flex: 1,
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11.5,
  },
  docAction: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 17, 23, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 28,
    justifyContent: 'space-between',
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 12,
  },
  modalTitleGroup: {
    flex: 1,
    gap: 2,
  },
  modalTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: '#FCFCFA',
  },
  modalSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#CBD5E1',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImageWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  browserBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  browserBtnText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: '#FCFCFA',
  },
  pressed: {
    opacity: 0.78,
  },
});
