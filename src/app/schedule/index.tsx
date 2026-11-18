import { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useIdentity } from '@/features/identity';
import {
  usePracticum,
  SessionCard,
  SessionFormModal,
  PracticumSession,
  CreateSessionInput,
} from '@/features/practicum';

export default function ScheduleScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { activeIdentity } = useIdentity();
  const isAssistant = activeIdentity?.role === 'assistant';

  const {
    classes,
    sessions,
    loadingSessions,
    sessionsFromCache,
    classesError,
    sessionsError,
    error,
    retryData,
    createSession,
    updateSession,
    deleteSession,
    openSession,
    closeSession,
  } = usePracticum();

  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<PracticumSession | null>(null);

  const filteredSessions = useMemo(() => {
    if (selectedClassId === 'all') return sessions;
    return sessions.filter((s) => s.classId === selectedClassId);
  }, [sessions, selectedClassId]);

  const handleOpenCreate = () => {
    if (classes.length === 0) {
      Alert.alert(
        'Kelas Belum Ada',
        'Anda harus membuat kelas praktikum terlebih dahulu sebelum membuat sesi.',
        [{ text: 'OK' }]
      );
      return;
    }
    setEditingSession(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (session: PracticumSession) => {
    setEditingSession(session);
    setModalVisible(true);
  };

  const handleFormSubmit = async (input: CreateSessionInput) => {
    if (editingSession) {
      await updateSession(editingSession.id, input);
    } else {
      await createSession(input);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
              {isAssistant ? 'RUANG ASISTEN' : 'RUANG PRAKTIKAN'}
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Jadwal Praktikum</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {isAssistant
                ? 'Kelola jadwal pertemuan, buka sesi presensi, dan tutup sesi.'
                : 'Daftar sesi praktikum dari kelas yang Anda ikuti.'}
            </Text>
          </View>

          {isAssistant && (
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.actionPrimary }]}
              onPress={handleOpenCreate}
            >
              <Text style={styles.createBtnText}>+ Tambah Sesi</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Error message */}
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            {sessionsError || classesError ? (
              <TouchableOpacity onPress={retryData} style={styles.retryButton}>
                <Text style={styles.retryText}>Coba lagi</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {sessionsFromCache ? (
          <Text style={[styles.cacheNotice, { color: colors.textSecondary }]}>Menampilkan data cache. Menunggu sinkronisasi server.</Text>
        ) : null}

        {/* Filter Kelas */}
        {classes.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              onPress={() => setSelectedClassId('all')}
              style={[
                styles.filterChip,
                {
                  borderColor: selectedClassId === 'all' ? colors.actionPrimary : colors.border,
                  backgroundColor: selectedClassId === 'all' ? colors.surfaceMuted : colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: selectedClassId === 'all' ? colors.actionPrimary : colors.textSecondary,
                    fontWeight: selectedClassId === 'all' ? '700' : '500',
                  },
                ]}
              >
                Semua Kelas
              </Text>
            </TouchableOpacity>

            {classes.map((cls) => {
              const isSelected = selectedClassId === cls.id;
              return (
                <TouchableOpacity
                  key={cls.id}
                  onPress={() => setSelectedClassId(cls.id)}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: isSelected ? colors.actionPrimary : colors.border,
                      backgroundColor: isSelected ? colors.surfaceMuted : colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: isSelected ? colors.actionPrimary : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {cls.className} - {cls.courseName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* List Sesi */}
        {loadingSessions ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.actionPrimary} />
            <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
              Memuat jadwal sesi praktikum...
            </Text>
          </View>
        ) : filteredSessions.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Belum ada sesi praktikum
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {isAssistant
                ? 'Klik "+ Tambah Sesi" untuk membuat jadwal pertemuan praktikum baru.'
                : 'Belum ada jadwal sesi yang dijadwalkan untuk kelas Anda.'}
            </Text>
          </View>
        ) : (
          <View style={styles.sessionList}>
            {filteredSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isAssistant={isAssistant}
                onOpenSession={openSession}
                onCloseSession={closeSession}
                onDeleteSession={deleteSession}
                onEditSession={handleOpenEdit}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal Tambah / Edit Sesi */}
      <SessionFormModal
        visible={modalVisible}
        classes={classes}
        initialSession={editingSession}
        defaultClassId={selectedClassId !== 'all' ? selectedClassId : undefined}
        onClose={() => setModalVisible(false)}
        onSubmit={handleFormSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: 16,
    padding: 20,
    paddingBottom: 48,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  createBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  createBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
  },
  retryButton: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 4 },
  retryText: { color: '#ef4444', fontSize: 13, fontWeight: '700' },
  cacheNotice: { fontSize: 12, fontStyle: 'italic' },
  filterScroll: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 360,
  },
  sessionList: {
    gap: 4,
  },
});
