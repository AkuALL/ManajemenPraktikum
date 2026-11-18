import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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

  // Search & picker states
  const [showSearchPicker, setShowSearchPicker] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<StudentCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  const [candidatesError, setCandidatesError] = useState('');
  const [candidateReloadKey, setCandidateReloadKey] = useState(0);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [addFeedback, setAddFeedback] = useState('');
  const [addError, setAddError] = useState('');

  // Multi-criteria filters (all optional)
  const [nameFilter, setNameFilter] = useState('');
  const [nimFilter, setNimFilter] = useState('');
  const [cohortFilter, setCohortFilter] = useState<string>('Semua Angkatan');
  const [showCohortDropdown, setShowCohortDropdown] = useState(false);

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

  const filteredCandidates = useMemo(() => {
    return filterStudentCandidates(
      candidates,
      members.map((m) => m.userId),
      {
        name: nameFilter,
        nim: nimFilter,
        cohort: cohortFilter,
      },
    );
  }, [candidates, cohortFilter, members, nameFilter, nimFilter]);

  const getOtherEnrolledClasses = (userId: string) =>
    allClasses.filter(
      (cls) => cls.id !== practicumClass.id && cls.memberUids?.includes(userId),
    );

  const handleSelectCandidate = async (candidate: StudentCandidate) => {
    if (addingUserId) return;

    try {
      setAddingUserId(candidate.userId);
      setAddError('');
      setAddFeedback('');
      const newMember = await onAddMember(practicumClass.id, {
        userId: candidate.userId,
        displayName: candidate.displayName,
        identifier: candidate.identifier,
      });
      setMembers((prev) => [...prev, newMember]);
      setAddFeedback(`${candidate.displayName} berhasil ditambahkan ke kelas.`);
    } catch (err: any) {
      setAddError(err?.message ?? 'Gagal menambah anggota');
    } finally {
      setAddingUserId(null);
    }
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
    <View style={styles.overlay}>
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
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
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
                Cari & Tambah Praktikan
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSearchPicker(false);
                  setShowCohortDropdown(false);
                  setAddError('');
                  setAddFeedback('');
                }}
              >
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

            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Filter Nama (opsional)"
              placeholderTextColor={colors.textSecondary}
              value={nameFilter}
              onChangeText={(value) => {
                setNameFilter(value);
                setAddError('');
              }}
              accessibilityLabel="Filter nama praktikan"
            />

            <View style={styles.filterRow}>
              <TextInput
                style={[
                  styles.input,
                  styles.nimInput,
                  { color: colors.textPrimary, borderColor: colors.border },
                ]}
                placeholder="Filter NIM (opsional)"
                placeholderTextColor={colors.textSecondary}
                value={nimFilter}
                onChangeText={(value) => {
                  setNimFilter(value);
                  setAddError('');
                }}
                accessibilityLabel="Filter NIM praktikan"
              />

              <TouchableOpacity
                style={[
                  styles.cohortButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                ]}
                onPress={() => setShowCohortDropdown((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel="Filter angkatan praktikan"
              >
                <Text style={[styles.cohortButtonText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {cohortFilter} ▾
                </Text>
              </TouchableOpacity>
            </View>

            {showCohortDropdown ? (
              <View
                style={[
                  styles.dropdownMenu,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                ]}
              >
                {COHORT_OPTIONS.map((option) => {
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
              </View>
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
            ) : filteredCandidates.length === 0 ? (
              <View style={styles.candidateState}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Tidak ada praktikan cocok atau semua sudah terdaftar di kelas ini.
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.resultHint, { color: colors.textSecondary }]}>
                  {filteredCandidates.length} praktikan tersedia — ketuk untuk menambahkan:
                </Text>
                <ScrollView style={styles.candidateList} nestedScrollEnabled>
                  {filteredCandidates.map((item) => {
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
                        disabled={Boolean(addingUserId)}
                        accessibilityRole="button"
                        accessibilityLabel={`Tambahkan ${item.displayName}`}
                      >
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                            {item.displayName}
                          </Text>
                          <Text style={[styles.memberNIM, { color: colors.textSecondary }]}>
                            {item.identifier} · {cohort ? `Angkatan ${cohort}` : 'Angkatan -'}
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
                                    otherClasses.length > 0 ? '#b45309' : colors.textSecondary,
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
                            <Text style={{ color: colors.actionPrimary, fontWeight: '700', fontSize: 12 }}>
                              + Pilih
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
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
              + Cari & Tambah Praktikan
            </Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <ActivityIndicator style={{ marginVertical: 30 }} size="large" color={colors.actionPrimary} />
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
            style={{ maxHeight: showSearchPicker ? 180 : 340 }}
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
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  nimInput: {
    flex: 1,
  },
  cohortButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    minWidth: 130,
    alignItems: 'center',
  },
  cohortButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownMenu: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    maxHeight: 200,
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
