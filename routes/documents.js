const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const {
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
} = require('../controllers/documentController');

router.post('/upload', upload.single('document'), uploadDocument);

router.get('/:id/processing', showProcessing);
router.post('/:id/analyze', startAnalysis);
router.get('/:id/status', getStatus);
router.get('/:id/dashboard', showDashboard);
router.get('/:id/tasks', getDocumentTasks);
router.get('/:id/tasks/:taskId', showTaskDetails);
router.delete('/:id', deleteDocument);
router.get('/:id', showDocument);
router.get('/', listDocuments);

module.exports = router;
