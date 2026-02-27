/**
 * MINDSKYRA UI Utilities Module
 * Common UI components and helper functions
 */

const UI = {
    // Toast notifications
    toast: {
        container: null,
        
        init() {
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = 'toast-container';
                this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
                document.body.appendChild(this.container);
            }
        },
        
        show(message, type = 'success', duration = 3000) {
            this.init();
            
            const toast = document.createElement('div');
            const colors = {
                success: 'bg-green-500',
                error: 'bg-red-500',
                warning: 'bg-yellow-500',
                info: 'bg-blue-500',
                admin: 'bg-red-600'
            };
            
            toast.className = `${colors[type] || colors.success} text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0 flex items-center space-x-2`;
            toast.innerHTML = `
                <span>${message}</span>
                <button onclick="this.parentElement.remove()" class="ml-2 opacity-75 hover:opacity-100">×</button>
            `;
            
            this.container.appendChild(toast);
            
            // Animate in
            requestAnimationFrame(() => {
                toast.classList.remove('translate-x-full', 'opacity-0');
            });
            
            // Auto remove
            if (duration > 0) {
                setTimeout(() => {
                    toast.classList.add('translate-x-full', 'opacity-0');
                    setTimeout(() => toast.remove(), 300);
                }, duration);
            }
            
            return toast;
        }
    },

    // Modal dialogs
    modal: {
        active: null,
        
        show(id) {
            const modal = document.getElementById(id);
            if (!modal) return;
            
            this.active = modal;
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        },
        
        hide(id) {
            const modal = id ? document.getElementById(id) : this.active;
            if (!modal) return;
            
            modal.classList.remove('show');
            document.body.style.overflow = '';
            this.active = null;
        },
        
        toggle(id) {
            const modal = document.getElementById(id);
            if (modal.classList.contains('show')) {
                this.hide(id);
            } else {
                this.show(id);
            }
        }
    },

    // Loading spinner
    loader: {
        show(elementId, text = 'Loading...') {
            const element = document.getElementById(elementId);
            if (!element) return;
            
            element.disabled = true;
            element.dataset.originalText = element.innerHTML;
            element.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ${text}
            `;
        },
        
        hide(elementId) {
            const element = document.getElementById(elementId);
            if (!element) return;
            
            element.disabled = false;
            if (element.dataset.originalText) {
                element.innerHTML = element.dataset.originalText;
            }
        }
    },

    // Form validation
    validate: {
        email(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },
        
        phone(phone) {
            const re = /^[6-9]\d{9}$/;
            return re.test(phone.replace(/\D/g, ''));
        },
        
        required(value) {
            return value && value.trim().length > 0;
        },
        
        minLength(value, length) {
            return value && value.length >= length;
        }
    },

    // Confirmation dialog
    confirm(message, onConfirm, onCancel) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <h3 class="text-lg font-bold mb-4">Confirm Action</h3>
                <p class="text-gray-600 mb-6">${message}</p>
                <div class="flex space-x-3">
                    <button id="btn-cancel" class="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button id="btn-confirm" class="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Confirm</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#btn-cancel').onclick = () => {
            modal.remove();
            if (onCancel) onCancel();
        };
        
        modal.querySelector('#btn-confirm').onclick = () => {
            modal.remove();
            if (onConfirm) onConfirm();
        };
    },

    // File upload helper
    async uploadFile(file, path, onProgress) {
        const storageRef = firebase.storage().ref(path);
        const uploadTask = storageRef.put(file);
        
        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (onProgress) onProgress(progress);
                },
                (error) => reject(error),
                async () => {
                    const url = await uploadTask.snapshot.ref.getDownloadURL();
                    resolve(url);
                }
            );
        });
    },

    // Date formatting
    formatDate(timestamp, format = 'short') {
        const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
        
        const options = {
            short: { month: 'short', day: 'numeric' },
            long: { year: 'numeric', month: 'long', day: 'numeric' },
            time: { hour: '2-digit', minute: '2-digit' }
        };
        
        return date.toLocaleDateString('en-IN', options[format] || options.short);
    },

    // Currency formatting
    formatCurrency(amount) {
        return '₹' + amount.toLocaleString('en-IN');
    },

    // Debounce function
    debounce(fn, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    // Throttle function
    throttle(fn, limit) {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Initialize UI on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    UI.toast.init();
});

// Export for global use
window.UI = UI;
window.showToast = (message, type, duration) => UI.toast.show(message, type, duration);