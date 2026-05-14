// Pre-made form templates for universities to use and customize

const FORM_TEMPLATES = {
  teaching_quality: {
    title: 'Teaching Quality Feedback',
    description: 'Evaluate the quality of teaching and instruction',
    questions: [
      {
        text: 'How clear and effective is the instructor\'s teaching?',
        answerType: 'rating',
        ratingScale: { min: 1, max: 5 }
      },
      {
        text: 'Does the instructor explain concepts well and answer questions?',
        answerType: 'rating',
        ratingScale: { min: 1, max: 5 }
      },
      {
        text: 'Is the teaching pace appropriate for your learning?',
        answerType: 'rating',
        ratingScale: { min: 1, max: 5 }
      },
      {
        text: 'What specific suggestions do you have to improve the teaching?',
        answerType: 'paragraph'
      }
    ]
  },

  infrastructure: {
    title: 'Infrastructure & Facilities Feedback',
    description: 'Assess campus infrastructure and learning facilities',
    questions: [
      {
        text: 'How satisfied are you with the classroom facilities?',
        answerType: 'rating',
        ratingScale: { min: 1, max: 5 }
      },
      {
        text: 'Rate the quality of lab equipment and technology.',
        answerType: 'rating',
        ratingScale: { min: 1, max: 5 }
      },
      {
        text: 'How reliable is the internet connectivity on campus?',
        answerType: 'rating',
        ratingScale: { min: 1, max: 5 }
      },
      {
        text: 'What infrastructure improvements are needed most urgently?',
        answerType: 'paragraph'
      }
    ]
  },

  course_content: {
    title: 'Course Content Feedback',
    description: 'Evaluate course curriculum and learning materials',
    questions: [
      {
        text: 'Is the course content relevant and aligned with learning objectives?',
        answerType: 'rating',
        ratingScale: { min: 1, max: 5 }
      },
      {
        text: 'Are the assignments and exams fair and well-aligned with teaching?',
        answerType: 'rating',
        ratingScale: { min: 1, max: 5 }
      },
      {
        text: 'How practical and applicable is the course content?',
        answerType: 'rating',
        ratingScale: { min: 1, max: 5 }
      },
      {
        text: 'Suggest improvements to course content or structure.',
        answerType: 'paragraph'
      }
    ]
  },

  overall_satisfaction: {
    title: 'Overall Course Satisfaction',
    description: 'General feedback on your overall learning experience',
    questions: [
      {
        text: 'Overall, how satisfied are you with this course?',
        answerType: 'rating',
        ratingScale: { min: 1, max: 5 }
      },
      {
        text: 'Would you recommend this course to other students?',
        answerType: 'rating',
        ratingScale: { min: 1, max: 5 }
      },
      {
        text: 'What was the most valuable aspect of this course?',
        answerType: 'paragraph'
      },
      {
        text: 'What could be improved most?',
        answerType: 'paragraph'
      }
    ]
  },

  support_services: {
    title: 'Support Services Feedback',
    description: 'Evaluate academic and student support services',
    questions: [
      {
        text: 'How accessible and helpful is academic support (tutoring, office hours)?',
        answerType: 'rating',
        ratingScale: { min: 1, max: 5 }
      },
      {
        text: 'Rate the quality of student counseling and career guidance services.',
        answerType: 'rating',
        ratingScale: { min: 1, max: 5 }
      },
      {
        text: 'How satisfied are you with administrative support?',
        answerType: 'rating',
        ratingScale: { min: 1, max: 5 }
      },
      {
        text: 'What support services are missing or need improvement?',
        answerType: 'paragraph'
      }
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
