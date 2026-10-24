import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LabSession, SessionStatus, UserRole } from '@/types';
import { AssistantSessionActionControls } from '@/components/assistant';

// Data dummy sesi kanonis sesuai dokumen SRS & Desain Mockup
const INITIAL_SESSIONS: LabSession[] = [
  {
    id: 'ses-01',
    practicumName: 'Basis Data',
    courseClass: 'Kelas B',
    location: 'Lab Komputer 2',
    date: '27 Okt 2026',
    startsAt: '13.00',
    endsAt: '15.00',
    status: 'upcoming',
    assistantName: 'Bayu Pratama, S.Kom.',
  },
  {
    id: 'ses-02',
    practicumName: 'Dasar Pemrograman',
    courseClass: 'Kelas A',
    location: 'Lab RPL 1',
    date: '28 Okt 2026',
    startsAt: '08.00',
    endsAt: '10.00',
    status: 'open',
    assistantName: 'Bayu Pratama, S.Kom.',
  },
  {
    id: 'ses-03',
    practicumName: 'Jaringan Komputer',
    courseClass: 'Kelas A',
    location: 'Lab Jaringan',
    date: '26 Okt 2026',
    startsAt: '09.00',
    endsAt: '11.00',
    status: 'closed',
    assistantName: 'Bayu Pratama, S.Kom.',
  },
];

export default function AssistantActionsDemoScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  // State peran (untuk memverifikasi guard role: Asisten vs Praktikan)
  const [currentRole, setCurrentRole] = useState<UserRole>('assistant');

  // State daftar sesi lokal
  const [sessions, setSessions] = useState<LabSession[]>(INITIAL_SESSIONS);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('ses-01');

  const currentSession =
    sessions.find((s) => s.id === selectedSessionId) || sessions[0];

  // Callback transisi status kanonis (KA-02)
  const handleStatusChange = (sessionId: string, newStatus: SessionStatus) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: newStatus } : s))
    );
  };

  const handleResetSessions = () => {
    setSessions(INITIAL_SESSIONS);
  };

  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case 'upcoming':
        return {
          label: '◷ Belum dibuka',
          bgLight: '#EEEEEE',
          bgDark: '#292929',
          borderLight: '#D2D2D2',
          borderDark: '#414141',
          textLight: '#555555',
          textDark: '#C2C2C2',
        };
      case 'open':
        return {
          label: '● Berlangsung',
          bgLight: '#E8F5E9',
          bgDark: '#1B3822',
          borderLight: '#A5D6A7',
          borderDark: '#2E7D32',
          textLight: '#1B5E20',
          textDark: '#A5D6A7',
        };
      case 'closed':
        return {
          label: '✓ Selesai',
          bgLight: '#E0E0E0',
          bgDark: '#333333',
          borderLight: '#BDBDBD',
          borderDark: '#555555',
          textLight: '#424242',
          textDark: '#E0E0E0',
        };
    }
  };

  const badgeStyle = getStatusBadge(currentSession.status);

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        isDark ? styles.safeAreaDark : styles.safeAreaLight,
      ]}>
      {/* Header Bar */}
      <View
        style={[
          styles.headerBar,
          isDark ? styles.headerBarDark : styles.headerBarLight,
        ]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Kembali">
          <Text
            style={[
              styles.backButtonText,
              isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
            ]}>
            ‹ Kembali
          </Text>
        </Pressable>
        <Text
          style={[
            styles.headerTitle,
            isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
          ]}>
          Aksi Sesi Asisten
        </Text>
        <Pressable onPress={handleResetSessions} style={styles.resetButton}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Domain & Modul Badge */}
        <View
          style={[
            styles.metaBanner,
            isDark ? styles.metaBannerDark : styles.metaBannerLight,
          ]}>
          <Text
            style={[
              styles.metaTitle,
              isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
            ]}>
            Sprint 1 · Domain Kaka (Merdeka Dewa Zuliyanto)
          </Text>
          <Text
            style={[
              styles.metaSubtitle,
              isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
            ]}>
            FR-05 (Buka Sesi), FR-06 (Tutup Sesi), KA-01–KA-03 (Modal & Status Guard)
          </Text>
        </View>

        {/* Switcher Peran untuk Pengujian Guard */}
        <View style={styles.switchSection}>
          <Text
            style={[
              styles.sectionLabel,
              isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
            ]}>
            SIMULASI PERAN PENGGUNA
          </Text>
          <View style={styles.roleToggleRow}>
            <Pressable
              onPress={() => setCurrentRole('assistant')}
              style={[
                styles.roleToggleBtn,
                currentRole === 'assistant'
                  ? isDark
                    ? styles.roleToggleActiveDark
                    : styles.roleToggleActiveLight
                  : isDark
                    ? styles.roleToggleInactiveDark
                    : styles.roleToggleInactiveLight,
              ]}>
              <Text
                style={[
                  styles.roleToggleText,
                  currentRole === 'assistant'
                    ? isDark
                      ? styles.roleToggleTextActiveDark
                      : styles.roleToggleTextActiveLight
                    : isDark
                      ? styles.textSecondaryDark
                      : styles.textSecondaryLight,
                ]}>
                👨‍🏫 Asisten (Aktif Aksi)
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setCurrentRole('student')}
              style={[
                styles.roleToggleBtn,
                currentRole === 'student'
                  ? isDark
                    ? styles.roleToggleActiveDark
                    : styles.roleToggleActiveLight
                  : isDark
                    ? styles.roleToggleInactiveDark
                    : styles.roleToggleInactiveLight,
              ]}>
              <Text
                style={[
                  styles.roleToggleText,
                  currentRole === 'student'
                    ? isDark
                      ? styles.roleToggleTextActiveDark
                      : styles.roleToggleTextActiveLight
                    : isDark
                      ? styles.textSecondaryDark
                      : styles.textSecondaryLight,
                ]}>
                🎓 Praktikan (Guard Nonaktif)
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Pemilih Sesi Demo */}
        <View style={styles.switchSection}>
          <Text
            style={[
              styles.sectionLabel,
              isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
            ]}>
            PILIH SESI PRAKTIKUM
          </Text>
          <View style={styles.sessionChipsRow}>
            {sessions.map((s) => {
              const isSelected = s.id === selectedSessionId;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSelectedSessionId(s.id)}
                  style={[
                    styles.sessionChip,
                    isSelected
                      ? isDark
                        ? styles.sessionChipActiveDark
                        : styles.sessionChipActiveLight
                      : isDark
                        ? styles.sessionChipInactiveDark
                        : styles.sessionChipInactiveLight,
                  ]}>
                  <Text
                    style={[
                      styles.sessionChipText,
                      isSelected
                        ? isDark
                          ? styles.sessionChipTextActiveDark
                          : styles.sessionChipTextActiveLight
                        : isDark
                          ? styles.textSecondaryDark
                          : styles.textSecondaryLight,
                    ]}>
                    {s.practicumName}
                  </Text>
                  <Text style={styles.sessionChipStatus}>
                    {s.status === 'upcoming'
                      ? '◷'
                      : s.status === 'open'
                        ? '●'
                        : '✓'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Kartu Detail Sesi (Mockup Baseline) */}
        <View
          style={[
            styles.sessionCard,
            isDark ? styles.sessionCardDark : styles.sessionCardLight,
          ]}>
          <View style={styles.sessionHeaderRow}>
            <View>
              <Text
                style={[
                  styles.courseLabel,
                  isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
                ]}>
                MATA KULIAH
              </Text>
              <Text
                style={[
                  styles.practicumTitle,
                  isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
                ]}>
                {currentSession.practicumName}
              </Text>
            </View>

            {/* Status Badge */}
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isDark
                    ? badgeStyle.bgDark
                    : badgeStyle.bgLight,
                  borderColor: isDark
                    ? badgeStyle.borderDark
                    : badgeStyle.borderLight,
                },
              ]}>
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color: isDark ? badgeStyle.textDark : badgeStyle.textLight,
                  },
                ]}>
                {badgeStyle.label}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.divider,
              isDark ? styles.dividerDark : styles.dividerLight,
            ]}
          />

          {/* Grid Informasi Sesi */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text
                style={[
                  styles.infoLabel,
                  isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
                ]}>
                Kelas
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
                ]}>
                {currentSession.courseClass || 'Kelas A'}
              </Text>
            </View>

            <View style={styles.infoCol}>
              <Text
                style={[
                  styles.infoLabel,
                  isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
                ]}>
                Lokasi
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
                ]}>
                {currentSession.location}
              </Text>
            </View>

            <View style={styles.infoCol}>
              <Text
                style={[
                  styles.infoLabel,
                  isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
                ]}>
                Tanggal
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
                ]}>
                {currentSession.date || '27 Okt 2026'}
              </Text>
            </View>

            <View style={styles.infoCol}>
              <Text
                style={[
                  styles.infoLabel,
                  isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
                ]}>
                Waktu
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
                ]}>
                {currentSession.startsAt} – {currentSession.endsAt}
              </Text>
            </View>
          </View>
        </View>

        {/* KOMPONEN UTAMA KAKA: KONTROL AKSI ASISTEN */}
        <AssistantSessionActionControls
          role={currentRole}
          session={currentSession}
          onStatusChange={handleStatusChange}
          hideWhenStudent={false}
        />

        {/* Catatan Panduan Pengujian */}
        <View
          style={[
            styles.guideBox,
            isDark ? styles.guideBoxDark : styles.guideBoxLight,
          ]}>
          <Text
            style={[
              styles.guideTitle,
              isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
            ]}>
            💡 Checklist Pengujian Fitur:
          </Text>
          <Text
            style={[
              styles.guideItem,
              isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
            ]}>
            1. Pada status <Text style={styles.boldText}>Belum dibuka</Text>, tombol <Text style={styles.boldText}>Buka sesi</Text> muncul.
          </Text>
          <Text
            style={[
              styles.guideItem,
              isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
            ]}>
            2. Menekan <Text style={styles.boldText}>Buka sesi</Text> memicu modal konfirmasi. Tekan Batal untuk menguji pembatalan tanpa mutasi status.
          </Text>
          <Text
            style={[
              styles.guideItem,
              isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
            ]}>
            3. Menyetujui konfirmasi akan mengubah status menjadi <Text style={styles.boldText}>Berlangsung</Text> dan memicu toast feedback.
          </Text>
          <Text
            style={[
              styles.guideItem,
              isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
            ]}>
            4. Pada status <Text style={styles.boldText}>Berlangsung</Text>, tombol <Text style={styles.boldText}>Tutup sesi</Text> muncul.
          </Text>
          <Text
            style={[
              styles.guideItem,
              isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
            ]}>
            5. Menutup sesi mengubah status menjadi <Text style={styles.boldText}>Selesai</Text> dan menonaktifkan seluruh tombol aksi.
          </Text>
          <Text
            style={[
              styles.guideItem,
              isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
            ]}>
            6. Ubah peran ke <Text style={styles.boldText}>Praktikan</Text> untuk memverifikasi proteksi hak akses (RBAC guard).
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  safeAreaLight: {
    backgroundColor: '#F7F7F7',
  },
  safeAreaDark: {
    backgroundColor: '#111111',
  },
  headerBar: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerBarLight: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#D2D2D2',
  },
  headerBarDark: {
    backgroundColor: '#1C1C1C',
    borderBottomColor: '#414141',
  },
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingRight: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  resetButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingLeft: 8,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284C7',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  metaBanner: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  metaBannerLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D2D2D2',
  },
  metaBannerDark: {
    backgroundColor: '#1C1C1C',
    borderColor: '#414141',
  },
  metaTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  metaSubtitle: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  switchSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  roleToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleToggleBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  roleToggleActiveLight: {
    backgroundColor: '#171717',
    borderColor: '#171717',
  },
  roleToggleActiveDark: {
    backgroundColor: '#F5F5F5',
    borderColor: '#F5F5F5',
  },
  roleToggleInactiveLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D2D2D2',
  },
  roleToggleInactiveDark: {
    backgroundColor: '#1C1C1C',
    borderColor: '#414141',
  },
  roleToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  roleToggleTextActiveLight: {
    color: '#FFFFFF',
  },
  roleToggleTextActiveDark: {
    color: '#171717',
  },
  sessionChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sessionChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionChipActiveLight: {
    backgroundColor: '#171717',
    borderColor: '#171717',
  },
  sessionChipActiveDark: {
    backgroundColor: '#F5F5F5',
    borderColor: '#F5F5F5',
  },
  sessionChipInactiveLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D2D2D2',
  },
  sessionChipInactiveDark: {
    backgroundColor: '#1C1C1C',
    borderColor: '#414141',
  },
  sessionChipText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  sessionChipTextActiveLight: {
    color: '#FFFFFF',
  },
  sessionChipTextActiveDark: {
    color: '#171717',
  },
  sessionChipStatus: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '700',
  },
  sessionCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  sessionCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D2D2D2',
  },
  sessionCardDark: {
    backgroundColor: '#1C1C1C',
    borderColor: '#414141',
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  courseLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  practicumTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  dividerLight: {
    backgroundColor: '#EEEEEE',
  },
  dividerDark: {
    backgroundColor: '#292929',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoCol: {
    width: '46%',
  },
  infoLabel: {
    fontSize: 12,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  guideBox: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  guideBoxLight: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  guideBoxDark: {
    backgroundColor: '#082F49',
    borderColor: '#0369A1',
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  guideItem: {
    fontSize: 12,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
  },
  textPrimaryLight: {
    color: '#171717',
  },
  textPrimaryDark: {
    color: '#F5F5F5',
  },
  textSecondaryLight: {
    color: '#555555',
  },
  textSecondaryDark: {
    color: '#C2C2C2',
  },
});
