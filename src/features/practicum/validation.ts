import type { CreateClassInput, CreateSessionInput, StudentCandidate } from './types';

type ValidationResult<T> = { value: T } | { error: string };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const COHORT_OPTIONS = [
  'Semua Angkatan',
  '2021',
  '2022',
  '2023',
  '2024',
  '2025',
  '2026',
] as const;

export type SessionSlotId = 'slot-1' | 'slot-2' | 'slot-3' | 'slot-4' | 'slot-5' | 'custom';

export interface SessionTimeSlotOption {
  id: SessionSlotId;
  label: string;
  description: string;
  startsAt: string;
  endsAt: string;
}

export const SESSION_TIME_SLOTS: SessionTimeSlotOption[] = [
  { id: 'slot-1', label: 'Slot 1 (08.00 - 10.00)', description: 'Sesi Pagi 1', startsAt: '08:00', endsAt: '10:00' },
  { id: 'slot-2', label: 'Slot 2 (10.10 - 12.10)', description: 'Sesi Pagi 2', startsAt: '10:10', endsAt: '12:10' },
  { id: 'slot-3', label: 'Slot 3 (13.00 - 15.00)', description: 'Sesi Siang 1', startsAt: '13:00', endsAt: '15:00' },
  { id: 'slot-4', label: 'Slot 4 (15.40 - 17.40)', description: 'Sesi Sore', startsAt: '15:40', endsAt: '17:40' },
  { id: 'slot-5', label: 'Slot 5 (18.15 - 20.15)', description: 'Sesi Malam', startsAt: '18:15', endsAt: '20:15' },
  { id: 'custom', label: 'Opsi 6 (Jadwal Kustom)', description: 'Jadwal di luar 5 pilihan baku di atas', startsAt: '', endsAt: '' },
];

export function extractCohortYear(identifier: string): string | null {
  const trimmed = identifier.trim();
  if (!trimmed) return null;
  const fullYearMatch = /^(20\d{2})/.exec(trimmed);
  if (fullYearMatch) return fullYearMatch[1];

  const shortYearMatch = /^(\d{2})(?:\D|$|\d)/.exec(trimmed);
  if (shortYearMatch) {
    const twoDigits = Number(shortYearMatch[1]);
    if (twoDigits >= 18 && twoDigits <= 35) {
      return `20${shortYearMatch[1]}`;
    }
  }
  return null;
}

export function filterStudentCandidates(
  candidates: StudentCandidate[],
  existingMemberIds: string[],
  filters: { name?: string; nim?: string; cohort?: string },
): StudentCandidate[] {
  const existingSet = new Set(existingMemberIds);
  const nameQuery = filters.name?.trim().toLowerCase() ?? '';
  const nimQuery = filters.nim?.trim().toLowerCase() ?? '';
  const cohortQuery = filters.cohort?.trim() ?? '';

  return candidates.filter((student) => {
    if (existingSet.has(student.userId)) return false;
    if (nameQuery && !student.displayName.toLowerCase().includes(nameQuery)) {
      return false;
    }
    if (nimQuery && !student.identifier.toLowerCase().includes(nimQuery)) {
      return false;
    }
    if (cohortQuery && cohortQuery !== 'Semua Angkatan') {
      if (extractCohortYear(student.identifier) !== cohortQuery) return false;
    }
    return true;
  });
}

export function normalizeTimeInput(value: string): string {
  return value.trim().replace('.', ':');
}

export function detectSessionSlotId(startsAt: string, endsAt: string): SessionSlotId {
  const start = normalizeTimeInput(startsAt);
  const end = normalizeTimeInput(endsAt);
  const match = SESSION_TIME_SLOTS.find(
    (slot) => slot.id !== 'custom' && slot.startsAt === start && slot.endsAt === end,
  );
  return match ? match.id : 'custom';
}

export function formatCalendarDateLabel(dateStr: string): string {
  if (!isValidDate(dateStr)) return dateStr || 'Pilih tanggal';
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function isValidDate(value: string) {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(year, month - 1, day);

  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}

function toLocalDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toLocalTimeInput(value: Date) {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function defaultSessionDate() {
  return toLocalDateInput(new Date());
}

export function sessionDateInput(value?: string, fallback?: string): string {
  if (value && isValidDate(value)) return value;

  const parsed = value ? new Date(value) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) return toLocalDateInput(parsed);

  return fallback && fallback !== value ? sessionDateInput(fallback) : defaultSessionDate();
}

export function sessionTimeInput(value: string | undefined, fallback: string) {
  if (value && TIME_PATTERN.test(value)) return value;

  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? toLocalTimeInput(parsed) : fallback;
}

export function validateClassInput(input: CreateClassInput): ValidationResult<CreateClassInput> {
  const courseName = input.courseName.trim();
  const className = input.className.trim();
  const lab = input.lab?.trim();

  if (courseName.length < 2) return { error: 'Nama praktikum minimal 2 karakter' };
  if (courseName.length > 120) return { error: 'Nama praktikum maksimal 120 karakter' };
  if (className.length < 2) return { error: 'Nama kelas minimal 2 karakter' };
  if (className.length > 80) return { error: 'Nama kelas maksimal 80 karakter' };
  if (lab && lab.length > 120) return { error: 'Nama laboratorium maksimal 120 karakter' };

  return { value: { ...input, courseName, className, lab: lab || undefined } };
}

export function validateSessionInput(
  input: {
    classId: string;
    title: string;
    location: string;
    date: string;
    startsAt: string;
    endsAt: string;
  },
  options?: { allowPast?: boolean; now?: Date },
): ValidationResult<CreateSessionInput> {
  const classId = input.classId.trim();
  const title = input.title.trim();
  const location = input.location.trim();
  const date = input.date.trim();
  const startsAt = normalizeTimeInput(input.startsAt);
  const endsAt = normalizeTimeInput(input.endsAt);

  if (!classId) return { error: 'Pilih kelas praktikum terlebih dahulu' };
  if (title.length < 2) return { error: 'Judul sesi minimal 2 karakter' };
  if (title.length > 140) return { error: 'Judul sesi maksimal 140 karakter' };
  if (location.length < 2) return { error: 'Lokasi praktikum minimal 2 karakter' };
  if (location.length > 120) return { error: 'Lokasi praktikum maksimal 120 karakter' };
  if (!isValidDate(date)) return { error: 'Tanggal harus berformat YYYY-MM-DD dan valid' };
  if (!TIME_PATTERN.test(startsAt) || !TIME_PATTERN.test(endsAt)) {
    return { error: 'Waktu mulai dan selesai harus berformat HH:mm' };
  }

  const start = new Date(`${date}T${startsAt}:00`);
  const end = new Date(`${date}T${endsAt}:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: 'Timestamp waktu sesi tidak valid' };
  }
  if (end.getTime() <= start.getTime()) {
    return { error: 'Waktu selesai harus setelah waktu mulai' };
  }

  if (options?.allowPast !== true) {
    const referenceNow = options?.now ?? new Date();
    if (start.getTime() < referenceNow.getTime()) {
      return { error: 'Waktu mulai sesi baru tidak boleh berada di masa lalu' };
    }
  }

  return {
    value: {
      classId,
      title,
      location,
      date,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
    },
  };
}

