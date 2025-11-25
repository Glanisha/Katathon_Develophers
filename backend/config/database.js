// ...existing code...
const mongoose = require('mongoose');

const connectDB = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI is not set. Aborting DB connect.');
        return;
    }

    const options = {
        dbName: 'safewalk',
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000, // fail fast
    };

    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
        try {
            attempts += 1;
            console.log(`Attempting MongoDB connect (attempt ${attempts}/${maxAttempts})`);
            await mongoose.connect(uri, options);
            console.log('MongoDB connected successfully');
            return;
        } catch (error) {
            console.error(`MongoDB connection attempt ${attempts} failed:`, error.message || error);
            if (attempts >= maxAttempts) {
                console.error('Max MongoDB connection attempts reached. Giving up.');
                break;
            }
            // wait before retrying
            await new Promise((res) => setTimeout(res, 3000));
        }
    }
};

module.exports = connectDB;
// ...existing code...
