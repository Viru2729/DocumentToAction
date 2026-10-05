const fs = require('fs');
const path = require('path');

const extractFromPdf = async (filePath) => {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text || '';
};

const extractFromDocx = async (filePath) => {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
};

const extractFromTxt = async (filePath) => {
    return fs.readFileSync(filePath, 'utf8');
};

const normalizeText = (text) => {
    return text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ')
        .replace(/[ ]{3,}/g, '  ')
        .replace(/\n{4,}/g, '\n\n\n')
        .replace(/[^\S\n]+/g, ' ')
        .trim();
};

const extractText = async (filePath, fileType) => {
    let rawText = '';
    const ext = fileType.toLowerCase();

    if (ext === '.pdf') {
        rawText = await extractFromPdf(filePath);
    } else if (ext === '.docx') {
        rawText = await extractFromDocx(filePath);
    } else if (ext === '.txt') {
        rawText = await extractFromTxt(filePath);
    } else {
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    const normalized = normalizeText(rawText);
    const isPossiblyScanned = ext === '.pdf' && normalized.trim().length < 100;

    return {
        text: normalized,
        length: normalized.length,
        isPossiblyScanned
    };
};

module.exports = { extractText };
