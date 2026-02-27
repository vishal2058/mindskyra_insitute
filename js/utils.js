// ==========================================
// UTILITY FUNCTIONS
// UI helpers, toggles, and general utilities
// ==========================================

import { AppState } from './config.js';

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'success' or 'error'
 */
export function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Toggle sidebar visibility
 */
export function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('sidebar-hidden');
}

/**
 * Toggle user menu dropdown
 */
export function toggleUserMenu() {
    document.getElementById('userDropdown').classList.toggle('hidden');
}

/**
 * Populate class dropdowns (3-12)
 */
export function populateClassDropdowns() {
    const classOptions = '<option value="">Select Class</option>' + 
        Array.from({length: 10}, (_, i) => `<option value="${i + 3}">Class ${i + 3}</option>`).join('');
    
    const feeClass = document.getElementById('feeClass');
    const courseClass = document.getElementById('courseClass');
    const notifClass = document.getElementById('notifClass');
    
    if (feeClass) feeClass.innerHTML = classOptions;
    if (courseClass) courseClass.innerHTML = classOptions;
    if (notifClass) notifClass.innerHTML = classOptions;
}

/**
 * Handle file selection for upload
 * @param {HTMLInputElement} input - File input element
 * @param {string} previewId - ID of preview element
 */
export function handleFileSelect(input, previewId) {
    const file = input.files[0];
    if (file) {
        const preview = document.getElementById(previewId);
        preview.textContent = `Selected: ${file.name}`;
        preview.classList.add('text-green-600', 'font-medium');
    }
}

/**
 * Handle payment proof upload
 * @param {HTMLInputElement} input - File input
 */
export function handlePaymentProof(input) {
    if (input.files[0]) {
        document.getElementById('paymentProofText').textContent = `Selected: ${input.files[0].name}`;
    }
}

/**
 * Close dropdowns when clicking outside
 */
export function setupClickOutsideListeners() {
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#userMenu')) {
            document.getElementById('userDropdown').classList.add('hidden');
        }
    });
}

/**
 * Setup drag and drop for file uploads
 */
export function setupDragAndDrop() {
    document.querySelectorAll('.upload-zone').forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });
        
        zone.addEventListener('dragleave', () => {
            zone.classList.remove('dragover');
        });
        
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
        });
    });
}

/**
 * Format currency
 * @param {number} amount 
 * @returns {string}
 */
export function formatCurrency(amount) {
    return '₹' + (amount || 0).toLocaleString();
}

/**
 * Get current academic year
 * @returns {string}
 */
export function getCurrentAcademicYear() {
    return '2024-25';
}