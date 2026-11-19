import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
  usePracticum,
} from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';

type RecapFilterMode = 'all' | 'hadir' | 'belum';

const FILTER_OPTIONS: PickerOption[] = [
  { value: 'hadir', label: 'Hadir', subtitle: 'Fokus daftar hadir tercatat saat ini' },
  { value: 'all', label: 'Semua', subtitle: 'Tampilkan daftar hadir dan belum scan / izin' },
  { value: 'belum', label: 'Belum Scan', subtitle: 'Tampilkan mahasiswa yang belum tercatat hadir' },
];

function formatSessionCourseLabel(session: PracticumSession): string {
  const parts = [session.courseName ?? session.className, session.title].filter(Boolean);
  return parts.join(' · ');
}

export default function RecapScreen() {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { classes, sessions, loadingSessions, getClassMembers } = usePracticum();

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
  const [absentExpanded, setAbsentExpanded] = useState(false);
  const [memberSnapshot, setMemberSnapshot] = useState<{
    classId: string;
    members: ClassMember[];
  } | null>(null);

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

  const missingMembers = useMemo(() => {
    return classMembers
      .filter(
        (m) =>
          !attendedIds.has(m.userId) &&
          !attendedIdentifiers.has(m.identifier.trim().toLowerCase()),
      )
      .map((member) => {
        const leave = sessionLeaves.find((l) => l.studentId === member.userId);
        return {
          ...member,
          leaveStatus: leave?.status ?? null,
        };
      });
  }, [attendedIdentifiers, attendedIds, classMembers, sessionLeaves]);

  const filteredPresent = useMemo(() => {
    if (filterMode === 'belum') return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.studentIdentifier.toLowerCase().includes(q),
    );
  }, [filterMode, records, searchQuery]);

  const filteredMissing = useMemo(() => {
    if (filterMode === 'hadir') return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return missingMembers;
    return missingMembers.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.identifier.toLowerCase().includes(q),
    );
  }, [filterMode, missingMembers, searchQuery]);

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
    const absentRows = missingMembers.map(
      (m) =>
        `"${m.displayName.replace(/"/g, '""')}","${m.identifier}","${m.leaveStatus ? `Izin (${m.leaveStatus})` : 'Belum Scan'}","-"`,
    );
    const csv = [header, ...presentRows, ...absentRows].join('\n');

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
      Alert.alert('Ekspor CSV', 'Tidak dapat membagikan berkas CSV saat ini.');
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
                  {filterMode !== 'belum' ? (
                    <AccordionGroup
                      title="Terdaftar scan QR"
                      badgeText={`${filteredPresent.length}`}
                      badgeTone="pacific"
                      expanded={presentExpanded}
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

                  {filterMode !== 'hadir' ? (
                    <AccordionGroup
                      title="Belum Scan / Izin"
                      badgeText={`${filteredMissing.length} orang`}
                      badgeTone="rosy"
                      expanded={absentExpanded || filterMode === 'belum'}
                      onToggle={() => setAbsentExpanded((v) => !v)}
                    >
                      {filteredMissing.length === 0 ? (
                        <Text style={[styles.innerEmpty, { color: colors.textSecondary }]}>
                          Semua anggota terdaftar sudah hadir.
                        </Text>
                      ) : (
                        filteredMissing.map((member) => {
                          const leaveBadge =
                            member.leaveStatus === 'approved'
                              ? 'Izin Disetujui'
                              : member.leaveStatus === 'pending'
                                ? 'Izin Pending'
                                : member.leaveStatus === 'rejected'
                                  ? 'Izin Ditolak'
                                  : 'Belum Scan';
                          return (
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
                                  {
                                    backgroundColor:
                                      member.leaveStatus === 'approved'
                                        ? colors.pacificSoft
                                        : colors.rosySoft,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.leaveBadgeText,
                                    {
                                      color:
                                        member.leaveStatus === 'approved'
                                          ? colors.pacificDark
                                          : colors.rosyDark,
                                    },
                                  ]}
                                >
                                  {leaveBadge}
                                </Text>
                              </View>
                            </View>
                          );
                        })
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
