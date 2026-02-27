// ==========================================
// NAVIGATION SYSTEM
// Page routing and navigation setup
// ==========================================

import { NAV_STRUCTURE, AppState } from './config.js';
import { toggleSidebar } from './utils.js';
import { loadAdminData } from './modules/admin.js';
import { loadTeacherDashboard } from './modules/teacher.js';
import { loadStudentDashboard } from './modules/student.js';
import { loadTeacherCoursesForAttendance } from './modules/teacher-attendance.js';
import { loadTeacherCoursesForUpload, loadTeacherRecentUploads } from './modules/teacher-upload.js';
import { loadTeacherCoursesForNotif } from './modules/teacher-notifications.js';
import { loadStudentCourses } from './modules/student-courses.js';
import { loadStudentAttendance } from './modules/student-attendance.js';
import { loadAllNotifications } from './services/notification-service.js';
import { setupAdminNotifForm } from './modules/admin-notifications.js';

/**
 * Setup sidebar navigation based on user role
 */
export function setupNavigation() {
    const nav = document.getElementById('sidebarNav');
    const items = NAV_STRUCTURE[AppState.userRole] || NAV_STRUCTURE.student;
    
    nav.innerHTML = items.map(item => `
        <button onclick="window.navigateTo('${item.id}')" class="nav-item w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left" data-page="${item.id}">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${item.icon}"></path>
            </svg>
            <span class="font-medium">${item.label}</span>
        </button>
    `).join('');
}

/**
 * Setup mobile bottom navigation
 */
export function setupMobileNav() {
    const items = NAV_STRUCTURE[AppState.userRole] || NAV_STRUCTURE.student;
    const mobileItems = items.slice(0, 4);
    
    document.getElementById('mobileNav').innerHTML = mobileItems.map(item => `
        <button onclick="window.navigateTo('${item.id}')" class="flex flex-col items-center p-2 text-gray-600 hover:text-primary">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${item.icon}"></path>
            </svg>
            <span class="text-[10px] mt-1">${item.label.split(' ')[0]}</span>
        </button>
    `).join('');
}

/**
 * Navigate to specific page
 * @param {string} page - Page ID to navigate to
 */
export function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Show target page
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
        targetPage.classList.add('active');
        
        // Update page title
        const pageTitle = page.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        document.getElementById('pageTitle').textContent = pageTitle;
    }
    
    // Update active nav state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) item.classList.add('active');
    });
    
    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
        document.getElementById('sidebar').classList.add('sidebar-hidden');
    }
    
    // Load page-specific data
    loadPageData(page);
}

/**
 * Load data based on current page
 * @param {string} page 
 */
function loadPageData(page) {
    switch(page) {
        case 'admin-dashboard':
            loadAdminData();
            break;
        case 'admin-notifications':
            setupAdminNotifForm();
            break;
        case 'teacher-dashboard':
            loadTeacherDashboard();
            break;
        case 'teacher-attendance':
            loadTeacherCoursesForAttendance();
            break;
        case 'teacher-create-course':
            // Form is ready
            break;
        case 'teacher-upload':
            loadTeacherCoursesForUpload();
            loadTeacherRecentUploads();
            break;
        case 'teacher-notifications':
            loadTeacherCoursesForNotif();
            break;
        case 'student-dashboard':
            loadStudentDashboard();
            break;
        case 'student-courses':
            loadStudentCourses();
            break;
        case 'student-attendance':
            loadStudentAttendance();
            break;
        case 'student-notifications':
            loadAllNotifications();
            break;
    }
}

// Make navigateTo globally accessible
window.navigateTo = navigateTo;
window.toggleSidebar = toggleSidebar;