import * as fb from './firebase-service.js';
import * as state from './state.js';

/**
 * Attaches all realtime listeners to Firestore.
 * This function is called once on successful login.
 * @param {string} userId The current user's ID.
 */
export function attachAllListeners(userId) {
    if (!userId) return;

    // --- Lead Listener ---
    const leadUnsubscribe = fb.setupLeadListener(userId, (snapshot, error) => {
        if (error) { console.error("Lead listener failed:", error); return; }
        state.setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        window.dispatchEvent(new CustomEvent('leadsUpdated'));
    });
    state.addDataListener(leadUnsubscribe);

    // --- Task Listener ---
    const taskUnsubscribe = fb.setupTaskListener(userId, (snapshot, error) => {
        if (error) { console.error("Task listener failed:", error); return; }
        state.setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        window.dispatchEvent(new CustomEvent('tasksUpdated'));
    });
    state.addDataListener(taskUnsubscribe);

    // --- Custom Email Template Listener ---
    const emailUnsubscribe = fb.setupCustomEmailListener(userId, (snapshot, error) => {
        if (error) { console.error("Email template listener failed:", error); return; }
        state.setCustomEmailTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        window.dispatchEvent(new CustomEvent('emailTemplatesUpdated'));
    });
    state.addDataListener(emailUnsubscribe);

    // --- Documents Listener ---
    const documentsUnsubscribe = fb.setupDocumentsListener(userId, (snapshot, error) => {
        if (error) { console.error("Documents listener failed:", error); return; }
        state.setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        window.dispatchEvent(new CustomEvent('documentsUpdated'));
    });
    state.addDataListener(documentsUnsubscribe);

    // --- Drip Campaigns Listener (NEW) ---
    const dripCampaignsUnsubscribe = fb.setupDripCampaignsListener(userId, (campaigns, error) => {
        if (error) { console.error("Drip campaigns listener failed:", error); return; }
        state.setDripCampaigns(campaigns);
        window.dispatchEvent(new CustomEvent('dripCampaignsUpdated'));
    });
    state.addDataListener(dripCampaignsUnsubscribe);
}

/**
 * Detaches all Firestore listeners and clears local state.
 * This is called on logout.
 */
export function detachAllListeners() {
    state.clearAllData(); // This now handles both clearing arrays and unsubscribing
}

/**
 * Fetches the user profile once on login.
 * @param {string} userId 
 * @returns A promise that resolves with the user profile document snapshot.
 */
export function getUserProfile(userId) {
    return fb.getUserProfile(userId);
}