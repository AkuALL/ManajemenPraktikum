import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { PracticumClass, PracticumSession, CreateSessionInput } from '../types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SessionFormModalProps {
  visible: boolean;
  classes: PracticumClass[];
  initialSession?: PracticumSession | null;
  defaultClassId?: string;
  onClose: () => void;
  onSubmit: (input: CreateSessionInput) => Promise<void>;
}

function SessionFormContent({
  classes,
  initialSession,
  defaultClassId,
  onClose,
  onSubmit,
}: {
  classes: PracticumClass[];
  initialSession?: PracticumSession | null;
  defaultClassId?: string;
  onClose: () => void;
  onSubmit: (input: CreateSessionInput) => Promise<void>;
}) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialSession?.classId ?? (defaultClassId || (classes[0]?.id ?? ''))
  );
  const [title, setTitle] = useState(initialSession?.title ?? '');
  const [location, setLocation] = useState(
    initialSession?.location ?? (classes[0]?.lab || 'Lab Komputer 1')
  );
  const [startsAt, setStartsAt] = useState(initialSession?.startsAt ?? '08:00');
  const [endsAt, setEndsAt] = useState(initialSession?.endsAt ?? '10:30');
  const [date, setDate] = useState(initialSession?.date ?? 'Senin, 25 Nov 2026');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    if (!selectedClassId) {
      setErrorMessage('Pilih kelas praktikum terlebih dahulu');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Judul / Topik sesi praktikum wajib diisi');
      return;
    }
    if (!location.trim()) {
      setErrorMessage('Lokasi praktikum wajib diisi');
      return;
    }
    if (!startsAt.trim() || !endsAt.trim()) {
      setErrorMessage('Waktu mulai dan selesai wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage('');
      await onSubmit({
        classId: selectedClassId,
        title: title.trim(),
        location: location.trim(),
        startsAt: startsAt.trim(),
        endsAt: endsAt.trim(),
        date: date.trim(),
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Gagal menyimpan sesi');
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
          {initialSession ? 'Edit Sesi Praktikum' : 'Tambah Sesi Praktikum Baru'}
        </Text>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 14 }}>
          {!initialSession && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Kelas Praktikum *
              </Text>
              <View style={styles.classChips}>
                {classes.map((cls) => {
                  const isSelected = selectedClassId === cls.id;
                  return (
                    <TouchableOpacity
                      key={cls.id}
                      onPress={() => setSelectedClassId(cls.id)}
                      style={[
                        styles.chip,
                        {
                          borderColor: isSelected ? colors.actionPrimary : colors.border,
                          backgroundColor: isSelected
                            ? colors.surfaceMuted
                            : colors.background,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected ? colors.actionPrimary : colors.textPrimary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {cls.className} - {cls.courseName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Judul / Topik Praktikum *
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              placeholder="Contoh: Modul 5: REST API & State Management"
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              editable={!submitting}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Lokasi / Ruangan Lab *
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              placeholder="Contoh: Lab Komputer 2"
              placeholderTextColor={colors.textSecondary}
              value={location}
              onChangeText={setLocation}
              editable={!submitting}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Tanggal Pelaksanaan
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              placeholder="Contoh: Senin, 25 Nov 2026"
              placeholderTextColor={colors.textSecondary}
              value={date}
              onChangeText={setDate}
              editable={!submitting}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Waktu Mulai *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background },
                ]}
                placeholder="08:00"
                placeholderTextColor={colors.textSecondary}
                value={startsAt}
                onChangeText={setStartsAt}
                editable={!submitting}
              />
            </View>

            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Waktu Selesai *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background },
                ]}
                placeholder="10:30"
                placeholderTextColor={colors.textSecondary}
                value={endsAt}
                onChangeText={setEndsAt}
                editable={!submitting}
              />
            </View>
          </View>
        </ScrollView>

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
                {initialSession ? 'Simpan Perubahan' : 'Buat Sesi'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export function SessionFormModal({
  visible,
  classes,
  initialSession,
  defaultClassId,
  onClose,
  onSubmit,
}: SessionFormModalProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SessionFormContent
        key={initialSession?.id ?? `new-session-${defaultClassId ?? 'all'}`}
        classes={classes}
        initialSession={initialSession}
        defaultClassId={defaultClassId}
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
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 500,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  classChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
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
    minWidth: 100,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
