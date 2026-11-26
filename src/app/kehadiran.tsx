import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AccordionGroup } from '@/components/ui/accordion-group';
import { AppHeader, getFirstName } from '@/components/ui/app-header';
import { PickerBottomSheet, type PickerOption } from '@/components/ui/picker-bottom-sheet';
import { SearchFilterBar } from '@/components/ui/search-filter-bar';
import { CardListSkeleton } from '@/components/ui/skeleton';
import { Colors, FontFamily, MaxContentWidth } from '@/constants/theme';
import { sortAttendanceEntries, useAttendance } from '@/features/attendance';
import { useAuth } from '@/features/auth';
import { useLeave } from '@/features/leave';
import { formatLeaveSentiment } from '@/features/leave/sentiment';
import { formatSessionTime, usePracticum } from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { LeaveSentimentAnalysis } from '@/types';

type FilterMode = 'all' | 'hadir' | 'izin';

type UnifiedHistoryItem = {
  id: string;
  courseName: string;
  title: string;
  subtitle: string;
  kind: 'hadir' | 'izin';
  statusLabel: string;
  statusTone: 'hadir' | 'pending' | 'approved' | 'rejected';
  hasUnreadDot?: boolean;
  sortOrder: number;
  sentimentAnalysis?: LeaveSentimentAnalysis;
  reviewNote?: string;
};

const FILTER_OPTIONS: PickerOption[] = [
  { value: 'hadir', label: 'Hadir', subtitle: 'Hanya presensi yang tercatat hadir' },
  { value: 'izin', label: 'Izin', subtitle: 'Hanya status pengajuan izin (Pending / Disetujui / Ditolak)' },
];

function formatLeaveDate(value: number | null, fallbackTime?: string): string {
  if (value === null) {
    return fallbackTime ? `${fallbackTime} · Menunggu sinkron` : 'Menunggu waktu server';
  }
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function AttendanceHistoryScreen() {
  const router = useRouter();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { records, loading: loadingAttendance, error: attendanceError, retry: retryAttendance } =
    useAttendance();
  const { requests: leaveRequests, loading: loadingLeave } = useLeave();
  const { sessions, classes } = usePracticum();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [collapsedCourses, setCollapsedCourses] = useState<Record<string, boolean>>({});

  const sessionById = useMemo(
    () => new Map(sessions.map((item) => [item.id, item])),
    [sessions],
  );
  const classById = useMemo(
    () => new Map(classes.map((item) => [item.id, item])),
    [classes],
  );

  const groupedCourses = useMemo(() => {
    const items: UnifiedHistoryItem[] = [];

    sortAttendanceEntries(records, false).forEach((entry) => {
      const session = sessionById.get(entry.sessionId);
      const cls = classById.get(entry.classId);
      const courseName =
        session?.courseName ?? cls?.courseName ?? session?.className ?? 'Praktikum Lab';
      const title = session
        ? `${session.title} · ${session.location}`
        : `Sesi ${entry.sessionId}`;
      items.push({
        id: `att-${entry.id}`,
        courseName,
        title,
        subtitle: entry.hasPendingWrites ? 'Menunggu sinkronisasi server' : entry.attendedAt,
        kind: 'hadir',
        statusLabel: 'Hadir',
        statusTone: 'hadir',
        sortOrder: entry.attendedAtMs ?? 0,
      });
    });

    leaveRequests.forEach((req) => {
      const session = sessionById.get(req.sessionId);
      const cls = classById.get(req.classId);
      const courseName =
        session?.courseName ?? cls?.courseName ?? session?.className ?? 'Praktikum Lab';
      const title = `${session?.title ?? 'Sesi Praktikum'} · Pengajuan Izin`;
      const statusLabel =
        req.status === 'approved'
          ? 'Disetujui'
          : req.status === 'rejected'
            ? 'Ditolak'
            : 'Pending';
      const statusTone =
        req.status === 'approved'
          ? 'approved'
          : req.status === 'rejected'
            ? 'rejected'
            : 'pending';
      items.push({
        id: `leave-${req.id}`,
        courseName,
        title,
        subtitle: formatLeaveDate(
          req.createdAtMs,
          session ? formatSessionTime(session.startsAt) : undefined,
        ),
        kind: 'izin',
        statusLabel,
        statusTone,
        hasUnreadDot: req.status === 'pending',
        sortOrder: req.createdAtMs ?? 0,
        sentimentAnalysis: req.sentimentAnalysis,
        reviewNote: req.reviewNote,
      });
    });

    const trimmedQuery = searchQuery.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (filterMode === 'hadir' && item.kind !== 'hadir') return false;
      if (filterMode === 'izin' && item.kind !== 'izin') return false;
      if (!trimmedQuery) return true;
      return (
        item.courseName.toLowerCase().includes(trimmedQuery) ||
        item.title.toLowerCase().includes(trimmedQuery) ||
        item.statusLabel.toLowerCase().includes(trimmedQuery)
      );
    });

    filtered.sort((a, b) => b.sortOrder - a.sortOrder);

    const groups = new Map<string, UnifiedHistoryItem[]>();
    filtered.forEach((item) => {
      const existing = groups.get(item.courseName) ?? [];
      existing.push(item);
      groups.set(item.courseName, existing);
    });

    return Array.from(groups.entries()).map(([courseName, entries]) => ({
      courseName,
      entries,
    }));
  }, [classById, filterMode, leaveRequests, records, searchQuery, sessionById]);

  if (user?.role !== 'student') {
    return (
      <View style={[styles.guard, { backgroundColor: colors.background }]}>
        <Text style={[styles.guardTitle, { color: colors.textPrimary }]}>
          Halaman tidak tersedia
        </Text>
        <Text style={[styles.guardBody, { color: colors.textSecondary }]}>
          Riwayat presensi & izin hanya tersedia untuk Praktikan.
        </Text>
      </View>
    );
  }

  const filterLabel =
    FILTER_OPTIONS.find((opt) => opt.value === filterMode)?.label ?? 'Semua';

  const loading = loadingAttendance || loadingLeave;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          eyebrow="Riwayat Presensi & Izin"
          title={`Hai, ${getFirstName(user.displayName)}`}
          monoBadge={`NIM ${user.identifier}`}
          statusBadge="Semester Genap"
        />

        <View style={styles.bodyContainer}>
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Cari matkul atau modul..."
            filterLabel={filterLabel}
            onPressFilter={() => setFilterSheetVisible(true)}
            isFilterActive={filterMode !== 'all'}
            onResetFilter={() => setFilterMode('all')}
          />

          {loading && groupedCourses.length === 0 ? (
            <CardListSkeleton count={3} label="Memuat riwayat presensi dan izin" />
          ) : attendanceError ? (
            <View
              accessibilityRole="alert"
              style={[
                styles.emptyCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Gagal memuat riwayat
              </Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                {attendanceError}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={retryAttendance}
                style={({ pressed }) => [
                  styles.retryBtn,
                  { backgroundColor: colors.balticSoft },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.retryText, { color: colors.baltic }]}>Coba lagi</Text>
              </Pressable>
            </View>
          ) : groupedCourses.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Belum ada riwayat sesi
              </Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                {searchQuery.trim()
                  ? 'Tidak ada mata kuliah atau modul yang cocok dengan pencarian Anda.'
                  : 'Catatan hadir dan pengajuan izin Anda akan muncul di sini.'}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/schedule')}
                style={({ pressed }) => [
                  styles.retryBtn,
                  { backgroundColor: colors.pacificSoft },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.retryText, { color: colors.pacificDark }]}>
                  Lihat Beranda
                </Text>
              </Pressable>
            </View>
          ) : (
            groupedCourses.map((group, index) => {
              const isExpanded =
                collapsedCourses[group.courseName] !== undefined
                  ? !collapsedCourses[group.courseName]
                  : index === 0;

              const hadirCount = group.entries.filter((e) => e.kind === 'hadir').length;
              const badgeText =
                isExpanded
                  ? `${group.entries.length} entri`
                  : hadirCount === group.entries.length
                    ? `${hadirCount} Hadir`
                    : `${group.entries.length} entri`;

              return (
                <AccordionGroup
                  key={group.courseName}
                  title={group.courseName}
                  badgeText={badgeText}
                  badgeTone="pacific"
                  expanded={isExpanded}
                  onToggle={() =>
                    setCollapsedCourses((prev) => ({
                      ...prev,
                      [group.courseName]: isExpanded,
                    }))
                  }
                >
                  {group.entries.map((entry) => {
                    const isRosy =
                      entry.statusTone === 'pending' || entry.statusTone === 'rejected';

                    return (
                      <View
                        key={entry.id}
                        style={[styles.entryRow, { backgroundColor: colors.background }]}
                      >
                        <View style={styles.entryMainRow}>
                          <View style={styles.entryInfo}>
                            <Text
                              style={[styles.entryTitle, { color: colors.textPrimary }]}
                              numberOfLines={1}
                            >
                              {entry.title}
                            </Text>
                            <Text
                              style={[styles.entryMeta, { color: colors.textSubtle }]}
                              numberOfLines={1}
                            >
                              {entry.subtitle}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: isRosy ? colors.rosySoft : colors.pacificSoft,
                              },
                            ]}
                          >
                            {entry.hasUnreadDot ? (
                              <View style={[styles.dot, { backgroundColor: colors.rosy }]} />
                            ) : null}
                            <Text
                              style={[
                                styles.statusText,
                                { color: isRosy ? colors.rosyDark : colors.pacificDark },
                              ]}
                            >
                              {entry.statusLabel}
                            </Text>
                          </View>
                        </View>

                        {entry.kind === 'izin' ? (
                          <View style={styles.izinMetaGroup}>
                            <View style={[styles.aiPillRow, { backgroundColor: colors.pacificSoft }]}>
                              <Text style={[styles.aiPillText, { color: colors.pacificDark }]}>
                                Sentimen AI: {formatLeaveSentiment(entry.sentimentAnalysis)}
                              </Text>
                            </View>

                            {entry.reviewNote ? (
                              <View
                                style={[
                                  styles.reviewNoteBox,
                                  {
                                    backgroundColor: colors.surface,
                                    borderColor: colors.border,
                                  },
                                ]}
                              >
                                <Text
                                  style={[styles.reviewNoteText, { color: colors.textSecondary }]}
                                >
                                  Catatan Asisten: {entry.reviewNote}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </AccordionGroup>
              );
            })
          )}
        </View>
      </ScrollView>

      <PickerBottomSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        title="Filter Riwayat"
        subtitle="Pilih jenis catatan yang ingin ditampilkan"
        searchable={false}
        options={FILTER_OPTIONS}
        selectedValue={filterMode}
        onSelect={(val) => setFilterMode(val as FilterMode)}
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
  entryRow: {
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
    gap: 8,
  },
  entryMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  izinMetaGroup: {
    gap: 6,
  },
  aiPillRow: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  aiPillText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11.5,
  },
  reviewNoteBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  reviewNoteText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  entryInfo: {
    flex: 1,
    gap: 2,
  },
  entryTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
  },
  entryMeta: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11.5,
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
    lineHeight: 19,
    textAlign: 'center',
  },
  retryBtn: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
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
