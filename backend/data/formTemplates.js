// Pre-made form templates for universities to use and customize

const FORM_TEMPLATES = {
  teaching_quality: {
    title: 'Teaching Quality Feedback',
    description: 'Evaluate clarity, pace, engagement, and teaching support',
    questions: [
      { text: 'How clear and effective is the instructor\'s teaching?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'Does the instructor explain concepts with enough examples?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'Is the teaching pace appropriate for your learning speed?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'How well does the teacher respond to student questions?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'How engaging are the classes and discussions?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'How well does the teacher connect theory with practice?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'How consistent is the teacher in covering planned topics?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'How supportive is the teacher outside the classroom?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'What teaching methods helped you learn the most?', answerType: 'paragraph' },
      { text: 'What specific changes would improve the teaching experience?', answerType: 'paragraph' }
    ]
  },

  infrastructure: {
    title: 'Infrastructure & Fadlities Feedback',
    description: 'Assess classrooms, labs, technology, and campus support spaces',
    questions: [
      { text: 'How satisfied are you with the classroom facilities?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'Rate the quality of lab equipment and technology.', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'How reliable is the internet connectivity on campus?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'How clean and well maintained are the classrooms?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'How comfortable are the seating and learning areas?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'How accessible are the library and study resources?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'How effective is the campus support for repairs and maintenance?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'How safe do you feel in the campus facilities?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'Which infrastructure area needs the most improvement?', answerType: 'paragraph' },
      { text: 'What facilities should be added or upgraded first?', answerType: 'paragraph' }
    ]
  },

  program_satisfaction: {
    title: 'Program Satisfaction Feedback',
    description: 'Evaluate department teaching quality, facilities, and student support',
    questions: [
      { text: 'Are you satisfied with the teaching quality in the department?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'Are the faculty members supportive and helpful?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'Is the syllabus completed on time?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'Are practical labs conducted properly?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'Is the department environment good for learning?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'Are classroom facilities satisfactory?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'Are departmental activities and workshops useful?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'Are study materials provided properly?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'Does the department help students in placements and internships?', answerType: 'rating', ratingScale: { min: 1, max: 5 } },
      { text: 'Would you recommend this department to other students?', answerType: 'rating', ratingScale: { min: 1, max: 5 } }
    ]
  }
};

module.exports = {
  FORM_TEMPLATES,
  getTemplateList: () => Object.entries(FORM_TEMPLATES).map(([key, value]) => ({
    id: key,
    title: value.title,
    description: value.description
  })),
  getTemplate: (templateId) => FORM_TEMPLATES[templateId] || null
};
