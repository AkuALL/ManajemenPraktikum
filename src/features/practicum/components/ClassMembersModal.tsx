import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { RowListSkeleton } from '@/components/ui/skeleton';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { AddMemberInput, ClassMember, PracticumClass, StudentCandidate } from '../types';
import { COHORT_OPTIONS, extractCohortYear, filterStudentCandidates } from '../validation';

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

function ClassMembersContent({
  practicumClass,
  allClasses = [],
  onClose,
  fetchMembers,
  fetchStudentCandidates,
  onAddMember,
  onRemoveMember,
}: {
  practicumClass: PracticumClass;
  allClasses?: PracticumClass[];
  onClose: () => void;
  fetchMembers: (classId: string) => Promise<ClassMember[]>;
  fetchStudentCandidates?: () => Promise<StudentCandidate[]>;
  onAddMember: (classId: string, input: AddMemberInput) => Promise<ClassMember>;
  onRemoveMember: (classId: string, memberId: string) => Promise<void>;
}) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [members, setMembers] = useState<ClassMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  // Add-praktikan picker states
  const [showSearchPicker, setShowSearchPicker] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<StudentCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  const [candidatesError, setCandidatesError] = useState('');
  const [candidateReloadKey, setCandidateReloadKey] = useState(0);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [addingBatch, setAddingBatch] = useState<boolean>(false);
  const [addFeedback, setAddFeedback] = useState('');
  const [addError, setAddError] = useState('');

  // 1) Cohort filter -> 2) Multi-select student dropdown -> 3) Name/NIM search
  const [cohortFilter, setCohortFilter] = useState<string>('Semua Angkatan');
  const [showCohortDropdown, setShowCohortDropdown] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isCancelled = false;

    fetchMembers(practicumClass.id)
      .then((data) => {
        if (!isCancelled) {
          setMembers(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setLoadError(err instanceof Error ? err.message : 'Gagal memuat daftar anggota');
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [fetchMembers, practicumClass.id, reloadKey]);

  useEffect(() => {
    if (!showSearchPicker || !fetchStudentCandidates) return;
    let isCancelled = false;

    fetchStudentCandidates()
      .then((list) => {
        if (!isCancelled) {
          setCandidates(list);
          setLoadingCandidates(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setCandidatesError(
            err instanceof Error ? err.message : 'Gagal memuat daftar praktikan terdaftar',
          );
          setLoadingCandidates(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [fetchStudentCandidates, showSearchPicker, candidateReloadKey]);

  const memberIds = useMemo(() => members.map((m) => m.userId), [members]);
  const memberIdSet = useMemo(() => new Set(memberIds), [memberIds]);

  const cohortOptions = useMemo(() => {
    const baseOptions: readonly string[] = COHORT_OPTIONS;
    const extras = candidates
      .map((candidate) => extractCohortYear(candidate.identifier))
      .filter((year): year is string => year !== null && !baseOptions.includes(year));
    return [...COHORT_OPTIONS, ...Array.from(new Set(extras)).sort()];
  }, [candidates]);

  const cohortCandidates = useMemo(() => {
    return filterStudentCandidates(candidates, memberIds, { cohort: cohortFilter });
  }, [candidates, cohortFilter, memberIds]);

  const selectedCandidates = useMemo(() => {
    const selectedSet = new Set(selectedUserIds);
    return candidates.filter(
      (candidate) => selectedSet.has(candidate.userId) && !memberIdSet.has(candidate.userId),
    );
  }, [candidates, memberIdSet, selectedUserIds]);

  const allCohortSelected =
    cohortCandidates.length > 0 &&
    cohortCandidates.every((candidate) => selectedUserIds.includes(candidate.userId));

  const trimmedSearchQuery = searchQuery.trim();
  const searchCandidates = useMemo(() => {
    if (!trimmedSearchQuery) return [];
    return filterStudentCandidates(candidates, memberIds, { query: trimmedSearchQuery });
  }, [candidates, memberIds, trimmedSearchQuery]);

  const isAdding = addingBatch || Boolean(addingUserId);

  const getOtherEnrolledClasses = (userId: string) =>
    allClasses.filter(
      (cls) => cls.id !== practicumClass.id && cls.memberUids?.includes(userId),
    );

  const toggleCandidateSelection = (userId: string) => {
    setAddError('');
    setAddFeedback('');
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const toggleSelectAllCohort = () => {
    const cohortIds = cohortCandidates.map((candidate) => candidate.userId);
    const cohortIdSet = new Set(cohortIds);
    setAddError('');
    setAddFeedback('');
    setSelectedUserIds((prev) => {
      if (allCohortSelected) {
        return prev.filter((id) => !cohortIdSet.has(id));
      }
      return Array.from(new Set([...prev, ...cohortIds]));
    });
  };

  // shortcut: sequential onAddMember calls; move to a single Firestore writeBatch if class adds regularly exceed ~30 students
  const handleAddSelected = async () => {
    if (isAdding || selectedCandidates.length === 0) return;

    setAddingBatch(true);
    setAddError('');
    setAddFeedback('');

    const addedMembers: ClassMember[] = [];
    const addedIds = new Set<string>();
    let firstError = '';

    try {
      for (const candidate of selectedCandidates) {
        try {
          const newMember = await onAddMember(practicumClass.id, {
            userId: candidate.userId,
            displayName: candidate.displayName,
            identifier: candidate.identifier,
          });
          addedMembers.push(newMember);
          addedIds.add(candidate.userId);
        } catch (err: any) {
          if (!firstError) {
            firstError = err?.message ?? `Gagal menambah ${candidate.displayName}`;
          }
        }
      }

      if (addedMembers.length > 0) {
        setMembers((prev) => {
          const existingIds = new Set(prev.map((m) => m.userId));
          const uniqueAdded = addedMembers.filter((m) => !existingIds.has(m.userId));
          return [...prev, ...uniqueAdded];
        });
        setSelectedUserIds((prev) => prev.filter((id) => !addedIds.has(id)));
        if (addedMembers.length === selectedCandidates.length) {
          setShowStudentDropdown(false);
        }
        setAddFeedback(
          addedMembers.length === 1
            ? `${addedMembers[0].displayName} berhasil ditambahkan ke kelas.`
            : `${addedMembers.length} praktikan berhasil ditambahkan ke kelas.`,
        );
      }

      if (firstError) {
        setAddError(
          addedMembers.length > 0
            ? `${addedMembers.length} berhasil, sebagian gagal: ${firstError}`
            : firstError,
        );
      }
    } finally {
      setAddingBatch(false);
    }
  };

  const handleSelectCandidate = async (candidate: StudentCandidate) => {
    if (isAdding) return;

    try {
      setAddingUserId(candidate.userId);
      setAddError('');
      setAddFeedback('');
      const newMember = await onAddMember(practicumClass.id, {
        userId: candidate.userId,
        displayName: candidate.displayName,
        identifier: candidate.identifier,
      });
      setMembers((prev) =>
        prev.some((m) => m.userId === newMember.userId) ? prev : [...prev, newMember],
      );
      setSelectedUserIds((prev) => prev.filter((id) => id !== candidate.userId));
      setAddFeedback(`${candidate.displayName} berhasil ditambahkan ke kelas.`);
    } catch (err: any) {
      setAddError(err?.message ?? 'Gagal menambah anggota');
    } finally {
      setAddingUserId(null);
    }
  };

  const handleClosePicker = () => {
    setShowSearchPicker(false);
    setShowCohortDropdown(false);
    setShowStudentDropdown(false);
    setSelectedUserIds([]);
    setSearchQuery('');
    setAddError('');
    setAddFeedback('');
  };

  const handleRemove = (member: ClassMember) => {
    if (removingMemberId) return;

    Alert.alert(
      'Hapus Anggota',
      `Keluarkan ${member.displayName} (${member.identifier}) dari kelas ini?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            if (removingMemberId) return;
            try {
              setRemovingMemberId(member.userId);
              await onRemoveMember(practicumClass.id, member.userId);
              setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Gagal menghapus anggota');
            } finally {
              setRemovingMemberId(null);
            }
          },
        },
      ],
    );
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
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Daftar Anggota Kelas
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {practicumClass.className} - {practicumClass.courseName}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Tutup modal">
            <Text style={{ color: colors.textSecondary, fontSize: 18, fontWeight: '700' }}>
              ✕
            </Text>
          </TouchableOpacity>
        </View>

        {showSearchPicker ? (
          <View
            style={[
              styles.searchPanel,
              { borderColor: colors.border, backgroundColor: colors.background },
            ]}
          >
            <View style={styles.searchHeader}>
              <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
                Tambah Praktikan
              </Text>
              <TouchableOpacity onPress={handleClosePicker} disabled={isAdding}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
                  Tutup
                </Text>
              </TouchableOpacity>
            </View>

            {addError ? <Text style={styles.errorText}>{addError}</Text> : null}
            {addFeedback ? (
              <Text style={[styles.successText, { color: colors.actionPrimary }]}>
                {addFeedback}
              </Text>
            ) : null}

            {!fetchStudentCandidates ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary, paddingVertical: 12 }]}>
                Pencarian praktikan tidak tersedia.
              </Text>
            ) : loadingCandidates ? (
              <View style={styles.candidateState}>
                <ActivityIndicator size="small" color={colors.actionPrimary} />
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  Memuat daftar praktikan terdaftar...
                </Text>
              </View>
            ) : candidatesError ? (
              <View style={styles.candidateState}>
                <Text style={styles.errorText}>{candidatesError}</Text>
                <TouchableOpacity
                  style={[styles.retryBtn, { borderColor: colors.actionPrimary }]}
                  onPress={() => {
                    setLoadingCandidates(true);
                    setCandidatesError('');
                    setCandidateReloadKey((v) => v + 1);
                  }}
                >
                  <Text style={{ color: colors.actionPrimary, fontWeight: '700' }}>Coba lagi</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                style={styles.searchPanelScroll}
                contentContainerStyle={styles.searchPanelContent}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {/* 1. Filter Angkatan */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    1. Filter Angkatan
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.selectorButton,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                    ]}
                    onPress={() => {
                      setShowCohortDropdown((prev) => !prev);
                      setShowStudentDropdown(false);
                    }}
                    disabled={isAdding}
                    accessibilityRole="button"
                    accessibilityLabel="Filter angkatan praktikan"
                  >
                    <Text
                      style={[styles.selectorPrimary, { color: colors.textPrimary, flex: 1 }]}
                      numberOfLines={1}
                    >
                      {cohortFilter === 'Semua Angkatan'
                        ? 'Semua Angkatan'
                        : `Angkatan ${cohortFilter}`}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
                      {showCohortDropdown ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>

                  {showCohortDropdown ? (
                    <View
                      style={[
                        styles.dropdownMenu,
                        { borderColor: colors.border, backgroundColor: colors.surface },
                      ]}
                    >
                      <ScrollView style={styles.cohortDropdownScroll} nestedScrollEnabled>
                        {cohortOptions.map((option) => {
                          const selected = option === cohortFilter;
                          return (
                            <TouchableOpacity
                              key={option}
                              style={[
                                styles.dropdownOption,
                                {
                                  borderBottomColor: colors.border,
                                  backgroundColor: selected ? colors.surfaceMuted : 'transparent',
                                },
                              ]}
                              onPress={() => {
                                setCohortFilter(option);
                                setShowCohortDropdown(false);
                              }}
                            >
                              <Text
                                style={{
                                  color: selected ? colors.actionPrimary : colors.textPrimary,
                                  fontWeight: selected ? '700' : '500',
                                  fontSize: 13,
                                }}
                              >
                                {option === 'Semua Angkatan' ? option : `Angkatan ${option}`}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>

                {/* 2. Dropdown Daftar Seluruh Praktikan dengan Checkbox (Multiple Choice) */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    2. Pilih Praktikan (Multiple Choice)
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.selectorButton,
                      {
                        borderColor:
                          showStudentDropdown || selectedCandidates.length > 0
                            ? colors.actionPrimary
                            : colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                    onPress={() => {
                      setShowStudentDropdown((prev) => !prev);
                      setShowCohortDropdown(false);
                    }}
                    disabled={isAdding}
                    accessibilityRole="button"
                    accessibilityLabel="Pilih praktikan dari dropdown"
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.selectorPrimary, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {selectedCandidates.length > 0
                          ? `${selectedCandidates.length} praktikan dipilih`
                          : 'Pilih nama praktikan'}
                      </Text>
                      <Text style={[styles.selectorSecondary, { color: colors.textSecondary }]}>
                        {cohortCandidates.length} tersedia
                        {cohortFilter !== 'Semua Angkatan' ? ` · Angkatan ${cohortFilter}` : ''}
                      </Text>
                    </View>
                    <Text style={{ color: colors.actionPrimary, fontSize: 12, fontWeight: '700' }}>
                      {showStudentDropdown ? 'Tutup ▲' : 'Pilih ▼'}
                    </Text>
                  </TouchableOpacity>

                  {showStudentDropdown ? (
                    <View
                      style={[
                        styles.dropdownMenu,
                        { borderColor: colors.border, backgroundColor: colors.surface },
                      ]}
                    >
                      {cohortCandidates.length === 0 ? (
                        <Text
                          style={[
                            styles.emptyText,
                            { color: colors.textSecondary, padding: 12 },
                          ]}
                        >
                          Tidak ada praktikan tersedia untuk filter angkatan ini atau semua sudah
                          terdaftar.
                        </Text>
                      ) : (
                        <>
                          <View
                            style={[
                              styles.dropdownToolbar,
                              {
                                borderBottomColor: colors.border,
                                backgroundColor: colors.surfaceMuted,
                              },
                            ]}
                          >
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                              {cohortCandidates.length} praktikan
                            </Text>
                            <TouchableOpacity
                              onPress={toggleSelectAllCohort}
                              disabled={isAdding}
                              accessibilityRole="button"
                            >
                              <Text
                                style={{
                                  color: colors.actionPrimary,
                                  fontSize: 12,
                                  fontWeight: '700',
                                }}
                              >
                                {allCohortSelected ? 'Batal Semua' : 'Pilih Semua'}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          <ScrollView
                            style={styles.studentDropdownScroll}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                          >
                            {cohortCandidates.map((item) => {
                              const isSelected = selectedUserIds.includes(item.userId);
                              const cohort = extractCohortYear(item.identifier);
                              const otherClasses = getOtherEnrolledClasses(item.userId);

                              return (
                                <TouchableOpacity
                                  key={item.userId}
                                  style={[
                                    styles.checkboxOption,
                                    {
                                      borderBottomColor: colors.border,
                                      backgroundColor: isSelected
                                        ? colors.surfaceMuted
                                        : 'transparent',
                                    },
                                  ]}
                                  onPress={() => toggleCandidateSelection(item.userId)}
                                  disabled={isAdding}
                                  accessibilityRole="checkbox"
                                  accessibilityState={{ checked: isSelected }}
                                  accessibilityLabel={`Pilih ${item.displayName}`}
                                >
                                  <View
                                    style={[
                                      styles.checkboxBox,
                                      {
                                        borderColor: isSelected
                                          ? colors.actionPrimary
                                          : colors.border,
                                        backgroundColor: isSelected
                                          ? colors.actionPrimary
                                          : 'transparent',
                                      },
                                    ]}
                                  >
                                    {isSelected ? <Text style={styles.checkboxMark}>✓</Text> : null}
                                  </View>

                                  <View style={{ flex: 1, gap: 2 }}>
                                    <Text
                                      style={[styles.checkboxName, { color: colors.textPrimary }]}
                                      numberOfLines={1}
                                    >
                                      {item.displayName}
                                    </Text>
                                    <Text
                                      style={[styles.memberNIM, { color: colors.textSecondary }]}
                                      numberOfLines={1}
                                    >
                                      {item.identifier} ·{' '}
                                      {cohort ? `Angkatan ${cohort}` : 'Angkatan -'}
                                    </Text>
                                    {otherClasses.length > 0 ? (
                                      <Text style={styles.otherClassHint} numberOfLines={1}>
                                        Terdaftar di{' '}
                                        {otherClasses.map((c) => c.className).join(', ')}
                                      </Text>
                                    ) : null}
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </>
                      )}
                    </View>
                  ) : null}

                  {selectedCandidates.length > 0 ? (
                    <View style={styles.batchActionRow}>
                      <TouchableOpacity
                        style={[
                          styles.batchAddBtn,
                          { backgroundColor: colors.actionPrimary },
                        ]}
                        onPress={handleAddSelected}
                        disabled={isAdding}
                        accessibilityRole="button"
                        accessibilityLabel={`Tambahkan ${selectedCandidates.length} praktikan terpilih`}
                      >
                        {addingBatch ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.batchAddText}>
                            Tambahkan {selectedCandidates.length} Praktikan
                          </Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.resetBtn, { borderColor: colors.border }]}
                        onPress={() => setSelectedUserIds([])}
                        disabled={isAdding}
                        accessibilityRole="button"
                      >
                        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                          Reset
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>

                {/* 3. Opsi Cari Berdasarkan Nama atau NIM */}
                <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    Atau Cari Nama / NIM
                  </Text>
                  <View
                    style={[
                      styles.searchInputRow,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                    ]}
                  >
                    <TextInput
                      style={[styles.searchInput, { color: colors.textPrimary }]}
                      placeholder="Cari nama atau NIM praktikan..."
                      placeholderTextColor={colors.textSecondary}
                      value={searchQuery}
                      onChangeText={(value) => {
                        setSearchQuery(value);
                        setAddError('');
                        if (value.trim().length > 0) {
                          setShowCohortDropdown(false);
                          setShowStudentDropdown(false);
                        }
                      }}
                      editable={!isAdding}
                      accessibilityLabel="Cari nama atau NIM praktikan"
                    />
                    {searchQuery.length > 0 ? (
                      <TouchableOpacity
                        onPress={() => setSearchQuery('')}
                        style={styles.clearInputBtn}
                        accessibilityLabel="Hapus pencarian"
                      >
                        <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '700' }}>
                          ✕
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {trimmedSearchQuery.length > 0 ? (
                    searchCandidates.length === 0 ? (
                      <Text
                        style={[
                          styles.emptyText,
                          { color: colors.textSecondary, paddingVertical: 8 },
                        ]}
                      >
                        Tidak ada praktikan cocok dengan &quot;{trimmedSearchQuery}&quot; atau sudah
                        terdaftar di kelas ini.
                      </Text>
                    ) : (
                      <>
                        <Text style={[styles.resultHint, { color: colors.textSecondary }]}>
                          {searchCandidates.length} hasil pencarian — ketuk untuk menambahkan:
                        </Text>
                        <ScrollView
                          style={styles.candidateList}
                          nestedScrollEnabled
                          keyboardShouldPersistTaps="handled"
                        >
                          {searchCandidates.map((item) => {
                            const cohort = extractCohortYear(item.identifier);
                            const otherClasses = getOtherEnrolledClasses(item.userId);
                            const isAddingThis = addingUserId === item.userId;

                            return (
                              <TouchableOpacity
                                key={item.userId}
                                style={[
                                  styles.candidateRow,
                                  { borderColor: colors.border, backgroundColor: colors.surface },
                                ]}
                                onPress={() => handleSelectCandidate(item)}
                                disabled={isAdding}
                                accessibilityRole="button"
                                accessibilityLabel={`Tambahkan ${item.displayName}`}
                              >
                                <View style={{ flex: 1, gap: 3 }}>
                                  <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                                    {item.displayName}
                                  </Text>
                                  <Text style={[styles.memberNIM, { color: colors.textSecondary }]}>
                                    {item.identifier} ·{' '}
                                    {cohort ? `Angkatan ${cohort}` : 'Angkatan -'}
                                  </Text>
                                  <View
                                    style={[
                                      styles.statusBadge,
                                      {
                                        backgroundColor:
                                          otherClasses.length > 0
                                            ? 'rgba(245, 158, 11, 0.15)'
                                            : colors.surfaceMuted,
                                        borderColor:
                                          otherClasses.length > 0 ? '#d97706' : colors.border,
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.statusBadgeText,
                                        {
                                          color:
                                            otherClasses.length > 0
                                              ? '#b45309'
                                              : colors.textSecondary,
                                        },
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {otherClasses.length > 0
                                        ? `Terdaftar di ${otherClasses.map((c) => c.className).join(', ')}`
                                        : 'Belum terdaftar di kelas lain'}
                                    </Text>
                                  </View>
                                </View>

                                <View style={styles.tapAddPill}>
                                  {isAddingThis ? (
                                    <ActivityIndicator size="small" color={colors.actionPrimary} />
                                  ) : (
                                    <Text
                                      style={{
                                        color: colors.actionPrimary,
                                        fontWeight: '700',
                                        fontSize: 12,
                                      }}
                                    >
                                      + Tambah
                                    </Text>
                                  )}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </>
                    )
                  ) : null}
                </View>
              </ScrollView>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addNewButton, { borderColor: colors.actionPrimary }]}
            onPress={() => {
              setLoadingCandidates(true);
              setCandidatesError('');
              setShowSearchPicker(true);
            }}
            disabled={loading || Boolean(removingMemberId)}
          >
            <Text style={[styles.addNewText, { color: colors.actionPrimary }]}>
              + Tambah Praktikan
            </Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <RowListSkeleton count={4} label="Memuat daftar anggota kelas" />
        ) : loadError ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{loadError}</Text>
            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: colors.actionPrimary }]}
              onPress={() => {
                setLoading(true);
                setLoadError('');
                setReloadKey((value) => value + 1);
              }}
            >
              <Text style={{ color: colors.actionPrimary, fontWeight: '700' }}>Coba lagi</Text>
            </TouchableOpacity>
          </View>
        ) : members.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Belum ada praktikan terdaftar di kelas ini.
            </Text>
          </View>
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => item.userId}
            style={{ maxHeight: showSearchPicker ? 150 : 340 }}
            renderItem={({ item }) => (
              <View style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                    {item.displayName}
                  </Text>
                  <Text style={[styles.memberNIM, { color: colors.textSecondary }]}>
                    {item.identifier}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemove(item)}
                  disabled={Boolean(removingMemberId)}
                >
                  <Text style={styles.removeText}>
                    {removingMemberId === item.userId ? 'Menghapus...' : 'Hapus'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </KeyboardAvoidingView>
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
  if (!visible || !practicumClass) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <ClassMembersContent
        key={practicumClass.id}
        practicumClass={practicumClass}
        allClasses={allClasses}
        onClose={onClose}
        fetchMembers={fetchMembers}
        fetchStudentCandidates={fetchStudentCandidates}
        onAddMember={onAddMember}
        onRemoveMember={onRemoveMember}
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
    maxWidth: 520,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  addNewButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  addNewText: {
    fontWeight: '700',
    fontSize: 14,
  },
  searchPanel: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  searchPanelScroll: {
    maxHeight: 380,
  },
  searchPanelContent: {
    gap: 10,
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formTitle: {
    fontWeight: '700',
    fontSize: 14,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
  },
  successText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectorButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorPrimary: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectorSecondary: {
    fontSize: 11,
    marginTop: 1,
  },
  dropdownMenu: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cohortDropdownScroll: {
    maxHeight: 160,
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  studentDropdownScroll: {
    maxHeight: 180,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  checkboxName: {
    fontSize: 14,
    fontWeight: '600',
  },
  otherClassHint: {
    color: '#b45309',
    fontSize: 11,
    fontWeight: '600',
  },
  batchActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  batchAddBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchAddText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  resetBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
  },
  clearInputBtn: {
    paddingLeft: 8,
    paddingVertical: 6,
  },
  candidateState: {
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  resultHint: {
    fontSize: 12,
  },
  candidateList: {
    maxHeight: 160,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tapAddPill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  retryBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberNIM: {
    fontSize: 12,
    marginTop: 2,
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  removeText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
});
