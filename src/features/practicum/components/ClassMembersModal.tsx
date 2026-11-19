import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Plus,
  Search,
  Trash2,
} from 'lucide-react-native';

import { FlyAwayBottomSheet } from '@/components/ui/fly-away-bottom-sheet';
import { RowListSkeleton } from '@/components/ui/skeleton';
import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type {
  AddMemberInput,
  ClassMember,
  PracticumClass,
  StudentCandidate,
} from '../types';
import {
  COHORT_OPTIONS,
  extractCohortYear,
  filterStudentCandidates,
} from '../validation';

interface ClassMembersModalProps {
  visible: boolean;
  practicumClass: PracticumClass | null;
  allClasses?: PracticumClass[];
  onClose: () => void;
  fetchMembers: (classId: string) => Promise<ClassMember[]>;
  fetchStudentCandidates?: () => Promise<StudentCandidate[]>;
  onAddMember: (classId: string, input: AddMemberInput) => Promise<ClassMember>;
  onRemoveMember: (classId: string, memberId: string) => Promise<void>;
}

const ALL_CLASSES_FILTER = 'Semua Kelas';
const UNENROLLED_FILTER = 'Belum Terdaftar';

function ClassMembersContent({
  practicumClass,
  allClasses = [],
  fetchMembers,
  fetchStudentCandidates,
  onAddMember,
  onRemoveMember,
}: Omit<ClassMembersModalProps, 'visible' | 'onClose'> & {
  practicumClass: PracticumClass;
}) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [members, setMembers] = useState<ClassMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [memberSearch, setMemberSearch] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [mode, setMode] = useState<'list' | 'add'>('list');
  const [candidates, setCandidates] = useState<StudentCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidatesError, setCandidatesError] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [cohortFilter, setCohortFilter] = useState<string>('Semua');
  const [classFilter, setClassFilter] = useState<string>(ALL_CLASSES_FILTER);
  const [activeDropdown, setActiveDropdown] = useState<'cohort' | 'class' | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [addingBatch, setAddingBatch] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [addError, setAddError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchMembers(practicumClass.id)
      .then((list) => {
        if (!cancelled) {
          setMembers(list);
          setLoadingMembers(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setMembersError(err instanceof Error ? err.message : 'Gagal memuat anggota kelas');
          setLoadingMembers(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetchMembers, practicumClass.id, reloadTick]);

  useEffect(() => {
    if (mode !== 'add' || !fetchStudentCandidates) return;
    let cancelled = false;
    fetchStudentCandidates()
      .then((list) => {
        if (!cancelled) {
          setCandidates(list);
          setLoadingCandidates(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCandidatesError(
            err instanceof Error ? err.message : 'Gagal memuat daftar praktikan terdaftar',
          );
          setLoadingCandidates(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetchStudentCandidates, mode]);

  const memberIds = useMemo(() => members.map((m) => m.userId), [members]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.identifier.toLowerCase().includes(q),
    );
  }, [memberSearch, members]);

  const cohortOptions = useMemo(() => {
    const extras = candidates
      .map((c) => extractCohortYear(c.identifier))
      .filter((y): y is string => y !== null);
    const merged = Array.from(
      new Set([
        ...COHORT_OPTIONS.filter((c) => c !== 'Semua Angkatan'),
        ...extras,
      ]),
    ).sort();
    return ['Semua', ...merged];
  }, [candidates]);

  const otherClasses = useMemo(
    () => allClasses.filter((cls) => cls.id !== practicumClass.id),
    [allClasses, practicumClass.id],
  );

  const classFilterOptions = useMemo(() => {
    const dynamic = otherClasses.map((cls) => ({
      value: cls.id,
      label: `${cls.courseName} · ${cls.className}`,
    }));
    return [
      { value: ALL_CLASSES_FILTER, label: ALL_CLASSES_FILTER },
      { value: UNENROLLED_FILTER, label: UNENROLLED_FILTER },
      ...dynamic,
    ];
  }, [otherClasses]);

  const allowedUserIdsByClass = useMemo(() => {
    if (classFilter === ALL_CLASSES_FILTER) return undefined;
    if (classFilter === UNENROLLED_FILTER) {
      const enrolledAnywhere = new Set(
        allClasses.flatMap((cls) => cls.memberUids ?? []),
      );
      return candidates
        .filter((c) => !enrolledAnywhere.has(c.userId))
        .map((c) => c.userId);
    }
    const targetCls = otherClasses.find((cls) => cls.id === classFilter);
    return targetCls?.memberUids ?? [];
  }, [allClasses, candidates, classFilter, otherClasses]);

  const filteredCandidates = useMemo(() => {
    return filterStudentCandidates(candidates, memberIds, {
      query: candidateSearch,
      cohort: cohortFilter === 'Semua' ? 'Semua Angkatan' : cohortFilter,
      allowedUserIds: allowedUserIdsByClass,
    });
  }, [allowedUserIdsByClass, candidateSearch, candidates, cohortFilter, memberIds]);

  const candidateIdSet = useMemo(
    () => new Set(filteredCandidates.map((c) => c.userId)),
    [filteredCandidates],
  );

  const selectedValidCandidates = useMemo(() => {
    const selectedSet = new Set(selectedUserIds);
    return candidates.filter(
      (c) => selectedSet.has(c.userId) && !memberIds.includes(c.userId),
    );
  }, [candidates, memberIds, selectedUserIds]);

  const allFilteredSelected =
    filteredCandidates.length > 0 &&
    filteredCandidates.every((c) => selectedUserIds.includes(c.userId));

  const getCandidateClassTag = (userId: string): string => {
    const match = otherClasses.find((cls) => cls.memberUids?.includes(userId));
    return match ? match.className : 'Terdaftar';
  };

  const toggleCandidate = (userId: string) => {
    setAddError('');
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const toggleSelectAllFiltered = () => {
    const visibleIds = filteredCandidates.map((c) => c.userId);
    setSelectedUserIds((prev) => {
      if (allFilteredSelected) {
        return prev.filter((id) => !candidateIdSet.has(id));
      }
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const handleBatchAdd = async () => {
    if (addingBatch || selectedValidCandidates.length === 0) return;

    setAddingBatch(true);
    setAddError('');
    const added: ClassMember[] = [];
    let firstError = '';

    for (const candidate of selectedValidCandidates) {
      try {
        const member = await onAddMember(practicumClass.id, {
          userId: candidate.userId,
          displayName: candidate.displayName,
          identifier: candidate.identifier,
        });
        added.push(member);
      } catch (err: any) {
        if (!firstError) {
          firstError = err?.message ?? `Gagal menambah ${candidate.displayName}`;
        }
      }
    }

    if (added.length > 0) {
      setMembers((prev) => {
        const existing = new Set(prev.map((m) => m.userId));
        return [...prev, ...added.filter((m) => !existing.has(m.userId))];
      });
      setSelectedUserIds([]);
      setFeedback(`${added.length} praktikan ditambahkan ke kelas.`);
      if (!firstError) {
        setMode('list');
      }
    }
    if (firstError) {
      setAddError(firstError);
    }
    setAddingBatch(false);
  };

  const handleRemoveMember = (member: ClassMember) => {
    if (removingId) return;
    Alert.alert(
      'Keluarkan Praktikan',
      `Keluarkan ${member.displayName} (${member.identifier}) dari kelas ini?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluarkan',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setRemovingId(member.userId);
              try {
                await onRemoveMember(practicumClass.id, member.userId);
                setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
              } catch (err: any) {
                Alert.alert('Gagal menghapus', err?.message ?? 'Silakan coba lagi.');
              } finally {
                setRemovingId(null);
              }
            })();
          },
        },
      ],
    );
  };

  const classFilterShortLabel =
    classFilter === ALL_CLASSES_FILTER
      ? 'Semua'
      : classFilter === UNENROLLED_FILTER
        ? 'Belum'
        : otherClasses.find((c) => c.id === classFilter)?.className ?? 'Kelas';

  if (mode === 'add') {
    return (
      <View style={styles.sheetBody}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setMode('list');
            setActiveDropdown(null);
          }}
          style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}
        >
          <ArrowLeft size={14} color={colors.baltic} strokeWidth={2.2} />
          <Text style={[styles.backLinkText, { color: colors.baltic }]}>
            Kembali ke Anggota ({members.length})
          </Text>
        </Pressable>

        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Search size={15} color={colors.textSubtle} strokeWidth={2} />
          <TextInput
            value={candidateSearch}
            onChangeText={setCandidateSearch}
            placeholder="Ketik nama atau NIM (opsional)..."
            placeholderTextColor={colors.textSubtle}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
        </View>

        <View style={styles.dualFilterRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              setActiveDropdown((prev) => (prev === 'cohort' ? null : 'cohort'))
            }
            style={({ pressed }) => [
              styles.filterBtn,
              {
                backgroundColor: colors.background,
                borderColor: activeDropdown === 'cohort' ? colors.pacific : colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.filterPrefix, { color: colors.textSecondary }]}>
              Angkatan:{' '}
              <Text style={[styles.filterValue, { color: colors.textPrimary }]}>
                {cohortFilter}
              </Text>
            </Text>
            <ChevronDown size={14} color={colors.baltic} strokeWidth={2.2} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              setActiveDropdown((prev) => (prev === 'class' ? null : 'class'))
            }
            style={({ pressed }) => [
              styles.filterBtn,
              {
                backgroundColor: colors.background,
                borderColor: activeDropdown === 'class' ? colors.pacific : colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.filterPrefix, { color: colors.textSecondary }]} numberOfLines={1}>
              Kelas:{' '}
              <Text style={[styles.filterValue, { color: colors.textPrimary }]}>
                {classFilterShortLabel}
              </Text>
            </Text>
            <ChevronDown size={14} color={colors.baltic} strokeWidth={2.2} />
          </Pressable>
        </View>

        {activeDropdown === 'cohort' ? (
          <View
            style={[
              styles.inlineDropdown,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.chipWrap}>
              {cohortOptions.map((cohort) => {
                const selected = cohort === cohortFilter;
                return (
                  <Pressable
                    key={cohort}
                    onPress={() => {
                      setCohortFilter(cohort);
                      setActiveDropdown(null);
                    }}
                    style={[
                      styles.dropChip,
                      {
                        backgroundColor: selected ? colors.pacificSoft : colors.background,
                        borderColor: selected ? colors.pacific : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dropChipText,
                        { color: selected ? colors.pacificDark : colors.textPrimary },
                      ]}
                    >
                      {cohort}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {activeDropdown === 'class' ? (
          <View
            style={[
              styles.inlineDropdown,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
              {classFilterOptions.map((opt) => {
                const selected = opt.value === classFilter;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      setClassFilter(opt.value);
                      setActiveDropdown(null);
                    }}
                    style={[
                      styles.dropOptionRow,
                      {
                        backgroundColor: selected ? colors.pacificSoft : 'transparent',
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dropOptionText,
                        { color: selected ? colors.pacificDark : colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                    {selected ? <Check size={14} color={colors.pacific} strokeWidth={2.5} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.countHeader}>
          <Text style={[styles.countText, { color: colors.textSecondary }]}>
            {filteredCandidates.length} mahasiswa ditemukan
          </Text>
          {filteredCandidates.length > 0 ? (
            <Pressable accessibilityRole="button" onPress={toggleSelectAllFiltered}>
              <Text style={[styles.selectAllText, { color: colors.baltic }]}>
                {allFilteredSelected ? 'Batal semua' : 'Pilih semua'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {addError ? (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: colors.rosySoft, borderColor: colors.rosyBorder },
            ]}
          >
            <Text style={[styles.errorText, { color: colors.rosyDark }]}>{addError}</Text>
          </View>
        ) : null}

        {loadingCandidates ? (
          <RowListSkeleton count={4} label="Memuat daftar praktikan" />
        ) : candidatesError ? (
          <Text style={[styles.errorText, { color: colors.rosyDark }]}>{candidatesError}</Text>
        ) : filteredCandidates.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Tidak ada calon praktikan yang sesuai filter.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.candidateScroll}
            contentContainerStyle={styles.candidateList}
            showsVerticalScrollIndicator={false}
          >
            {filteredCandidates.map((student) => {
              const checked = selectedUserIds.includes(student.userId);
              const year = extractCohortYear(student.identifier) ?? '-';
              const clsTag = getCandidateClassTag(student.userId);

              return (
                <Pressable
                  key={student.userId}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  onPress={() => toggleCandidate(student.userId)}
                  style={({ pressed }) => [
                    styles.candidateRow,
                    {
                      backgroundColor: checked ? colors.pacificSoft : colors.background,
                      borderColor: checked ? colors.pacific : colors.border,
                      borderWidth: checked ? 1.5 : 1,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: checked ? colors.pacific : colors.surface,
                        borderColor: checked ? colors.pacific : colors.borderStrong,
                      },
                    ]}
                  >
                    {checked ? <Check size={13} color="#FCFCFA" strokeWidth={3} /> : null}
                  </View>

                  <View style={styles.candidateInfo}>
                    <Text
                      style={[styles.candidateName, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {student.displayName}
                    </Text>
                    <Text
                      style={[styles.candidateMeta, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {student.identifier} · {year} · {clsTag}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={addingBatch || selectedValidCandidates.length === 0}
          onPress={() => void handleBatchAdd()}
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor:
                selectedValidCandidates.length === 0 ? colors.disabledSurface : colors.rosy,
            },
            pressed && selectedValidCandidates.length > 0 && styles.pressed,
          ]}
        >
          {addingBatch ? (
            <ActivityIndicator size="small" color="#FCFCFA" />
          ) : (
            <Text
              style={[
                styles.primaryBtnText,
                selectedValidCandidates.length === 0 && { color: colors.disabledText },
              ]}
            >
              {selectedValidCandidates.length > 0
                ? `Tambahkan ${selectedValidCandidates.length} Praktikan`
                : 'Pilih Praktikan'}
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.sheetBody}>
      <View
        style={[
          styles.searchBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Search size={15} color={colors.textSubtle} strokeWidth={2} />
        <TextInput
          value={memberSearch}
          onChangeText={setMemberSearch}
          placeholder="Cari nama atau NIM..."
          placeholderTextColor={colors.textSubtle}
          style={[styles.searchInput, { color: colors.textPrimary }]}
        />
      </View>

      {feedback ? (
        <View
          style={[
            styles.feedbackBox,
            { backgroundColor: colors.pacificSoft, borderColor: colors.pacificLight },
          ]}
        >
          <Text style={[styles.feedbackText, { color: colors.pacificDark }]}>{feedback}</Text>
        </View>
      ) : null}

      {loadingMembers ? (
        <RowListSkeleton count={4} label="Memuat anggota kelas" />
      ) : membersError ? (
        <View
          style={[
            styles.emptyBox,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{membersError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setLoadingMembers(true);
              setMembersError('');
              setReloadTick((t) => t + 1);
            }}
            style={({ pressed }) => [
              styles.retryPill,
              { backgroundColor: colors.balticSoft },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.retryText, { color: colors.baltic }]}>Coba lagi</Text>
          </Pressable>
        </View>
      ) : filteredMembers.length === 0 ? (
        <View
          style={[
            styles.emptyBox,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {members.length === 0
              ? 'Belum ada praktikan terdaftar di kelas ini.'
              : 'Tidak ada anggota yang cocok.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.membersScroll}
          contentContainerStyle={styles.membersList}
          showsVerticalScrollIndicator={false}
        >
          {filteredMembers.map((member) => (
            <View
              key={member.userId}
              style={[styles.memberRow, { backgroundColor: colors.background }]}
            >
              <Text style={[styles.memberName, { color: colors.textPrimary }]} numberOfLines={1}>
                {member.displayName}
              </Text>
              <View style={styles.memberRight}>
                <Text style={[styles.memberNim, { color: colors.textSubtle }]}>
                  {member.identifier}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Keluarkan ${member.displayName}`}
                  disabled={removingId === member.userId}
                  onPress={() => handleRemoveMember(member)}
                  style={({ pressed }) => [
                    styles.removeIconBtn,
                    { backgroundColor: colors.rosySoft },
                    pressed && styles.pressed,
                  ]}
                >
                  <Trash2 size={13} color={colors.rosyDark} strokeWidth={2} />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {fetchStudentCandidates ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setFeedback('');
            setAddError('');
            setLoadingCandidates(true);
            setMode('add');
          }}
          style={({ pressed }) => [
            styles.addTriggerBtn,
            { backgroundColor: colors.pacificSoft },
            pressed && styles.pressed,
          ]}
        >
          <Plus size={16} color={colors.pacificDark} strokeWidth={2.4} />
          <Text style={[styles.addTriggerText, { color: colors.pacificDark }]}>
            Tambah Praktikan
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ClassMembersModal({
  visible,
  practicumClass,
  allClasses,
  onClose,
  fetchMembers,
  fetchStudentCandidates,
  onAddMember,
  onRemoveMember,
}: ClassMembersModalProps) {
  return (
    <FlyAwayBottomSheet
      visible={visible && Boolean(practicumClass)}
      onClose={onClose}
      title={practicumClass ? `Anggota (${practicumClass.memberCount ?? practicumClass.memberUids?.length ?? 0})` : 'Anggota Kelas'}
      subtitle={
        practicumClass
          ? `${practicumClass.courseName} · ${practicumClass.className}`
          : undefined
      }
      maxHeight="88%"
    >
      {practicumClass ? (
        <ClassMembersContent
          key={practicumClass.id}
          practicumClass={practicumClass}
          allClasses={allClasses}
          fetchMembers={fetchMembers}
          fetchStudentCandidates={fetchStudentCandidates}
          onAddMember={onAddMember}
          onRemoveMember={onRemoveMember}
        />
      ) : null}
    </FlyAwayBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBody: {
    gap: 12,
    paddingBottom: 6,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  backLinkText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12.5,
  },
  searchBox: {
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    paddingVertical: 0,
  },
  dualFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  filterPrefix: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    flex: 1,
  },
  filterValue: {
    fontFamily: FontFamily.sansBold,
  },
  inlineDropdown: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dropChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  dropChipText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
  },
  dropOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropOptionText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12.5,
    flex: 1,
  },
  countHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
  },
  selectAllText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
  },
  candidateScroll: {
    maxHeight: 270,
  },
  candidateList: {
    gap: 8,
  },
  candidateRow: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  candidateInfo: {
    flex: 1,
    gap: 2,
  },
  candidateName: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
  },
  candidateMeta: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
  },
  primaryBtn: {
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
    color: '#FCFCFA',
  },
  membersScroll: {
    maxHeight: 280,
  },
  membersList: {
    gap: 8,
  },
  memberRow: {
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  memberName: {
    flex: 1,
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13.5,
  },
  memberRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberNim: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  removeIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTriggerBtn: {
    height: 46,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addTriggerText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
  },
  feedbackBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  feedbackText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
  },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    textAlign: 'center',
  },
  retryPill: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retryText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.78,
  },
});
