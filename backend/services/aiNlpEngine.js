const CATEGORY_LABELS = ['teaching', 'infrastructure', 'course content', 'general'];
const SENTIMENT_MODEL = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
const ZERO_SHOT_MODEL = 'Xenova/bart-large-mnli';

const POSITIVE_THRESHOLD = 0.62;
const NEGATIVE_THRESHOLD = 0.62;
const CATEGORY_CONFIDENCE_THRESHOLD = 0.45;

const URGENT_KEYWORDS = [
  'harassment',
  'discrimination',
  'abuse',
  'assault',
  'threat',
  'violence',
  'unsafe',
  'safety',
  'ragging',
  'bully',
  'self-harm',
  'suicide'
];

let pipelinesPromise;

function normalizeWhitespace(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function extractUrgentReasons(text) {
  const lower = text.toLowerCase();
  const reasons = URGENT_KEYWORDS
    .filter((keyword) => lower.includes(keyword))
    .map((keyword) => `Contains urgent keyword: ${keyword}`);

  return unique(reasons);
}

function heuristicSentiment(text) {
  const lower = text.toLowerCase();
  const positiveWords = ['good', 'great', 'excellent', 'helpful', 'clear', 'amazing', 'supportive'];
  const negativeWords = ['bad', 'poor', 'worst', 'hate', 'broken', 'problem', 'issue', 'delay', 'unsafe'];

  const positiveHits = positiveWords.filter((word) => lower.includes(word)).length;
  const negativeHits = negativeWords.filter((word) => lower.includes(word)).length;

  if (positiveHits > negativeHits) return { sentiment: 'positive', confidence: 0.55 };
  if (negativeHits > positiveHits) return { sentiment: 'negative', confidence: 0.55 };
  return { sentiment: 'neutral', confidence: 0.5 };
}

function heuristicCategory(text) {
  const lower = text.toLowerCase();

  if (/(teacher|teaching|faculty|explain|lecture|class)/.test(lower)) {
    return { category: 'teaching', confidence: 0.55 };
  }

  if (/(lab|infrastructure|facility|classroom|wifi|network|equipment|projector|building)/.test(lower)) {
    return { category: 'infrastructure', confidence: 0.55 };
  }

  if (/(syllabus|content|curriculum|assignment|exam|course)/.test(lower)) {
    return { category: 'course content', confidence: 0.55 };
  }

  return { category: 'general', confidence: 0.5 };
}

function normalizeSentimentResult(result) {
  const label = String(result?.label || '').toUpperCase();
  const score = Number(result?.score || 0);

  if (label.includes('POSITIVE') && score >= POSITIVE_THRESHOLD) {
    return { sentiment: 'positive', confidence: score };
  }

  if (label.includes('NEGATIVE') && score >= NEGATIVE_THRESHOLD) {
    return { sentiment: 'negative', confidence: score };
  }

  return { sentiment: 'neutral', confidence: score || 0.5 };
}

function normalizeCategoryResult(result) {
  const labels = Array.isArray(result?.labels) ? result.labels : [];
  const scores = Array.isArray(result?.scores) ? result.scores : [];

  if (!labels.length || !scores.length) {
    return { category: 'general', confidence: 0.5 };
  }

  const bestLabel = String(labels[0] || 'general').toLowerCase();
  const bestScore = Number(scores[0] || 0);

  if (bestScore < CATEGORY_CONFIDENCE_THRESHOLD) {
    return { category: 'general', confidence: bestScore || 0.5 };
  }

  if (bestLabel === 'teaching') return { category: 'teaching', confidence: bestScore };
  if (bestLabel === 'infrastructure') return { category: 'infrastructure', confidence: bestScore };
  if (bestLabel === 'course content') return { category: 'course content', confidence: bestScore };

  return { category: 'general', confidence: bestScore };
}

function buildSuggestion({ category, text, sentiment }) {
  const lower = text.toLowerCase();

  if (category === 'infrastructure' || /(lab|equipment|wifi|classroom|projector)/.test(lower)) {
    return 'Upgrade lab and classroom facilities to improve the learning environment.';
  }

  if (category === 'teaching' || /(teacher|lecture|explain|mentor|doubt)/.test(lower)) {
    return 'Improve teaching methods with clearer explanations and regular doubt-solving sessions.';
  }

  if (category === 'course content' || /(syllabus|content|curriculum|assignment|exam)/.test(lower)) {
    return 'Refine course content structure with more practical examples and balanced assessments.';
  }

  if (sentiment === 'negative') {
    return 'Schedule a focused quality review with students to identify and resolve recurring concerns.';
  }

  if (sentiment === 'positive') {
    return 'Maintain current strengths and gather specific suggestions to continuously improve quality.';
  }

  return 'Collect more detailed feedback and run a follow-up review to identify improvement opportunities.';
}

async function getPipelines() {
  if (pipelinesPromise) {
    return pipelinesPromise;
  }

  pipelinesPromise = (async () => {
    const transformers = await import('@xenova/transformers');
    const pipeline = transformers.pipeline;

    const sentimentClassifier = await pipeline('sentiment-analysis', SENTIMENT_MODEL);
    const zeroShotClassifier = await pipeline('zero-shot-classification', ZERO_SHOT_MODEL);

    return { sentimentClassifier, zeroShotClassifier };
  })();

  return pipelinesPromise;
}

async function modelAnalyze(text) {
  const { sentimentClassifier, zeroShotClassifier } = await getPipelines();

  const sentimentOutput = await sentimentClassifier(text);
  const sentimentArray = Array.isArray(sentimentOutput) ? sentimentOutput : [sentimentOutput];
  const sentimentResult = normalizeSentimentResult(sentimentArray[0] || {});

  const categoryOutput = await zeroShotClassifier(text, CATEGORY_LABELS, {
    multi_label: false
  });
  const categoryResult = normalizeCategoryResult(categoryOutput);

  return {
    sentiment: sentimentResult.sentiment,
    sentimentConfidence: sentimentResult.confidence,
    category: categoryResult.category,
    categoryConfidence: categoryResult.confidence,
    source: 'transformersjs'
  };
}

function fallbackAnalyze(text) {
  const sentimentResult = heuristicSentiment(text);
  const categoryResult = heuristicCategory(text);

  return {
    sentiment: sentimentResult.sentiment,
    sentimentConfidence: sentimentResult.confidence,
    category: categoryResult.category,
    categoryConfidence: categoryResult.confidence,
    source: 'heuristic-fallback'
  };
}

async function analyzeFeedbackWithModel(rawText) {
  const text = normalizeWhitespace(rawText);
  if (!text) {
    return {
      sentiment: 'neutral',
      category: 'general',
      suggestion: 'Collect more detailed feedback and run a follow-up review to identify improvement opportunities.',
      alertFlag: false,
      alertReasons: [],
      modelSource: 'none',
      sentimentConfidence: 0.5,
      categoryConfidence: 0.5
    };
  }

  let analysis;

  try {
    analysis = await modelAnalyze(text);
  } catch {
    analysis = fallbackAnalyze(text);
  }

  const alertReasons = extractUrgentReasons(text);
  const suggestion = buildSuggestion({
    category: analysis.category,
    text,
    sentiment: analysis.sentiment
  });

  return {
    sentiment: analysis.sentiment,
    category: analysis.category,
    suggestion,
    alertFlag: alertReasons.length > 0,
    alertReasons,
    modelSource: analysis.source,
    sentimentConfidence: analysis.sentimentConfidence,
    categoryConfidence: analysis.categoryConfidence
  };
}

module.exports = {
  analyzeFeedbackWithModel
};
