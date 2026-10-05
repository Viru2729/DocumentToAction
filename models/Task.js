const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    analysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Analysis', required: true },
    taskId: { type: String },
    title: { type: String, required: true },
    description: { type: String },
    responsiblePerson: { type: String },
    department: { type: String },
    startDate: { type: String },
    startDateResolved: { type: Date },
    deadline: { type: String },
    deadlineResolved: { type: Date },
    deadlineAmbiguous: { type: Boolean, default: false },
    time: { type: String },
    duration: { type: String },
    estimatedEffort: { type: String },
    priority: { type: String, enum: ['Critical', 'High', 'Medium', 'Low', 'Unknown'], default: 'Medium' },
    priorityInferred: { type: Boolean, default: false },
    status: { type: String, default: 'Pending' },
    dependencies: [{ type: String }],
    prerequisites: [{ type: String }],
    deliverables: [{ type: String }],
    resources: [{ type: String }],
    instructions: [{ type: String }],
    risks: [{ type: String }],
    consequences: { type: String },
    relatedTasks: [{ type: String }],
    location: { type: String },
    contactPerson: { type: String },
    constraints: [{ type: String }],
    sourceText: { type: String },
    isRecurring: { type: Boolean, default: false },
    recurrencePattern: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
