require('dotenv').config();

const express = require('express');
const path = require('path');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const morgan = require('morgan');

require('./config/db');

const documentRoutes = require('./routes/documents');

const app = express();
const PORT = process.env.PORT || 8080;

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(morgan('dev'));

app.get('/', (req, res) => {
    res.render('home', { title: 'Home' });
});

app.use('/documents', documentRoutes);

app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist.',
        error: null
    });
});

app.use((err, req, res, next) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).render('error', { title: 'File Too Large', message: 'File size exceeds the 20MB limit. Please upload a smaller file.', error: null });
    }
    if (err && err.message && (err.message.includes('Unsupported file type') || err.message.includes('file type'))) {
        return res.status(400).render('error', { title: 'Invalid File Type', message: err.message, error: null });
    }
    console.error('Unhandled error:', err);
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(500).json({ error: 'Internal server error' });
    }
    res.status(500).render('error', {
        title: 'Server Error',
        message: 'An unexpected error occurred. Please try again.',
        error: null
    });
});

app.listen(PORT, () => {
    console.log(`Document to Action running on http://localhost:${PORT}`);
});