const Datastore = require('@seald-io/nedb');
const path = require('path');
const fs = require('fs');

const dbDir = process.env.DB_PATH || path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const documents = new Datastore({ filename: path.join(dbDir, 'documents.db'), autoload: true });
const analyses = new Datastore({ filename: path.join(dbDir, 'analyses.db'), autoload: true });
const tasks = new Datastore({ filename: path.join(dbDir, 'tasks.db'), autoload: true });

documents.ensureIndex({ fieldName: 'createdAt' });
tasks.ensureIndex({ fieldName: 'documentId' });
tasks.ensureIndex({ fieldName: 'analysisId' });
analyses.ensureIndex({ fieldName: 'documentId' });

const insertAsync = (db, doc) => {
    return new Promise((resolve, reject) => {
        db.insert({ ...doc, createdAt: new Date(), updatedAt: new Date() }, (err, newDoc) => {
            if (err) reject(err); else resolve(newDoc);
        });
    });
};

const findAsync = (db, query, options = {}) => {
    return new Promise((resolve, reject) => {
        let cursor = db.find(query);
        if (options.sort) cursor = cursor.sort(options.sort);
        if (options.limit) cursor = cursor.limit(options.limit);
        cursor.exec((err, docs) => {
            if (err) reject(err); else resolve(docs);
        });
    });
};

const findOneAsync = (db, query) => {
    return new Promise((resolve, reject) => {
        db.findOne(query, (err, doc) => {
            if (err) reject(err); else resolve(doc);
        });
    });
};

const updateAsync = (db, query, update, options = {}) => {
    return new Promise((resolve, reject) => {
        db.update(query, { $set: { ...update, updatedAt: new Date() } }, options, (err, count) => {
            if (err) reject(err); else resolve(count);
        });
    });
};

const removeAsync = (db, query, options = {}) => {
    return new Promise((resolve, reject) => {
        db.remove(query, options, (err, count) => {
            if (err) reject(err); else resolve(count);
        });
    });
};

const insertManyAsync = (db, docs) => {
    return new Promise((resolve, reject) => {
        const withTimestamps = docs.map(d => ({ ...d, createdAt: new Date(), updatedAt: new Date() }));
        db.insert(withTimestamps, (err, newDocs) => {
            if (err) reject(err); else resolve(newDocs);
        });
    });
};

module.exports = {
    documents,
    analyses,
    tasks,
    insertAsync,
    findAsync,
    findOneAsync,
    updateAsync,
    removeAsync,
    insertManyAsync
};
