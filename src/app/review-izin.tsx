import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { AccordionGroup } from '@/components/ui/accordion-group';
import { AppHeader, getFirstName } from '@/components/ui/app-header';
import { PickerBottomSheet, type PickerOption } from '@/components/ui/picker-bottom-sheet';
import { SearchFilterBar } from '@/components/ui/search-filter-bar';
import { CardListSkeleton } from '@/components/ui/skeleton';
import { Colors, FontFamily, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import {
  aiStatusLabel,
  formatAttachmentSize,
  getLeaveAttachment,
  useAssistantLeaveRequests,
  useLeave,
} from '@/features/leave';
import {
  formatSessionTime,
  type StudentCandidate,
  usePracticum,
} from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { confirmAction, showAlert } from '@/lib/cross-platform-alert';
import type { LeaveRequest } from '@/types';

type ReviewFilterMode = 'pending' | 'all' | 'done';

const FILTER_OPTIONS: PickerOption[] = [
  { value: 'pending', label: 'Pending', subtitle: 'Pengajuan izin yang menunggu konfirmasi' },
  { value: 'all', label: 'Semua', subtitle: 'Tampilkan pending dan yang sudah diproses' },
  { value: 'done', label: 'Selesai', subtitle: 'Riwayat izin yang sudah disetujui / ditolak' },
];

function capitalizeLabel(value?: string): string {
  if (!value) return 'Lainnya';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function LeaveReviewScreen() {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { classes, sessions, loadingClasses, getRegisteredStudents } = usePracticum();
  const classIds = useMemo(() => classes.map((item) => item.id), [classes]);
  const sessionById = useMemo(() => new Map(sessions.map((item) => [item.id, item])), [sessions]);
  const classById = useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes]);

  const { requests, loading, error, retry } = useAssistantLeaveRequests(
    classIds,
    undefined,
    !loadingClasses,
  );
  const { reviewLeave } = useLeave();

  const [students, setStudents] = useState<StudentCandidate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<ReviewFilterMode>('pending');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [focusedRequestId, setFocusedRequestId] = useState<string | null>(null);
  const [doneExpanded, setDoneExpanded] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'assistant') return;
    let cancelled = false;
    getRegisteredStudents()
      .then((list) => {
        if (!cancelled) setStudents(list);
      })
      .catch(() => {
        if (!cancelled) setStudents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [getRegisteredStudents, user?.role]);

  const studentById = useMemo(
    () => new Map(students.map((s) => [s.userId, s])),
    [students],
  );

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === 'pending'),
    [requests],
  );
  const processedRequests = useMemo(
    () => requests.filter((r) => r.status !== 'pending'),
    [requests],
  );

  const matchesSearch = (req: LeaveRequest) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const student = studentById.get(req.studentId);
    const session = sessionById.get(req.sessionId);
    return (
      (student?.displayName.toLowerCase().includes(q) ?? false) ||
      (student?.identifier.toLowerCase().includes(q) ?? false) ||
      (session?.courseName?.toLowerCase().includes(q) ?? false) ||
      req.reason.toLowerCase().includes(q)
    );
  };

  const filteredPending = useMemo(
    () => (filterMode === 'done' ? [] : pendingRequests.filter(matchesSearch)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterMode, pendingRequests, searchQuery, studentById, sessionById],
  );

  const filteredProcessed = useMemo(
    () => (filterMode === 'pending' ? [] : processedRequests.filter(matchesSearch)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterMode, processedRequests, searchQuery, studentById, sessionById],
  );

  const spotlightRequest = useMemo(() => {
    const pool = filteredPending.length > 0 ? filteredPending : filteredProcessed;
    return pool.find((r) => r.id === focusedRequestId) ?? pool[0] ?? null;
  }, [filteredPending, filteredProcessed, focusedRequestId]);

  const remainingPending = filteredPending.filter((r) => r.id !== spotlightRequest?.id);

  const decide = (request: LeaveRequest, decision: 'approved' | 'rejected') => {
    const verb = decision === 'approved' ? 'menyetujui' : 'menolak';
    confirmAction({
      title: 'Konfirmasi Keputusan',
      message: `Anda akan ${verb} pengajuan izin ini.`,
      confirmText: decision === 'approved' ? 'Setujui' : 'Tolak',
      destructive: decision === 'rejected',
      onConfirm: () => {
        void (async () => {
          setSubmittingId(request.id);
          try {
            const session = sessionById.get(request.sessionId);
            await reviewLeave(request.id, decision, undefined, {
              studentId: request.studentId,
              sessionId: request.sessionId,
              classId: request.classId,
              sessionTitle: session?.courseName ?? session?.title,
            });
          } catch (decisionError) {
            showAlert(
              'Keputusan gagal disimpan',
              decisionError instanceof Error ? decisionError.message : 'Silakan coba lagi.',
            );
          } finally {
            setSubmittingId(null);
          }
        })();
      },
    });
  };

  const primaryLab = classes[0]?.lab ?? 'Asisten Lab';
  const filterLabel =
    FILTER_OPTIONS.find((opt) => opt.value === filterMode)?.label ?? 'Pending';

  const renderSpotlightCard = (request: LeaveRequest) => {
    const session = sessionById.get(request.sessionId);
    const cls = classById.get(request.classId);
    const student = studentById.get(request.studentId);
    const attachment = getLeaveAttachment({
      sessionId: request.sessionId,
      userId: request.studentId,
      leaveId: request.id,
    });
    const busy = submittingId === request.id;

    const studentHeading = student
      ? `${student.displayName} · ${student.identifier}`
      : session?.title ?? request.studentId;
    const courseSub = [
      session?.courseName ?? cls?.courseName ?? request.classId,
      session ? formatSessionTime(session.startsAt) : undefined,
    ]
      .filter(Boolean)
      .join(' · ');

    const aiCategory =
      request.aiStatus === 'success'
        ? capitalizeLabel(request.aiCategory)
        : aiStatusLabel(request.aiStatus);
    const aiConfidence =
      request.aiStatus === 'success' && typeof request.aiConfidence === 'number'
        ? `${Math.round(request.aiConfidence * 100)}%`
        : null;

    return (
      <View
        style={[
          styles.spotlightCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.spotlightHeader}>
          <View style={styles.spotlightTitleGroup}>
            <Text style={[styles.spotlightTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {studentHeading}
            </Text>
            <Text style={[styles.spotlightMeta, { color: colors.textSecondary }]} numberOfLines={1}>
              {courseSub}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  request.status === 'approved'
                    ? colors.pacificSoft
                    : colors.rosySoft,
              },
            ]}
          >
            {request.status === 'pending' ? (
              <View style={[styles.statusDot, { backgroundColor: colors.rosy }]} />
            ) : null}
            <Text
              style={[
                styles.statusBadgeText,
                {
                  color:
                    request.status === 'approved'
                      ? colors.pacificDark
                      : colors.rosyDark,
                },
              ]}
            >
              {request.status === 'pending'
                ? 'Menunggu Konfirmasi'
                : request.status === 'approved'
                  ? 'Disetujui'
                  : 'Ditolak'}
            </Text>
          </View>
        </View>

        <View style={[styles.aiBanner, { backgroundColor: colors.pacificSoft }]}>
          <Text style={[styles.aiBannerLeft, { color: colors.pacificDark }]}>
            Klasifikasi: {aiCategory}
          </Text>
          {aiConfidence ? (
            <Text style={[styles.aiBannerPct, { color: colors.pacificDark }]}>
              {aiConfidence}
            </Text>
          ) : null}
        </View>

        <View style={[styles.reasonBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.reasonText, { color: colors.textPrimary }]}>
            &ldquo;{request.reason}&rdquo;
          </Text>
          {attachment ? (
            <View style={[styles.attachChip, { backgroundColor: colors.balticSoft }]}>
              <Text style={[styles.attachChipText, { color: colors.baltic }]} numberOfLines={1}>
                {attachment.name} · {formatAttachmentSize(attachment.sizeBytes)}
              </Text>
            </View>
          ) : null}
        </View>

        {request.status === 'pending' ? (
          <View style={styles.decisionRow}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => decide(request, 'rejected')}
              style={({ pressed }) => [
                styles.rejectBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.rejectText, { color: colors.textPrimary }]}>Tolak</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => decide(request, 'approved')}
              style={({ pressed }) => [
                styles.approveBtn,
                { backgroundColor: colors.rosy },
                pressed && styles.pressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FCFCFA" />
              ) : (
                <Text style={styles.approveText}>Setujui</Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AppHeader
          eyebrow={`Review Izin · ${primaryLab}`}
          title={`Hai, ${getFirstName(user?.displayName)}`}
          monoBadge={user?.identifier ?? 'AST-LAB'}
          statusBadge={`${pendingRequests.length} Menunggu`}
        />

        <View style={styles.bodyContainer}>
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Cari nama atau NIM..."
            filterLabel={filterLabel}
            onPressFilter={() => setFilterSheetVisible(true)}
          />

          {loading || loadingClasses ? (
            <CardListSkeleton count={3} showActions label="Memuat pengajuan izin" />
          ) : error ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Izin belum dapat dimuat
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
          ) : !spotlightRequest ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Tidak ada pengajuan izin
              </Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                Pengajuan izin dari praktikan di kelas Anda akan muncul secara real-time di sini.
              </Text>
            </View>
          ) : (
            <>
              {renderSpotlightCard(spotlightRequest)}

              {remainingPending.map((item) => {
                const student = studentById.get(item.studentId);
                const name = student?.displayName ?? item.studentId;
                const cat =
                  item.aiStatus === 'success'
                    ? `${capitalizeLabel(item.aiCategory)}${typeof item.aiConfidence === 'number' ? ` · ${Math.round(item.aiConfidence * 100)}%` : ''}`
                    : 'Menunggu';

                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => setFocusedRequestId(item.id)}
                    style={({ pressed }) => [
                      styles.queueRow,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.queueLeft}>
                      <Text style={[styles.queueTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {name} · {cat}
                      </Text>
                      <View style={[styles.pendingPill, { backgroundColor: colors.rosySoft }]}>
                        <Text style={[styles.pendingPillText, { color: colors.rosyDark }]}>
                          Pending
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={17} color={colors.textSubtle} strokeWidth={2.2} />
                  </Pressable>
                );
              })}

              {(filterMode !== 'pending' || processedRequests.length > 0) ? (
                <AccordionGroup
                  title="Sudah Diproses"
                  badgeText={`${processedRequests.length} selesai`}
                  badgeTone="pacific"
                  expanded={doneExpanded || filterMode === 'done'}
                  onToggle={() => setDoneExpanded((v) => !v)}
                >
                  {processedRequests.length === 0 ? (
                    <Text style={[styles.emptyDone, { color: colors.textSecondary }]}>
                      Belum ada pengajuan izin yang diproses.
                    </Text>
                  ) : (
                    processedRequests.map((item) => {
                      const student = studentById.get(item.studentId);
                      const approved = item.status === 'approved';
                      return (
                        <View
                          key={item.id}
                          style={[styles.doneRow, { backgroundColor: colors.background }]}
                        >
                          <View style={styles.doneLeft}>
                            <Text style={[styles.doneName, { color: colors.textPrimary }]} numberOfLines={1}>
                              {student?.displayName ?? item.studentId}
                            </Text>
                            <Text style={[styles.doneSub, { color: colors.textSecondary }]} numberOfLines={1}>
                              {sessionById.get(item.sessionId)?.courseName ?? item.sessionId}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.donePill,
                              { backgroundColor: approved ? colors.pacificSoft : colors.rosySoft },
                            ]}
                          >
                            <Text
                              style={[
                                styles.donePillText,
                                { color: approved ? colors.pacificDark : colors.rosyDark },
                              ]}
                            >
                              {approved ? 'Disetujui' : 'Ditolak'}
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
        </View>
      </ScrollView>

      <PickerBottomSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        title="Filter Status Izin"
        searchable={false}
        options={FILTER_OPTIONS}
        selectedValue={filterMode}
        onSelect={(val) => setFilterMode(val as ReviewFilterMode)}
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
  spotlightCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  spotlightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  spotlightTitleGroup: {
    flex: 1,
    gap: 2,
  },
  spotlightTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15.5,
    fontVariant: ['tabular-nums'],
  },
  spotlightMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '44%',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10.5,
  },
  aiBanner: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  aiBannerLeft: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
  },
  aiBannerPct: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 12.5,
    fontVariant: ['tabular-nums'],
  },
  reasonBox: {
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  reasonText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    lineHeight: 19,
  },
  attachChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  attachChipText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11.5,
  },
  decisionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
  },
  approveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
    color: '#FCFCFA',
  },
  queueRow: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  queueLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queueTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14,
    flexShrink: 1,
  },
  pendingPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pendingPillText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
  },
  doneRow: {
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  doneLeft: {
    flex: 1,
    gap: 2,
  },
  doneName: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
  },
  doneSub: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11.5,
  },
  donePill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  donePillText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
  },
  emptyDone: {
    fontFamily: FontFamily.sansRegular,
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
