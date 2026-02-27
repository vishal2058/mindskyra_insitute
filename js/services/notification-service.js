// ==========================================
// NOTIFICATION SERVICE
// Real-time notifications for all users
// ==========================================

import { db } from './firebase-service.js';
import { AppState } from '../config.js';

/**
 * Setup real-time notifications listener
 */
export function setupNotificationsListener() {
    if (!AppState.currentUser) return;
    
    db.collection('notifications')
        .where('userId', '==', AppState.currentUser.uid)
        .where('read', '==', false)
        .onSnapshot(snapshot => {
            const badge = document.getElementById('notifBadge');
            if (snapshot.size > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
            
            // If on student dashboard, refresh notifications
            if (document.getElementById('page-student-dashboard').classList.contains('active')) {
                loadStudentNotifications();
            }
        });
}

/**
 * Load notifications for student dashboard
 */
export async function loadStudentNotifications() {
    try {
        const snap = await db.collection('notifications')
            .where('userId', '==', AppState.currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        const container = document.getElementById('studentNotificationsList');
        
        if (snap.empty) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No notifications</p>';
            return;
        }
        
        container.innerHTML = snap.docs.map(doc => {
            const data = doc.data();
            const isHighPriority = data.priority === 'high';
            return `
                <div class="p-3 ${isHighPriority ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'} border rounded-lg ${!data.read ? 'border-l-4' : ''}">
                    <div class="flex justify-between items-start">
                        <h4 class="font-semibold text-sm ${isHighPriority ? 'text-red-800' : 'text-blue-800'}">${data.title}</h4>
                        ${isHighPriority ? '<span class="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded">High</span>' : ''}
                    </div>
                    <p class="text-sm text-gray-700 mt-1">${data.message}</p>
                    <p class="text-xs text-gray-500 mt-1">From: ${data.sender} • ${data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'Unknown'}</p>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

/**
 * Load all notifications page
 */
export async function loadAllNotifications() {
    try {
        const snap = await db.collection('notifications')
            .where('userId', '==', AppState.currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        const container = document.getElementById('allNotificationsList');
        
        if (snap.empty) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No notifications</p>';
            return;
        }
        
        container.innerHTML = snap.docs.map(doc => {
            const data = doc.data();
            return `
                <div class="card p-4 ${!data.read ? 'border-l-4 border-primary' : ''}">
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-semibold">${data.title}</h4>
                            <p class="text-gray-600 mt-1">${data.message}</p>
                            <p class="text-sm text-gray-500 mt-2">From: ${data.sender} • ${data.createdAt ? data.createdAt.toDate().toLocaleString() : 'Unknown'}</p>
                        </div>
                        ${!data.read ? '<span class="w-2 h-2 bg-primary rounded-full"></span>' : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Mark all as read
        markAllNotificationsRead();
        
    } catch (error) {
        console.error('Error loading all notifications:', error);
    }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead() {
    try {
        const snap = await db.collection('notifications')
            .where('userId', '==', AppState.currentUser.uid)
            .where('read', '==', false)
            .get();
        
        const batch = db.batch();
        snap.docs.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        
        await batch.commit();
        document.getElementById('notifBadge').classList.add('hidden');
        
    } catch (error) {
        console.error('Error marking notifications read:', error);
    }
}

/**
 * Show notifications page based on role
 */
export function showNotifications() {
    if (AppState.userRole === 'student') {
        window.navigateTo('student-notifications');
    } else if (AppState.userRole === 'teacher') {
        window.navigateTo('teacher-notifications');
    } else {
        window.navigateTo('admin-notifications');
    }
}

// Make globally accessible
window.showNotifications = showNotifications;
window.markAllNotificationsRead = markAllNotificationsRead;