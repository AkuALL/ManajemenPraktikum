import { SessionStatus } from '@/types';

type StatusPresentation = {
  label: string;
  icon: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

const statusPresentations: Record<SessionStatus, StatusPresentation> = {
  upcoming: {
    label: 'Belum dibuka',
    icon: '◷',
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
    textColor: '#374151',
  },
  open: {
    label: 'Berlangsung',
    icon: '●',
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    textColor: '#166534',
  },
  closed: {
    label: 'Selesai',
    icon: '✓',
    backgroundColor: '#E5E7EB',
    borderColor: '#9CA3AF',
    textColor: '#374151',
  },
};

export function getStatusPresentation(status: SessionStatus): StatusPresentation {
  return statusPresentations[status];
}
