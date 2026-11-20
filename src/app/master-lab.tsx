import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChevronDown, Plus } from 'lucide-react-native';

import { AppHeader, getFirstName } from '@/components/ui/app-header';
import { PickerBottomSheet, type PickerOption } from '@/components/ui/picker-bottom-sheet';
import {
  generateSessionQrCode,
  QrSessionBottomSheet,
} from '@/components/ui/qr-session-bottom-sheet';
import { Colors, FontFamily, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { usePracticum } from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { showAlert } from '@/lib/cross-platform-alert';

type MasterLabItem = {
  id: string;
  name: string;
  buildingFloor: string;
  roomCode: string;
  capacity: string;
  linkedClassId?: string;
};

const DEFAULT_MASTER_LABS: MasterLabItem[] = [
  {
    id: 'lab-if-202',
    name: 'Laboratorium Komputer 2',
    buildingFloor: 'Gedung Informatika Lt. 2',
    roomCode: 'LAB-IF-202',
    capacity: '32 kursi',
  },
  {
    id: 'lab-jarkom-302',
    name: 'Lab Jarkom 302',
    buildingFloor: 'Gedung Laboratorium Lt. 3',
    roomCode: 'LAB-JRK-302',
    capacity: '36 kursi',
  },
  {
    id: 'lab-rpl-1',
    name: 'Lab RPL 1',
    buildingFloor: 'Gedung Laboratorium Lt. 2',
    roomCode: 'LAB-RPL-01',
    capacity: '40 kursi',
  },
];

export default function MasterLabScreen() {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { classes, sessions, updateClass, openSession } = usePracticum();

  const [customLabs, setCustomLabs] = useState<MasterLabItem[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string>('');
  const [labPickerVisible, setLabPickerVisible] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const labs = useMemo<MasterLabItem[]>(() => {
    const map = new Map<string, MasterLabItem>();
    DEFAULT_MASTER_LABS.forEach((item) => map.set(item.name.toLowerCase(), item));

    classes.forEach((cls) => {
      const labName = cls.lab?.trim();
      if (!labName) return;
      const key = labName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: `cls-${cls.id}`,
          name: labName,
          buildingFloor: 'Gedung Informatika Lt. 2',
          roomCode: `LAB-${cls.id.slice(0, 6).toUpperCase()}`,
          capacity: '32 kursi',
          linkedClassId: cls.id,
        });
      } else {
        const existing = map.get(key)!;
        if (!existing.linkedClassId) {
          map.set(key, { ...existing, linkedClassId: cls.id });
        }
      }
    });

    customLabs.forEach((lab) => {
      map.set(lab.name.toLowerCase(), lab);
    });

    return Array.from(map.values());
  }, [classes, customLabs]);

  const activeLab = useMemo(
    () => labs.find((l) => l.id === selectedLabId) ?? labs[0],
    [labs, selectedLabId],
  );

  const [draftName, setDraftName] = useState(activeLab?.name ?? 'Laboratorium Komputer 2');
  const [draftBuilding, setDraftBuilding] = useState(
    activeLab?.buildingFloor ?? 'Gedung Informatika Lt. 2',
  );
  const [draftCode, setDraftCode] = useState(activeLab?.roomCode ?? 'LAB-IF-202');
  const [draftCapacity, setDraftCapacity] = useState(activeLab?.capacity ?? '32 kursi');

  const syncFormToLab = (lab: MasterLabItem) => {
    setSelectedLabId(lab.id);
    setDraftName(lab.name);
    setDraftBuilding(lab.buildingFloor);
    setDraftCode(lab.roomCode);
    setDraftCapacity(lab.capacity);
  };

  const handleAddNewLab = () => {
    setSelectedLabId('new');
    setDraftName('');
    setDraftBuilding('Gedung Informatika Lt. 2');
    setDraftCode('LAB-BARU-01');
    setDraftCapacity('32 kursi');
  };

  const handleSave = async () => {
    const trimmedName = draftName.trim();
    if (trimmedName.length < 2) {
      showAlert('Nama lab tidak valid', 'Masukkan nama laboratorium minimal 2 karakter.');
      return;
    }

    setSaving(true);
    try {
      const nextLab: MasterLabItem = {
        id: selectedLabId && selectedLabId !== 'new' ? selectedLabId : `custom-${Date.now()}`,
        name: trimmedName,
        buildingFloor: draftBuilding.trim() || 'Gedung Informatika',
        roomCode: draftCode.trim() || 'LAB-01',
        capacity: draftCapacity.trim() || '32 kursi',
        linkedClassId: activeLab?.linkedClassId,
      };

      if (activeLab?.linkedClassId && selectedLabId !== 'new') {
        await updateClass(activeLab.linkedClassId, { lab: trimmedName });
      }

      setCustomLabs((prev) => [
        ...prev.filter((item) => item.id !== nextLab.id),
        nextLab,
      ]);
      setSelectedLabId(nextLab.id);
      showAlert('Berhasil', 'Perubahan ruang laboratorium disimpan.');
    } catch (err: any) {
      showAlert('Gagal menyimpan', err?.message ?? 'Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const activeSession = useMemo(
    () => sessions.find((s) => s.status === 'open') ?? sessions[0] ?? null,
    [sessions],
  );
  const qrSessionId = activeSession?.id ?? activeLab?.id ?? 'lab-qr';
  const qrCode = generateSessionQrCode(qrSessionId);

  const labOptions: PickerOption[] = labs.map((l) => ({
    value: l.id,
    label: `${l.name} (${l.roomCode})`,
    subtitle: `${l.buildingFloor} · ${l.capacity}`,
  }));

  if (user?.role !== 'assistant') {
    return (
      <View style={[styles.guard, { backgroundColor: colors.background }]}>
        <Text style={[styles.guardTitle, { color: colors.textPrimary }]}>
          Halaman tidak tersedia
        </Text>
        <Text style={[styles.guardBody, { color: colors.textSecondary }]}>
          Master Lab hanya tersedia untuk Asisten Lab.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AppHeader
          eyebrow="Master Lab & QR Sesi"
          title={`Hai, ${getFirstName(user.displayName)}`}
          monoBadge={`${labs.length} RUANG LAB`}
          statusBadge="QR Aktif"
        />

        <View style={styles.bodyContainer}>
          <View style={styles.topRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setLabPickerVisible(true)}
              style={({ pressed }) => [
                styles.labDropdown,
                { backgroundColor: colors.baltic },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.labDropdownText} numberOfLines={1}>
                {selectedLabId === 'new'
                  ? 'Ruang Laboratorium Baru'
                  : `${draftName} (${draftCode})`}
              </Text>
              <ChevronDown size={16} color="#FCFCFA" strokeWidth={2.2} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handleAddNewLab}
              style={({ pressed }) => [
                styles.addLabBtn,
                { backgroundColor: colors.pacificSoft },
                pressed && styles.pressed,
              ]}
            >
              <Plus size={14} color={colors.pacificDark} strokeWidth={2.4} />
              <Text style={[styles.addLabText, { color: colors.pacificDark }]}>Lab</Text>
            </Pressable>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Detail ruang laboratorium
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Nama laboratorium
              </Text>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Contoh: Laboratorium Komputer 2"
                placeholderTextColor={colors.textSubtle}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Gedung & lantai
              </Text>
              <TextInput
                value={draftBuilding}
                onChangeText={setDraftBuilding}
                placeholder="Contoh: Gedung Informatika Lt. 2"
                placeholderTextColor={colors.textSubtle}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
              />
            </View>

            <View style={styles.twoCol}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Kode ruang</Text>
                <TextInput
                  value={draftCode}
                  onChangeText={setDraftCode}
                  autoCapitalize="characters"
                  placeholder="LAB-IF-202"
                  placeholderTextColor={colors.textSubtle}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      fontFamily: FontFamily.monoMedium,
                    },
                  ]}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Kapasitas</Text>
                <TextInput
                  value={draftCapacity}
                  onChangeText={setDraftCapacity}
                  placeholder="32 kursi"
                  placeholderTextColor={colors.textSubtle}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={[styles.qrStrip, { backgroundColor: colors.balticSoft }]}>
              <View style={styles.qrStripText}>
                <Text style={[styles.qrStripTitle, { color: colors.textPrimary }]}>
                  QR Presensi Sesi Aktif
                </Text>
                <Text style={[styles.qrStripMeta, { color: colors.textSecondary }]}>
                  Kode: {qrCode} · Rotasi 60 dtk
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => setQrVisible(true)}
                style={({ pressed }) => [
                  styles.showQrPill,
                  { backgroundColor: colors.baltic },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.showQrPillText}>Tampilkan QR</Text>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => void handleSave()}
              style={({ pressed }) => [
                styles.saveBtn,
                { backgroundColor: colors.rosy },
                pressed && styles.pressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FCFCFA" />
              ) : (
                <Text style={styles.saveBtnText}>Simpan Perubahan Lab</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <PickerBottomSheet
        visible={labPickerVisible}
        onClose={() => setLabPickerVisible(false)}
        title="Pilih Ruang Laboratorium"
        options={labOptions}
        selectedValue={activeLab?.id ?? ''}
        onSelect={(val) => {
          const picked = labs.find((l) => l.id === val);
          if (picked) syncFormToLab(picked);
        }}
      />

      <QrSessionBottomSheet
        visible={qrVisible}
        onClose={() => setQrVisible(false)}
        sessionId={qrSessionId}
        sessionTitle={activeSession?.courseName ?? draftName}
        subtitle={`${draftCode} · ${draftBuilding}`}
        sessionStatus={activeSession?.status ?? 'open'}
        onOpenSession={activeSession ? () => openSession(activeSession.id) : undefined}
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labDropdown: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  labDropdownText: {
    flex: 1,
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#FCFCFA',
  },
  addLabBtn: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  addLabText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16.5,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
  },
  input: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13.5,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  qrStrip: {
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  qrStripText: {
    flex: 1,
    gap: 2,
  },
  qrStripTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
  },
  qrStripMeta: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
  },
  showQrPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showQrPillText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: '#FCFCFA',
  },
  saveBtn: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  saveBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: '#FCFCFA',
  },
  pressed: {
    opacity: 0.78,
  },
});
