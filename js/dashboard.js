/**
 * MINDSKYRA Dashboard Module
 * Handles role-based dashboard loading and rendering
 */

// Dashboard configurations by role
const dashboardConfig = {
    student: {
        sidebarColor: 'bg-blue-600',
        navItems: [
            { id: 'dashboard', label: 'Dashboard', icon: 'home', default: true },
            { id: 'courses', label: 'My Courses', icon: 'book' },
            { id: 'fees', label: 'Fees', icon: 'credit-card' },
            { id: 'attendance', label: 'Attendance', icon: 'check-circle' },
            { id: 'tests', label: 'Tests', icon: 'clipboard' },
            { id: 'timetable', label: 'Timetable', icon: 'calendar' },
            { id: 'library', label: 'Library', icon: 'book-open' },
            { id: 'notifications', label: 'Notifications', icon: 'bell' }
        ],
        stats: ['coursesEnrolled', 'attendance', 'testsTaken', 'studyHours']
    },
    
    teacher: {
        sidebarColor: 'bg-green-600',
        navItems: [
            { id: 'dashboard', label: 'Dashboard', icon: 'home', default: true },
            { id: 'upload', label: 'Upload Content', icon: 'upload' },
            { id: 'attendance', label: 'Mark Attendance', icon: 'check-circle' },
            { id: 'tests', label: 'Create Test', icon: 'clipboard' },
            { id: 'students', label: 'My Students', icon: 'users' },
            { id: 'announcements', label: 'Announcements', icon: 'speaker' }
        ],
        stats: ['studentsCount', 'classesToday', 'uploadsThisWeek', 'pendingReviews']
    },
    
    parent: {
        sidebarColor: 'bg-purple-600',
        navItems: [
            { id: 'dashboard', label: 'Dashboard', icon: 'home', default: true },
            { id: 'children', label: 'My Children', icon: 'users' },
            { id: 'fees', label: 'Fee Status', icon: 'credit-card' },
            { id: 'attendance', label: 'Attendance', icon: 'check-circle' },
            { id: 'tests', label: 'Test Results', icon: 'clipboard' },
            { id: 'notifications', label: 'Notifications', icon: 'bell' }
        ],
        stats: ['childrenCount', 'totalFeesPaid', 'attendanceAvg', 'upcomingTests']
    }
};

/**
 * Load dashboard based on user role
 */
async function loadDashboard() {
    const { user, userData } = await Auth.init();
    
    if (!user) {
        window.location.href = '/login.html';
        return;
    }
    
    const role = userData.role;
    const config = dashboardConfig[role];
    
    if (!config) {
        console.error('Unknown role:', role);
        return;
    }
    
    // Render sidebar
    renderSidebar(config, userData);
    
    // Render header
    renderHeader(userData);
    
    // Load default page
    const defaultNav = config.navItems.find(item => item.default) || config.navItems[0];
    navigateToPage(defaultNav.id, userData);
    
    // Setup mode selection for students
    if (role === 'student' && !userData.roleData?.mode) {
        showModeSelectionModal(userData);
    }
}

/**
 * Render sidebar navigation
 */
function renderSidebar(config, userData) {
    const sidebar = document.getElementById('sidebarNav');
    if (!sidebar) return;
    
    sidebar.innerHTML = config.navItems.map(item => `
        <button onclick="navigateToPage('${item.id}')" 
                class="nav-item w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all ${item.default ? 'active' : ''}" 
                data-page="${item.id}">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                ${getIconPath(item.icon)}
            </svg>
            <span class="font-medium">${item.label}</span>
            ${item.id === 'notifications' ? '<span class="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full hidden" id="notifCount">0</span>' : ''}
        </button>
    `).join('');
    
    // Apply role color
    const sidebarHeader = document.querySelector('.sidebar-header');
    if (sidebarHeader) {
        sidebarHeader.className = `sidebar-header ${config.sidebarColor} text-white p-6`;
    }
}

/**
 * Render header with user info
 */
function renderHeader(userData) {
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const userAvatarEl = document.getElementById('userAvatar');
    
    if (userNameEl) userNameEl.textContent = userData.fullName;
    if (userRoleEl) userRoleEl.textContent = userData.role.charAt(0).toUpperCase() + userData.role.slice(1);
    if (userAvatarEl) userAvatarEl.textContent = userData.firstName.charAt(0);
}

/**
 * Navigate to dashboard page
 * @param {string} pageId 
 * @param {Object} userData 
 */
async function navigateToPage(pageId, userData = null) {
    if (!userData) {
        userData = await Auth.getUserData(Auth.auth.currentUser.uid);
    }
    
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active', 'bg-primary', 'text-white');
        if (item.dataset.page === pageId) {
            item.classList.add('active', 'bg-primary', 'text-white');
        }
    });
    
    // Update page title
    const pageTitle = document.getElementById('pageTitle');
    const navItem = dashboardConfig[userData.role].navItems.find(i => i.id === pageId);
    if (pageTitle && navItem) pageTitle.textContent = navItem.label;
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Show selected page
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Load page-specific data
    await loadPageData(pageId, userData);
}

/**
 * Load data for specific page
 */
async function loadPageData(pageId, userData) {
    switch (pageId) {
        case 'dashboard':
            await loadDashboardOverview(userData);
            break;
        case 'courses':
            await loadCourses(userData);
            break;
        case 'fees':
            await loadFees(userData);
            break;
        case 'attendance':
            await loadAttendance(userData);
            break;
        case 'tests':
            await loadTests(userData);
            break;
        case 'timetable':
            await loadTimetable(userData);
            break;
        case 'library':
            await loadLibrary(userData);
            break;
        case 'notifications':
            await loadNotifications(userData);
            break;
        case 'upload':
            await loadUploadPage(userData);
            break;
        case 'students':
            await loadTeacherStudents(userData);
            break;
        case 'children':
            await loadParentChildren(userData);
            break;
    }
}

/**
 * Load dashboard overview with stats and charts
 */
async function loadDashboardOverview(userData) {
    const role = userData.role;
    const config = dashboardConfig[role];
    
    // Load stats
    const statsContainer = document.getElementById('statsGrid');
    if (statsContainer) {
        const stats = await fetchStats(role, userData.uid);
        statsContainer.innerHTML = renderStatsCards(stats, config.stats);
    }
    
    // Load recent activity
    const activityList = document.getElementById('activityList');
    if (activityList) {
        const activities = await fetchRecentActivity(userData.uid, role);
        activityList.innerHTML = renderActivityList(activities);
    }
    
    // Load upcoming items
    const upcomingList = document.getElementById('upcomingList');
    if (upcomingList) {
        const upcoming = await fetchUpcoming(userData.uid, role);
        upcomingList.innerHTML = renderUpcomingList(upcoming);
    }
    
    // Initialize charts
    initDashboardCharts(userData);
}

/**
 * Fetch stats from Firestore
 */
async function fetchStats(role, uid) {
    try {
        const stats = {};
        
        if (role === 'student') {
            const studentDoc = await Auth.db.collection('students').doc(uid).get();
            const data = studentDoc.data();
            stats.coursesEnrolled = data?.roleData?.enrolledCourses?.length || 0;
            stats.attendance = data?.roleData?.progress?.attendancePercentage || 0;
            stats.testsTaken = data?.roleData?.progress?.testsTaken || 0;
            stats.studyHours = data?.roleData?.progress?.studyHours || 0;
        } else if (role === 'teacher') {
            const teacherDoc = await Auth.db.collection('teachers').doc(uid).get();
            const data = teacherDoc.data();
            stats.studentsCount = data?.roleData?.students?.length || 0;
            stats.classesToday = data?.roleData?.todayClasses || 0;
            stats.uploadsThisWeek = data?.roleData?.weeklyUploads || 0;
            stats.pendingReviews = data?.roleData?.pendingReviews || 0;
        } else if (role === 'parent') {
            const parentDoc = await Auth.db.collection('parents').doc(uid).get();
            const data = parentDoc.data();
            stats.childrenCount = data?.roleData?.children?.length || 0;
            stats.totalFeesPaid = data?.roleData?.totalFeesPaid || 0;
            stats.attendanceAvg = data?.roleData?.attendanceAvg || 0;
            stats.upcomingTests = data?.roleData?.upcomingTests || 0;
        }
        
        return stats;
    } catch (error) {
        console.error('Fetch stats error:', error);
        return {};
    }
}

/**
 * Render stats cards
 */
function renderStatsCards(stats, statKeys) {
    const statConfig = {
        coursesEnrolled: { label: 'Courses Enrolled', icon: 'book', color: 'blue' },
        attendance: { label: 'Attendance', icon: 'check', color: 'green', suffix: '%' },
        testsTaken: { label: 'Tests Taken', icon: 'clipboard', color: 'purple' },
        studyHours: { label: 'Study Hours', icon: 'clock', color: 'orange' },
        studentsCount: { label: 'My Students', icon: 'users', color: 'blue' },
        classesToday: { label: 'Classes Today', icon: 'calendar', color: 'green' },
        uploadsThisWeek: { label: 'Uploads This Week', icon: 'upload', color: 'purple' },
        pendingReviews: { label: 'Pending Reviews', icon: 'alert', color: 'orange' },
        childrenCount: { label: 'Children', icon: 'users', color: 'blue' },
        totalFeesPaid: { label: 'Total Fees Paid', icon: 'credit-card', color: 'green', prefix: '₹' },
        attendanceAvg: { label: 'Avg Attendance', icon: 'check', color: 'purple', suffix: '%' },
        upcomingTests: { label: 'Upcoming Tests', icon: 'calendar', color: 'orange' }
    };
    
    return statKeys.map(key => {
        const config = statConfig[key];
        const value = stats[key] || 0;
        const displayValue = config.prefix ? config.prefix + value : value + (config.suffix || '');
        
        return `
            <div class="card p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-600 mb-1">${config.label}</p>
                        <p class="text-3xl font-bold text-${config.color}-600">${displayValue}</p>
                    </div>
                    <div class="w-12 h-12 bg-${config.color}-100 rounded-xl flex items-center justify-center">
                        <svg class="w-6 h-6 text-${config.color}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            ${getIconPath(config.icon)}
                        </svg>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Show mode selection modal for students
 */
function showModeSelectionModal(userData) {
    const modal = document.getElementById('modeModal');
    if (modal) modal.classList.add('show');
}

/**
 * Select learning mode
 */
async function selectMode(mode) {
    try {
        await Auth.updateStudentMode(mode);
        document.getElementById('modeModal').classList.remove('show');
        showToast(`Switched to ${mode.toUpperCase()} mode`);
        
        // Reload dashboard
        const userData = await Auth.getUserData(Auth.auth.currentUser.uid);
        loadDashboardOverview(userData);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

/**
 * Get SVG icon path
 */
function getIconPath(name) {
    const icons = {
        home: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>',
        book: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>',
        'credit-card': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>',
        'check-circle': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
        clipboard: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>',
        calendar: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>',
        'book-open': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>',
        bell: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>',
        upload: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>',
        users: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>',
        speaker: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path>',
        clock: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
        alert: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>'
    };
    
    return icons[name] || icons.home;
}

// Export functions
window.loadDashboard = loadDashboard;
window.navigateToPage = navigateToPage;
window.selectMode = selectMode;