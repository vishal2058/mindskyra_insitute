/**
 * MINDSKYRA Router Module
 * Handles client-side routing for Single Page Application behavior
 * FIXED for GitHub Pages deployment
 */

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.beforeHooks = [];
        this.afterHooks = [];
        
        // Listen for popstate (back/forward buttons)
        window.addEventListener('popstate', (e) => {
            this.handleRouteChange(window.location.pathname);
        });
        
        // Intercept link clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-router]');
            if (link) {
                e.preventDefault();
                this.navigate(link.getAttribute('href'));
            }
        });
    }

    /**
     * Get base path for GitHub Pages compatibility
     * Detects if running on GitHub Pages with repo subdirectory
     */
    getBasePath() {
        const { hostname, pathname } = window.location;
        
        // GitHub Pages detection
        if (hostname.includes('github.io')) {
            // Extract repo name from path (e.g., /mindskyra_institute/...)
            const pathParts = pathname.split('/').filter(p => p);
            if (pathParts.length > 0) {
                return '/' + pathParts[0] + '/';
            }
        }
        
        // Local development or custom domain
        return '/';
    }

    /**
     * Resolve path relative to base
     * @param {string} path - Relative path (e.g., 'admin.html')
     */
    resolvePath(path) {
        // If path already starts with http or //, return as-is
        if (path.startsWith('http') || path.startsWith('//')) {
            return path;
        }
        
        // If path starts with /, make it relative to base
        if (path.startsWith('/')) {
            const base = this.getBasePath();
            // Remove leading / from path to avoid double slashes
            const cleanPath = path.substring(1);
            return base + cleanPath;
        }
        
        // Relative path (no leading /) - return as-is for same-directory navigation
        return path;
    }

    /**
     * Register a route
     * @param {string} path - Route path
     * @param {Function} handler - Route handler function
     * @param {Object} options - Route options (authRequired, roles, etc.)
     */
    register(path, handler, options = {}) {
        this.routes[path] = {
            handler: handler,
            options: {
                authRequired: options.authRequired || false,
                allowedRoles: options.allowedRoles || [],
                title: options.title || 'MINDSKYRA',
                ...options
            }
        };
        return this;
    }

    /**
     * Register before hook (runs before route change)
     * @param {Function} fn 
     */
    beforeEach(fn) {
        this.beforeHooks.push(fn);
        return this;
    }

    /**
     * Register after hook (runs after route change)
     * @param {Function} fn 
     */
    afterEach(fn) {
        this.afterHooks.push(fn);
        return this;
    }

    /**
     * Navigate to a route
     * @param {string} path 
     * @param {Object} state 
     */
    navigate(path, state = {}) {
        // Run before hooks
        for (const hook of this.beforeHooks) {
            const result = hook(path, this.currentRoute);
            if (result === false) return; // Cancel navigation
        }

        // Update browser history
        window.history.pushState(state, '', path);
        
        // Handle route change
        this.handleRouteChange(path, state);
        
        // Run after hooks
        for (const hook of this.afterHooks) {
            hook(path, this.currentRoute);
        }
    }

    /**
     * Handle route change
     * @param {string} path 
     * @param {Object} state 
     */
    async handleRouteChange(path, state = {}) {
        // Find matching route
        const route = this.findRoute(path);
        
        if (!route) {
            console.error('Route not found:', path);
            this.navigate('/404');
            return;
        }

        // Check authentication
        if (route.options.authRequired) {
            const { user, userData } = await Auth.init();
            if (!user) {
                this.navigate('/login?redirect=' + encodeURIComponent(path));
                return;
            }
            
            // Check role authorization
            if (route.options.allowedRoles.length > 0) {
                if (!route.options.allowedRoles.includes(userData?.role)) {
                    console.error('Unauthorized role:', userData?.role);
                    this.navigate('/unauthorized');
                    return;
                }
            }
        }

        // Update document title
        document.title = route.options.title + ' - MINDSKYRA';

        // Execute route handler
        try {
            await route.handler(state);
            this.currentRoute = path;
        } catch (error) {
            console.error('Route handler error:', error);
            this.showError('Failed to load page');
        }
    }

    /**
     * Find matching route (supports dynamic params)
     * @param {string} path 
     */
    findRoute(path) {
        // Exact match
        if (this.routes[path]) {
            return this.routes[path];
        }

        // Try matching with params
        for (const [routePath, route] of Object.entries(this.routes)) {
            const pattern = routePath.replace(/:([^/]+)/g, '([^/]+)');
            const regex = new RegExp(`^${pattern}$`);
            const match = path.match(regex);
            
            if (match) {
                // Extract params
                const paramNames = routePath.match(/:([^/]+)/g) || [];
                const params = {};
                paramNames.forEach((name, index) => {
                    params[name.substring(1)] = match[index + 1];
                });
                return { ...route, params };
            }
        }

        return null;
    }

    /**
     * Get current route params
     */
    getParams() {
        const route = this.findRoute(this.currentRoute);
        return route?.params || {};
    }

    /**
     * Show error message
     * @param {string} message 
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }

    /**
     * Initialize router
     */
    init() {
        this.handleRouteChange(window.location.pathname, window.history.state);
        return this;
    }
}

// Create global router instance
const router = new Router();

// Register common routes - FIXED PATHS for GitHub Pages
router
    .register('/', () => {
        // Use relative path - works on both local and GitHub Pages
        window.location.href = router.resolvePath('index.html');
    }, { title: 'Home' })
    
    .register('/login', () => {
        // Login page is separate HTML, no SPA handling needed
    }, { title: 'Login' })
    
    .register('/app', async () => {
        // Main app dashboard - handled by dashboard.js
        await loadDashboard();
    }, { 
        authRequired: true, 
        allowedRoles: ['student', 'parent', 'teacher'],
        title: 'Dashboard' 
    })
    
    .register('/admin', async () => {
        // Admin dashboard - separate HTML
        // FIXED: Use resolvePath to handle GitHub Pages subdirectory
        window.location.href = router.resolvePath('admin.html');
    }, { 
        authRequired: true, 
        allowedRoles: ['admin'],
        title: 'Admin Panel' 
    })
    
    .register('/unauthorized', () => {
        showToast('You are not authorized to access this page', 'error');
        router.navigate('/');
    }, { title: 'Unauthorized' })
    
    .register('/404', () => {
        showToast('Page not found', 'error');
        router.navigate('/');
    }, { title: 'Not Found' });

// Export for global use
window.Router = router;
