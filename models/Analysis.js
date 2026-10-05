const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    documentTitle: { type: String },
    documentType: { type: String },
    summary: { type: String },
    objective: { type: String },
    taskCount: { type: Number, default: 0 },
    highPriorityCount: { type: Number, default: 0 },
    criticalPriorityCount: { type: Number, default: 0 },
    milestones: [{ type: mongoose.Schema.Types.Mixed }],
    events: [{ type: mongoose.Schema.Types.Mixed }],
    importantDates: [{ type: mongoose.Schema.Types.Mixed }],
    contacts: [{ type: mongoose.Schema.Types.Mixed }],
    links: [{ type: String }],
    overallTimeline: [{ type: mongoose.Schema.Types.Mixed }],
    actionPlan: [{ type: mongoose.Schema.Types.Mixed }],
    rawAiResponse: { type: String },
    processingDuration: { type: Number },
    chunksProcessed: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('Analysis', analysisSchema);
