// Persistent File Storage System for Sales Shortlist Application
class FileStorageSystem {
    constructor() {
        this.apiBase = 'https://repole-sales-app.vercel.app/api';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadFiles();
    }

    setupEventListeners() {
        // File input change
        const fileInput = document.getElementById('persistentFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Drag and drop
        const dropZone = document.getElementById('persistentDropZone');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            dropZone.addEventListener('drop', (e) => this.handleDrop(e));
            dropZone.addEventListener('click', () => fileInput?.click());
        }

        // Upload button
        const uploadBtn = document.getElementById('persistentUploadBtn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => fileInput?.click());
        }

        // Refresh button
        const refreshBtn = document.getElementById('persistentRefreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadFiles());
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        const dropZone = document.getElementById('persistentDropZone');
        dropZone?.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        const dropZone = document.getElementById('persistentDropZone');
        dropZone?.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        const dropZone = document.getElementById('persistentDropZone');
        dropZone?.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        this.uploadFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.uploadFiles(files);
        e.target.value = ''; // Reset input
    }

    async uploadFiles(files) {
        if (!files || files.length === 0) return;

        // Validate files
        const validFiles = files.filter(file => {
            const validTypes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'text/csv'
            ];
            const validExtensions = ['.xlsx', '.xls', '.csv'];
            const hasValidExtension = validExtensions.some(ext => 
                file.name.toLowerCase().endsWith(ext)
            );
            const hasValidType = validTypes.includes(file.type);
            const validSize = file.size <= 10 * 1024 * 1024; // 10MB

            return (hasValidType || hasValidExtension) && validSize;
        });

        if (validFiles.length === 0) {
            this.showMessage('No valid Excel/CSV files found. Files must be .xlsx, .xls, or .csv and under 10MB.', 'warning');
            return;
        }

        if (validFiles.length < files.length) {
            this.showMessage(`${files.length - validFiles.length} file(s) were skipped (invalid type or too large).`, 'warning');
        }

        this.showLoading(true);

        try {
            const formData = new FormData();
            validFiles.forEach(file => {
                formData.append('files', file);
            });
            formData.append('uploader', 'Sales User'); // You can customize this

            const response = await fetch(`${this.apiBase}/upload`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showMessage(result.message, 'success');
                this.loadFiles(); // Refresh the file list
            } else {
                throw new Error(result.error || 'Upload failed');
            }

        } catch (error) {
            console.error('Upload error:', error);
            this.showMessage(`Upload failed: ${error.message}`, 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    async loadFiles() {
        try {
            const response = await fetch(`${this.apiBase}/files`);
            const result = await response.json();

            if (response.ok) {
                this.displayFiles(result.files || []);
            } else {
                throw new Error(result.error || 'Failed to load files');
            }

        } catch (error) {
            console.error('Load files error:', error);
            this.showMessage(`Failed to load files: ${error.message}`, 'danger');
        }
    }

    displayFiles(files) {
        const container = document.getElementById('persistentFilesList');
        if (!container) return;

        if (files.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-file-excel fa-3x mb-3"></i>
                    <p>No files uploaded yet</p>
                </div>
            `;
            return;
        }

        const filesHtml = files.map(file => {
            const uploadDate = new Date(file.uploadDate).toLocaleDateString();
            const fileSize = this.formatFileSize(parseInt(file.size));
            const fileIcon = this.getFileIcon(file.filename);

            return `
                <div class="file-item border rounded p-3 mb-2 d-flex justify-content-between align-items-center">
                    <div class="file-info d-flex align-items-center">
                        <i class="${fileIcon} fa-2x me-3 text-primary"></i>
                        <div>
                            <h6 class="mb-1">${this.escapeHtml(file.filename)}</h6>
                            <small class="text-muted">
                                Uploaded: ${uploadDate} • Size: ${fileSize} • By: ${this.escapeHtml(file.uploader)}
                            </small>
                        </div>
                    </div>
                    <div class="file-actions">
                        <button class="btn btn-sm btn-outline-primary me-2" onclick="fileStorage.downloadFile('${file.id}', '${this.escapeHtml(file.filename)}')">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="fileStorage.deleteFile('${file.id}', '${this.escapeHtml(file.filename)}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = filesHtml;
    }

    async downloadFile(fileId, filename) {
        try {
            const response = await fetch(`${this.apiBase}/download?fileId=${encodeURIComponent(fileId)}`);
            
            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('Download error:', error);
            this.showMessage(`Download failed: ${error.message}`, 'danger');
        }
    }

    async deleteFile(fileId, filename) {
        if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/delete?fileId=${encodeURIComponent(fileId)}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showMessage(`File "${filename}" deleted successfully`, 'success');
                this.loadFiles(); // Refresh the list
            } else {
                throw new Error(result.error || 'Delete failed');
            }

        } catch (error) {
            console.error('Delete error:', error);
            this.showMessage(`Delete failed: ${error.message}`, 'danger');
        }
    }

    getFileIcon(filename) {
        const ext = filename.toLowerCase().split('.').pop();
        switch (ext) {
            case 'xlsx':
            case 'xls':
                return 'fas fa-file-excel';
            case 'csv':
                return 'fas fa-file-csv';
            default:
                return 'fas fa-file';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showMessage(message, type = 'info') {
        // Create or update message container
        let messageContainer = document.getElementById('persistentFileMessages');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'persistentFileMessages';
            messageContainer.className = 'position-fixed top-0 end-0 p-3';
            messageContainer.style.zIndex = '9999';
            document.body.appendChild(messageContainer);
        }

        const alertId = 'alert-' + Date.now();
        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${this.escapeHtml(message)}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        messageContainer.insertAdjacentHTML('beforeend', alertHtml);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }

    showLoading(show) {
        const uploadBtn = document.getElementById('persistentUploadBtn');
        const dropZone = document.getElementById('persistentDropZone');
        
        if (show) {
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            }
            if (dropZone) {
                dropZone.style.pointerEvents = 'none';
                dropZone.style.opacity = '0.6';
            }
        } else {
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Files';
            }
            if (dropZone) {
                dropZone.style.pointerEvents = 'auto';
                dropZone.style.opacity = '1';
            }
        }
    }
}

// Initialize the file storage system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if the persistent file elements exist
    if (document.getElementById('persistentFileSection')) {
        window.fileStorage = new FileStorageSystem();
    }
});