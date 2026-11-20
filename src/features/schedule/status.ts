import { SessionStatus } from '@/types';

type StatusPresentation = {
  label: string;
  tone: 'scheduled' | 'open' | 'closed';
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  dotColor: string;
};

const statusPresentations: Record<SessionStatus, StatusPresentation> = {
  upcoming: {
    label: 'Terjadwal',
    tone: 'scheduled',
    backgroundColor: '#E9F1F6',
    borderColor: '#DCE4EA',
    textColor: '#12597F',
    dotColor: '#1FA7C1',
  },
  open: {
    label: 'Berlangsung',
    tone: 'open',
    backgroundColor: '#FCF0ED',
    borderColor: '#F3D3CC',
    textColor: '#D55036',
    dotColor: '#D55036',
  },
  closed: {
    label: 'Selesai',
    tone: 'closed',
    backgroundColor: '#E8F7FA',
    borderColor: '#BCE8F2',
    textColor: '#0E6F83',
    dotColor: '#1FA7C1',
  },
};

export function getStatusPresentation(status: SessionStatus): StatusPresentation {
  return statusPresentations[status];
}
