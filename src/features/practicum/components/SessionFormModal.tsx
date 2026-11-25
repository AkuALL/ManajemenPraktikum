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
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react-native';

import { FlyAwayBottomSheet } from '@/components/ui/fly-away-bottom-sheet';
import { Colors, FontFamily } from '@/constants/theme';
import { useLabs } from '@/features/labs/firestore-labs';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type { CreateSessionInput, PracticumClass, PracticumSession } from '../types';
import {
  defaultSessionDate,
  detectSessionSlotId,
  formatCalendarDateLabel,
  isWeekendDate,
  SESSION_TIME_SLOTS,
  sessionDateInput,
  type SessionSlotId,
  sessionTimeInput,
  validateSessionInput,
} from '../validation';

interface SessionFormModalProps {
  visible: boolean;
  classes: PracticumClass[];
  initialSession?: PracticumSession | null;
  defaultClassId?: string;
  onClose: () => void;
  onSubmit: (input: CreateSessionInput) => Promise<void>;
}

const WEEKDAY_HEADERS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function parseYearMonth(dateStr: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(dateStr);
  if (match) {
    return { year: Number(match[1]), month: Number(match[2]) - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function buildCalendarDays(year: number, month: number): (string | null)[] {
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(firstDayOfWeek).fill(null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    cells.push(`${year}-${mm}-${dd}`);
  }
  return cells;
}

function SessionFormContent({
  classes,
  initialSession,
  defaultClassId,
  onClose,
  onSubmit,
}: {
  classes: PracticumClass[];
  initialSession?: PracticumSession | null;
  defaultClassId?: string;
  onClose: () => void;
  onSubmit: (input: CreateSessionInput) => Promise<void>;
}) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { labs: storedLabs, loading: labsLoading } = useLabs();
  const labs = useMemo(
    () => storedLabs.filter((item) => item.isActive),
    [storedLabs],
  );

  const initialStartsAt = sessionTimeInput(initialSession?.startsAt, '08:00');
  const initialEndsAt = sessionTimeInput(initialSession?.endsAt, '10:00');
  const initialDate = sessionDateInput(
    initialSession?.date,
    initialSession?.startsAt ?? defaultSessionDate(),
  );

  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialSession?.classId ?? (defaultClassId || (classes[0]?.id ?? '')),
  );
  const [title, setTitle] = useState(initialSession?.title ?? '');
  const [selectedLabId, setSelectedLabId] = useState(initialSession?.labId ?? '');
  const [date, setDate] = useState(initialDate);
  const [calendarCursor, setCalendarCursor] = useState(() => parseYearMonth(initialDate));
  const [showCalendar, setShowCalendar] = useState(false);

  const [selectedSlotId, setSelectedSlotId] = useState<SessionSlotId>(() =>
    initialSession ? detectSessionSlotId(initialStartsAt, initialEndsAt) : 'slot-1',
  );
  const [showSlotDropdown, setShowSlotDropdown] = useState(false);
  const [startsAt, setStartsAt] = useState(initialStartsAt);
  const [endsAt, setEndsAt] = useState(initialEndsAt);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const calendarCells = useMemo(
    () => buildCalendarDays(calendarCursor.year, calendarCursor.month),
    [calendarCursor.month, calendarCursor.year],
  );
  const todayDateStr = useMemo(() => defaultSessionDate(), []);
  const activeSlot =
    SESSION_TIME_SLOTS.find((slot) => slot.id === selectedSlotId) ?? SESSION_TIME_SLOTS[0];
  const automaticLabId =
    initialSession?.location
      ? labs.find((lab) => lab.name.toLowerCase() === initialSession.location.toLowerCase())?.id
      : labs[0]?.id;
  const activeLabId = selectedLabId || automaticLabId;
  const selectedLab = labs.find((lab) => lab.id === activeLabId) ?? null;

  const shiftCalendarMonth = (delta: number) => {
    setCalendarCursor((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const handleSelectSlot = (slotId: SessionSlotId) => {
    const slot = SESSION_TIME_SLOTS.find((item) => item.id === slotId);
    if (!slot) return;

    setSelectedSlotId(slotId);
    setShowSlotDropdown(false);
    setErrorMessage('');

    if (slot.id !== 'custom') {
      setStartsAt(slot.startsAt);
      setEndsAt(slot.endsAt);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!selectedLab) {
      setErrorMessage('Pilih Master Lab agar koordinat dan radius presensi sesi tersimpan.');
      return;
    }

    const validation = validateSessionInput(
      {
        classId: selectedClassId,
        title,
        location: selectedLab.name,
        date,
        startsAt,
        endsAt,
      },
      { allowPast: Boolean(initialSession) },
    );
    if ('error' in validation) {
      setErrorMessage(validation.error);
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage('');
      await onSubmit({
        ...validation.value,
        location: selectedLab.name,
        labId: selectedLab.id,
        locationName: selectedLab.name,
        latitude: selectedLab.latitude,
        longitude: selectedLab.longitude,
        radiusMeters: selectedLab.radiusMeters,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Gagal menyimpan sesi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.formWrap}>
      {errorMessage ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.errorBox,
            { backgroundColor: colors.rosySoft, borderColor: colors.rosyBorder },
          ]}
        >
          <Text style={[styles.errorText, { color: colors.rosyDark }]}>{errorMessage}</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!initialSession ? (
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Kelas Praktikum</Text>
            <View style={styles.classChips}>
              {classes.map((cls) => {
                const isSelected = selectedClassId === cls.id;
                return (
                  <Pressable
                    key={cls.id}
                    onPress={() => setSelectedClassId(cls.id)}
                    disabled={submitting}
                    style={[
                      styles.chip,
                      {
                        borderColor: isSelected ? colors.pacific : colors.border,
                        backgroundColor: isSelected ? colors.pacificSoft : colors.background,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? colors.pacificDark : colors.textPrimary },
                      ]}
                    >
                      {cls.courseName} · {cls.className}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Judul / Modul Sesi
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="Contoh: Modul 04 · Routing OSPF"
            placeholderTextColor={colors.textSubtle}
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              setErrorMessage('');
            }}
            editable={!submitting}
            maxLength={140}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Master Lab & Radius Presensi
          </Text>
          {labsLoading && storedLabs.length === 0 ? (
            <ActivityIndicator size="small" color={colors.baltic} />
          ) : (
            <View style={styles.classChips}>
              {labs.map((lab) => {
                const isSelected = lab.id === activeLabId;
                return (
                  <Pressable
                    key={lab.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      setSelectedLabId(lab.id);
                      setErrorMessage('');
                    }}
                    disabled={submitting}
                    style={[
                      styles.chip,
                      {
                        borderColor: isSelected ? colors.pacific : colors.border,
                        backgroundColor: isSelected ? colors.pacificSoft : colors.background,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? colors.pacificDark : colors.textPrimary },
                      ]}
                    >
                      {lab.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {selectedLab ? (
            <View style={[styles.labHint, { backgroundColor: colors.balticSoft }]}>
              <Text style={[styles.labHintTitle, { color: colors.baltic }]}>
                {selectedLab.building}
              </Text>
              <Text style={[styles.labHintText, { color: colors.textSecondary }]}>
                Koordinat dan radius {selectedLab.radiusMeters} m disalin ke sesi ini.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Tanggal Pelaksanaan
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setShowCalendar((prev) => !prev);
              setShowSlotDropdown(false);
            }}
            disabled={submitting}
            style={[
              styles.selectorButton,
              { borderColor: colors.border, backgroundColor: colors.background },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.selectorPrimary, { color: colors.textPrimary }]}>
                {formatCalendarDateLabel(date)}
              </Text>
              <Text style={[styles.selectorSecondary, { color: colors.textSubtle }]}>{date}</Text>
            </View>
            {showCalendar ? (
              <ChevronUp size={16} color={colors.baltic} strokeWidth={2.2} />
            ) : (
              <ChevronDown size={16} color={colors.baltic} strokeWidth={2.2} />
            )}
          </Pressable>

          {showCalendar ? (
            <View
              style={[
                styles.calendarCard,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            >
              <View style={styles.calendarHeader}>
                <Pressable
                  style={[styles.calendarNavBtn, { borderColor: colors.border }]}
                  onPress={() => shiftCalendarMonth(-1)}
                >
                  <ChevronLeft size={16} color={colors.textPrimary} strokeWidth={2.2} />
                </Pressable>
                <Text style={[styles.calendarMonthLabel, { color: colors.textPrimary }]}>
                  {MONTH_NAMES[calendarCursor.month]} {calendarCursor.year}
                </Text>
                <Pressable
                  style={[styles.calendarNavBtn, { borderColor: colors.border }]}
                  onPress={() => shiftCalendarMonth(1)}
                >
                  <ChevronRight size={16} color={colors.textPrimary} strokeWidth={2.2} />
                </Pressable>
              </View>

              <View style={styles.weekRow}>
                {WEEKDAY_HEADERS.map((dayName, dayIdx) => {
                  const isWeekendHeader = dayIdx === 0 || dayIdx === 6;
                  return (
                    <Text
                      key={dayName}
                      style={[
                        styles.weekHeaderText,
                        {
                          color: isWeekendHeader ? colors.disabledText : colors.textSubtle,
                          opacity: isWeekendHeader ? 0.6 : 1,
                        },
                      ]}
                    >
                      {dayName}
                    </Text>
                  );
                })}
              </View>

              <View style={styles.daysGrid}>
                {calendarCells.map((cellDate, idx) => {
                  if (!cellDate) {
                    return <View key={`empty-${idx}`} style={styles.dayCell} />;
                  }
                  const dayNum = Number(cellDate.slice(-2));
                  const isWeekend = isWeekendDate(cellDate);
                  const isSelected = !isWeekend && cellDate === date;
                  const isToday = cellDate === todayDateStr;
                  return (
                    <Pressable
                      key={cellDate}
                      disabled={isWeekend}
                      accessibilityState={{ disabled: isWeekend, selected: isSelected }}
                      style={[
                        styles.dayCell,
                        isSelected && { backgroundColor: colors.pacific },
                        isWeekend && {
                          backgroundColor: colors.disabledSurface,
                          opacity: 0.45,
                        },
                        !isSelected &&
                          !isWeekend &&
                          isToday && {
                            borderColor: colors.pacific,
                            borderWidth: 1,
                          },
                      ]}
                      onPress={() => {
                        if (isWeekend) return;
                        setDate(cellDate);
                        setShowCalendar(false);
                        setErrorMessage('');
                      }}
                    >
                      <Text
                        style={[
                          styles.dayCellText,
                          {
                            color: isSelected
                              ? '#FCFCFA'
                              : isWeekend
                                ? colors.disabledText
                                : colors.textPrimary,
                            fontFamily:
                              isSelected || isToday ? FontFamily.sansBold : FontFamily.sansRegular,
                          },
                        ]}
                      >
                        {dayNum}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.labHintText, { color: colors.textSubtle }]}>
                Praktikum hanya tersedia pada hari Senin–Jumat (Sabtu &amp; Minggu dinonaktifkan).
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Slot Waktu Praktikum</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setShowSlotDropdown((prev) => !prev);
              setShowCalendar(false);
            }}
            disabled={submitting}
            style={[
              styles.selectorButton,
              { borderColor: colors.border, backgroundColor: colors.background },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.selectorPrimary, { color: colors.textPrimary }]}>
                {activeSlot.label}
              </Text>
              <Text style={[styles.selectorSecondary, { color: colors.textSubtle }]}>
                {activeSlot.description}
              </Text>
            </View>
            {showSlotDropdown ? (
              <ChevronUp size={16} color={colors.baltic} strokeWidth={2.2} />
            ) : (
              <ChevronDown size={16} color={colors.baltic} strokeWidth={2.2} />
            )}
          </Pressable>

          {showSlotDropdown ? (
            <View
              style={[
                styles.dropdownList,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            >
              {SESSION_TIME_SLOTS.map((slot) => {
                const isSelected = slot.id === selectedSlotId;
                return (
                  <Pressable
                    key={slot.id}
                    style={[
                      styles.dropdownItem,
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: isSelected ? colors.pacificSoft : 'transparent',
                      },
                    ]}
                    onPress={() => handleSelectSlot(slot.id)}
                  >
                    <Text
                      style={{
                        color: isSelected ? colors.pacificDark : colors.textPrimary,
                        fontFamily: FontFamily.sansSemiBold,
                        fontSize: 13,
                      }}
                    >
                      {slot.label}
                    </Text>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontFamily: FontFamily.sansRegular,
                        fontSize: 11.5,
                      }}
                    >
                      {slot.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        {selectedSlotId !== 'custom' ? (
          <View
            style={[
              styles.lockedTimeBanner,
              { borderColor: colors.border, backgroundColor: colors.balticSoft },
            ]}
          >
            <Text style={[styles.lockedTimeLabel, { color: colors.textSecondary }]}>
              Jam Sesi
            </Text>
            <Text style={[styles.lockedTimeValue, { color: colors.baltic }]}>
              {startsAt} – {endsAt}
            </Text>
          </View>
        ) : (
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Mulai</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.textPrimary,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    fontFamily: FontFamily.monoMedium,
                  },
                ]}
                placeholder="08:00"
                placeholderTextColor={colors.textSubtle}
                value={startsAt}
                onChangeText={(value) => {
                  setStartsAt(value);
                  setErrorMessage('');
                }}
                editable={!submitting}
                maxLength={5}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Selesai</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.textPrimary,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    fontFamily: FontFamily.monoMedium,
                  },
                ]}
                placeholder="10:30"
                placeholderTextColor={colors.textSubtle}
                value={endsAt}
                onChangeText={(value) => {
                  setEndsAt(value);
                  setErrorMessage('');
                }}
                editable={!submitting}
                maxLength={5}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.buttonRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          disabled={submitting}
          style={({ pressed }) => [
            styles.cancelBtn,
            { backgroundColor: colors.background, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Batal</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => void handleSubmit()}
          disabled={submitting}
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: colors.rosy },
            pressed && styles.pressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#FCFCFA" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>
              {initialSession ? 'Simpan Jadwal' : 'Buat Sesi'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function SessionFormModal({
  visible,
  classes,
  initialSession,
  defaultClassId,
  onClose,
  onSubmit,
}: SessionFormModalProps) {
  return (
    <FlyAwayBottomSheet
      visible={visible}
      onClose={onClose}
      title={initialSession ? 'Reschedule / Ubah Sesi' : 'Tambah Sesi Praktikum'}
      subtitle={
        initialSession
          ? 'Pindahkan tanggal (Senin–Jumat), jam, atau ruang laboratorium sesi'
          : 'Atur jadwal (Senin–Jumat), ruang laboratorium, dan slot waktu sesi'
      }
      maxHeight="88%"
    >
      <SessionFormContent
        key={initialSession?.id ?? `new-session-${defaultClassId ?? 'all'}`}
        classes={classes}
        initialSession={initialSession}
        defaultClassId={defaultClassId}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    </FlyAwayBottomSheet>
  );
}

const styles = StyleSheet.create({
  formWrap: {
    gap: 12,
    paddingBottom: 6,
  },
  formScroll: {
    maxHeight: 410,
  },
  formContent: {
    gap: 12,
    paddingBottom: 4,
  },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  errorText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12.5,
  },
  fieldGroup: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
  },
  classChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12.5,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13.5,
  },
  labHint: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 2,
  },
  labHintTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
  },
  labHintText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11.5,
  },
  selectorButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorPrimary: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13.5,
  },
  selectorSecondary: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 11.5,
    marginTop: 2,
  },
  calendarCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarNavBtn: {
    borderWidth: 1,
    borderRadius: 10,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthLabel: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekHeaderText: {
    width: '14.285%',
    textAlign: 'center',
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%',
    aspectRatio: 1,
    maxHeight: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellText: {
    fontSize: 12.5,
  },
  dropdownList: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  lockedTimeBanner: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lockedTimeLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
  },
  lockedTimeValue: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 13.5,
    fontVariant: ['tabular-nums'],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
  },
  submitBtn: {
    flex: 1.4,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FCFCFA',
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
  },
  pressed: {
    opacity: 0.78,
  },
});
