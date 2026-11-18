import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, MaxContentWidth } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useIdentity } from '@/features/identity';
import {
  usePracticum,
  ClassCard,
  ClassFormModal,
  ClassMembersModal,
  PracticumClass,
  CreateClassInput,
} from '@/features/practicum';

export default function ClassesScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { activeIdentity } = useIdentity();
  const isAssistant = activeIdentity?.role === 'assistant';

  const {
    classes,
    loadingClasses,
    classesError,
    classesFromCache,
    error,
    retryClasses,
    createClass,
    updateClass,
    deleteClass,
    getRegisteredStudents,
    getClassMembers,
    addMember,
    removeMember,
  } = usePracticum();

  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<PracticumClass | null>(null);

  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [managingClass, setManagingClass] = useState<PracticumClass | null>(null);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const deletingClassRef = useRef<string | null>(null);

  const handleOpenCreate = () => {
    setEditingClass(null);
    setFormModalVisible(true);
  };

  const handleOpenEdit = (cls: PracticumClass) => {
    setEditingClass(cls);
    setFormModalVisible(true);
  };

  const handleOpenMembers = (cls: PracticumClass) => {
    setManagingClass(cls);
    setMembersModalVisible(true);
  };

  const handleFormSubmit = async (input: CreateClassInput) => {
    if (editingClass) {
      await updateClass(editingClass.id, input);
    } else {
      await createClass(input);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (deletingClassRef.current) return;

    deletingClassRef.current = classId;
    setDeletingClassId(classId);
    try {
      await deleteClass(classId);
    } catch (err: any) {
      Alert.alert('Gagal Menghapus Kelas', err.message ?? 'Terjadi kesalahan');
    } finally {
      deletingClassRef.current = null;
      setDeletingClassId(null);
    }
  };

  if (!isAssistant) {
    return (
      <View style={[styles.guard, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          Halaman tidak tersedia
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Pengelolaan kelas dan anggota praktikum hanya tersedia untuk Asisten.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
            MANAJEMEN PRAKTIKUM
          </Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Kelola Kelas
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Buat kelas praktikum baru, atur lokasi lab, dan daftarkan anggota praktikan.
          </Text>
        </View>

        {isAssistant && (
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.actionPrimary }]}
            onPress={handleOpenCreate}
          >
            <Text style={styles.createBtnText}>+ Tambah Kelas</Text>
          </TouchableOpacity>
        )}
      </View>

      {classesFromCache ? (
        <Text style={[styles.cacheNotice, { color: colors.textSecondary }]}>Menampilkan data cache. Menunggu sinkronisasi server.</Text>
      ) : null}

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          {classesError ? (
            <TouchableOpacity onPress={retryClasses} style={styles.retryButton}>
              <Text style={styles.retryText}>Coba lagi</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* List Kelas */}
      {loadingClasses ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.actionPrimary} />
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
            Memuat daftar kelas...
          </Text>
        </View>
      ) : classes.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Belum ada kelas praktikum
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Klik tombol &quot;+ Tambah Kelas&quot; di atas untuk mulai membuat kelas praktikum pertama Anda.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {classes.map((cls) => (
            <ClassCard
              key={cls.id}
              practicumClass={cls}
              isAssistant={isAssistant}
              onManageMembers={handleOpenMembers}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteClass}
            isDeleting={deletingClassId === cls.id}
            />
          ))}
        </View>
      )}

      {/* Modal Form Tambah / Edit Kelas */}
      <ClassFormModal
        visible={formModalVisible}
        initialClass={editingClass}
        onClose={() => setFormModalVisible(false)}
        onSubmit={handleFormSubmit}
      />

      {/* Modal Kelola Anggota Kelas */}
      <ClassMembersModal
        visible={membersModalVisible}
        practicumClass={managingClass}
        allClasses={classes}
        onClose={() => setMembersModalVisible(false)}
        fetchMembers={getClassMembers}
        fetchStudentCandidates={getRegisteredStudents}
        onAddMember={addMember}
        onRemoveMember={removeMember}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: 24,
    paddingBottom: 48,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    paddingTop: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  createBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  createBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  cacheNotice: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  errorBanner: {
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
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 380,
  },
  list: {
    marginTop: 8,
  },
  guard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
});
