export class UIManager {
    constructor(app) {
        this.app = app;
    }

    init() {
        // Update navigation and display
    }

    showPage(page) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        // Show selected page
        const pageId = `${page}-page`;
        const pageEl = document.getElementById(pageId);
        if (pageEl) {
            pageEl.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === page);
        });
    }

    updateFileList(files) {
        const fileList = document.getElementById('fileList');
        if (!fileList) return;

        if (files.length === 0) {
            fileList.innerHTML = '';
            return;
        }

        let html = '<div style="margin-top: 24px;"><h3 style="font-weight: 600; margin-bottom: 12px;">선택된 파일</h3>';
        
        files.forEach(file => {
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            html += `
                <div class="file-item">
                    <div class="file-name">📄 ${file.name}</div>
                    <div class="file-size">${sizeMB}MB</div>
                    <div class="file-status">준비 중</div>
                </div>
            `;
        });
        
        html += '</div>';
        fileList.innerHTML = html;
    }

    updateFileProgress(fileName, progress, status) {
        const fileItems = document.querySelectorAll('.file-item');
        fileItems.forEach(item => {
            const name = item.querySelector('.file-name').textContent;
            if (name.includes(fileName)) {
                const statusEl = item.querySelector('.file-status');
                statusEl.className = `file-status ${status}`;
                
                if (status === 'success') {
                    statusEl.textContent = '✓ 완료';
                } else if (status === 'error') {
                    statusEl.textContent = '✗ 오류';
                } else {
                    statusEl.textContent = `${Math.round(progress)}%`;
                }
            }
        });
    }

    showAlert(type, message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <div class="alert-icon">
                ${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '!' : 'ℹ'}
            </div>
            <div>${message}</div>
        `;
        
        // Insert at top of main
        document.querySelector('main .container').insertBefore(alertDiv, document.querySelector('main .container').firstChild);
        
        // Remove after 5 seconds
        setTimeout(() => alertDiv.remove(), 5000);
    }
}