const { OpenAI } = require('openai');

const getClient = () => {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;

    if (!endpoint || !apiKey) {
        throw new Error('AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY must be set in environment variables.');
    }

    const isV1Style = endpoint.endsWith('/v1') || endpoint.includes('/openai/v1');

    if (isV1Style) {
        return new OpenAI({
            apiKey,
            baseURL: endpoint,
            defaultHeaders: { 'api-key': apiKey }
        });
    }

    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview';
    return new OpenAI({
        apiKey,
        baseURL: endpoint,
        defaultQuery: { 'api-version': apiVersion },
        defaultHeaders: { 'api-key': apiKey }
    });
};

const getModelDeployment = () => {
    const model = process.env.TEXT_MODEL_DEPLOYMENT || process.env.FOUNDRY_MODEL || 'gpt-4.1-mini';
    return model;
};

const SYSTEM_PROMPT = `You are an expert document analyst and task extractor. Your job is to analyze documents and extract every actionable item, requirement, task, deadline, event, and important date.

STRICT RULES:
- Never invent deadlines, people, responsibilities, dates, or any information not present in the document.
- Never convert ordinary informational statements into tasks without clear evidence of required action.
- Preserve exact dates when available in the document.
- Clearly distinguish between explicit information (directly stated) and inferred information.
- Identify every actionable requirement: what must be done, by whom, by when.
- Identify dependencies between tasks.
- Identify deadlines and their consequences.
- Identify important events separately from tasks (events do not require user action).
- Return ONLY valid JSON. No explanatory text before or after the JSON.
- Use null for missing single values and [] for missing array values.
- Include the source text from the document for every extracted action.
- Mark inferred priorities with "priorityInferred": true.
- Mark ambiguous dates with "dateAmbiguous": true.
- Do not turn presentations, announcements, or informational sentences into tasks unless action is required.

PRIORITY LEVELS: "Critical", "High", "Medium", "Low"
STATUS VALUES: Use exactly what the document says, or "Pending" if not stated.

Return ONLY this JSON structure:
{
  "document": {
    "title": "string or null",
    "type": "string or null",
    "summary": "string",
    "objective": "string or null"
  },
  "tasks": [
    {
      "id": "T001",
      "title": "string",
      "description": "string or null",
      "responsiblePerson": "string or null",
      "department": "string or null",
      "startDate": "string or null",
      "startDateAmbiguous": false,
      "deadline": "string or null",
      "deadlineAmbiguous": false,
      "time": "string or null",
      "duration": "string or null",
      "estimatedEffort": "string or null",
      "priority": "Critical|High|Medium|Low",
      "priorityInferred": false,
      "status": "string or null",
      "dependencies": [],
      "prerequisites": [],
      "deliverables": [],
      "resources": [],
      "instructions": [],
      "risks": [],
      "consequences": "string or null",
      "location": "string or null",
      "contactPerson": "string or null",
      "constraints": [],
      "relatedTasks": [],
      "isRecurring": false,
      "recurrencePattern": "string or null",
      "sourceText": "exact relevant quote from document"
    }
  ],
  "milestones": [
    { "title": "string", "date": "string or null", "description": "string or null" }
  ],
  "events": [
    { "title": "string", "date": "string or null", "time": "string or null", "location": "string or null", "description": "string or null" }
  ],
  "importantDates": [
    { "label": "string", "date": "string or null", "description": "string or null" }
  ],
  "contacts": [
    { "name": "string or null", "role": "string or null", "email": "string or null", "phone": "string or null", "department": "string or null" }
  ],
  "links": [],
  "overallTimeline": [
    { "phase": "string", "startDate": "string or null", "endDate": "string or null", "description": "string or null", "tasks": [] }
  ],
  "actionPlan": [
    { "step": 1, "title": "string", "description": "string or null", "taskIds": [] }
  ]
}`;

const buildUserPrompt = (text, uploadDate) => {
    return `Today's date for context: ${uploadDate}

DOCUMENT CONTENT:
---
${text}
---

Analyze this document thoroughly. Extract all actionable tasks, deadlines, events, milestones, and important dates. Return only the JSON structure as specified. Do not include any text outside the JSON.`;
};

const MAX_CHARS_PER_CHUNK = 60000;

const splitIntoChunks = (text, maxChars) => {
    if (text.length <= maxChars) return [text];
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        let end = start + maxChars;
        if (end < text.length) {
            const lastNewline = text.lastIndexOf('\n', end);
            if (lastNewline > start + maxChars * 0.5) {
                end = lastNewline;
            }
        }
        chunks.push(text.slice(start, end));
        start = end;
    }
    return chunks;
};

const parseAiJson = (content) => {
    let cleaned = content.trim();
    const jsonMatch = cleaned.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) cleaned = jsonMatch[1].trim();
    const jsonBlock = cleaned.match(/```\s*([\s\S]*?)```/);
    if (jsonBlock) cleaned = jsonBlock[1].trim();
    return JSON.parse(cleaned);
};

const analyzeChunk = async (client, model, chunkText, chunkIndex, totalChunks, uploadDate) => {
    const chunkNote = totalChunks > 1
        ? `\n\nNote: This is chunk ${chunkIndex + 1} of ${totalChunks} of the document. Extract all tasks from this section only.`
        : '';
    const userContent = buildUserPrompt(chunkText + chunkNote, uploadDate);

    const response = await client.chat.completions.create({
        model,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent }
        ],
        temperature: 0.1,
        max_tokens: 8000,
        response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    return parseAiJson(content);
};

const mergeChunkResults = async (client, model, chunkResults, uploadDate) => {
    if (chunkResults.length === 1) return chunkResults[0];

    const mergePrompt = `You are merging task extraction results from multiple chunks of the same document into a single unified result.

Merge the following ${chunkResults.length} analysis results into one. Deduplicate tasks that appear in multiple chunks. Preserve all unique tasks, milestones, events, contacts, and dates. Maintain task IDs sequentially. Return only valid JSON in the same structure.

Chunk results:
${JSON.stringify(chunkResults, null, 2)}

Return the merged unified JSON.`;

    const response = await client.chat.completions.create({
        model,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: mergePrompt }
        ],
        temperature: 0.1,
        max_tokens: 8000,
        response_format: { type: 'json_object' }
    });

    return parseAiJson(response.choices[0].message.content);
};

const analyzeDocument = async (text, uploadDate) => {
    const client = getClient();
    const model = getModelDeployment();

    const chunks = splitIntoChunks(text, MAX_CHARS_PER_CHUNK);
    const chunkResults = [];

    for (let i = 0; i < chunks.length; i++) {
        const result = await analyzeChunk(client, model, chunks[i], i, chunks.length, uploadDate);
        chunkResults.push(result);
    }

    const merged = await mergeChunkResults(client, model, chunkResults, uploadDate);

    return {
        result: merged,
        chunksProcessed: chunks.length
    };
};

module.exports = { analyzeDocument };
