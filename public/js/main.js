(function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const filePreview = document.getElementById('filePreview');
    const fileIconWrap = document.getElementById('fileIconWrap');
    const fileNameEl = document.getElementById('fileName');
    const fileSizeEl = document.getElementById('fileSize');
    const removeFileBtn = document.getElementById('removeFile');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadError = document.getElementById('uploadError');
    const uploadForm = document.getElementById('uploadForm');

    if (!dropZone) return;

    const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const ALLOWED_EXTS = ['.pdf', '.docx', '.txt'];
    const MAX_SIZE = 20 * 1024 * 1024;

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const getExt = (name) => {
        const dot = name.lastIndexOf('.');
        return dot >= 0 ? name.slice(dot).toLowerCase() : '';
    };

    const getIconClass = (ext) => {
        const map = { '.pdf': 'file-icon-pdf', '.docx': 'file-icon-docx', '.txt': 'file-icon-txt' };
        return map[ext] || 'file-icon-txt';
    };

    const showError = (msg) => {
        uploadError.textContent = msg;
        uploadError.style.display = 'block';
    };

    const hideError = () => {
        uploadError.style.display = 'none';
    };

    const validateFile = (file) => {
        const ext = getExt(file.name);
        if (!ALLOWED_EXTS.includes(ext)) {
            return 'Unsupported file type. Only PDF, DOCX, and TXT files are allowed.';
        }
        if (file.size === 0) {
            return 'The file appears to be empty.';
        }
        if (file.size > MAX_SIZE) {
            return 'File size exceeds the 20MB limit.';
        }
        return null;
    };

    const showFile = (file) => {
        const ext = getExt(file.name);
        const iconClass = getIconClass(ext);
        fileIconWrap.className = 'file-icon-wrap ' + iconClass;
        fileIconWrap.textContent = ext.replace('.', '').toUpperCase();
        fileNameEl.textContent = file.name;
        fileSizeEl.textContent = formatSize(file.size);
        filePreview.style.display = 'block';
        dropZone.style.display = 'none';
        uploadBtn.disabled = false;
        hideError();
    };

    const clearFile = () => {
        fileInput.value = '';
        filePreview.style.display = 'none';
        dropZone.style.display = 'block';
        uploadBtn.disabled = true;
        hideError();
    };

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const err = validateFile(file);
        if (err) { showError(err); fileInput.value = ''; return; }
        showFile(file);
    });

    removeFileBtn && removeFileBtn.addEventListener('click', clearFile);

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (!file) return;
        const err = validateFile(file);
        if (err) { showError(err); return; }
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        showFile(file);
    });

    uploadForm && uploadForm.addEventListener('submit', () => {
        uploadBtn.disabled = true;
        uploadBtn.querySelector('.btn-text').textContent = 'Uploading...';
    });
})();

(function() {
    const filterPriority = document.getElementById('filterPriority');
    const filterStatus = document.getElementById('filterStatus');
    const sortBy = document.getElementById('sortBy');
    const taskTable = document.getElementById('taskTable');

    if (!taskTable) return;

    const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3, Unknown: 4 };

    const applyFiltersAndSort = () => {
        const pVal = filterPriority ? filterPriority.value : '';
        const sVal = filterStatus ? filterStatus.value : '';
        const sortVal = sortBy ? sortBy.value : 'deadline';

        const tbody = taskTable.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr.task-row'));

        rows.forEach(row => {
            const rPriority = row.dataset.priority || '';
            const rStatus = row.dataset.status || '';
            const matchP = !pVal || rPriority === pVal;
            const matchS = !sVal || rStatus.toLowerCase().includes(sVal.toLowerCase());
            row.classList.toggle('hidden', !(matchP && matchS));
        });

        const visible = rows.filter(r => !r.classList.contains('hidden'));

        visible.sort((a, b) => {
            if (sortVal === 'priority') {
                return (PRIORITY_ORDER[a.dataset.priority] || 99) - (PRIORITY_ORDER[b.dataset.priority] || 99);
            }
            if (sortVal === 'deadline') {
                const dA = a.dataset.deadline ? new Date(a.dataset.deadline) : null;
                const dB = b.dataset.deadline ? new Date(b.dataset.deadline) : null;
                if (!dA && !dB) return 0;
                if (!dA) return 1;
                if (!dB) return -1;
                return dA - dB;
            }
            if (sortVal === 'status') {
                return (a.dataset.status || '').localeCompare(b.dataset.status || '');
            }
            return 0;
        });

        rows.forEach(r => tbody.appendChild(r));
    };

    filterPriority && filterPriority.addEventListener('change', applyFiltersAndSort);
    filterStatus && filterStatus.addEventListener('change', applyFiltersAndSort);
    sortBy && sortBy.addEventListener('change', applyFiltersAndSort);
})();
