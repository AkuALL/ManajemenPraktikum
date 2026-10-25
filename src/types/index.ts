/**
 * Kontrak Data Minimum Sistem Manajemen Praktikum - Sprint 1
 * Dikelola oleh: Galang (Owner kontrak data lintas-domain)
 * Referensi: Jobdesc Programmer Sprint 1 Bagian 3
 */

import type { UserRole } from './session';

export * from './session';

export type UserIdentity = {
  role: UserRole;
  userId: string;
  displayName: string;
  identifier?: string; // misal NIM / NIP / Kode Asisten
};
