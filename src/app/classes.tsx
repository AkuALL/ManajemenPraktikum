import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Plus, SlidersHorizontal } from 'lucide-react-native';

import { AppHeader, getFirstName } from '@/components/ui/app-header';
import { PickerBottomSheet, type PickerOption } from '@/components/ui/picker-bottom-sheet';
import { QrSessionBottomSheet } from '@/components/ui/qr-session-bottom-sheet';
import { SearchFilterBar } from '@/components/ui/search-filter-bar';
import { CardListSkeleton } from '@/components/ui/skeleton';
import { Colors, FontFamily, MaxContentWidth } from '@/constants/theme';
import { useIdentity } from '@/features/identity';
import {
  ClassCard,
  ClassFormModal,
  ClassMembersModal,
  type CreateClassInput,
  formatSessionTime,
  type PracticumClass,
  type PracticumSession,
  usePracticum,
} from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { showAlert } from '@/lib/cross-platform-alert';

type ClassFilterMode = 'all' | 'active' | 'live';

const FILTER_OPTIONS: PickerOption[] = [
  { value: 'active', label: 'Aktif', subtitle: 'Tampilkan semua kelas aktif semester ini' },
  { value: 'live', label: 'Live', subtitle: 'Hanya kelas yang sedang memiliki sesi berlangsung' },
];

export default function ClassesScreen() {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { activeIdentity } = useIdentity();
  const isAssistant = activeIdentity?.role === 'assistant';

  const {
    classes,
    sessions,
    loadingClasses,
    classesError,
    error,
    retryClasses,
    createClass,
    updateClass,
    deleteClass,
    getRegisteredStudents,
    getClassMembers,
    addMember,
    removeMember,
    openSession,
  } = usePracticum();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<ClassFilterMode>('all');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<PracticumClass | null>(null);

  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [managingClass, setManagingClass] = useState<PracticumClass | null>(null);
  const [qrTarget, setQrTarget] = useState<{
    sessionId: string;
    classId: string;
    title: string;
    subtitle: string;
    status: PracticumSession['status'];
  } | null>(null);

  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const deletingClassRef = useRef<string | null>(null);

  const sessionByClassId = useMemo(() => {
    const map = new Map<string, PracticumSession>();
    sessions.forEach((sess) => {
      const existing = map.get(sess.classId);
      if (!existing || (sess.status === 'open' && existing.status !== 'open')) {
        map.set(sess.classId, sess);
      }
    });
    return map;
  }, [sessions]);

  const filteredClasses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return classes.filter((cls) => {
      const linkedSession = sessionByClassId.get(cls.id);
      if (filterMode === 'live' && linkedSession?.status !== 'open') {
        return false;
      }
      if (!q) return true;
      return (
        cls.courseName.toLowerCase().includes(q) ||
        cls.className.toLowerCase().includes(q) ||
        (cls.lab?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [classes, filterMode, searchQuery, sessionByClassId]);

  const handleOpenCreate = useCallback(() => {
    setEditingClass(null);
    setFormModalVisible(true);
  }, []);

  const handleOpenEdit = useCallback((cls: PracticumClass) => {
    setEditingClass(cls);
    setFormModalVisible(true);
  }, []);

  const handleOpenMembers = useCallback((cls: PracticumClass) => {
    setManagingClass(cls);
    setMembersModalVisible(true);
  }, []);

  const handleShowQr = useCallback(
    (cls: PracticumClass) => {
      const sess = sessionByClassId.get(cls.id);
      if (!sess) {
        showAlert('Belum ada sesi', 'Buat sesi praktikum terlebih dahulu sebelum membuat QR presensi.');
        return;
      }
      setQrTarget({
        sessionId: sess.id,
        classId: cls.id,
        title: `${cls.courseName} · ${cls.className}`,
        subtitle: cls.lab ?? sess?.location ?? 'Ruang Lab',
        status: sess.status,
      });
    },
    [sessionByClassId],
  );

  const handleFormSubmit = async (input: CreateClassInput) => {
    if (editingClass) {
      await updateClass(editingClass.id, input);
    } else {
      await createClass(input);
    }
  };

  const handleDeleteClass = useCallback(
    async (classId: string) => {
      if (deletingClassRef.current) return;
      deletingClassRef.current = classId;
      setDeletingClassId(classId);
      try {
        await deleteClass(classId);
      } catch (err: any) {
        showAlert('Gagal Menghapus Kelas', err.message ?? 'Terjadi kesalahan');
      } finally {
        deletingClassRef.current = null;
        setDeletingClassId(null);
      }
    },
    [deleteClass],
  );

  if (!isAssistant) {
    return (
      <View style={[styles.guard, { backgroundColor: colors.background }]}>
        <Text style={[styles.guardTitle, { color: colors.textPrimary }]}>
          Halaman tidak tersedia
        </Text>
        <Text style={[styles.guardBody, { color: colors.textSecondary }]}>
          Pengelolaan kelas dan anggota praktikum hanya tersedia untuk Asisten.
        </Text>
      </View>
    );
  }

  const primaryLab = classes[0]?.lab ?? 'Asisten Lab';
  const filterLabel =
    FILTER_OPTIONS.find((opt) => opt.value === filterMode)?.label ?? 'Semua';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AppHeader
          eyebrow={`Asisten Lab · ${primaryLab}`}
          title={`Hai, ${getFirstName(activeIdentity?.displayName)}`}
          monoBadge={activeIdentity?.identifier ?? 'AST-LAB'}
          statusBadge={`${classes.length} Kelas Aktif`}
        />

        <View style={styles.bodyContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Daftar kelas ({filteredClasses.length})
            </Text>

            <View style={styles.headerActionPills}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: true }}
                disabled
                style={[
                  styles.labChip,
                  {
                    backgroundColor: colors.disabledSurface,
                    borderColor: colors.border,
                    opacity: 0.55,
                  },
                ]}
              >
                <SlidersHorizontal size={13} color={colors.disabledText} strokeWidth={2} />
                <Text style={[styles.labChipText, { color: colors.disabledText }]}>Lab</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handleOpenCreate}
                style={({ pressed }) => [
                  styles.createPill,
                  { backgroundColor: colors.rosy },
                  pressed && styles.pressed,
                ]}
              >
                <Plus size={14} color="#FCFCFA" strokeWidth={2.4} />
                <Text style={styles.createPillText}>Kelas Baru</Text>
              </Pressable>
            </View>
          </View>

          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Cari nama atau kode kelas..."
            filterLabel={filterLabel}
            onPressFilter={() => setFilterSheetVisible(true)}
            isFilterActive={filterMode !== 'all'}
            onResetFilter={() => setFilterMode('all')}
          />

          {error ? (
            <View
              style={[
                styles.errorBanner,
                { backgroundColor: colors.rosySoft, borderColor: colors.rosyBorder },
              ]}
            >
              <Text style={[styles.errorText, { color: colors.rosyDark }]}>{error}</Text>
              {classesError ? (
                <Pressable onPress={retryClasses} style={styles.retryBtn}>
                  <Text style={[styles.retryText, { color: colors.rosy }]}>Coba lagi</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {loadingClasses ? (
            <CardListSkeleton count={3} showActions label="Memuat daftar kelas" />
          ) : filteredClasses.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {classes.length === 0 ? 'Belum ada kelas praktikum' : 'Kelas tidak ditemukan'}
              </Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                {classes.length === 0
                  ? 'Tekan "+ Kelas Baru" untuk membuat kelas praktikum pertama Anda.'
                  : 'Coba ubah kata kunci pencarian atau filter status kelas.'}
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {filteredClasses.map((cls, index) => {
                const linkedSession = sessionByClassId.get(cls.id);
                const hasLiveSession = linkedSession?.status === 'open';
                const defaultExpanded = hasLiveSession || index === 0;
                const expanded =
                  expandedMap[cls.id] !== undefined ? expandedMap[cls.id] : defaultExpanded;
                const scheduleSummary = linkedSession
                  ? `${formatSessionTime(linkedSession.startsAt)}–${formatSessionTime(linkedSession.endsAt)}`
                  : undefined;

                return (
                  <ClassCard
                    key={cls.id}
                    practicumClass={cls}
                    isAssistant={isAssistant}
                    expanded={expanded}
                    onToggleExpand={() =>
                      setExpandedMap((prev) => ({ ...prev, [cls.id]: !expanded }))
                    }
                    hasLiveSession={hasLiveSession}
                    scheduleSummary={scheduleSummary}
                    onShowQr={handleShowQr}
                    onManageMembers={handleOpenMembers}
                    onEdit={handleOpenEdit}
                    onDelete={handleDeleteClass}
                    isDeleting={deletingClassId === cls.id}
                  />
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <PickerBottomSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        title="Filter Daftar Kelas"
        searchable={false}
        options={FILTER_OPTIONS}
        selectedValue={filterMode}
        onSelect={(val) => setFilterMode(val as ClassFilterMode)}
      />

      <QrSessionBottomSheet
        visible={Boolean(qrTarget)}
        onClose={() => setQrTarget(null)}
        sessionId={qrTarget?.sessionId ?? 'cls'}
        classId={qrTarget?.classId}
        sessionTitle={qrTarget?.title ?? ''}
        subtitle={qrTarget?.subtitle ?? ''}
        sessionStatus={qrTarget?.status}
        onOpenSession={qrTarget?.status === 'scheduled' ? () => openSession(qrTarget.sessionId) : undefined}
      />

      <ClassFormModal
        visible={formModalVisible}
        initialClass={editingClass}
        onClose={() => setFormModalVisible(false)}
        onSubmit={handleFormSubmit}
        onDelete={handleDeleteClass}
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 112,
    gap: 14,
  },
  bodyContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  guard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  guardTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 18,
    textAlign: 'center',
  },
  guardBody: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16.5,
  },
  headerActionPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labChip: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  labChipText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
  },
  createPill: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  createPillText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
    color: '#FCFCFA',
  },
  list: {
    gap: 10,
  },
  errorBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  errorText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12.5,
  },
  retryBtn: {
    alignSelf: 'flex-start',
  },
  retryText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.78,
  },
});
