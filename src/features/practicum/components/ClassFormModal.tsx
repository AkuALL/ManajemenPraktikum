import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { PracticumClass, CreateClassInput } from '../types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { validateClassInput } from '../validation';

interface ClassFormModalProps {
  visible: boolean;
  initialClass?: PracticumClass | null;
  onClose: () => void;
  onSubmit: (input: CreateClassInput) => Promise<void>;
}

function ClassFormContent({
  initialClass,
  onClose,
  onSubmit,
}: {
  initialClass?: PracticumClass | null;
  onClose: () => void;
  onSubmit: (input: CreateClassInput) => Promise<void>;
}) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [courseName, setCourseName] = useState(initialClass?.courseName ?? '');
  const [className, setClassName] = useState(initialClass?.className ?? '');
  const [lab, setLab] = useState(initialClass?.lab ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    if (submitting) return;

    const validation = validateClassInput({ courseName, className, lab });
    if ('error' in validation) {
      setErrorMessage(validation.error);
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage('');
      await onSubmit(validation.value);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Gagal menyimpan kelas');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.overlay}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {initialClass ? 'Edit Kelas Praktikum' : 'Tambah Kelas Baru'}
        </Text>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Nama Mata Kuliah / Praktikum *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="Contoh: Pemrograman Web Lanjut"
            placeholderTextColor={colors.textSecondary}
            value={courseName}
            onChangeText={(value) => {
              setCourseName(value);
              setErrorMessage('');
            }}
            editable={!submitting}
            maxLength={120}
            accessibilityLabel="Nama mata kuliah atau praktikum"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Nama Kelas *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="Contoh: Kelas B"
            placeholderTextColor={colors.textSecondary}
            value={className}
            onChangeText={(value) => {
              setClassName(value);
              setErrorMessage('');
            }}
            editable={!submitting}
            maxLength={80}
            accessibilityLabel="Nama kelas"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Ruang Laboratorium (Opsional)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="Contoh: Lab Jaringan Komputer"
            placeholderTextColor={colors.textSecondary}
            value={lab}
            onChangeText={(value) => {
              setLab(value);
              setErrorMessage('');
            }}
            editable={!submitting}
            maxLength={120}
            accessibilityLabel="Ruang laboratorium"
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={onClose}
            disabled={submitting}
          >
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Batal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.actionPrimary }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>
                {initialClass ? 'Simpan Perubahan' : 'Buat Kelas'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export function ClassFormModal({
  visible,
  initialClass,
  onClose,
  onSubmit,
}: ClassFormModalProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <ClassFormContent
        key={initialClass?.id ?? 'new-class'}
        initialClass={initialClass}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  submitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
