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

import { FlyAwayBottomSheet } from '@/components/ui/fly-away-bottom-sheet';
import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type { CreateClassInput, PracticumClass } from '../types';
import { validateClassInput } from '../validation';

interface ClassFormModalProps {
  visible: boolean;
  initialClass?: PracticumClass | null;
  onClose: () => void;
  onSubmit: (input: CreateClassInput) => Promise<void>;
  onDelete?: (classId: string) => Promise<void>;
}

function ClassFormContent({
  initialClass,
  onClose,
  onSubmit,
  onDelete,
}: {
  initialClass?: PracticumClass | null;
  onClose: () => void;
  onSubmit: (input: CreateClassInput) => Promise<void>;
  onDelete?: (classId: string) => Promise<void>;
}) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

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

  const handleDeletePress = () => {
    if (!initialClass || !onDelete || submitting) return;
    Alert.alert(
      'Hapus Kelas',
      `Yakin ingin menghapus "${initialClass.courseName} · ${initialClass.className}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setSubmitting(true);
              try {
                await onDelete(initialClass.id);
                onClose();
              } catch (err: any) {
                setErrorMessage(err.message ?? 'Gagal menghapus kelas');
              } finally {
                setSubmitting(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.form}>
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

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Nama Mata Kuliah / Praktikum
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
          placeholder="Contoh: Jaringan Komputer"
          placeholderTextColor={colors.textSubtle}
          value={courseName}
          onChangeText={(value) => {
            setCourseName(value);
            setErrorMessage('');
          }}
          editable={!submitting}
          maxLength={120}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Nama Kelas</Text>
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
          placeholderTextColor={colors.textSubtle}
          value={className}
          onChangeText={(value) => {
            setClassName(value);
            setErrorMessage('');
          }}
          editable={!submitting}
          maxLength={80}
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
          placeholder="Contoh: Lab Komp 2"
          placeholderTextColor={colors.textSubtle}
          value={lab}
          onChangeText={(value) => {
            setLab(value);
            setErrorMessage('');
          }}
          editable={!submitting}
          maxLength={120}
        />
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          disabled={submitting}
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
          onPress={() => void handleSubmit()}
          disabled={submitting}
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: colors.rosy },
            pressed && styles.pressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#FCFCFA" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>
              {initialClass ? 'Simpan Perubahan' : 'Buat Kelas'}
            </Text>
          )}
        </Pressable>
      </View>

      {initialClass && onDelete ? (
        <Pressable
          accessibilityRole="button"
          onPress={handleDeletePress}
          disabled={submitting}
          style={({ pressed }) => [
            styles.deleteBtn,
            { backgroundColor: colors.rosySoft, borderColor: colors.rosyBorder },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.deleteBtnText, { color: colors.rosyDark }]}>Hapus Kelas Ini</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ClassFormModal({
  visible,
  initialClass,
  onClose,
  onSubmit,
  onDelete,
}: ClassFormModalProps) {
  return (
    <FlyAwayBottomSheet
      visible={visible}
      onClose={onClose}
      title={initialClass ? 'Ubah Kelas Praktikum' : 'Tambah Kelas Baru'}
      subtitle="Lengkapi detail mata kuliah, kelas, dan ruang laboratorium"
    >
      <ClassFormContent
        key={initialClass?.id ?? 'new-class'}
        initialClass={initialClass}
        onClose={onClose}
        onSubmit={onSubmit}
        onDelete={onDelete}
      />
    </FlyAwayBottomSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 13,
    paddingBottom: 6,
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
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13.5,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
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
  submitBtn: {
    flex: 1.4,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FCFCFA',
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
  },
  deleteBtn: {
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
  },
  pressed: {
    opacity: 0.78,
  },
});
