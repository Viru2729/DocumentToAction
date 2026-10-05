const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String },
    uploadDate: { type: Date, default: Date.now },
    processingStatus: {
        type: String,
        enum: ['pending', 'extracting', 'analyzing', 'completed', 'failed'],
        default: 'pending'
    },
    processingError: { type: String },
    extractedText: { type: String },
    extractedTextLength: { type: Number },
    isPossiblyScanned: { type: Boolean, default: false },
    analysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Analysis' }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
