const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('./models/User');
const University = require('./models/University');
const Form = require('./models/Form');
const Feedback = require('./models/Feedback');
const { generateUniqueCode } = require('./utils/codeGenerator');

async function seedDatabase() {
  try {
    const mongoUri = process.env.MONGO_URI_ATLAS || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI_ATLAS or MONGO_URI is required. Set it in the root .env or deployment env vars.');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    console.log('🔄 Clearing existing data...');
    await Feedback.deleteMany({});
    await Form.deleteMany({});
    await User.deleteMany({});
    await University.deleteMany({});

    console.log('📚 Creating university...');
    const universityCode = await generateUniqueCode(University, 'universityCode', 'UNI');
    const university = await University.create({ name: 'Demo University', universityCode });

    console.log('👨‍💼 Creating admin...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      name: 'Admin University',
      email: 'admin@university.com',
      password: adminPassword,
      role: 'admin',
      universityCode,
      universityId: university._id
    });

    console.log('👨‍🏫 Creating teacher...');
    const teacherCode = await generateUniqueCode(User, 'teacherCode', 'TEA');
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    const teacher = await User.create({
      name: 'Demo Teacher',
      email: 'teacher@university.com',
      password: teacherPassword,
      role: 'teacher',
      teacherCode,
      universityId: university._id
    });

    console.log('📋 Creating form...');
    const form = await Form.create({
      title: 'Student Feedback Form',
      questions: ['How satisfied are you with teaching?', 'Rate the course content', 'Rate infrastructure'],
      type: 'public',
      assignedTeachers: [teacher._id],
      createdBy: admin._id,
      isActive: true
    });

    console.log('👥 Creating students...');
    const students = [];
    for (let i = 1; i <= 5; i++) {
      const password = await bcrypt.hash(`student${i}123`, 10);
      const student = await User.create({
        name: `Student ${i}`,
        email: `student${i}@university.com`,
        password,
        role: 'student',
        teacherId: teacher._id
      });
      students.push(student);
      teacher.students.push(student._id);
    }
    await teacher.save();

    console.log('⭐ Creating 50 feedbacks...');
    const feedbacks = [];
    
    // 18 positive
    for (let i = 0; i < 18; i++) {
      feedbacks.push({
        formId: form._id,
        studentId: students[i % 5]._id,
        teacherId: teacher._id,
        rating: 5,
        answers: [{ question: 'Feedback', answer: 'Excellent teaching and content' }],
        rawText: 'Excellent teaching and content',
        sentiment: 'positive',
        category: 'teaching',
        suggestion: 'Continue great work'
      });
    }
    
    // 18 negative
    for (let i = 0; i < 18; i++) {
      const alertFlag = i < 2;
      feedbacks.push({
        formId: form._id,
        studentId: students[i % 5]._id,
        teacherId: teacher._id,
        rating: 2,
        answers: [{ question: 'Feedback', answer: 'Poor experience' }],
        rawText: alertFlag ? (i === 0 ? 'I felt unsafe' : 'There is harassment') : 'Course needs improvement',
        sentiment: 'negative',
        category: 'teaching',
        suggestion: 'Improve teaching methods',
        alertFlag,
        alertReasons: alertFlag ? ['Alert keyword found'] : []
      });
    }
    
    // 14 neutral
    for (let i = 0; i < 14; i++) {
      feedbacks.push({
        formId: form._id,
        studentId: students[i % 5]._id,
        teacherId: teacher._id,
        rating: 3,
        answers: [{ question: 'Feedback', answer: 'Average experience' }],
        rawText: 'Average experience',
        sentiment: 'neutral',
        category: 'teaching',
        suggestion: 'Consider improvements'
      });
    }

    await Feedback.insertMany(feedbacks);
    
    console.log('\n✅ Database seeded successfully!');
    console.log('📊 Created 50 feedbacks (18 positive, 18 negative, 14 neutral)');
    console.log('\n🔐 Test Credentials:');
    console.log('   Admin: admin@university.com / admin123');
    console.log('   Teacher: teacher@university.com / teacher123');
    console.log('   Student: student1@university.com / student1123');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seedDatabase();
