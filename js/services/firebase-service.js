// ==========================================
// FIREBASE SERVICE
// Initialization and core Firebase operations
// ==========================================

import { firebaseConfig, AppState } from '../config.js';
import { showToast } from '../utils.js';

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export Firebase services
export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();

/**
 * Load current user data from Firestore
 * @returns {Promise<boolean>}
 */
export async function loadUserData() {
    try {
        const doc = await db.collection('users').doc(AppState.currentUser.uid).get();
        if (doc.exists) {
            AppState.userData = doc.data();
            AppState.userRole = AppState.userData.role || 'student';
            
            // Update UI with user info
            const fullName = `${AppState.userData.firstName || ''} ${AppState.userData.lastName || ''}`.trim() || 'User';
            document.getElementById('userName').textContent = fullName;
            document.getElementById('userRole').textContent = AppState.userRole.charAt(0).toUpperCase() + AppState.userRole.slice(1);
            document.getElementById('userAvatar').textContent = (AppState.userData.firstName || 'U').charAt(0).toUpperCase();
            
            // Update role-specific welcome names
            if (AppState.userRole === 'teacher') {
                document.getElementById('teacherWelcomeName').textContent = AppState.userData.firstName || 'Teacher';
            } else if (AppState.userRole === 'student') {
                document.getElementById('studentWelcomeName').textContent = AppState.userData.firstName || 'Student';
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Error loading user data', 'error');
        return false;
    }
}

/**
 * Logout user
 */
export async function logout() {
    try {
        await auth.signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error logging out:', error);
    }
}

// Make logout globally accessible
window.logout = logout;