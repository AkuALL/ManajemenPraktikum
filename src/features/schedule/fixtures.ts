import { LabSession } from '@/types';

export const SESSION_FIXTURES: LabSession[] = [
  {
    id: 'session-basis-data-01',
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
    id: 'session-dasar-pemrograman-01',
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
    id: 'session-jaringan-komputer-01',
    practicumName: 'Jaringan Komputer',
    courseClass: 'Kelas A',
    location: 'Lab Jaringan',
    date: '29 Okt 2026',
    startsAt: '09.00',
    endsAt: '11.00',
    status: 'closed',
    assistantName: 'Bayu Pratama, S.Kom.',
  },
];
