const app = require('./app');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI_ATLAS || process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error('MONGO_URI_ATLAS or MONGO_URI is required. Set it in .env');
}

console.log('Connecting to MongoDB Atlas...');

mongoose.connect(MONGO_URI, {
  // Assumption: long-running API server with moderate concurrent traffic.
  maxPoolSize: 50,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 30000
})
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    const shutdown = () => {
      server.close(async () => {
        await mongoose.connection.close();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
