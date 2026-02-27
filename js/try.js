/**
 * MINDSKYRA Authentication Module
 * Handles: Email/Password Auth, Google Auth, Profile Management, Role-based Routing
 */

// Firebase Configuration - REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyB5TTCXCD74IUeLmM7bynlgCUvcmcM6rTw",
  authDomain: "mind-skyra-institute.firebaseapp.com",
  projectId: "mind-skyra-institute",
  storageBucket: "mind-skyra-institute.firebasestorage.app",
  messagingSenderId: "333988573281",
  appId: "1:333988573281:web:7d775f902b55d2e15aba20"
};

// Initialize Firebase (only if not already initialized)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// ==================== AUTH STATE OBSERVER ====================

/**
 * Initialize auth state listener
 * Call this on every protected page
 */
function initAuth() {
    return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe();
            
            if (user) {
                console.log('User authenticated:', user.uid);
                const userData = await getUserData(user.uid);
                resolve({ user, userData });
            } else {
                console.log('No user authenticated');
                resolve({ user: null, userData: null });
            }
        }, reject);
    });
}

/**
 * Check if user is authenticated and redirect if not
 * @param {Array} allowedRoles - Array of allowed roles for current page
 */
async function requireAuth(allowedRoles = []) {
    const { user, userData } = await initAuth();
    
    if (!user) {
        window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return null;
    }
    
    // Check email verification (except for admin)
    if (!user.emailVerified && userData?.role !== 'admin') {
        // Allow access but show warning
        console.warn('Email not verified');
    }
    
    // Check role authorization
    if (allowedRoles.length > 0 && !allowedRoles.includes(userData?.role)) {
        console.error('Unauthorized role:', userData?.role);
        redirectToDashboard(userData?.role);
        return null;
    }
    
    return { user, userData };
}

// ==================== EMAIL/PASSWORD AUTH ====================

/**
 * Handle user signup with complete data collection
 * @param {Object} formData - Complete signup form data
 */
async function signupUser(formData) {
    try {
        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            throw new Error('Passwords do not match');
        }

        // Validate password strength
        if (formData.password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }

        // Validate phone number (Indian format)
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
            throw new Error('Please enter a valid 10-digit phone number');
        }

        // Create authentication user
        const userCredential = await auth.createUserWithEmailAndPassword(
            formData.email, 
            formData.password
        );
        const user = userCredential.user;

        // Send email verification
        await user.sendEmailVerification();

        // Prepare comprehensive user data
        const userData = {
            // Basic Info
            uid: user.uid,
            email: formData.email,
            emailVerified: false,
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            phone: formData.phone.replace(/\D/g, ''),
            displayName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            
            // Role & Status
            role: formData.role,
            isActive: true,
            isApproved: formData.role === 'student' || formData.role === 'parent', // Teachers need approval
            status: 'active', // active, suspended, deleted
            
            // Timestamps
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
            
            // Profile
            profile: {
                photoURL: null,
                dateOfBirth: formData.dateOfBirth || null,
                gender: formData.gender || null,
                address: {
                    street: '',
                    city: '',
                    state: '',
                    pincode: '',
                    country: 'India'
                },
                emergencyContact: {
                    name: '',
                    phone: '',
                    relation: ''
                }
            },
            
            // Preferences
            preferences: {
                language: 'en',
                notifications: {
                    email: true,
                    sms: true,
                    push: true
                },
                theme: 'light'
            },
            
            // Role-specific data (initialized empty)
            roleData: {}
        };

        // Add role-specific fields
        switch (formData.role) {
            case 'student':
                userData.roleData = {
                    class: formData.studentClass,
                    section: '',
                    rollNumber: '',
                    schoolName: formData.schoolName || '',
                    board: formData.board || 'CBSE', // CBSE, SSC, ICSE
                    mode: null, // online, offline - to be selected after login
                    batchId: null,
                    batchName: null,
                    
                    // Academic Info
                    admission: {
                        status: 'pending', // pending, approved, rejected
                        admissionDate: null,
                        admissionNumber: '',
                        previousSchool: '',
                        previousPercentage: ''
                    },
                    
                    // Fee Structure
                    fees: {
                        totalAmount: 0,
                        discountApplied: 0,
                        finalAmount: 0,
                        paidAmount: 0,
                        pendingAmount: 0,
                        installmentsAllowed: 3,
                        installments: [],
                        nextDueDate: null
                    },
                    
                    // Academic Progress
                    progress: {
                        overallPercentage: 0,
                        testsTaken: 0,
                        testsPassed: 0,
                        averageScore: 0,
                        studyHours: 0,
                        lastActive: null,
                        streakDays: 0
                    },
                    
                    // Parent linkage
                    parentId: null,
                    parentEmail: formData.parentEmail || null,
                    parentPhone: formData.parentPhone || null
                };
                break;

            case 'parent':
                userData.roleData = {
                    children: [], // Array of student UIDs
                    pendingChildren: [{
                        email: formData.childEmail,
                        relation: formData.relation || 'Father',
                        status: 'pending' // pending, linked, rejected
                    }],
                    occupation: formData.occupation || '',
                    isPrimaryContact: true
                };
                break;

            case 'teacher':
                userData.roleData = {
                    employeeId: '',
                    subjects: formData.subjects ? formData.subjects.split(',').map(s => s.trim()) : [],
                    classes: formData.classes ? formData.classes.split(',').map(c => c.trim()) : [],
                    qualification: formData.qualification || '',
                    experience: formData.experience || 0,
                    specialization: formData.specialization || '',
                    batches: [], // Assigned batches
                    isClassTeacher: false,
                    classTeacherOf: null,
                    joiningDate: null,
                    salary: {
                        basic: 0,
                        allowances: 0,
                        total: 0
                    },
                    documents: {
                        resume: null,
                        certificates: [],
                        idProof: null
                    }
                };
                break;
        }

        // Save to users collection
        await db.collection('users').doc(user.uid).set(userData);

        // Save to role-specific collection
        await db.collection(`${formData.role}s`).doc(user.uid).set(userData);

        // Create notification for admin about new registration
        await createAdminNotification({
            type: 'new_registration',
            title: `New ${formData.role} registered`,
            message: `${userData.fullName} has registered as ${formData.role}`,
            userId: user.uid,
            userRole: formData.role,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });

        // If teacher, create approval request
        if (formData.role === 'teacher') {
            await db.collection('teacherApprovals').doc(user.uid).set({
                teacherId: user.uid,
                status: 'pending',
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                documents: {}
            });
        }

        return {
            success: true,
            user: user,
            message: 'Account created successfully! Please verify your email.',
            requiresEmailVerification: true
        };

    } catch (error) {
        console.error('Signup error:', error);
        
        // Clean up if user was created but data save failed
        if (auth.currentUser) {
            await auth.currentUser.delete().catch(console.error);
        }
        
        throw error;
    }
}

/**
 * Handle user login
 * @param {string} email 
 * @param {string} password 
 */
async function loginUser(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Get user data from Firestore
        const userData = await getUserData(user.uid);
        
        if (!userData) {
            throw new Error('User data not found. Please contact support.');
        }

        // Check if account is active
        if (!userData.isActive) {
            await auth.signOut();
            throw new Error('Your account has been suspended. Contact admin.');
        }

        // Check teacher approval status
        if (userData.role === 'teacher' && !userData.isApproved) {
            await auth.signOut();
            throw new Error('Your teacher account is pending admin approval.');
        }

        // Update last login
        await db.collection('users').doc(user.uid).update({
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
            'metadata.lastLoginIp': await getClientIP()
        });

        // Check if mode selection needed (for students)
        const needsModeSelection = userData.role === 'student' && !userData.roleData?.mode;

        return {
            success: true,
            user: user,
            userData: userData,
            needsModeSelection: needsModeSelection,
            redirectTo: getDashboardUrl(userData.role)
        };

    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// ==================== GOOGLE AUTH ====================

/**
 * Handle Google Sign In/Sign Up
 * Works for both new and existing users
 */
async function signInWithGoogle() {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;
        const isNewUser = result.additionalUserInfo.isNewUser;

        if (isNewUser) {
            // New user - need to collect additional info
            return {
                success: true,
                isNewUser: true,
                user: user,
                message: 'Please complete your profile',
                redirectTo: '/login.html?completeProfile=true&uid=' + user.uid
            };
        } else {
            // Existing user - get full data
            const userData = await getUserData(user.uid);
            
            if (!userData) {
                // User exists in Auth but not in Firestore (edge case)
                throw new Error('User data incomplete. Please contact support.');
            }

            // Update last login
            await db.collection('users').doc(user.uid).update({
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return {
                success: true,
                isNewUser: false,
                user: user,
                userData: userData,
                redirectTo: getDashboardUrl(userData.role)
            };
        }

    } catch (error) {
        console.error('Google sign in error:', error);
        throw error;
    }
}

/**
 * Complete Google signup with additional data
 * @param {string} uid - Firebase Auth UID
 * @param {Object} additionalData - Role, class, etc.
 */
async function completeGoogleSignup(uid, additionalData) {
    try {
        const user = auth.currentUser;
        if (!user || user.uid !== uid) {
            throw new Error('Session mismatch. Please try again.');
        }

        const fullName = additionalData.firstName + ' ' + additionalData.lastName;
        
        // Update Auth profile
        await user.updateProfile({
            displayName: fullName,
            photoURL: user.photoURL || additionalData.photoURL
        });

        // Prepare complete user data
        const userData = {
            uid: uid,
            email: user.email,
            emailVerified: user.emailVerified,
            firstName: additionalData.firstName,
            lastName: additionalData.lastName,
            fullName: fullName,
            phone: additionalData.phone.replace(/\D/g, ''),
            displayName: fullName,
            photoURL: user.photoURL || additionalData.photoURL || null,
            
            role: additionalData.role,
            isActive: true,
            isApproved: additionalData.role !== 'teacher',
            status: 'active',
            
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
            
            profile: {
                photoURL: user.photoURL || additionalData.photoURL || null,
                dateOfBirth: additionalData.dateOfBirth || null,
                gender: additionalData.gender || null,
                address: {
                    street: '',
                    city: '',
                    state: '',
                    pincode: '',
                    country: 'India'
                }
            },
            
            preferences: {
                language: 'en',
                notifications: { email: true, sms: true, push: true },
                theme: 'light'
            },
            
            authProvider: 'google',
            roleData: {}
        };

        // Add role-specific data (same as email signup)
        if (additionalData.role === 'student') {
            userData.roleData = {
                class: additionalData.studentClass,
                section: '',
                rollNumber: '',
                schoolName: additionalData.schoolName || '',
                board: additionalData.board || 'CBSE',
                mode: null,
                batchId: null,
                admission: { status: 'pending', admissionDate: null, admissionNumber: '' },
                fees: { totalAmount: 0, discountApplied: 0, finalAmount: 0, paidAmount: 0, pendingAmount: 0, installments: [] },
                progress: { overallPercentage: 0, testsTaken: 0, averageScore: 0, studyHours: 0 }
            };
        }
        // ... (similar for parent and teacher)

        // Save to Firestore
        await db.collection('users').doc(uid).set(userData);
        await db.collection(`${additionalData.role}s`).doc(uid).set(userData);

        return {
            success: true,
            user: user,
            userData: userData,
            redirectTo: getDashboardUrl(additionalData.role)
        };

    } catch (error) {
        console.error('Complete Google signup error:', error);
        throw error;
    }
}

// ==================== MODE SELECTION (STUDENTS) ====================

/**
 * Update student learning mode after first login
 * @param {string} mode - 'online' or 'offline'
 */
async function updateStudentMode(mode) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    try {
        const updateData = {
            'roleData.mode': mode,
            'roleData.modeSelectedAt': firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // If offline mode, initialize offline-specific fields
        if (mode === 'offline') {
            updateData['roleData.offline'] = {
                batchAssigned: false,
                batchId: null,
                batchName: null,
                center: null,
                seatNumber: null
            };
        }

        await db.collection('users').doc(user.uid).update(updateData);
        await db.collection('students').doc(user.uid).update(updateData);

        // Create welcome notification
        await db.collection('notifications').add({
            userId: user.uid,
            title: `Welcome to ${mode === 'online' ? 'Online' : 'Offline'} Learning!`,
            message: mode === 'online' 
                ? 'Access your free notes, videos, and tests now.'
                : 'Visit the institute for your batch details and timetable.',
            type: 'welcome',
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, mode: mode };

    } catch (error) {
        console.error('Update mode error:', error);
        throw error;
    }
}

// ==================== PASSWORD MANAGEMENT ====================

/**
 * Send password reset email
 * @param {string} email 
 */
async function resetPassword(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        return { success: true, message: 'Password reset email sent' };
    } catch (error) {
        console.error('Password reset error:', error);
        throw error;
    }
}

/**
 * Change password for logged in user
 * @param {string} currentPassword 
 * @param {string} newPassword 
 */
async function changePassword(currentPassword, newPassword) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    try {
        // Re-authenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email, 
            currentPassword
        );
        await user.reauthenticateWithCredential(credential);
        
        // Update password
        await user.updatePassword(newPassword);
        
        return { success: true, message: 'Password updated successfully' };
    } catch (error) {
        console.error('Change password error:', error);
        throw error;
    }
}

// ==================== PROFILE MANAGEMENT ====================

/**
 * Get user data from Firestore
 * @param {string} uid 
 */
async function getUserData(uid) {
    try {
        const doc = await db.collection('users').doc(uid).get();
        return doc.exists ? doc.data() : null;
    } catch (error) {
        console.error('Get user data error:', error);
        return null;
    }
}

/**
 * Update user profile
 * @param {Object} updates 
 */
async function updateProfile(updates) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    try {
        const allowedFields = [
            'firstName', 'lastName', 'phone', 'profile.dateOfBirth',
            'profile.gender', 'profile.address', 'profile.emergencyContact',
            'preferences'
        ];

        const updateData = {
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Filter allowed fields
        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                updateData[key] = updates[key];
            }
        });

        // Update display name if first/last name changed
        if (updates.firstName || updates.lastName) {
            const currentData = await getUserData(user.uid);
            const newFirstName = updates.firstName || currentData.firstName;
            const newLastName = updates.lastName || currentData.lastName;
            const newFullName = `${newFirstName} ${newLastName}`;
            
            updateData.fullName = newFullName;
            updateData.displayName = newFullName;
            
            await user.updateProfile({ displayName: newFullName });
        }

        await db.collection('users').doc(user.uid).update(updateData);
        
        // Sync to role collection
        const userData = await getUserData(user.uid);
        await db.collection(`${userData.role}s`).doc(user.uid).update(updateData);

        return { success: true, message: 'Profile updated' };

    } catch (error) {
        console.error('Update profile error:', error);
        throw error;
    }
}

/**
 * Upload profile photo
 * @param {File} file 
 */
async function uploadProfilePhoto(file) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    try {
        const storageRef = storage.ref(`profilePhotos/${user.uid}`);
        const snapshot = await storageRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();

        // Update auth profile
        await user.updateProfile({ photoURL: downloadURL });

        // Update Firestore
        await db.collection('users').doc(user.uid).update({
            photoURL: downloadURL,
            'profile.photoURL': downloadURL,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, photoURL: downloadURL };

    } catch (error) {
        console.error('Upload photo error:', error);
        throw error;
    }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Redirect to appropriate dashboard based on role
 * @param {string} role 
 */
function redirectToDashboard(role) {
    const url = getDashboardUrl(role);
    window.location.href = url;
}

/**
 * Get dashboard URL for role
 * @param {string} role 
 */
function getDashboardUrl(role) {
    switch (role) {
        case 'admin':
            return '/admin.html';
        case 'teacher':
            return '/app.html'; // Teachers use same app with different views
        case 'student':
        case 'parent':
            return '/app.html';
        default:
            return '/index.html';
    }
}

/**
 * Create notification for admin
 * @param {Object} notification 
 */
async function createAdminNotification(notification) {
    try {
        await db.collection('adminNotifications').add(notification);
    } catch (error) {
        console.error('Create admin notification error:', error);
    }
}

/**
 * Get client IP (basic implementation)
 */
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return 'unknown';
    }
}

/**
 * Logout user
 */
async function logoutUser() {
    try {
        // Update last logout time
        if (auth.currentUser) {
            await db.collection('users').doc(auth.currentUser.uid).update({
                lastLogoutAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        await auth.signOut();
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

/**
 * Delete user account (with confirmation)
 */
async function deleteAccount() {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    // This is a sensitive operation - should require re-authentication
    try {
        // Mark as deleted in Firestore (soft delete)
        await db.collection('users').doc(user.uid).update({
            status: 'deleted',
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
            isActive: false
        });

        // Delete auth account
        await user.delete();
        
        return { success: true, message: 'Account deleted' };
    } catch (error) {
        console.error('Delete account error:', error);
        throw error;
    }
}

// ==================== FORM VALIDATION HELPERS ====================

/**
 * Validate signup form data
 * @param {Object} data 
 */
function validateSignupData(data) {
    const errors = [];

    if (!data.firstName || data.firstName.trim().length < 2) {
        errors.push('First name must be at least 2 characters');
    }

    if (!data.lastName || data.lastName.trim().length < 2) {
        errors.push('Last name must be at least 2 characters');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        errors.push('Please enter a valid email address');
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(data.phone.replace(/\D/g, ''))) {
        errors.push('Please enter a valid 10-digit mobile number');
    }

    if (!data.password || data.password.length < 6) {
        errors.push('Password must be at least 6 characters');
    }

    if (data.password !== data.confirmPassword) {
        errors.push('Passwords do not match');
    }

    if (!data.role) {
        errors.push('Please select a role');
    }

    // Role-specific validation
    if (data.role === 'student' && !data.studentClass) {
        errors.push('Please select your class');
    }

    if (data.role === 'parent' && !data.childEmail) {
        errors.push("Please enter your child's email");
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}
// ==================== ADMIN SPECIFIC FUNCTIONS ====================

/**
 * Verify admin secret key
 * @param {string} key - The admin secret key to verify
 * @returns {boolean} - True if valid, false otherwise
 */
function verifyAdminKey(key) {
    console.log("verifyAdminKey called with:", typeof key, key);
    
    // If key is somehow an event, extract the value
    if (key && typeof key === 'object' && key.target) {
        key = key.target.value;
    }
    
    // If key is undefined or not string, convert to string
    if (typeof key !== 'string') {
        key = String(key || '');
    }
    
    const validKey = 'VI7058623898'; // Your key
    return key === validKey;
}

/**
 * Create admin user with elevated privileges
 * @param {Object} formData 
 */
async function createAdminUser(formData) {
    // Verify admin key first
    if (!verifyAdminKey(formData.adminKey)) {
        throw new Error('Invalid admin secret key');
    }

    const userCredential = await auth.createUserWithEmailAndPassword(
        formData.email,
        formData.password
    );
    const user = userCredential.user;

    // Skip email verification for admin (they need immediate access)
    // But log this for security audit

    const userData = {
        // Basic info (same as regular users)
        uid: user.uid,
        email: formData.email,
        emailVerified: true, // Auto-verify for admin
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`,
        phone: formData.phone.replace(/\D/g, ''),
        displayName: `${formData.firstName} ${formData.lastName}`,
        
        // Admin specific
        role: 'admin',
        isActive: true,
        isApproved: true, // Auto-approve
        isSuperAdmin: formData.isSuperAdmin || false,
        status: 'active',
        
        // Admin permissions
        permissions: {
            canManageUsers: true,
            canManageFees: true,
            canManageCourses: true,
            canViewAnalytics: true,
            canSendNotifications: true,
            canManageTeachers: true,
            canAccessSettings: formData.isSuperAdmin || false,
            canCreateAdmins: formData.isSuperAdmin || false
        },
        
        // Admin profile
        roleData: {
            designation: formData.designation || 'Administrator',
            employeeCode: formData.employeeCode || '',
            department: 'Management',
            adminLevel: formData.isSuperAdmin ? 'super' : 'standard',
            accessLog: [{
                action: 'account_created',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                ip: await getClientIP()
            }]
        },
        
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
        
        profile: {
            photoURL: null,
            address: { street: '', city: '', state: '', pincode: '', country: 'India' }
        },
        
        preferences: {
            language: 'en',
            notifications: { email: true, sms: true, push: true },
            theme: 'light',
            dashboardLayout: 'default'
        },
        
        authProvider: 'email',
        createdBy: 'self', // or admin UID if created by another admin
        adminKeyHash: btoa(formData.adminKey) // Basic obfuscation, not security
    };

    // Save to Firestore
    await db.collection('users').doc(user.uid).set(userData);
    await db.collection('admins').doc(user.uid).set(userData);

    // Create security log
    await db.collection('adminSecurityLogs').add({
        action: 'admin_account_created',
        adminId: user.uid,
        email: formData.email,
        isSuperAdmin: formData.isSuperAdmin,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        ip: await getClientIP(),
        userAgent: navigator.userAgent
    });

    // Notify other admins (if any exist)
    const otherAdmins = await db.collection('users')
        .where('role', '==', 'admin')
        .where('uid', '!=', user.uid)
        .get();
    
    const batch = db.batch();
    otherAdmins.forEach(doc => {
        const notifRef = db.collection('notifications').doc();
        batch.set(notifRef, {
            userId: doc.id,
            title: 'New Admin Registered',
            message: `${userData.fullName} has been added as ${formData.isSuperAdmin ? 'Super ' : ''}Admin`,
            type: 'admin_alert',
            priority: 'high',
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    });
    await batch.commit();

    return {
        success: true,
        user: user,
        message: 'Admin account created successfully',
        redirectTo: '/admin.html'
    };
}

/**
 * Admin login with audit logging
 * @param {string} email 
 * @param {string} password 
 */
async function adminLogin(email, password) {
    const result = await loginUser(email, password);
    
    if (result.userData?.role !== 'admin') {
        await auth.signOut();
        throw new Error('Unauthorized. Admin access only.');
    }

    // Log admin access
    await db.collection('adminSecurityLogs').add({
        action: 'admin_login',
        adminId: result.user.uid,
        email: email,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        ip: await getClientIP(),
        userAgent: navigator.userAgent
    });

    return result;
}

/**
 * Check if current user has specific admin permission
 * @param {string} permission 
 */
async function checkAdminPermission(permission) {
    const user = auth.currentUser;
    if (!user) return false;

    const userData = await getUserData(user.uid);
    if (userData?.role !== 'admin') return false;
    
    return userData.permissions?.[permission] || false;
}

// Update the signup function to handle admin
const originalSignup = signupUser;
signupUser = async function(formData) {
    if (formData.role === 'admin') {
        return await createAdminUser(formData);
    }
    return await originalSignup(formData);
};

// ==================== EXPORT FOR MODULES ====================

// Make functions available globally
window.Auth = {
    // Initialization
    init: initAuth,
    requireAuth: requireAuth,
    
    // Auth methods
    signup: signupUser,
    login: loginUser,
    logout: logoutUser,
    resetPassword: resetPassword,
    changePassword: changePassword,
    
    // Google Auth
    signInWithGoogle: signInWithGoogle,
    completeGoogleSignup: completeGoogleSignup,
    
    // Profile
    getUserData: getUserData,
    updateProfile: updateProfile,
    uploadPhoto: uploadProfilePhoto,
    
    // Student specific
    updateStudentMode: updateStudentMode,
    
    // Utilities
    redirectToDashboard: redirectToDashboard,
    getDashboardUrl: getDashboardUrl,
    validateSignupData: validateSignupData,
    deleteAccount: deleteAccount,
    
    // Firebase instances (for advanced use)
    auth: auth,
    db: db,
    storage: storage
};

// For ES6 module imports (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.Auth;
}