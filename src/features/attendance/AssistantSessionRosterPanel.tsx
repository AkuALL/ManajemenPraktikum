import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, Search, UserCheck, X } from 'lucide-react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { useLabs } from '@/features/labs/firestore-labs';
import {
  type ClassMember,
  type PracticumSession,
  type StudentCandidate,
  usePracticum,
} from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { confirmAction, showAlert } from '@/lib/cross-platform-alert';

import { recordAssistantAttendance } from './firestore-adapter';
import { resolveSessionLocationSummary } from './lab-location-fallback';
import { useSessionAttendance } from './useSessionAttendance';

const QUICK_REASONS = [
  'Kendala GPS di dalam lab',
  'Kamera QR bermasalah',
  'Perangkat tidak mendukung',
] as const;

export interface AssistantSessionRosterPanelProps {
  session: PracticumSession;
}

/**
 * Panel daftar praktikan yang belum presensi pada Detail Sesi Asisten
 * saat sesi sedang berlangsung (`open`), dilengkapi pencarian nama/NIM & set hadir manual.
 */
export function AssistantSessionRosterPanel({
  session,
}: AssistantSessionRosterPanelProps) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { labs } = useLabs();
  const { getClassMembers, getRegisteredStudents } = usePracticum();
  const { records, loading: loadingAttendance } = useSessionAttendance(
    session.id,
    session.classId,
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [memberSnapshot, setMemberSnapshot] = useState<{
    classId: string;
    members: ClassMember[];
  } | null>(null);
  const [registeredStudents, setRegisteredStudents] = useState<StudentCandidate[]>([]);
  const [manualTarget, setManualTarget] = useState<ClassMember | null>(null);
  const [manualReason, setManualReason] = useState('');
  const [manualSaving, setManualSaving] = useState(false);

  useEffect(() => {
    if (user?.role !== 'assistant') return;
    let cancelled = false;
    getRegisteredStudents()
      .then((list) => {
        if (!cancelled) setRegisteredStudents(list);
      })
      .catch(() => {
        if (!cancelled) setRegisteredStudents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [getRegisteredStudents, user?.role]);

  useEffect(() => {
    let cancelled = false;
    getClassMembers(session.classId)
      .then((list) => {
        if (!cancelled) {
          setMemberSnapshot({ classId: session.classId, members: list });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMemberSnapshot({ classId: session.classId, members: [] });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [getClassMembers, session.classId]);

  const classMembers = useMemo(
    () =>
      memberSnapshot?.classId === session.classId ? memberSnapshot.members : [],
    [memberSnapshot, session.classId],
  );
  const loadingMembers = memberSnapshot?.classId !== session.classId;

  const studentByKey = useMemo(() => {
    const map = new Map<string, StudentCandidate>();
    registeredStudents.forEach((student) => {
      if (student.authUid) map.set(student.authUid, student);
      map.set(student.userId, student);
      map.set(student.identifier.trim().toLowerCase(), student);
    });
    return map;
  }, [registeredStudents]);

  const attendedIds = useMemo(
    () => new Set(records.map((item) => item.studentId)),
    [records],
  );
  const attendedIdentifiers = useMemo(
    () => new Set(records.map((item) => item.studentIdentifier.trim().toLowerCase())),
    [records],
  );

  const missingMembers = useMemo(
    () =>
      classMembers.filter((member) => {
        const normalizedId = member.identifier.trim().toLowerCase();
        return (
          !attendedIds.has(member.userId) &&
          !attendedIdentifiers.has(normalizedId)
        );
      }),
    [attendedIdentifiers, attendedIds, classMembers],
  );

  const filteredMissing = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return missingMembers;
    return missingMembers.filter(
      (member) =>
        member.displayName.toLowerCase().includes(q) ||
        member.identifier.toLowerCase().includes(q),
    );
  }, [missingMembers, searchQuery]);

  const resolvedSessionCoords = useMemo(() => {
    if (
      typeof session.latitude === 'number' &&
      typeof session.longitude === 'number'
    ) {
      return session;
    }
    const fallback = resolveSessionLocationSummary(session, labs).summary;
    return {
      ...session,
      latitude: fallback.latitude,
      longitude: fallback.longitude,
    };
  }, [labs, session]);

  const handleConfirmManual = (member: ClassMember) => {
    if (!user || manualSaving) return;
    const registered =
      studentByKey.get(member.userId) ??
      studentByKey.get(member.identifier.trim().toLowerCase());
    const studentUid = registered?.authUid;

    if (!studentUid) {
      showAlert(
        'Akun praktikan belum siap',
        'Praktikan ini belum memiliki akun terdaftar yang dapat ditandai hadir.',
      );
      return;
    }
    if (manualReason.trim().length < 5) {
      showAlert(
        'Alasan diperlukan',
        'Tuliskan atau pilih alasan kendala minimal 5 karakter sebelum menandai hadir.',
      );
      return;
    }

    confirmAction({
      title: 'Konfirmasi Hadir Manual',
      message: `Tandai ${member.displayName} (${member.identifier}) hadir pada sesi ini?`,
      confirmText: 'Tandai Hadir',
      onConfirm: () => {
        void (async () => {
          setManualSaving(true);
          const result = await recordAssistantAttendance({
            session: resolvedSessionCoords,
            assistant: user,
            student: {
              uid: studentUid,
              displayName: registered?.displayName ?? member.displayName,
              identifier: member.identifier,
            },
            reason: manualReason,
          });
          setManualSaving(false);

          if (result.ok) {
            setManualTarget(null);
            setManualReason('');
            showAlert(
              'Presensi tercatat',
              `${member.displayName} berhasil ditandai hadir oleh Asisten.`,
            );
          } else {
            showAlert('Gagal mencatat presensi', result.message);
          }
        })();
      },
    });
  };

  if (user?.role !== 'assistant' || session.status !== 'open') {
    return null;
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <UserCheck size={16} color={colors.baltic} strokeWidth={2.2} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Belum Presensi
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {records.length} hadir · {missingMembers.length} belum presensi
          </Text>
        </View>

        <View style={[styles.countBadge, { backgroundColor: colors.rosySoft }]}>
          <Text style={[styles.countBadgeText, { color: colors.rosyDark }]}>
            {missingMembers.length} Mahasiswa
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.searchBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Search size={15} color={colors.textSubtle} strokeWidth={2} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Cari nama atau NIM praktikan..."
          placeholderTextColor={colors.textSubtle}
          style={[styles.searchInput, { color: colors.textPrimary }]}
        />
        {searchQuery.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hapus pencarian"
            onPress={() => setSearchQuery('')}
            style={styles.clearBtn}
          >
            <X size={14} color={colors.textSubtle} strokeWidth={2.2} />
          </Pressable>
        ) : null}
      </View>

      {loadingMembers || loadingAttendance ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.baltic} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Memuat daftar praktikan...
          </Text>
        </View>
      ) : classMembers.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Belum ada praktikan yang terdaftar di kelas ini.
        </Text>
      ) : missingMembers.length === 0 ? (
        <View
          style={[
            styles.allPresentBox,
            { backgroundColor: colors.pacificSoft, borderColor: colors.pacificLight },
          ]}
        >
          <Check size={16} color={colors.pacificDark} strokeWidth={2.4} />
          <Text style={[styles.allPresentText, { color: colors.pacificDark }]}>
            Seluruh praktikan pada kelas ini sudah tercatat hadir.
          </Text>
        </View>
      ) : filteredMissing.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Tidak ada praktikan belum presensi yang cocok dengan &ldquo;{searchQuery.trim()}&rdquo;.
        </Text>
      ) : (
        <View style={styles.list}>
          {filteredMissing.map((member) => {
            const isSelected = manualTarget?.userId === member.userId;
            return (
              <View key={member.userId} style={styles.memberWrap}>
                <View
                  style={[
                    styles.memberRow,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.memberInfo}>
                    <Text
                      style={[styles.memberName, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {member.displayName}
                    </Text>
                    <Text
                      style={[styles.memberNim, { color: colors.textSubtle }]}
                      numberOfLines={1}
                    >
                      {member.identifier}
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (isSelected) {
                        setManualTarget(null);
                        setManualReason('');
                      } else {
                        setManualTarget(member);
                        setManualReason('');
                      }
                    }}
                    style={({ pressed }) => [
                      styles.actionPill,
                      {
                        backgroundColor: isSelected
                          ? colors.surfaceMuted
                          : colors.balticSoft,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionPillText,
                        { color: isSelected ? colors.textPrimary : colors.baltic },
                      ]}
                    >
                      {isSelected ? 'Batal' : 'Set Hadir'}
                    </Text>
                  </Pressable>
                </View>

                {isSelected ? (
                  <View
                    style={[
                      styles.manualPanel,
                      {
                        backgroundColor: colors.surfaceMuted,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.manualLabel, { color: colors.textSecondary }]}>
                      Pilih atau tulis alasan presensi manual (min. 5 karakter):
                    </Text>

                    <View style={styles.quickRow}>
                      {QUICK_REASONS.map((preset) => (
                        <Pressable
                          key={preset}
                          accessibilityRole="button"
                          onPress={() => setManualReason(preset)}
                          style={({ pressed }) => [
                            styles.quickChip,
                            {
                              backgroundColor:
                                manualReason === preset
                                  ? colors.pacificSoft
                                  : colors.surface,
                              borderColor:
                                manualReason === preset
                                  ? colors.pacific
                                  : colors.border,
                            },
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.quickChipText,
                              {
                                color:
                                  manualReason === preset
                                    ? colors.pacificDark
                                    : colors.textSecondary,
                              },
                            ]}
                          >
                            {preset}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <TextInput
                      value={manualReason}
                      onChangeText={setManualReason}
                      editable={!manualSaving}
                      placeholder="Contoh: Kamera bermasalah / kendala GPS di lab"
                      placeholderTextColor={colors.textSubtle}
                      multiline
                      style={[
                        styles.manualInput,
                        {
                          color: colors.textPrimary,
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    />

                    <Pressable
                      accessibilityRole="button"
                      disabled={manualSaving}
                      onPress={() => handleConfirmManual(member)}
                      style={({ pressed }) => [
                        styles.confirmBtn,
                        {
                          backgroundColor: manualSaving
                            ? colors.disabledSurface
                            : colors.rosy,
                        },
                        pressed && !manualSaving && styles.pressed,
                      ]}
                    >
                      {manualSaving ? (
                        <ActivityIndicator size="small" color="#FCFCFA" />
                      ) : (
                        <Text style={styles.confirmBtnText}>
                          Konfirmasi Hadir Manual
                        </Text>
                      )}
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
  },
  subtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  countBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  countBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  searchBox: {
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  allPresentBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allPresentText: {
    flex: 1,
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12.5,
  },
  emptyText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
    lineHeight: 18,
  },
  list: {
    gap: 8,
  },
  memberWrap: {
    gap: 6,
  },
  memberRow: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
  },
  memberNim: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  actionPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actionPillText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
  },
  manualPanel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  manualLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quickChipText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11.5,
  },
  manualInput: {
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: 'top',
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
  },
  confirmBtn: {
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#FCFCFA',
  },
  pressed: {
    opacity: 0.78,
  },
});
