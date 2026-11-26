import type { LeaveSentiment, LeaveSentimentAnalysis } from '@/types';

const EDOM_MODEL = 'edom-v1';
const EDOM_TIMEOUT_MS = 1_000;
const SENTIMENT_LABELS: Record<LeaveSentiment, string> = {
  positif: 'Positif',
  netral: 'Netral',
  negatif: 'Negatif',
};

type EdomClassifier = (text: string, checkDeadline: () => void) => { label: unknown };
type EdomModule = { createSentimentClassifier: (model: unknown) => EdomClassifier };

let classifyWithEdom: EdomClassifier | undefined;

export function tryAnalyzeLeaveWithEdom(reason: string): LeaveSentimentAnalysis | undefined {
  try {
    const deadline = performance.now() + EDOM_TIMEOUT_MS;
    const checkDeadline = () => {
      if (performance.now() >= deadline) throw new Error('Analisis EDOM melebihi batas waktu.');
    };
    if (!classifyWithEdom) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- Load EDOM only when it is needed.
      const { createSentimentClassifier } = require('../../../ai/sentiment.js') as EdomModule;
      classifyWithEdom = createSentimentClassifier(require('../../../ai/model-edom.json'));
    }
    checkDeadline();
    const { label } = classifyWithEdom(reason.trim(), checkDeadline);
    checkDeadline();

    const analysis = parseLeaveSentiment({ model: EDOM_MODEL, label });
    if (analysis?.label) return analysis;
  } catch {
    // An unavailable local result is handled by the Gemini fallback.
  }
  return undefined;
}

export function parseLeaveSentiment(value: unknown): LeaveSentimentAnalysis | undefined {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('model' in value) ||
    (value.model !== EDOM_MODEL && value.model !== 'gemini') ||
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

export function needsLeaveSentimentAnalysis(analysis?: LeaveSentimentAnalysis): boolean {
  return !analysis || (analysis.model === EDOM_MODEL && analysis.label === null);
}

export function formatLeaveSentiment(analysis?: LeaveSentimentAnalysis): string {
  if (!analysis) return 'Belum dianalisis';
  if (analysis.label === null) return 'Tidak dapat ditentukan';
  return SENTIMENT_LABELS[analysis.label];
}
