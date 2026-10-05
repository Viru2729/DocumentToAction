const mongoose = require('mongoose');

const connectDB = async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/document-to-action';
    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err.message);
    });
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');
};

module.exports = connectDB;
