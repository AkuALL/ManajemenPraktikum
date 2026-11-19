import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/ui/app-header';
import { FlyAwayBottomSheet } from '@/components/ui/fly-away-bottom-sheet';
import { PickerBottomSheet, type PickerOption } from '@/components/ui/picker-bottom-sheet';
import { SearchFilterBar } from '@/components/ui/search-filter-bar';
import { Colors, FontFamily, MaxContentWidth } from '@/constants/theme';
import { formatSessionTime, usePracticum } from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
};

const BASE_LAB_ROOMS: Omit<LabRoomItem, 'isActiveNow'>[] = [
  { id: 'lab-jarkom-302', name: 'Lab Jarkom 302', building: 'Gedung Laboratorium Lantai 3', floor: 'Lt. 3', capacity: 32 },
  { id: 'lab-komp-2', name: 'Lab Komp 2', building: 'Gedung Laboratorium Lantai 3', floor: 'Lt. 3', capacity: 36 },
  { id: 'lab-rpl-1', name: 'Lab RPL 1', building: 'Gedung Laboratorium Lantai 2', floor: 'Lt. 2', capacity: 40 },
  { id: 'lab-104', name: 'Lab 104', building: 'Gedung Laboratorium Lantai 1', floor: 'Lt. 1', capacity: 30 },
];

export default function PetaLabScreen() {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { classes, sessions } = usePracticum();

  const [searchQuery, setSearchQuery] = useState('');
  const [floorFilter, setFloorFilter] = useState<string>('Semua');
  const [floorSheetVisible, setFloorSheetVisible] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [detailSheetRoom, setDetailSheetRoom] = useState<LabRoomItem | null>(null);

  const rooms = useMemo<LabRoomItem[]>(() => {
    const map = new Map<string, Omit<LabRoomItem, 'isActiveNow'>>();
    BASE_LAB_ROOMS.forEach((item) => map.set(item.name.toLowerCase(), item));

    classes.forEach((cls) => {
      const labName = cls.lab?.trim();
      if (!labName) return;
      if (!map.has(labName.toLowerCase())) {
        map.set(labName.toLowerCase(), {
          id: `cls-${cls.id}`,
          name: labName,
          building: 'Gedung Laboratorium Lantai 2',
          floor: 'Lt. 2',
          capacity: 32,
        });
      }
    });

    sessions.forEach((sess) => {
      const labName = sess.location?.trim();
      if (!labName) return;
      if (!map.has(labName.toLowerCase())) {
        map.set(labName.toLowerCase(), {
          id: `sess-${sess.id}`,
          name: labName,
          building: 'Gedung Laboratorium Lantai 3',
          floor: 'Lt. 3',
          capacity: 32,
        });
      }
    });

    return Array.from(map.values()).map((room) => {
      const activeSession = sessions.find(
        (s) =>
          s.location.trim().toLowerCase() === room.name.toLowerCase() &&
          s.status === 'open',
      );
      return {
        ...room,
        isActiveNow: Boolean(activeSession),
        activeCourse: activeSession?.courseName ?? activeSession?.className,
        activeSessionTitle: activeSession?.title,
        activeTime: activeSession
          ? `${formatSessionTime(activeSession.startsAt)}–${formatSessionTime(activeSession.endsAt)}`
          : undefined,
        assistantName: activeSession?.assistantName ?? 'Asisten Jaga',
      };
    });
  }, [classes, sessions]);

  const floorOptions = useMemo<PickerOption[]>(() => {
    const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort();
    return [
      { value: 'Semua', label: 'Semua Lantai', subtitle: 'Tampilkan seluruh ruang laboratorium' },
      ...floors.map((f) => ({ value: f, label: f, subtitle: `Ruangan pada ${f}` })),
    ];
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

  const activeNowCount = rooms.filter((r) => r.isActiveNow).length;
  const focusedRoom =
    filteredRooms.find((r) => r.id === selectedRoomId) ??
    filteredRooms.find((r) => r.isActiveNow) ??
    filteredRooms[0] ??
    null;

  const topPair = filteredRooms.slice(0, 2);
  const bottomPair = filteredRooms.slice(2, 6);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AppHeader
          eyebrow="Denah Ruangan · Gedung Lab"
          title="Lokasi Lab"
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
          />

          <View
            style={[
              styles.floorplanCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {filteredRooms.length === 0 ? (
              <Text style={[styles.emptyRoomText, { color: colors.textSecondary }]}>
                Tidak ada ruang laboratorium yang cocok.
              </Text>
            ) : (
              <>
                <View style={styles.roomGrid}>
                  {topPair.map((room) => (
                    <RoomTile
                      key={room.id}
                      room={room}
                      selected={focusedRoom?.id === room.id}
                      onPress={() => {
                        setSelectedRoomId(room.id);
                        setDetailSheetRoom(room);
                      }}
                    />
                  ))}
                </View>

                {bottomPair.length > 0 ? (
                  <>
                    <View style={[styles.corridorBand, { backgroundColor: colors.background }]} />
                    <View style={styles.roomGrid}>
                      {bottomPair.map((room) => (
                        <RoomTile
                          key={room.id}
                          room={room}
                          selected={focusedRoom?.id === room.id}
                          onPress={() => {
                            setSelectedRoomId(room.id);
                            setDetailSheetRoom(room);
                          }}
                        />
                      ))}
                    </View>
                  </>
                ) : null}
              </>
            )}
          </View>

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
                    {focusedRoom.building}
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
                    : `Kapasitas ${focusedRoom.capacity} kursi · Siap digunakan`}
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
        subtitle={detailSheetRoom?.building}
        maxHeight="62%"
      >
        {detailSheetRoom ? (
          <View style={styles.bsContent}>
            <View style={styles.bsBadgeRow}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: detailSheetRoom.isActiveNow
                      ? colors.rosySoft
                      : colors.pacificSoft,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: detailSheetRoom.isActiveNow
                        ? colors.rosy
                        : colors.pacific,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: detailSheetRoom.isActiveNow
                        ? colors.rosyDark
                        : colors.pacificDark,
                    },
                  ]}
                >
                  {detailSheetRoom.isActiveNow ? 'Sedang Dipakai' : 'Tersedia'}
                </Text>
              </View>

              <View style={[styles.capBadge, { backgroundColor: colors.balticSoft }]}>
                <Text style={[styles.capText, { color: colors.baltic }]}>
                  {detailSheetRoom.capacity} Kursi
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.bsDetailBox,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.bsDetailTitle, { color: colors.textPrimary }]}>
                {detailSheetRoom.activeCourse
                  ? `Praktikum ${detailSheetRoom.activeCourse}`
                  : 'Ruang Praktikum Tersedia'}
              </Text>
              <Text style={[styles.bsDetailMeta, { color: colors.textSecondary }]}>
                {detailSheetRoom.activeTime
                  ? `${detailSheetRoom.activeTime} · ${detailSheetRoom.assistantName}`
                  : `Lantai ${detailSheetRoom.floor} · Koridor utama Gedung Laboratorium`}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                Alert.alert(
                  `Arah ke ${detailSheetRoom.name}`,
                  `Masuk lobby utama Gedung Lab, naik ke ${detailSheetRoom.floor}, lalu ikuti papan penunjuk menuju ${detailSheetRoom.name}.`,
                );
              }}
              style={({ pressed }) => [
                styles.directionsBtn,
                { backgroundColor: colors.baltic },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.directionsBtnText}>Petunjuk Arah Ruangan</Text>
            </Pressable>
          </View>
        ) : null}
      </FlyAwayBottomSheet>
    </View>
  );
}

function RoomTile({
  room,
  selected,
  onPress,
}: {
  room: LabRoomItem;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const active = room.isActiveNow;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.roomTile,
        {
          backgroundColor: active ? colors.rosySoft : colors.balticSoft,
          borderColor: active
            ? colors.rosy
            : selected
              ? colors.pacific
              : colors.border,
          borderWidth: active || selected ? 1.5 : 1,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.roomTileTop}>
        <Text
          style={[
            styles.roomTileTitle,
            { color: active ? colors.rosyDark : colors.baltic },
          ]}
          numberOfLines={1}
        >
          {room.name}
        </Text>
        <View
          style={[
            styles.roomDot,
            { backgroundColor: active ? colors.rosy : colors.pacific },
          ]}
        />
      </View>

      <Text
        style={[
          styles.roomTileSub,
          { color: active ? colors.rosy : colors.textSecondary },
        ]}
        numberOfLines={1}
      >
        {active ? `Dipakai · ${room.activeTime?.split('–')[0] ?? 'Live'}` : 'Tersedia'}
      </Text>
    </Pressable>
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
  floorplanCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  roomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  corridorBand: {
    height: 16,
    borderRadius: 8,
  },
  roomTile: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 16,
    padding: 12,
    minHeight: 74,
    justifyContent: 'space-between',
    gap: 8,
  },
  roomTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  roomTileTitle: {
    flex: 1,
    fontFamily: FontFamily.displayBold,
    fontSize: 13.5,
  },
  roomDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  roomTileSub: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11.5,
  },
  emptyRoomText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
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
  },
  bsDetailBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    gap: 4,
  },
  bsDetailTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14.5,
  },
  bsDetailMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
    lineHeight: 18,
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
