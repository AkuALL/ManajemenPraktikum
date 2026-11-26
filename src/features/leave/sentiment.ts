import type { LeaveSentiment, LeaveSentimentAnalysis } from '@/types';

const SENTIMENT_MODEL = 'edom-v1';
const SENTIMENT_LABELS: Record<LeaveSentiment, string> = {
  positif: 'Positif',
  netral: 'Netral',
  negatif: 'Negatif',
};

type ClassifySentiment = (reason: string) => { label: LeaveSentiment | null };
type SentimentModule = { createSentimentClassifier: (model: unknown) => ClassifySentiment };

let classifySentiment: ClassifySentiment | undefined;

export function analyzeLeaveSentiment(reason: string): LeaveSentimentAnalysis {
  if (!classifySentiment) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Load the model on first use.
    const { createSentimentClassifier } = require('../../../ai/sentiment.js') as SentimentModule;
    classifySentiment = createSentimentClassifier(require('../../../ai/model-edom.json'));
  }

  return { model: SENTIMENT_MODEL, label: classifySentiment(reason.trim()).label };
}

export function parseLeaveSentiment(value: unknown): LeaveSentimentAnalysis | undefined {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('model' in value) ||
    value.model !== SENTIMENT_MODEL ||
    !('label' in value)
  ) {
    return undefined;
  }

  const { label } = value;
  if (label === null || label === 'positif' || label === 'netral' || label === 'negatif') {
    return { model: SENTIMENT_MODEL, label };
  }
  return undefined;
}

export function formatLeaveSentiment(analysis?: LeaveSentimentAnalysis): string {
  if (!analysis) return 'Belum dianalisis';
  if (analysis.label === null) return 'Tidak dapat ditentukan';
  return SENTIMENT_LABELS[analysis.label];
}
