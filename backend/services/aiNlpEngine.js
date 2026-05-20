const CATEGORY_LABELS = ['teaching', 'infrastructure', 'course content', 'general'];
const SENTIMENT_MODEL = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
const ZERO_SHOT_MODEL = 'Xenova/bart-large-mnli';

const POSITIVE_THRESHOLD = 0.62;
const NEGATIVE_THRESHOLD = 0.62;
const CATEGORY_CONFIDENCE_THRESHOLD = 0.45;
const ANALYSIS_ENGINE = String(process.env.ANALYSIS_ENGINE || '').trim().toLowerCase();
const USE_TRANSFORMER_MODEL = ANALYSIS_ENGINE === 'transformers'
  || (ANALYSIS_ENGINE !== 'heuristic' && process.env.NODE_ENV !== 'production');
const GROQ_API_KEY = String(process.env.GROQ_API_KEY || '').trim();
const GROQ_MODEL = String(process.env.GROQ_MODEL || 'llama-3.1-8b-instant').trim();

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

function normalizeRating(rawRating) {
  const rating = Number.parseFloat(rawRating);
  if (Number.isNaN(rating)) {
    return null;
  }

  if (rating <= 0) {
    return 1;
  }

  if (rating > 5) {
    return 5;
  }

  return Math.round(rating);
}

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

function ratingToSentiment(rating) {
  if (rating === null) {
    return null;
  }

  if (rating <= 2) return 'negative';
  if (rating >= 4) return 'positive';
  return 'neutral';
}

function inferSentimentFromRatingAndText(text, rating, sentiment) {
  const ratingSentiment = ratingToSentiment(rating);
  if (!ratingSentiment) {
    return sentiment;
  }

  if (ratingSentiment === 'negative') {
    return 'negative';
  }

  if (ratingSentiment === 'positive' && sentiment === 'neutral') {
    return 'positive';
  }

  if (ratingSentiment === 'neutral' && sentiment === 'positive') {
    return 'neutral';
  }

  return sentiment;
}

async function analyzeWithGroq(text, rating) {
  const axios = require('axios');

  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: GROQ_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You analyze student feedback for a university dashboard. Return only JSON with keys sentiment, category, suggestion, alertFlag, alertReasons. sentiment must be positive, negative, or neutral. category must be teaching, infrastructure, course content, or general. alertReasons must be an array of short strings.'
        },
        {
          role: 'user',
          content: JSON.stringify({
            text,
            rating,
            ratingMeaning: '1-2 is negative, 3 is neutral, 4-5 is positive',
            categories: CATEGORY_LABELS
          })
        }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  );

  const content = response?.data?.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(content);

  return {
    sentiment: ['positive', 'negative', 'neutral'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
    category: CATEGORY_LABELS.includes(parsed.category) ? parsed.category : 'general',
    suggestion: typeof parsed.suggestion === 'string' && parsed.suggestion.trim()
      ? parsed.suggestion.trim()
      : buildSuggestion({ category: parsed.category || 'general', text, sentiment: parsed.sentiment || 'neutral' }),
    alertFlag: Boolean(parsed.alertFlag),
    alertReasons: Array.isArray(parsed.alertReasons) ? parsed.alertReasons.map((reason) => String(reason).trim()).filter(Boolean) : [],
    source: 'groq'
  };
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

async function analyzeFeedbackWithModel(rawText, rawRating) {
  const text = normalizeWhitespace(rawText);
  const rating = normalizeRating(rawRating);
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

  if (GROQ_API_KEY) {
    try {
      const groqAnalysis = await analyzeWithGroq(text, rating);
      const finalSentiment = inferSentimentFromRatingAndText(text, rating, groqAnalysis.sentiment);

      return {
        sentiment: finalSentiment,
        category: groqAnalysis.category,
        suggestion: groqAnalysis.suggestion,
        alertFlag: groqAnalysis.alertFlag || extractUrgentReasons(text).length > 0,
        alertReasons: unique([...groqAnalysis.alertReasons, ...extractUrgentReasons(text)]),
        modelSource: groqAnalysis.source,
        sentimentConfidence: ratingToSentiment(rating) ? 0.85 : 0.75,
        categoryConfidence: 0.75
      };
    } catch (err) {
      console.warn('Groq analysis failed, falling back to local analysis:', err.message);
    }
  }

  const analysis = USE_TRANSFORMER_MODEL
    ? await modelAnalyze(text).catch(() => fallbackAnalyze(text))
    : fallbackAnalyze(text);

  const finalSentiment = inferSentimentFromRatingAndText(text, rating, analysis.sentiment);

  const alertReasons = extractUrgentReasons(text);
  const suggestion = buildSuggestion({
    category: analysis.category,
    text,
    sentiment: finalSentiment
  });

  return {
    sentiment: finalSentiment,
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
