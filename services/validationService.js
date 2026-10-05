const validateAiResponse = (data) => {
    if (!data || typeof data !== 'object') {
        throw new Error('AI response is not a valid object.');
    }

    if (!data.document || typeof data.document !== 'object') {
        data.document = { title: null, type: null, summary: 'No summary available', objective: null };
    }

    if (!Array.isArray(data.tasks)) {
        data.tasks = [];
    }

    if (!Array.isArray(data.milestones)) data.milestones = [];
    if (!Array.isArray(data.events)) data.events = [];
    if (!Array.isArray(data.importantDates)) data.importantDates = [];
    if (!Array.isArray(data.contacts)) data.contacts = [];
    if (!Array.isArray(data.links)) data.links = [];
    if (!Array.isArray(data.overallTimeline)) data.overallTimeline = [];
    if (!Array.isArray(data.actionPlan)) data.actionPlan = [];

    data.tasks = data.tasks.map((task, index) => {
        const t = task || {};
        return {
            id: t.id || `T${String(index + 1).padStart(3, '0')}`,
            title: t.title || 'Untitled Task',
            description: t.description || null,
            responsiblePerson: t.responsiblePerson || null,
            department: t.department || null,
            startDate: t.startDate || null,
            startDateAmbiguous: t.startDateAmbiguous || false,
            deadline: t.deadline || null,
            deadlineAmbiguous: t.deadlineAmbiguous || false,
            time: t.time || null,
            duration: t.duration || null,
            estimatedEffort: t.estimatedEffort || null,
            priority: ['Critical', 'High', 'Medium', 'Low'].includes(t.priority) ? t.priority : 'Medium',
            priorityInferred: t.priorityInferred || false,
            status: t.status || 'Pending',
            dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
            prerequisites: Array.isArray(t.prerequisites) ? t.prerequisites : [],
            deliverables: Array.isArray(t.deliverables) ? t.deliverables : [],
            resources: Array.isArray(t.resources) ? t.resources : [],
            instructions: Array.isArray(t.instructions) ? t.instructions : [],
            risks: Array.isArray(t.risks) ? t.risks : [],
            consequences: t.consequences || null,
            location: t.location || null,
            contactPerson: t.contactPerson || null,
            constraints: Array.isArray(t.constraints) ? t.constraints : [],
            relatedTasks: Array.isArray(t.relatedTasks) ? t.relatedTasks : [],
            isRecurring: t.isRecurring || false,
            recurrencePattern: t.recurrencePattern || null,
            sourceText: t.sourceText || null
        };
    });

    return data;
};

const normalizeTasks = (tasks) => {
    return tasks.map(task => {
        const normalized = { ...task };
        normalized.deadlineResolved = resolveDate(task.deadline, task.deadlineAmbiguous);
        normalized.startDateResolved = resolveDate(task.startDate, task.startDateAmbiguous);
        return normalized;
    });
};

const resolveDate = (dateStr, isAmbiguous) => {
    if (!dateStr || isAmbiguous) return null;
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
};

const sortTasksByDeadline = (tasks) => {
    return [...tasks].sort((a, b) => {
        if (!a.deadlineResolved && !b.deadlineResolved) return 0;
        if (!a.deadlineResolved) return 1;
        if (!b.deadlineResolved) return -1;
        return new Date(a.deadlineResolved) - new Date(b.deadlineResolved);
    });
};

const computeStats = (tasks) => {
    const now = new Date();
    return {
        total: tasks.length,
        critical: tasks.filter(t => t.priority === 'Critical').length,
        high: tasks.filter(t => t.priority === 'High').length,
        medium: tasks.filter(t => t.priority === 'Medium').length,
        low: tasks.filter(t => t.priority === 'Low').length,
        overdue: tasks.filter(t => t.deadlineResolved && new Date(t.deadlineResolved) < now).length,
        upcoming: tasks.filter(t => {
            if (!t.deadlineResolved) return false;
            const diff = new Date(t.deadlineResolved) - now;
            return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
        }).length
    };
};

module.exports = { validateAiResponse, normalizeTasks, sortTasksByDeadline, computeStats };
