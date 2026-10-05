const { documents, analyses, tasks, insertAsync, findOneAsync, updateAsync, insertManyAsync } = require('../config/db');
const { extractText } = require('./extractionService');
const { analyzeDocument } = require('./aiService');
const { validateAiResponse, normalizeTasks } = require('./validationService');

const processDocument = async (documentId) => {
    const doc = await findOneAsync(documents, { _id: documentId });
    if (!doc) throw new Error('Document not found');

    try {
        await updateAsync(documents, { _id: documentId }, { processingStatus: 'extracting' });

        const { text, length, isPossiblyScanned } = await extractText(doc.filePath, doc.fileType);

        if (!text || text.trim().length < 10) {
            const errorMsg = isPossiblyScanned
                ? 'Document appears to be scanned or image-based. Text extraction returned minimal content.'
                : 'Document is empty or contains no extractable text.';
            await updateAsync(documents, { _id: documentId }, { processingStatus: 'failed', processingError: errorMsg, isPossiblyScanned });
            return { success: false, error: errorMsg };
        }

        await updateAsync(documents, { _id: documentId }, {
            extractedText: text,
            extractedTextLength: length,
            isPossiblyScanned,
            processingStatus: 'analyzing'
        });

        const startTime = Date.now();
        const uploadDate = doc.uploadDate ? new Date(doc.uploadDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        const { result: rawResult, chunksProcessed } = await analyzeDocument(text, uploadDate);
        const validated = validateAiResponse(rawResult);
        const normalizedTaskData = normalizeTasks(validated.tasks);

        const analysis = await insertAsync(analyses, {
            documentId,
            documentTitle: validated.document?.title || null,
            documentType: validated.document?.type || null,
            summary: validated.document?.summary || null,
            objective: validated.document?.objective || null,
            taskCount: normalizedTaskData.length,
            highPriorityCount: normalizedTaskData.filter(t => t.priority === 'High').length,
            criticalPriorityCount: normalizedTaskData.filter(t => t.priority === 'Critical').length,
            milestones: validated.milestones || [],
            events: validated.events || [],
            importantDates: validated.importantDates || [],
            contacts: validated.contacts || [],
            links: validated.links || [],
            overallTimeline: validated.overallTimeline || [],
            actionPlan: validated.actionPlan || [],
            processingDuration: Date.now() - startTime,
            chunksProcessed
        });

        const taskDocs = normalizedTaskData.map(t => ({
            documentId,
            analysisId: analysis._id,
            taskId: t.id,
            title: t.title,
            description: t.description || null,
            responsiblePerson: t.responsiblePerson || null,
            department: t.department || null,
            startDate: t.startDate || null,
            startDateResolved: t.startDateResolved || null,
            startDateAmbiguous: t.startDateAmbiguous || false,
            deadline: t.deadline || null,
            deadlineResolved: t.deadlineResolved || null,
            deadlineAmbiguous: t.deadlineAmbiguous || false,
            time: t.time || null,
            duration: t.duration || null,
            estimatedEffort: t.estimatedEffort || null,
            priority: t.priority || 'Medium',
            priorityInferred: t.priorityInferred || false,
            status: t.status || 'Pending',
            dependencies: t.dependencies || [],
            prerequisites: t.prerequisites || [],
            deliverables: t.deliverables || [],
            resources: t.resources || [],
            instructions: t.instructions || [],
            risks: t.risks || [],
            consequences: t.consequences || null,
            location: t.location || null,
            contactPerson: t.contactPerson || null,
            constraints: t.constraints || [],
            relatedTasks: t.relatedTasks || [],
            isRecurring: t.isRecurring || false,
            recurrencePattern: t.recurrencePattern || null,
            sourceText: t.sourceText || null
        }));

        if (taskDocs.length > 0) await insertManyAsync(tasks, taskDocs);

        await updateAsync(documents, { _id: documentId }, {
            processingStatus: 'completed',
            analysisId: analysis._id
        });

        return { success: true, analysisId: analysis._id };
    } catch (err) {
        console.error('processDocument error:', err);
        await updateAsync(documents, { _id: documentId }, {
            processingStatus: 'failed',
            processingError: err.message
        });
        return { success: false, error: err.message };
    }
};

module.exports = { processDocument };
