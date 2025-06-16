import { onAuth, logoutUser, loginUser } from './firebase-service.js';
import * as state from './state.js';
import * as ui from './ui.js';
import * as dataService from './data-listeners.js';
import { initModals, closeAllModals } from './modals.js';

let currentPageModule = null;

function removePageSpecificStylesheet() {
    const existingLink = document.getElementById('page-specific-styles');
    if (existingLink) {
        existingLink.remove();
    }
}

function loadPageSpecificStylesheet(pageName) {
    removePageSpecificStylesheet();
    const link = document.createElement('link');
    link.id = 'page-specific-styles';
    link.rel = 'stylesheet';
    link.href = `css/page-styles/${pageName}.css`;
    document.head.appendChild(link);
}

export async function navigateTo(pageName, replaceState = false) {
    // =========================================================================
    // START: DEFINITIVE FIX FOR GHOST MODAL ISSUE
    // Forcefully close all modals to prevent overlays from blocking the next page.
    closeAllModals();
    // END: DEFINITIVE FIX
    // =========================================================================

    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    const currentHash = window.location.hash.substring(1);
    if (currentHash === pageName && !replaceState) {
        return;
    }

    appContent.style.opacity = '0';

    setTimeout(async () => {
        if (currentPageModule && typeof currentPageModule.destroy === 'function') {
            currentPageModule.destroy();
        }
        currentPageModule = null;

        const navLinks = document.querySelectorAll('.top-navigation-bar .nav-link, .nav-profile-item a');
        navLinks.forEach(link => {
            link.classList.toggle('active-nav-item', link.dataset.page === pageName);
        });

        const url = `#${pageName}`;
        if (window.location.hash !== url) {
            if (replaceState) {
                window.history.replaceState({ page: pageName }, '', url);
            } else {
                window.history.pushState({ page: pageName }, '', url);
            }
        }

        try {
            const htmlPromise = fetch(`pages/${pageName}.html`).then(res => {
                if (!res.ok) throw new Error(`Page not found: ${pageName}.html`);
                return res.text();
            });
            loadPageSpecificStylesheet(pageName);
            const html = await htmlPromise;
            appContent.innerHTML = html;

            const pageModule = await import(`./page-modules/${pageName}.js`);
            currentPageModule = pageModule;
            if (pageModule.init) {
                pageModule.init();
            }
        } catch (error) {
            console.error(`Error loading page ${pageName}:`, error);
            appContent.innerHTML = `<h2>Error</h2><p>Could not load the page. Please try again.</p>`;
            removePageSpecificStylesheet();
        } finally {
            appContent.style.opacity = '1';
        }
    }, 150);
}

window.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('authSection');
    const appSection = document.getElementById('appSection');
    const loginButton = document.getElementById('loginButton');

    let appListenersController = null;

    loginButton.addEventListener('click', handleLogin);
    ui.initializeDarkMode();
    initModals();
    authSection.classList.add('visible');

    onAuth(async (user) => {
        if (user) {
            state.setCurrentUser(user);
            try {
                const profileSnap = await dataService.getUserProfile(user.uid);
                if (profileSnap.exists()) {
                    state.setUserProfile(profileSnap.data());
                }
            } catch (e) { console.warn("Could not fetch user profile on login.", e); }

            ui.updateUserProfileCircleDisplay(state.userProfile.photoUrl, user.email);
            dataService.attachAllListeners(user.uid);

            authSection.classList.remove('visible');
            appSection.classList.add('visible');

            addAppEventListeners();
            handleInitialPageLoad();
        } else {
            if (currentPageModule && typeof currentPageModule.destroy === 'function') {
                currentPageModule.destroy();
                currentPageModule = null;
            }
            removeAppEventListeners();
            dataService.detachAllListeners();
            state.clearUserState();

            appSection.classList.remove('visible');
            authSection.classList.add('visible');

            document.getElementById('app-content').innerHTML = '';
            ui.updateUserProfileCircleDisplay(null, '');
            removePageSpecificStylesheet();
        }
    });

    function addAppEventListeners() {
        if (appListenersController) appListenersController.abort();
        appListenersController = new AbortController();
        const { signal } = appListenersController;

        const navLinks = document.querySelectorAll('.top-navigation-bar .nav-link, .nav-profile-item a');
        navLinks.forEach(link => link.addEventListener('click', handleNavigation, { signal }));

        document.getElementById('logoutButton').addEventListener('click', handleLogout, { signal });
        window.addEventListener('popstate', handleInitialPageLoad, { signal });
    }

    function removeAppEventListeners() {
        if (appListenersController) {
            appListenersController.abort();
            appListenersController = null;
        }
    }

    async function handleLogin() {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const authError = document.getElementById('authError');
        if (!emailInput.value || !passwordInput.value) {
            authError.textContent = "Please enter email and password."; return;
        }
        authError.textContent = "";
        try { await loginUser(emailInput.value, passwordInput.value); }
        catch (error) { authError.textContent = "Login failed: " + error.message; }
    }

    async function handleLogout() {
        try { await logoutUser(); }
        catch (error) { console.error("Logout error:", error); }
    }

    function handleNavigation(e) {
        e.preventDefault();
        const pageName = e.currentTarget.dataset.page;
        if (pageName) navigateTo(pageName);
    }

    function handleInitialPageLoad() {
        const page = window.location.hash.substring(1) || 'dashboard';
        navigateTo(page, true);
    }
});