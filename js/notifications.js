/**
 * MINDSKYRA Notification System
 * Handles: Real-time notifications, Push notifications, In-app alerts
 */

class NotificationSystem {
    constructor() {
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.currentUser = null;
        this.unsubscribe = null;
        this.notifications = [];
        this.unreadCount = 0;
    }

    /**
     * Initialize notification system for current user
     */
    async init(userId) {
        this.currentUser = userId;
        this.setupRealtimeListener();
        await this.updateUnreadCount();
        return this;
    }

    /**
     * Setup real-time notification listener
     */
    setupRealtimeListener() {
        if (!this.currentUser) return;
        
        // Unsubscribe from previous listener if exists
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        // Listen for new notifications
        this.unsubscribe = this.db.collection('notifications')
            .where('userId', '==', this.currentUser)
            .where('read', '==', false)
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const notif = change.doc.data();
                        this.showInAppNotification(notif);
                        this.playNotificationSound();
                    }
                });
                
                this.updateUnreadCount();
                this.updateNotificationBadge();
            }, (error) => {
                console.error('Notification listener error:', error);
            });
    }

    /**
     * Send notification to a specific user
     */
    async sendToUser(userId, data) {
        try {
            const notification = {
                userId: userId,
                title: data.title || 'New Notification',
                message: data.message || '',
                type: data.type || 'general',
                priority: data.priority || 'normal',
                sender: data.sender || 'System',
                senderId: data.senderId || null,
                senderRole: data.senderRole || 'system',
                read: false,
                readAt: null,
                actionUrl: data.actionUrl || null,
                actionText: data.actionText || 'View',
                metadata: data.metadata || {},
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await this.db.collection('notifications').add(notification);
            
            if (data.push !== false) {
                await this.sendPushNotification(userId, notification);
            }

            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error sending notification:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send notification to multiple users (batch)
     */
    async sendToMultiple(userIds, data) {
        try {
            const batch = this.db.batch();
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            
            userIds.forEach(userId => {
                const notifRef = this.db.collection('notifications').doc();
                batch.set(notifRef, {
                    userId: userId,
                    title: data.title || 'New Notification',
                    message: data.message || '',
                    type: data.type || 'general',
                    priority: data.priority || 'normal',
                    sender: data.sender || 'System',
                    senderId: data.senderId || null,
                    senderRole: data.senderRole || 'system',
                    read: false,
                    readAt: null,
                    actionUrl: data.actionUrl || null,
                    actionText: data.actionText || 'View',
                    metadata: data.metadata || {},
                    createdAt: timestamp
                });
            });

            await batch.commit();
            return { success: true, count: userIds.length };
        } catch (error) {
            console.error('Error sending batch notifications:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send notification to all students in a course
     */
    async sendToCourseStudents(courseId, data) {
        try {
            const courseDoc = await this.db.collection('courses').doc(courseId).get();
            const enrolledStudents = courseDoc.data()?.enrolledStudents || [];
            
            if (enrolledStudents.length === 0) {
                return { success: false, error: 'No students enrolled' };
            }

            return await this.sendToMultiple(enrolledStudents, {
                ...data,
                metadata: { ...data.metadata, courseId }
            });
        } catch (error) {
            console.error('Error sending course notification:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send notification to all users with specific role
     */
    async sendToRole(role, data) {
        try {
            const usersSnap = await this.db.collection('users')
                .where('role', '==', role)
                .where('isActive', '==', true)
                .get();
            
            const userIds = usersSnap.docs.map(doc => doc.id);
            
            if (userIds.length === 0) {
                return { success: false, error: `No active ${role}s found` };
            }

            return await this.sendToMultiple(userIds, data);
        } catch (error) {
            console.error('Error sending role notification:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get user's notifications
     */
    async getNotifications(limit = 20, includeRead = false) {
        try {
            let query = this.db.collection('notifications')
                .where('userId', '==', this.currentUser)
                .orderBy('createdAt', 'desc');
            
            if (!includeRead) {
                query = query.where('read', '==', false);
            }

            const snap = await query.limit(limit).get();
            
            return snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            }));
        } catch (error) {
            console.error('Error getting notifications:', error);
            return [];
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId) {
        try {
            await this.db.collection('notifications').doc(notificationId).update({
                read: true,
                readAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await this.updateUnreadCount();
            return { success: true };
        } catch (error) {
            console.error('Error marking as read:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead() {
        try {
            const snap = await this.db.collection('notifications')
                .where('userId', '==', this.currentUser)
                .where('read', '==', false)
                .get();
            
            const batch = this.db.batch();
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            
            snap.docs.forEach(doc => {
                batch.update(doc.ref, {
                    read: true,
                    readAt: timestamp
                });
            });
            
            await batch.commit();
            await this.updateUnreadCount();
            
            return { success: true, count: snap.size };
        } catch (error) {
            console.error('Error marking all as read:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a notification
     */
    async deleteNotification(notificationId) {
        try {
            await this.db.collection('notifications').doc(notificationId).delete();
            await this.updateUnreadCount();
            return { success: true };
        } catch (error) {
            console.error('Error deleting notification:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update unread count
     */
    async updateUnreadCount() {
        try {
            const snap = await this.db.collection('notifications')
                .where('userId', '==', this.currentUser)
                .where('read', '==', false)
                .count().get();
            
            this.unreadCount = snap.data().count;
            return this.unreadCount;
        } catch (error) {
            console.error('Error updating count:', error);
            return 0;
        }
    }

    /**
     * Update notification badge on UI
     */
    updateNotificationBadge() {
        const badge = document.getElementById('notifBadge');
        const countElement = document.getElementById('notifCount');
        
        if (badge) {
            if (this.unreadCount > 0) {
                badge.classList.remove('hidden');
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            } else {
                badge.classList.add('hidden');
            }
        }
        
        if (countElement) {
            countElement.textContent = this.unreadCount;
        }
    }

    /**
     * Show in-app notification toast
     */
    showInAppNotification(notif) {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 max-w-sm p-4 rounded-xl shadow-lg z-50 transform translate-x-full transition-transform duration-300 ${this.getNotificationColor(notif.type)}`;
        
        toast.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="flex-shrink-0">${this.getNotificationIcon(notif.type)}</div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-white">${notif.title}</p>
                    <p class="text-xs text-white/90 mt-1">${notif.message}</p>
                    <p class="text-xs text-white/70 mt-2">From: ${notif.sender}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="text-white/70 hover:text-white">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.remove('translate-x-full'), 100);
        
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    /**
     * Get color class based on notification type
     */
    getNotificationColor(type) {
        const colors = {
            success: 'bg-green-500',
            warning: 'bg-yellow-500',
            error: 'bg-red-500',
            alert: 'bg-orange-500',
            general: 'bg-blue-500'
        };
        return colors[type] || colors.general;
    }

    /**
     * Get icon based on notification type
     */
    getNotificationIcon(type) {
        const icons = {
            success: '<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>',
            warning: '<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
            error: '<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
            alert: '<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>',
            general: '<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
        };
        return icons[type] || icons.general;
    }

    /**
     * Play notification sound
     */
    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            // Audio not supported, ignore
        }
    }

    /**
     * Send push notification (requires FCM setup)
     */
    async sendPushNotification(userId, notification) {
        console.log('Push notification to', userId, ':', notification.title);
    }

    /**
     * Cleanup and unsubscribe
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

// ==================== NOTIFICATION TEMPLATES ====================

const NotificationTemplates = {
    welcomeStudent(studentName) {
        return {
            title: 'Welcome to MINDSKYRA! 🎉',
            message: `Hi ${studentName}, your learning journey begins now. Access your courses and start learning!`,
            type: 'success',
            priority: 'normal'
        };
    },

    newContent(courseName, chapterName, teacherName) {
        return {
            title: 'New Content Available 📚',
            message: `${teacherName} uploaded new content for ${courseName}: ${chapterName}`,
            type: 'general',
            priority: 'normal',
            actionText: 'View Content'
        };
    },

    feeReminder(amount, dueDate) {
        return {
            title: 'Fee Payment Due 💰',
            message: `Your fee payment of ₹${amount} is due on ${dueDate}. Please pay to avoid late charges.`,
            type: 'warning',
            priority: 'high',
            actionText: 'Pay Now'
        };
    },

    paymentReceived(amount) {
        return {
            title: 'Payment Received ✅',
            message: `We received your payment of ₹${amount}. Thank you!`,
            type: 'success',
            priority: 'normal'
        };
    },

    attendanceAlert(absentDays) {
        return {
            title: 'Attendance Alert ⚠️',
            message: `You have been absent for ${absentDays} days. Regular attendance is important for your progress.`,
            type: 'warning',
            priority: 'high'
        };
    },

    testReminder(testName, date, time) {
        return {
            title: 'Upcoming Test 📝',
            message: `${testName} is scheduled on ${date} at ${time}. Don't forget to prepare!`,
            type: 'alert',
            priority: 'high'
        };
    },

    teacherApprovalRequest(teacherName) {
        return {
            title: 'New Teacher Registration 👨‍🏫',
            message: `${teacherName} has registered and is awaiting your approval.`,
            type: 'alert',
            priority: 'normal',
            actionText: 'Review'
        };
    },

    teacherApproved() {
        return {
            title: 'Account Approved! 🎉',
            message: 'Your teacher account has been approved by the admin. You can now start teaching!',
            type: 'success',
            priority: 'high'
        };
    },

    newFeedback(rating) {
        return {
            title: 'New Student Feedback ⭐',
            message: `A student gave you a ${rating}-star rating. Check your dashboard for details.`,
            type: 'general',
            priority: 'low'
        };
    },

    lowAttendance(courseName, percentage) {
        return {
            title: 'Low Class Attendance 📊',
            message: `Attendance for ${courseName} is at ${percentage}%. Consider following up with students.`,
            type: 'warning',
            priority: 'normal'
        };
    }
};

// ==================== EXPORT ====================

window.NotificationSystem = NotificationSystem;
window.NotificationTemplates = NotificationTemplates;
window.Notifications = new NotificationSystem();