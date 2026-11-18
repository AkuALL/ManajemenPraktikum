import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { CreateSessionInput, PracticumClass, PracticumSession } from '../types';
import {
  defaultSessionDate,
  detectSessionSlotId,
  formatCalendarDateLabel,
  SESSION_TIME_SLOTS,
  sessionDateInput,
  SessionSlotId,
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
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

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
  const [location, setLocation] = useState(
    initialSession?.location ?? (classes[0]?.lab || 'Lab Komputer 1'),
  );
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

    const validation = validateSessionInput(
      {
        classId: selectedClassId,
        title,
        location,
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
      await onSubmit(validation.value);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Gagal menyimpan sesi');
    } finally {
      setSubmitting(false);
    }
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
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {initialSession ? 'Edit Sesi Praktikum' : 'Tambah Sesi Praktikum Baru'}
        </Text>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 14 }}>
          {!initialSession && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Kelas Praktikum *
              </Text>
              <View style={styles.classChips}>
                {classes.map((cls) => {
                  const isSelected = selectedClassId === cls.id;
                  return (
                    <TouchableOpacity
                      key={cls.id}
                      onPress={() => setSelectedClassId(cls.id)}
                      disabled={submitting}
                      style={[
                        styles.chip,
                        {
                          borderColor: isSelected ? colors.actionPrimary : colors.border,
                          backgroundColor: isSelected
                            ? colors.surfaceMuted
                            : colors.background,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected ? colors.actionPrimary : colors.textPrimary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {cls.className} - {cls.courseName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Judul / Topik Praktikum *
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
              placeholder="Contoh: Modul 5: REST API & State Management"
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                setErrorMessage('');
              }}
              editable={!submitting}
              maxLength={140}
              accessibilityLabel="Judul atau topik praktikum"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Lokasi / Ruangan Lab *
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
              placeholder="Contoh: Lab Komputer 2"
              placeholderTextColor={colors.textSecondary}
              value={location}
              onChangeText={(value) => {
                setLocation(value);
                setErrorMessage('');
              }}
              editable={!submitting}
              maxLength={120}
              accessibilityLabel="Lokasi praktikum"
            />
          </View>

          {/* Pemilih Tanggal Berbasis Kalender */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Tanggal Pelaksanaan *
            </Text>
            <TouchableOpacity
              style={[
                styles.selectorButton,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
              onPress={() => {
                setShowCalendar((prev) => !prev);
                setShowSlotDropdown(false);
              }}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Pilih tanggal pelaksanaan dari kalender"
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectorPrimary, { color: colors.textPrimary }]}>
                  {formatCalendarDateLabel(date)}
                </Text>
                <Text style={[styles.selectorSecondary, { color: colors.textSecondary }]}>
                  {date}
                </Text>
              </View>
              <Text style={{ color: colors.actionPrimary, fontWeight: '700', fontSize: 13 }}>
                {showCalendar ? 'Tutup ▲' : 'Kalender ▼'}
              </Text>
            </TouchableOpacity>

            {showCalendar ? (
              <View
                style={[
                  styles.calendarCard,
                  { borderColor: colors.border, backgroundColor: colors.background },
                ]}
              >
                <View style={styles.calendarHeader}>
                  <TouchableOpacity
                    style={[styles.calendarNavBtn, { borderColor: colors.border }]}
                    onPress={() => shiftCalendarMonth(-1)}
                    accessibilityLabel="Bulan sebelumnya"
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>‹</Text>
                  </TouchableOpacity>
                  <Text style={[styles.calendarMonthLabel, { color: colors.textPrimary }]}>
                    {MONTH_NAMES[calendarCursor.month]} {calendarCursor.year}
                  </Text>
                  <TouchableOpacity
                    style={[styles.calendarNavBtn, { borderColor: colors.border }]}
                    onPress={() => shiftCalendarMonth(1)}
                    accessibilityLabel="Bulan berikutnya"
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>›</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.weekRow}>
                  {WEEKDAY_HEADERS.map((dayName) => (
                    <Text
                      key={dayName}
                      style={[styles.weekHeaderText, { color: colors.textSecondary }]}
                    >
                      {dayName}
                    </Text>
                  ))}
                </View>

                <View style={styles.daysGrid}>
                  {calendarCells.map((cellDate, idx) => {
                    if (!cellDate) {
                      return <View key={`empty-${idx}`} style={styles.dayCell} />;
                    }
                    const dayNum = Number(cellDate.slice(-2));
                    const isSelected = cellDate === date;
                    const isToday = cellDate === todayDateStr;
                    return (
                      <TouchableOpacity
                        key={cellDate}
                        style={[
                          styles.dayCell,
                          isSelected && { backgroundColor: colors.actionPrimary },
                          !isSelected && isToday && {
                            borderColor: colors.actionPrimary,
                            borderWidth: 1,
                          },
                        ]}
                        onPress={() => {
                          setDate(cellDate);
                          setShowCalendar(false);
                          setErrorMessage('');
                        }}
                      >
                        <Text
                          style={[
                            styles.dayCellText,
                            {
                              color: isSelected ? '#fff' : colors.textPrimary,
                              fontWeight: isSelected || isToday ? '700' : '400',
                            },
                          ]}
                        >
                          {dayNum}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>

          {/* Dropdown 6 Slot Waktu Sesi */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Slot Waktu Praktikum *
            </Text>
            <TouchableOpacity
              style={[
                styles.selectorButton,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
              onPress={() => {
                setShowSlotDropdown((prev) => !prev);
                setShowCalendar(false);
              }}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Pilih slot waktu praktikum"
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectorPrimary, { color: colors.textPrimary }]}>
                  {activeSlot.label}
                </Text>
                <Text style={[styles.selectorSecondary, { color: colors.textSecondary }]}>
                  {activeSlot.description}
                </Text>
              </View>
              <Text style={{ color: colors.actionPrimary, fontWeight: '700', fontSize: 13 }}>
                {showSlotDropdown ? 'Tutup ▲' : 'Pilih ▼'}
              </Text>
            </TouchableOpacity>

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
                    <TouchableOpacity
                      key={slot.id}
                      style={[
                        styles.dropdownItem,
                        {
                          borderBottomColor: colors.border,
                          backgroundColor: isSelected ? colors.surfaceMuted : 'transparent',
                        },
                      ]}
                      onPress={() => handleSelectSlot(slot.id)}
                    >
                      <Text
                        style={{
                          color: isSelected ? colors.actionPrimary : colors.textPrimary,
                          fontWeight: isSelected ? '700' : '600',
                          fontSize: 13,
                        }}
                      >
                        {slot.label}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        {slot.description}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>

          {selectedSlotId !== 'custom' ? (
            <View
              style={[
                styles.lockedTimeBanner,
                { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
              ]}
            >
              <Text style={[styles.lockedTimeLabel, { color: colors.textSecondary }]}>
                Jam Sesi (otomatis dari slot terpilih):
              </Text>
              <Text style={[styles.lockedTimeValue, { color: colors.textPrimary }]}>
                {startsAt} – {endsAt}
              </Text>
            </View>
          ) : (
            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Waktu Mulai Kustom *
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
                  placeholder="08:00"
                  placeholderTextColor={colors.textSecondary}
                  value={startsAt}
                  onChangeText={(value) => {
                    setStartsAt(value);
                    setErrorMessage('');
                  }}
                  editable={!submitting}
                  maxLength={5}
                  keyboardType="numbers-and-punctuation"
                  accessibilityLabel="Waktu mulai kustom, format HH:mm"
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Waktu Selesai Kustom *
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
                  placeholder="10:30"
                  placeholderTextColor={colors.textSecondary}
                  value={endsAt}
                  onChangeText={(value) => {
                    setEndsAt(value);
                    setErrorMessage('');
                  }}
                  editable={!submitting}
                  maxLength={5}
                  keyboardType="numbers-and-punctuation"
                  accessibilityLabel="Waktu selesai kustom, format HH:mm"
                />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={onClose}
            disabled={submitting}
          >
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Batal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.actionPrimary }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>
                {initialSession ? 'Simpan Perubahan' : 'Buat Sesi'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SessionFormContent
        key={initialSession?.id ?? `new-session-${defaultClassId ?? 'all'}`}
        classes={classes}
        initialSession={initialSession}
        defaultClassId={defaultClassId}
        onClose={onClose}
        onSubmit={onSubmit}
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
    maxWidth: 500,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
  },
  fieldGroup: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  classChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  selectorButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorPrimary: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectorSecondary: {
    fontSize: 12,
    marginTop: 2,
  },
  calendarCard: {
    borderWidth: 1,
    borderRadius: 10,
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
    borderRadius: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekHeaderText: {
    width: '14.285%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%',
    aspectRatio: 1,
    maxHeight: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellText: {
    fontSize: 13,
  },
  dropdownList: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  lockedTimeBanner: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lockedTimeLabel: {
    fontSize: 12,
  },
  lockedTimeValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  submitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
