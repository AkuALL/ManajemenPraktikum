import type { CreateClassInput, CreateSessionInput } from './types';

type ValidationResult<T> = { value: T } | { error: string };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

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

export function validateSessionInput(input: {
  classId: string;
  title: string;
  location: string;
  date: string;
  startsAt: string;
  endsAt: string;
}): ValidationResult<CreateSessionInput> {
  const classId = input.classId.trim();
  const title = input.title.trim();
  const location = input.location.trim();
  const date = input.date.trim();
  const startsAt = input.startsAt.trim();
  const endsAt = input.endsAt.trim();

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
  if (start >= end) return { error: 'Waktu selesai harus setelah waktu mulai' };

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

