const { documents, analyses, tasks, insertAsync, findAsync, findOneAsync, updateAsync, removeAsync } = require('../config/db');
const { processDocument } = require('../services/documentProcessor');
const { sortTasksByDeadline, computeStats } = require('../services/validationService');
const path = require('path');
const fs = require('fs');

const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.render('error', { title: 'Upload Failed', message: 'No file was uploaded.', error: null });
        }

        const ext = path.extname(req.file.originalname).toLowerCase();
        const doc = await insertAsync(documents, {
            originalName: req.file.originalname,
            storedName: req.file.filename,
            filePath: req.file.path,
            fileType: ext,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            uploadDate: new Date(),
            processingStatus: 'pending'
        });

        return res.redirect(`/documents/${doc._id}/processing`);
    } catch (err) {
        console.error('uploadDocument error:', err);
        return res.render('error', { title: 'Upload Failed', message: 'Failed to upload the document. Please try again.', error: null });
    }
};

const showProcessing = async (req, res) => {
    try {
        const doc = await findOneAsync(documents, { _id: req.params.id });
        if (!doc) return res.status(404).render('error', { title: 'Not Found', message: 'Document not found.', error: null });
        return res.render('processing', { title: 'Processing Document', document: doc });
    } catch (err) {
        console.error('showProcessing error:', err);
        return res.render('error', { title: 'Error', message: 'An error occurred.', error: null });
    }
};

const startAnalysis = async (req, res) => {
    try {
        const doc = await findOneAsync(documents, { _id: req.params.id });
        if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });

        if (doc.processingStatus === 'completed') {
            return res.json({ success: true, redirect: `/documents/${doc._id}/dashboard` });
        }

        processDocument(doc._id).then(() => {}).catch(err => console.error('Background analysis error:', err));

        return res.json({ success: true, message: 'Analysis started' });
    } catch (err) {
        console.error('startAnalysis error:', err);
        return res.status(500).json({ success: false, error: 'Failed to start analysis' });
    }
};

const getStatus = async (req, res) => {
    try {
        const doc = await findOneAsync(documents, { _id: req.params.id });
        if (!doc) return res.status(404).json({ error: 'Document not found' });
        return res.json({
            status: doc.processingStatus,
            error: doc.processingError,
            analysisId: doc.analysisId,
            isPossiblyScanned: doc.isPossiblyScanned
        });
    } catch (err) {
        console.error('getStatus error:', err);
        return res.status(500).json({ error: 'Status check failed' });
    }
};

const showDashboard = async (req, res) => {
    try {
        const doc = await findOneAsync(documents, { _id: req.params.id });
        if (!doc) return res.status(404).render('error', { title: 'Not Found', message: 'Document not found.', error: null });

        if (doc.processingStatus !== 'completed') {
            return res.redirect(`/documents/${doc._id}/processing`);
        }

        const analysis = doc.analysisId ? await findOneAsync(analyses, { _id: doc.analysisId }) : null;
        const taskList = await findAsync(tasks, { documentId: doc._id });

        const sortedTasks = sortTasksByDeadline(taskList);
        const stats = computeStats(sortedTasks);

        const now = new Date();
        const upcoming = sortedTasks.filter(t => {
            if (!t.deadlineResolved) return false;
            const diff = new Date(t.deadlineResolved) - now;
            return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
        });
        const overdue = sortedTasks.filter(t => t.deadlineResolved && new Date(t.deadlineResolved) < now);

        return res.render('dashboard', {
            title: (analysis && analysis.documentTitle) ? analysis.documentTitle : doc.originalName,
            document: doc,
            analysis,
            tasks: sortedTasks,
            stats,
            upcoming,
            overdue
        });
    } catch (err) {
        console.error('showDashboard error:', err);
        return res.render('error', { title: 'Error', message: 'Failed to load dashboard.', error: null });
    }
};

const listDocuments = async (req, res) => {
    try {
        const docs = await findAsync(documents, {}, { sort: { createdAt: -1 }, limit: 50 });
        return res.render('documents', { title: 'Document History', documents: docs });
    } catch (err) {
        console.error('listDocuments error:', err);
        return res.render('error', { title: 'Error', message: 'Failed to load documents.', error: null });
    }
};

const showDocument = async (req, res) => {
    try {
        const doc = await findOneAsync(documents, { _id: req.params.id });
        if (!doc) return res.status(404).render('error', { title: 'Not Found', message: 'Document not found.', error: null });
        const analysis = doc.analysisId ? await findOneAsync(analyses, { _id: doc.analysisId }) : null;
        return res.render('document-details', { title: doc.originalName, document: doc, analysis });
    } catch (err) {
        console.error('showDocument error:', err);
        return res.render('error', { title: 'Error', message: 'Failed to load document.', error: null });
    }
};

const showTaskDetails = async (req, res) => {
    try {
        const task = await findOneAsync(tasks, { _id: req.params.taskId });
        if (!task) return res.status(404).render('error', { title: 'Not Found', message: 'Task not found.', error: null });
        const doc = await findOneAsync(documents, { _id: task.documentId });
        task.documentId = doc;
        return res.render('task-details', { title: task.title, task });
    } catch (err) {
        console.error('showTaskDetails error:', err);
        return res.render('error', { title: 'Error', message: 'Failed to load task.', error: null });
    }
};

const deleteDocument = async (req, res) => {
    try {
        const doc = await findOneAsync(documents, { _id: req.params.id });
        if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });

        if (doc.filePath && fs.existsSync(doc.filePath)) {
            fs.unlinkSync(doc.filePath);
        }

        await removeAsync(tasks, { documentId: doc._id }, { multi: true });
        await removeAsync(analyses, { documentId: doc._id }, { multi: true });
        await removeAsync(documents, { _id: doc._id }, {});

        return res.json({ success: true });
    } catch (err) {
        console.error('deleteDocument error:', err);
        return res.status(500).json({ success: false, error: 'Failed to delete document' });
    }
};

const getDocumentTasks = async (req, res) => {
    try {
        const taskList = await findAsync(tasks, { documentId: req.params.id });
        return res.json({ tasks: taskList });
    } catch (err) {
        console.error('getDocumentTasks error:', err);
        return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
};

module.exports = {
    uploadDocument,
    showProcessing,
    startAnalysis,
    getStatus,
    showDashboard,
    listDocuments,
    showDocument,
    showTaskDetails,
    deleteDocument,
    getDocumentTasks
};
