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

function analyzeLocally(reason: string): LeaveSentiment | null {
  if (!classifySentiment) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Load the model on first use.
    const { createSentimentClassifier } = require('../../../ai/sentiment.js') as SentimentModule;
    classifySentiment = createSentimentClassifier(require('../../../ai/model-edom.json'));
  }

  return classifySentiment(reason).label;
}

export async function analyzeLeaveSentiment(
  reason: string,
  classifyWithGemini: (text: string) => Promise<{ label: LeaveSentiment | null } | null>,
): Promise<LeaveSentimentAnalysis> {
  const text = reason.trim();
  let label: LeaveSentiment | null = null;
  if (text) {
    try {
      label = analyzeLocally(text);
    } catch {
      // Gemini can supply a result when the local model cannot run.
    }
    if (label === null) {
      const fallback = await classifyWithGemini(text);
      if (fallback) return { model: 'gemini', label: fallback.label };
    }
  }

  return { model: SENTIMENT_MODEL, label };
}

export function parseLeaveSentiment(value: unknown): LeaveSentimentAnalysis | undefined {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('model' in value) ||
    (value.model !== SENTIMENT_MODEL && value.model !== 'gemini') ||
    !('label' in value)
  ) {
    return undefined;
  }

  const { model, label } = value;
  if (label === null || label === 'positif' || label === 'netral' || label === 'negatif') {
    return { model, label };
  }
  return undefined;
}

export function formatLeaveSentiment(analysis?: LeaveSentimentAnalysis): string {
  if (!analysis) return 'Belum dianalisis';
  if (analysis.label === null) return 'Tidak dapat ditentukan';
  return SENTIMENT_LABELS[analysis.label];
}
