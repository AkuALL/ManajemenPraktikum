import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppHeader } from '@/components/ui/app-header';
import { FlyAwayBottomSheet } from '@/components/ui/fly-away-bottom-sheet';
import { PickerBottomSheet, type PickerOption } from '@/components/ui/picker-bottom-sheet';
import { SearchFilterBar } from '@/components/ui/search-filter-bar';
import { Colors, FontFamily, MaxContentWidth } from '@/constants/theme';
import { useLabs } from '@/features/labs/firestore-labs';
import { LabNativeMap } from '@/features/maps/lab-native-map';
import {
  type LabActivitySession,
  useLabDetailSessions,
  useOpenLabSessions,
} from '@/features/maps/use-lab-sessions';
import { formatSessionDate, formatSessionTime, usePracticum } from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { showAlert } from '@/lib/cross-platform-alert';

type LabRoomItem = {
  id: string;
  name: string;
  building: string;
  floor: string;
  capacity: number;
  isActiveNow: boolean;
  activeSessionTitle?: string;
  activeCourse?: string;
  activeTime?: string;
  assistantName?: string;
  nextSessionTitle?: string;
  nextSessionTime?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

function getRoomDirections(room: Pick<LabRoomItem, 'id' | 'name'>): string {
  const name = room.name.trim().toLowerCase().replace(/\s+/g, ' ');
  if (room.id === 'dekanat-fsm' || name === 'dekanat fsm undip' || name === 'lab dekanat fsm undip') {
    return 'Dari Gedung dekanat FSM naik ke lantai 5';
  }
  if (room.id === 'lab-informatika-b' || room.id === 'lab-informatika-c' || /^(?:lab|laboratorium)(?: informatika)? [bc]$/.test(name)) {
    return 'Dari Gedung E lantai 1 naik ke lantai 2 lalu belok ke kanan';
  }
  if (room.id === 'lab-informatika-d' || /^(?:lab|laboratorium)(?: informatika)? d$/.test(name)) {
    return 'Dari Gedung E lantai 1 naik ke lantai 2 lalu belok ke kiri';
  }
  return 'Petunjuk arah ruangan belum tersedia. Silakan hubungi asisten.';
}

export default function MapsLabScreen() {
  const { labId, location } = useLocalSearchParams<{ labId?: string; location?: string }>();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { sessions: userSessions } = usePracticum({ classes: false, sessions: true });
  const { openSessions } = useOpenLabSessions();
  const { labs: storedLabs, loading: labsLoading } = useLabs();

  const [searchQuery, setSearchQuery] = useState('');
  const [floorFilter, setFloorFilter] = useState<string>('Semua');
  const [floorSheetVisible, setFloorSheetVisible] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [detailSheetRoom, setDetailSheetRoom] = useState<LabRoomItem | null>(null);

  const userSessionById = useMemo(
    () => new Map(userSessions.map((item) => [item.id, item])),
    [userSessions],
  );

  const {
    activeSessions: detailActiveRaw,
    upcomingSessions: detailUpcomingRaw,
    loading: detailLoading,
  } = useLabDetailSessions(detailSheetRoom?.id ?? null);

  const enrichSession = useMemo(
    () =>
      (item: LabActivitySession): LabActivitySession => {
        const own = userSessionById.get(item.id);
        return own
          ? {
              ...item,
              courseName: own.courseName,
              className: own.className,
              assistantName: own.assistantName,
            }
          : item;
      },
    [userSessionById],
  );

  const detailActiveSessions = useMemo(
    () => detailActiveRaw.map(enrichSession),
    [detailActiveRaw, enrichSession],
  );
  const detailUpcomingSessions = useMemo(
    () => detailUpcomingRaw.map(enrichSession),
    [detailUpcomingRaw, enrichSession],
  );

  const rooms = useMemo<LabRoomItem[]>(() => {
    const map = new Map<string, Omit<LabRoomItem, 'isActiveNow'>>();
    storedLabs
      .filter((lab) => lab.isActive)
      .forEach((lab) =>
        map.set(lab.id, {
          id: lab.id,
          name: lab.name,
          building: lab.building,
          floor: lab.floor ? `Lt. ${lab.floor}` : 'Area gedung',
          capacity: lab.capacity,
          latitude: lab.latitude,
          longitude: lab.longitude,
          radiusMeters: lab.radiusMeters,
        }),
      );

    return Array.from(map.values()).map((room) => {
      const matchesRoom = (s: { labId?: string; location: string }) =>
        (s.labId && s.labId === room.id) ||
        s.location.trim().toLowerCase() === room.name.toLowerCase();

      const activeFromOpen = openSessions.find(matchesRoom);
      const activeFromOwn = userSessions.find((s) => matchesRoom(s) && s.status === 'open');
      const activeSession = activeFromOpen
        ? enrichSession(activeFromOpen)
        : activeFromOwn;
      const nextSession = userSessions.find(
        (s) => matchesRoom(s) && s.status === 'scheduled',
      );

      return {
        ...room,
        isActiveNow: Boolean(activeSession),
        activeCourse: activeSession?.courseName ?? activeSession?.className ?? activeSession?.title,
        activeSessionTitle: activeSession?.title,
        activeTime: activeSession
          ? `${formatSessionTime(activeSession.startsAt)}–${formatSessionTime(activeSession.endsAt)}`
          : undefined,
        assistantName: activeSession?.assistantName ?? 'Asisten Jaga',
        nextSessionTitle: nextSession?.courseName ?? nextSession?.className ?? nextSession?.title,
        nextSessionTime: nextSession
          ? `${formatSessionTime(nextSession.startsAt)}–${formatSessionTime(nextSession.endsAt)}`
          : undefined,
      };
    });
  }, [enrichSession, openSessions, storedLabs, userSessions]);

  const floorOptions = useMemo<PickerOption[]>(() => {
    const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort();
    return floors.map((f) => ({ value: f, label: f, subtitle: `Ruangan pada ${f}` }));
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rooms.filter((r) => {
      if (floorFilter !== 'Semua' && r.floor !== floorFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.building.toLowerCase().includes(q) ||
        (r.activeCourse?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [floorFilter, rooms, searchQuery]);

  const requestedRoom = rooms.find((room) =>
    labId ? room.id === labId : location && room.name.toLowerCase() === location.trim().toLowerCase(),
  );
  const selectedId = selectedRoomId ?? requestedRoom?.id;
  const activeNowCount = rooms.filter((r) => r.isActiveNow).length;
  const requestedMissing = Boolean((labId || location) && !requestedRoom && !selectedRoomId);
  const focusedRoom = requestedMissing ? null : (
    filteredRooms.find((r) => r.id === selectedId) ??
    filteredRooms.find((r) => r.isActiveNow) ??
    filteredRooms[0] ??
    null
  );

  const isSheetLabActive =
    detailActiveSessions.length > 0 || Boolean(detailSheetRoom?.isActiveNow);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AppHeader
          eyebrow="Peta Interaktif · Gedung Lab"
          title="Peta Laboratorium"
          monoBadge={`${rooms.length} RUANG LAB`}
          statusBadge={`${activeNowCount} Aktif Sekarang`}
        />

        <View style={styles.bodyContainer}>
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Cari ruang lab..."
            filterLabel={floorFilter}
            onPressFilter={() => setFloorSheetVisible(true)}
            isFilterActive={floorFilter !== 'Semua'}
            onResetFilter={() => setFloorFilter('Semua')}
          />

          <LabNativeMap
            labs={filteredRooms}
            selectedLabId={selectedId ?? null}
            onSelectLab={(labId) => {
              const selected = rooms.find((room) => room.id === labId);
              setSelectedRoomId(labId);
              if (selected) setDetailSheetRoom(selected);
            }}
          />

          {requestedMissing && !labsLoading ? (
            <Text style={[styles.selectedSub, { color: colors.textSecondary }]}>
              Lab untuk sesi ini tidak ditemukan. Pilih lab pada peta untuk melihat petunjuk arah.
            </Text>
          ) : null}

          {focusedRoom ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setDetailSheetRoom(focusedRoom)}
              style={({ pressed }) => [
                styles.selectedCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.selectedHeader}>
                <View style={styles.selectedInfo}>
                  <Text style={[styles.selectedTitle, { color: colors.textPrimary }]}>
                    {focusedRoom.name}
                  </Text>
                  <Text style={[styles.selectedSub, { color: colors.textSecondary }]}>
                    {focusedRoom.building} · Radius {focusedRoom.radiusMeters} m
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: focusedRoom.isActiveNow
                        ? colors.rosySoft
                        : colors.pacificSoft,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: focusedRoom.isActiveNow
                          ? colors.rosy
                          : colors.pacific,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: focusedRoom.isActiveNow
                          ? colors.rosyDark
                          : colors.pacificDark,
                      },
                    ]}
                  >
                    {focusedRoom.isActiveNow ? 'Sedang Dipakai' : 'Tersedia'}
                  </Text>
                </View>
              </View>

              <View style={[styles.selectedStrip, { backgroundColor: colors.background }]}>
                <Text style={[styles.selectedStripLeft, { color: colors.textPrimary }]}>
                  {focusedRoom.activeCourse
                    ? `${focusedRoom.activeCourse} · ${focusedRoom.activeTime}`
                    : focusedRoom.nextSessionTitle
                      ? `Berikutnya: ${focusedRoom.nextSessionTitle} · ${focusedRoom.nextSessionTime}`
                      : `Kapasitas ${focusedRoom.capacity} kursi · Ketuk untuk detail jadwal`}
                </Text>
                <Text style={[styles.selectedStripFloor, { color: colors.baltic }]}>
                  {focusedRoom.floor}
                </Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <PickerBottomSheet
        visible={floorSheetVisible}
        onClose={() => setFloorSheetVisible(false)}
        title="Pilih Lantai Gedung"
        subtitle="Filter ruangan berdasarkan lantai"
        searchable={false}
        options={floorOptions}
        selectedValue={floorFilter}
        onSelect={setFloorFilter}
      />

      <FlyAwayBottomSheet
        visible={Boolean(detailSheetRoom)}
        onClose={() => setDetailSheetRoom(null)}
        title={detailSheetRoom?.name ?? 'Detail Ruang'}
        subtitle={
          detailSheetRoom
            ? `${detailSheetRoom.building} · ${detailSheetRoom.floor}`
            : undefined
        }
        maxHeight="76%"
      >
        {detailSheetRoom ? (
          <View style={styles.bsContent}>
            <View style={styles.bsBadgeRow}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isSheetLabActive
                      ? colors.rosySoft
                      : colors.pacificSoft,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: isSheetLabActive
                        ? colors.rosy
                        : colors.pacific,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: isSheetLabActive
                        ? colors.rosyDark
                        : colors.pacificDark,
                    },
                  ]}
                >
                  {isSheetLabActive ? 'Sedang Dipakai' : 'Tersedia'}
                </Text>
              </View>

              <View style={[styles.capBadge, { backgroundColor: colors.balticSoft }]}>
                <Text style={[styles.capText, { color: colors.baltic }]}>
                  {detailSheetRoom.capacity} Kursi
                </Text>
              </View>

              <View style={[styles.capBadge, { backgroundColor: colors.pacificSoft }]}>
                <Text style={[styles.capText, { color: colors.pacificDark }]}>
                  Radius {detailSheetRoom.radiusMeters} m
                </Text>
              </View>
            </View>

            {detailLoading ? (
              <View style={styles.detailLoadingRow}>
                <ActivityIndicator size="small" color={colors.baltic} />
                <Text style={[styles.detailLoadingText, { color: colors.textSecondary }]}>
                  Memuat aktivitas laboratorium...
                </Text>
              </View>
            ) : null}

            {/* Seksi 1: Sedang Berlangsung */}
            <View
              style={[
                styles.bsDetailBox,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionEyebrow, { color: colors.textSubtle }]}>
                  SEDANG BERLANGSUNG
                </Text>
                {detailActiveSessions.length > 0 ? (
                  <View style={[styles.liveChip, { backgroundColor: colors.rosySoft }]}>
                    <View style={[styles.statusDot, { backgroundColor: colors.rosy }]} />
                    <Text style={[styles.liveChipText, { color: colors.rosyDark }]}>Live</Text>
                  </View>
                ) : null}
              </View>

              {detailActiveSessions.length === 0 ? (
                <Text style={[styles.sectionEmptyText, { color: colors.textSecondary }]}>
                  Tidak ada praktikum yang sedang berlangsung di lab ini.
                </Text>
              ) : (
                <View style={styles.sessionList}>
                  {detailActiveSessions.map((sessionItem) => (
                    <View key={sessionItem.id} style={styles.sessionItemRow}>
                      <Text style={[styles.bsDetailTitle, { color: colors.textPrimary }]}>
                        {sessionItem.courseName
                          ? `${sessionItem.courseName}${sessionItem.className ? ` · ${sessionItem.className}` : ''}`
                          : sessionItem.title}
                      </Text>
                      <Text style={[styles.bsDetailMeta, { color: colors.textSecondary }]}>
                        {sessionItem.courseName ? `${sessionItem.title} · ` : ''}
                        {formatSessionTime(sessionItem.startsAt)}–
                        {formatSessionTime(sessionItem.endsAt)} WIB
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Seksi 2: Sesi Berikutnya */}
            <View
              style={[
                styles.bsDetailBox,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.sectionEyebrow, { color: colors.textSubtle }]}>
                SESI BERIKUTNYA
              </Text>

              {detailUpcomingSessions.length === 0 ? (
                <Text style={[styles.sectionEmptyText, { color: colors.textSecondary }]}>
                  Belum ada jadwal sesi berikutnya untuk lab ini.
                </Text>
              ) : (
                <View style={styles.sessionList}>
                  {detailUpcomingSessions.slice(0, 2).map((sessionItem) => (
                    <View key={sessionItem.id} style={styles.sessionItemRow}>
                      <Text style={[styles.bsDetailTitle, { color: colors.textPrimary }]}>
                        {sessionItem.courseName
                          ? `${sessionItem.courseName}${sessionItem.className ? ` · ${sessionItem.className}` : ''}`
                          : sessionItem.title}
                      </Text>
                      <Text style={[styles.bsDetailMeta, { color: colors.textSecondary }]}>
                        {formatSessionDate(undefined, sessionItem.startsAt)} ·{' '}
                        {formatSessionTime(sessionItem.startsAt)}–
                        {formatSessionTime(sessionItem.endsAt)} WIB
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => showAlert(`Arah ke ${detailSheetRoom.name}`, getRoomDirections(detailSheetRoom))}
              style={({ pressed }) => [
                styles.directionsBtn,
                { backgroundColor: colors.baltic },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.directionsBtnText}>Petunjuk Arah ke Lab</Text>
            </Pressable>
          </View>
        ) : null}
      </FlyAwayBottomSheet>
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
  selectedCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    gap: 10,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectedInfo: {
    flex: 1,
    gap: 2,
  },
  selectedTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
  },
  selectedSub: {
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
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11.5,
  },
  selectedStrip: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectedStripLeft: {
    flex: 1,
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12.5,
    fontVariant: ['tabular-nums'],
  },
  selectedStripFloor: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
  },
  bsContent: {
    gap: 12,
    paddingBottom: 6,
  },
  bsBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  capBadge: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  capText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
  },
  detailLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLoadingText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
  },
  bsDetailBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionEyebrow: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.7,
  },
  liveChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveChipText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10.5,
  },
  sessionList: {
    gap: 8,
  },
  sessionItemRow: {
    gap: 2,
  },
  sectionEmptyText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
    lineHeight: 18,
  },
  bsDetailTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14.5,
  },
  bsDetailMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  directionsBtn: {
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionsBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
    color: '#FCFCFA',
  },
  pressed: {
    opacity: 0.78,
  },
});
