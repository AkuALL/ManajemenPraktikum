import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChevronDown, Download } from 'lucide-react-native';

import { AccordionGroup } from '@/components/ui/accordion-group';
import { AppHeader, getFirstName } from '@/components/ui/app-header';
import { PickerBottomSheet, type PickerOption } from '@/components/ui/picker-bottom-sheet';
import { SearchFilterBar } from '@/components/ui/search-filter-bar';
import { CardListSkeleton, RowListSkeleton } from '@/components/ui/skeleton';
import { Colors, FontFamily, MaxContentWidth } from '@/constants/theme';
import { useSessionAttendance } from '@/features/attendance';
import { useAuth } from '@/features/auth';
import { useAssistantLeaveRequests } from '@/features/leave';
import {
  type ClassMember,
  formatSessionDate,
  formatSessionTime,
  type PracticumSession,
  type StudentCandidate,
  usePracticum,
} from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { showAlert } from '@/lib/cross-platform-alert';
import type { LeaveStatus } from '@/types';

type RecapFilterMode = 'all' | 'hadir' | 'izin' | 'belum';

type LeaveMemberRow = {
  id: string;
  displayName: string;
  identifier: string;
  leaveStatus: LeaveStatus;
};

const FILTER_OPTIONS: PickerOption[] = [
  { value: 'hadir', label: 'Hadir', subtitle: 'Fokus praktikan yang sudah tercatat hadir' },
  { value: 'izin', label: 'Izin', subtitle: 'Praktikan yang mengajukan izin pada sesi ini' },
  { value: 'belum', label: 'Belum Presensi', subtitle: 'Praktikan yang belum presensi maupun izin' },
];

function formatSessionCourseLabel(session: PracticumSession): string {
  const parts = [session.courseName ?? session.className, session.title].filter(Boolean);
  return parts.join(' · ');
}

function leaveStatusLabel(status: LeaveStatus): string {
  if (status === 'approved') return 'Disetujui';
  if (status === 'rejected') return 'Ditolak';
  return 'Pending';
}

export default function RecapScreen() {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { classes, sessions, loadingSessions, getClassMembers, getRegisteredStudents } =
    usePracticum();

  const defaultSessionId = useMemo(() => {
    const open = sessions.find((item) => item.status === 'open');
    return open?.id ?? sessions[0]?.id ?? null;
  }, [sessions]);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionSheetVisible, setSessionSheetVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<RecapFilterMode>('all');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  const [presentExpanded, setPresentExpanded] = useState(true);
  const [leaveExpanded, setLeaveExpanded] = useState(true);
  const [absentExpanded, setAbsentExpanded] = useState(true);
  const [memberSnapshot, setMemberSnapshot] = useState<{
    classId: string;
    members: ClassMember[];
  } | null>(null);
  const [registeredStudents, setRegisteredStudents] = useState<StudentCandidate[]>([]);

  const activeSession = useMemo(() => {
    const targetId = selectedSessionId ?? defaultSessionId;
    return sessions.find((item) => item.id === targetId) ?? sessions[0] ?? null;
  }, [defaultSessionId, selectedSessionId, sessions]);

  const { records, loading, error, retry } = useSessionAttendance(
    activeSession?.id ?? null,
    activeSession?.classId ?? null,
  );

  const classIds = useMemo(() => classes.map((c) => c.id), [classes]);
  const { requests: leaveRequests } = useAssistantLeaveRequests(
    classIds,
    undefined,
    classes.length > 0,
  );

  useEffect(() => {
    if (user?.role !== 'assistant') return;
    let cancelled = false;
    getRegisteredStudents()
      .then((list) => {
        if (!cancelled) setRegisteredStudents(list);
      })
      .catch(() => {
        if (!cancelled) setRegisteredStudents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [getRegisteredStudents, user?.role]);

  useEffect(() => {
    const targetClassId = activeSession?.classId;
    if (!targetClassId) return;
    let cancelled = false;
    getClassMembers(targetClassId)
      .then((list) => {
        if (!cancelled) {
          setMemberSnapshot({ classId: targetClassId, members: list });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMemberSnapshot({ classId: targetClassId, members: [] });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeSession?.classId, getClassMembers]);

  const classMembers = useMemo(
    () =>
      activeSession?.classId && memberSnapshot?.classId === activeSession.classId
        ? memberSnapshot.members
        : [],
    [activeSession, memberSnapshot],
  );

  const studentByKey = useMemo(() => {
    const map = new Map<string, StudentCandidate>();
    registeredStudents.forEach((student) => {
      if (student.authUid) map.set(student.authUid, student);
      map.set(student.userId, student);
      map.set(student.identifier.trim().toLowerCase(), student);
    });
    return map;
  }, [registeredStudents]);

  const attendedIdentifiers = useMemo(
    () => new Set(records.map((r) => r.studentIdentifier.trim().toLowerCase())),
    [records],
  );
  const attendedIds = useMemo(() => new Set(records.map((r) => r.studentId)), [records]);

  const sessionLeaves = useMemo(
    () =>
      activeSession
        ? leaveRequests.filter((req) => req.sessionId === activeSession.id)
        : [],
    [activeSession, leaveRequests],
  );

  const { leaveMembers, notAttendedMembers } = useMemo(() => {
    const leaveRows: LeaveMemberRow[] = [];
    const leaveMemberKeys = new Set<string>();

    sessionLeaves.forEach((req) => {
      const registered = studentByKey.get(req.studentId);
      const matchedMember = classMembers.find(
        (m) =>
          m.userId === req.studentId ||
          (registered !== undefined &&
            (m.userId === registered.userId ||
              m.identifier.trim().toLowerCase() === registered.identifier.trim().toLowerCase())),
      );

      const resolvedIdentifier =
        matchedMember?.identifier ?? registered?.identifier ?? req.studentId;
      const resolvedName =
        matchedMember?.displayName ?? registered?.displayName ?? req.studentId;
      const normalizedIdentifier = resolvedIdentifier.trim().toLowerCase();

      const alreadyPresent =
        attendedIds.has(req.studentId) ||
        (matchedMember !== undefined && attendedIds.has(matchedMember.userId)) ||
        attendedIdentifiers.has(normalizedIdentifier);

      if (matchedMember) {
        leaveMemberKeys.add(matchedMember.userId);
      }
      leaveMemberKeys.add(normalizedIdentifier);

      if (!alreadyPresent) {
        leaveRows.push({
          id: req.id,
          displayName: resolvedName,
          identifier: resolvedIdentifier,
          leaveStatus: req.status,
        });
      }
    });

    const missing = classMembers.filter((member) => {
      const normalized = member.identifier.trim().toLowerCase();
      if (attendedIds.has(member.userId) || attendedIdentifiers.has(normalized)) {
        return false;
      }
      if (leaveMemberKeys.has(member.userId) || leaveMemberKeys.has(normalized)) {
        return false;
      }
      return true;
    });

    return { leaveMembers: leaveRows, notAttendedMembers: missing };
  }, [attendedIdentifiers, attendedIds, classMembers, sessionLeaves, studentByKey]);

  const filteredPresent = useMemo(() => {
    if (filterMode !== 'all' && filterMode !== 'hadir') return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.studentIdentifier.toLowerCase().includes(q),
    );
  }, [filterMode, records, searchQuery]);

  const filteredLeave = useMemo(() => {
    if (filterMode !== 'all' && filterMode !== 'izin') return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return leaveMembers;
    return leaveMembers.filter(
      (item) =>
        item.displayName.toLowerCase().includes(q) ||
        item.identifier.toLowerCase().includes(q),
    );
  }, [filterMode, leaveMembers, searchQuery]);

  const filteredNotAttended = useMemo(() => {
    if (filterMode !== 'all' && filterMode !== 'belum') return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return notAttendedMembers;
    return notAttendedMembers.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.identifier.toLowerCase().includes(q),
    );
  }, [filterMode, notAttendedMembers, searchQuery]);

  const sessionOptions = useMemo<PickerOption[]>(
    () =>
      sessions.map((s) => ({
        value: s.id,
        label: formatSessionCourseLabel(s),
        subtitle: `${formatSessionDate(s.date, s.startsAt)} · ${formatSessionTime(s.startsAt)} · ${s.location}`,
      })),
    [sessions],
  );

  const handleExportCsv = async () => {
    if (!activeSession) return;
    const header = 'Nama,NIM,Status,Waktu Scan';
    const presentRows = records.map(
      (r) =>
        `"${r.studentName.replace(/"/g, '""')}","${r.studentIdentifier}","Hadir","${r.attendedAt}"`,
    );
    const leaveRows = leaveMembers.map(
      (l) =>
        `"${l.displayName.replace(/"/g, '""')}","${l.identifier}","Izin (${leaveStatusLabel(l.leaveStatus)})","-"`,
    );
    const notAttendedRows = notAttendedMembers.map(
      (m) =>
        `"${m.displayName.replace(/"/g, '""')}","${m.identifier}","Belum Presensi","-"`,
    );
    const csv = [header, ...presentRows, ...leaveRows, ...notAttendedRows].join('\n');

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof Blob !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rekap-${activeSession.id}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    try {
      await Share.share({
        title: `Rekap ${activeSession.title}`,
        message: csv,
      });
    } catch {
      showAlert('Ekspor CSV', 'Tidak dapat membagikan berkas CSV saat ini.');
    }
  };

  if (user?.role !== 'assistant') {
    return (
      <View style={[styles.guard, { backgroundColor: colors.background }]}>
        <Text style={[styles.guardTitle, { color: colors.textPrimary }]}>
          Halaman tidak tersedia
        </Text>
        <Text style={[styles.guardBody, { color: colors.textSecondary }]}>
          Rekap kehadiran hanya tersedia untuk Asisten.
        </Text>
      </View>
    );
  }

  const totalEnrolled = Math.max(classMembers.length, records.length);
  const filterLabel =
    FILTER_OPTIONS.find((opt) => opt.value === filterMode)?.label ?? 'Semua';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AppHeader
          eyebrow={`Rekap Sesi · ${activeSession?.className ?? 'Asisten'}`}
          title={`Hai, ${getFirstName(user.displayName)}`}
          monoBadge={activeSession ? activeSession.title.toUpperCase().slice(0, 18) : 'BELUM ADA SESI'}
          statusBadge={`${records.length} / ${totalEnrolled} Masuk`}
        />

        <View style={styles.bodyContainer}>
          {loadingSessions && sessions.length === 0 ? (
            <CardListSkeleton count={2} label="Memuat daftar sesi praktikum" />
          ) : sessions.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Belum ada sesi praktikum
              </Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                Buat sesi praktikum terlebih dahulu untuk memantau rekap presensi real-time.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.topControlsRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSessionSheetVisible(true)}
                  style={({ pressed }) => [
                    styles.classDropdown,
                    { backgroundColor: colors.baltic },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.classDropdownText} numberOfLines={1}>
                    {activeSession ? formatSessionCourseLabel(activeSession) : 'Pilih Sesi'}
                  </Text>
                  <ChevronDown size={16} color="#FCFCFA" strokeWidth={2.2} />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Unduh CSV Rekap Presensi"
                  onPress={() => void handleExportCsv()}
                  style={({ pressed }) => [
                    styles.csvBtn,
                    { backgroundColor: colors.pacificSoft },
                    pressed && styles.pressed,
                  ]}
                >
                  <Download size={15} color={colors.pacificDark} strokeWidth={2.2} />
                  <Text style={[styles.csvBtnText, { color: colors.pacificDark }]}>CSV</Text>
                </Pressable>
              </View>

              <SearchFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Cari nama atau NIM..."
                filterLabel={filterLabel}
                onPressFilter={() => setFilterSheetVisible(true)}
                isFilterActive={filterMode !== 'all'}
                onResetFilter={() => setFilterMode('all')}
              />

              {loading ? (
                <View
                  style={[
                    styles.loadingCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <RowListSkeleton count={4} label="Memuat rekap presensi" />
                </View>
              ) : error ? (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    Gagal memuat rekap
                  </Text>
                  <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{error}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={retry}
                    style={({ pressed }) => [
                      styles.retryBtn,
                      { backgroundColor: colors.balticSoft },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.retryText, { color: colors.baltic }]}>Coba lagi</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {filterMode === 'all' || filterMode === 'hadir' ? (
                    <AccordionGroup
                      title="Terdaftar scan QR"
                      badgeText={`${filteredPresent.length}`}
                      badgeTone="pacific"
                      expanded={presentExpanded || filterMode === 'hadir'}
                      onToggle={() => setPresentExpanded((v) => !v)}
                    >
                      {filteredPresent.length === 0 ? (
                        <Text style={[styles.innerEmpty, { color: colors.textSecondary }]}>
                          Belum ada praktikan yang tercatat hadir.
                        </Text>
                      ) : (
                        filteredPresent.map((record) => (
                          <View
                            key={record.id}
                            style={[styles.recapRow, { backgroundColor: colors.background }]}
                          >
                            <View style={styles.recapLeft}>
                              <Text
                                style={[styles.studentName, { color: colors.textPrimary }]}
                                numberOfLines={1}
                              >
                                {record.studentName}
                              </Text>
                              <Text style={[styles.studentNim, { color: colors.textSubtle }]}>
                                {record.studentIdentifier}
                              </Text>
                            </View>
                            <Text style={[styles.timeText, { color: colors.pacificDark }]}>
                              {record.hasPendingWrites ? 'Sinkron' : record.attendedAt}
                            </Text>
                          </View>
                        ))
                      )}
                    </AccordionGroup>
                  ) : null}

                  {filterMode === 'all' || filterMode === 'izin' ? (
                    <AccordionGroup
                      title="Izin"
                      badgeText={`${filteredLeave.length} orang`}
                      badgeTone="muted"
                      expanded={leaveExpanded || filterMode === 'izin'}
                      onToggle={() => setLeaveExpanded((v) => !v)}
                    >
                      {filteredLeave.length === 0 ? (
                        <Text style={[styles.innerEmpty, { color: colors.textSecondary }]}>
                          Tidak ada praktikan yang mengajukan izin pada sesi ini.
                        </Text>
                      ) : (
                        filteredLeave.map((member) => {
                          const approved = member.leaveStatus === 'approved';
                          return (
                            <View
                              key={member.id}
                              style={[styles.recapRow, { backgroundColor: colors.background }]}
                            >
                              <View style={styles.recapLeft}>
                                <Text
                                  style={[styles.studentName, { color: colors.textPrimary }]}
                                  numberOfLines={1}
                                >
                                  {member.displayName}
                                </Text>
                                <Text style={[styles.studentNim, { color: colors.textSubtle }]}>
                                  {member.identifier}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.leaveBadge,
                                  {
                                    backgroundColor: approved
                                      ? colors.pacificSoft
                                      : member.leaveStatus === 'rejected'
                                        ? colors.rosySoft
                                        : colors.balticSoft,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.leaveBadgeText,
                                    {
                                      color: approved
                                        ? colors.pacificDark
                                        : member.leaveStatus === 'rejected'
                                          ? colors.rosyDark
                                          : colors.baltic,
                                    },
                                  ]}
                                >
                                  {leaveStatusLabel(member.leaveStatus)}
                                </Text>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </AccordionGroup>
                  ) : null}

                  {filterMode === 'all' || filterMode === 'belum' ? (
                    <AccordionGroup
                      title="Belum Presensi"
                      badgeText={`${filteredNotAttended.length} orang`}
                      badgeTone="rosy"
                      expanded={absentExpanded || filterMode === 'belum'}
                      onToggle={() => setAbsentExpanded((v) => !v)}
                    >
                      {filteredNotAttended.length === 0 ? (
                        <Text style={[styles.innerEmpty, { color: colors.textSecondary }]}>
                          Semua anggota terdaftar sudah melakukan presensi atau izin.
                        </Text>
                      ) : (
                        filteredNotAttended.map((member) => (
                          <View
                            key={member.userId}
                            style={[styles.recapRow, { backgroundColor: colors.background }]}
                          >
                            <View style={styles.recapLeft}>
                              <Text
                                style={[styles.studentName, { color: colors.textPrimary }]}
                                numberOfLines={1}
                              >
                                {member.displayName}
                              </Text>
                              <Text style={[styles.studentNim, { color: colors.textSubtle }]}>
                                {member.identifier}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.leaveBadge,
                                { backgroundColor: colors.rosySoft },
                              ]}
                            >
                              <Text style={[styles.leaveBadgeText, { color: colors.rosyDark }]}>
                                Belum Presensi
                              </Text>
                            </View>
                          </View>
                        ))
                      )}
                    </AccordionGroup>
                  ) : null}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <PickerBottomSheet
        visible={sessionSheetVisible}
        onClose={() => setSessionSheetVisible(false)}
        title="Pilih Kelas & Sesi"
        subtitle="Ketuk salah satu untuk mengganti tampilan rekap"
        options={sessionOptions}
        selectedValue={activeSession?.id ?? ''}
        onSelect={setSelectedSessionId}
      />

      <PickerBottomSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        title="Filter Kehadiran"
        searchable={false}
        options={FILTER_OPTIONS}
        selectedValue={filterMode}
        onSelect={(val) => setFilterMode(val as RecapFilterMode)}
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
  topControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  classDropdown: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  classDropdownText: {
    flex: 1,
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#FCFCFA',
  },
  csvBtn: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  csvBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
  },
  loadingCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
  },
  recapRow: {
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  manualWrap: {
    gap: 7,
  },
  manualButton: {
    alignSelf: 'flex-end',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  manualButtonText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11.5,
  },
  manualPanel: {
    borderRadius: 14,
    padding: 11,
    gap: 8,
  },
  manualNote: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11.5,
  },
  manualInput: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    textAlignVertical: 'top',
  },
  manualConfirm: {
    minHeight: 40,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualConfirmText: {
    color: '#FCFCFA',
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
  },
  disabled: {
    opacity: 0.52,
  },
  recapLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  studentName: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    flexShrink: 1,
  },
  studentNim: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  timeText: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  leaveBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  leaveBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
  },
  innerEmpty: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
    paddingVertical: 4,
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
  retryBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  retryText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
  },
  pressed: {
    opacity: 0.78,
  },
});
