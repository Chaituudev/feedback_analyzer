// NLP accuracy evaluation framework with demo dataset and metrics

const { analyzeFeedbackWithModel } = require('./aiNlpEngine');

// Demo dataset for NLP accuracy testing
const DEMO_TEST_CASES = [
  {
    text: 'The teacher explains concepts very clearly and is always helpful during office hours.',
    expectedSentiment: 'positive',
    expectedCategory: 'teaching'
  },
  {
    text: 'The classroom is too cold and the projector is broken.',
    expectedSentiment: 'negative',
    expectedCategory: 'infrastructure'
  },
  {
    text: 'The course content is relevant but the assignments are sometimes unclear.',
    expectedSentiment: 'neutral',
    expectedCategory: 'course content'
  },
  {
    text: 'Harassment and bullying is happening in the classroom and it is unsafe.',
    expectedSentiment: 'negative',
    expectedCategory: 'teaching'
  },
  {
    text: 'Lab equipment works well and the IT support team is responsive.',
    expectedSentiment: 'positive',
    expectedCategory: 'infrastructure'
  },
  {
    text: 'The syllabus was updated last minute and assignments are too heavy.',
    expectedSentiment: 'negative',
    expectedCategory: 'course content'
  },
  {
    text: 'Teaching methods are traditional but effective for the subject.',
    expectedSentiment: 'neutral',
    expectedCategory: 'teaching'
  },
  {
    text: 'The campus WiFi is excellent and library facilities are amazing.',
    expectedSentiment: 'positive',
    expectedCategory: 'infrastructure'
  },
  {
    text: 'The course material is outdated and not relevant to industry standards.',
    expectedSentiment: 'negative',
    expectedCategory: 'course content'
  },
  {
    text: 'Overall, the experience was satisfactory with minor issues.',
    expectedSentiment: 'neutral',
    expectedCategory: 'general'
  },
  {
    text: 'Violence and threats were made during the class discussion.',
    expectedSentiment: 'negative',
    expectedCategory: 'general'
  },
  {
    text: 'The instructor is supportive and creates a great learning environment.',
    expectedSentiment: 'positive',
    expectedCategory: 'teaching'
  }
];

async function evaluateNLPAccuracy() {
  const results = {
    totalTests: DEMO_TEST_CASES.length,
    sentimentAccuracy: { correct: 0, total: DEMO_TEST_CASES.length },
    categoryAccuracy: { correct: 0, total: DEMO_TEST_CASES.length },
    detailedResults: []
  };

  for (const testCase of DEMO_TEST_CASES) {
    const analysis = await analyzeFeedbackWithModel(testCase.text);

    const sentimentCorrect = analysis.sentiment === testCase.expectedSentiment;
    const categoryCorrect = analysis.category === testCase.expectedCategory;

    if (sentimentCorrect) {
      results.sentimentAccuracy.correct += 1;
    }

    if (categoryCorrect) {
      results.categoryAccuracy.correct += 1;
    }

    results.detailedResults.push({
      text: testCase.text,
      expectedSentiment: testCase.expectedSentiment,
      predictedSentiment: analysis.sentiment,
      sentimentCorrect,
      sentimentConfidence: analysis.sentimentConfidence,
      expectedCategory: testCase.expectedCategory,
      predictedCategory: analysis.category,
      categoryCorrect,
      categoryConfidence: analysis.categoryConfidence,
      alertFlag: analysis.alertFlag,
      suggestion: analysis.suggestion
    });
  }

  results.sentimentAccuracyPercent = ((results.sentimentAccuracy.correct / results.sentimentAccuracy.total) * 100).toFixed(2);
  results.categoryAccuracyPercent = ((results.categoryAccuracy.correct / results.categoryAccuracy.total) * 100).toFixed(2);

  return results;
}

module.exports = {
  DEMO_TEST_CASES,
  evaluateNLPAccuracy
};
