import { showLoading } from '../ui.js';
import * as state from '../state.js';
import * as fb from '../firebase-service.js';
import { openLeadModal, openTaskModal, openUploadDocumentModal } from '../modals.js';
import { populatePipelineStageDropdowns } from '../utilities.js';
import { ICONS } from '../icons.js';

// --- 1. CONSOLIDATED PAGE STATE & ABORT CONTROLLER ---
let pageState = {
    selectedLeadId: null,
    activeRightColumnView: 'engagement',
    activeLogFilter: 'all',
    filters: {
        pipeline: '',
        taskStatus: '',
        financing: ''
    }
};
let pageAbortController = null;


// --- 2. PAGE LIFECYCLE (INIT & DESTROY) ---

export function init() {
    pageAbortController = new AbortController();
    populatePipelineStageDropdowns(document.getElementById('filterLeadPipelineStage'), false, true, '');

    addPageEventListeners(pageAbortController.signal);
    applySessionFilters();
    applyLeadFiltersAndRender();

    window.addEventListener('leadsUpdated', applyLeadFiltersAndRender, { signal: pageAbortController.signal });
    window.addEventListener('tasksUpdated', applyLeadFiltersAndRender, { signal: pageAbortController.signal });
    window.addEventListener('documentsUpdated', applyLeadFiltersAndRender, { signal: pageAbortController.signal });
}

export function destroy() {
    if (pageAbortController) {
        pageAbortController.abort();
    }
    pageState.selectedLeadId = null;
    pageState.activeRightColumnView = 'engagement';
}


// --- 3. EVENT HANDLING & DELEGATION ---

function addPageEventListeners(signal) {
    // Main page actions
    document.getElementById('showAddLeadFormButtonPage').addEventListener('click', () => openLeadModal(), { signal });
    const importBtn = document.getElementById('importLeadsButton');
    const importDropdown = document.getElementById('importLeadsDropdown');
    importBtn.addEventListener('click', (e) => { e.stopPropagation(); importDropdown.classList.toggle('active'); }, { signal });
    document.getElementById('importLeadsCsvButton').addEventListener('click', () => { document.getElementById('csvFileInput').click(); importDropdown.classList.remove('active'); }, { signal });
    document.getElementById('csvFileInput').addEventListener('change', handleCsvImport, { signal });
    document.getElementById('importVCardButton').addEventListener('click', () => { document.getElementById('vCardFileInput').click(); importDropdown.classList.remove('active'); }, { signal });
    document.getElementById('vCardFileInput').addEventListener('change', handleVCardImport, { signal });

    // Filter changes
    document.getElementById('filterLeadPipelineStage').addEventListener('change', applyLeadFiltersAndRender, { signal });
    document.getElementById('filterLeadByTaskStatus').addEventListener('change', applyLeadFiltersAndRender, { signal });
    document.getElementById('filterLeadFinancingStatus').addEventListener('change', applyLeadFiltersAndRender, { signal });

    // Event Delegation for dynamic content
    document.getElementById('leads-list-panel').addEventListener('click', handleLeadListClick, { signal });
    document.getElementById('leads-detail-panel').addEventListener('click', handleDetailPanelClick, { signal });
    // ========================================================================
    // START: BUG FIX - Added separate 'change' listener for select dropdowns
    // ========================================================================
    document.getElementById('leads-detail-panel').addEventListener('change', handleDetailPanelChange, { signal });
    // ========================================================================
    // END: BUG FIX
    // ========================================================================
    document.getElementById('leads-right-panel').addEventListener('click', handleRightPanelClick, { signal });

    // Global listener to close dropdowns
    document.body.addEventListener('click', closeImportDropdown, { signal });
}

function handleLeadListClick(event) {
    const listItem = event.target.closest('.vision-list-item');
    if (listItem && listItem.dataset.leadId) {
        selectAndRenderLead(listItem.dataset.leadId);
    }
}

// ========================================================================
// START: BUG FIX - Modified click handler and added change handler
// ========================================================================
function handleDetailPanelClick(event) {
    const lead = state.allLeads.find(l => l.id === pageState.selectedLeadId);
    if (!lead) return;

    const target = event.target;
    const actionButton = target.closest('.card-action-button');

    if (actionButton) {
        renderRightColumn(actionButton.dataset.view, lead);
    } else if (target.id === 'detailEditLeadButton') {
        openLeadModal(lead);
    }
}

async function handleDetailPanelChange(event) {
    const lead = state.allLeads.find(l => l.id === pageState.selectedLeadId);
    // This handler now correctly targets the dropdown by its ID and event type
    if (!lead || event.target.id !== 'quickStageChange') return;

    showLoading(true);
    try {
        await fb.updateLead(state.currentUser.uid, lead.id, { pipelineStage: event.target.value });
    } catch (error) {
        console.error("Failed to update pipeline stage:", error);
        alert("There was an error updating the stage. Please try again.");
    } finally {
        showLoading(false);
    }
}
// ========================================================================
// END: BUG FIX
// ========================================================================

function handleRightPanelClick(event) {
    const lead = state.allLeads.find(l => l.id === pageState.selectedLeadId);
    if (!lead) return;

    const view = rightPanelViews[pageState.activeRightColumnView];
    if (view && typeof view.handleClicks === 'function') {
        view.handleClicks(event, lead);
    }
}

function closeImportDropdown(e) {
    const dropdown = document.getElementById('importLeadsDropdown');
    const button = document.getElementById('importLeadsButton');
    if (dropdown && button && !button.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
    }
}


// --- 4. DATA FILTERING & LIST RENDERING ---

function applySessionFilters() {
    const pipeline = sessionStorage.getItem('pendingPipelineFilter');
    if (pipeline) document.getElementById('filterLeadPipelineStage').value = pipeline;
    sessionStorage.clear();
}

function applyLeadFiltersAndRender() {
    let filtered = [...state.allLeads];
    pageState.filters.pipeline = document.getElementById('filterLeadPipelineStage').value;
    pageState.filters.taskStatus = document.getElementById('filterLeadByTaskStatus').value;
    pageState.filters.financing = document.getElementById('filterLeadFinancingStatus').value;

    if (pageState.filters.pipeline) filtered = filtered.filter(lead => (lead.pipelineStage || 'New Lead') === pageState.filters.pipeline);
    if (pageState.filters.financing) filtered = filtered.filter(lead => lead.financingStatus === pageState.filters.financing);
    if (pageState.filters.taskStatus) {
        if (pageState.filters.taskStatus === "HAS_NO_TASKS") filtered = filtered.filter(lead => !state.allTasks.some(task => task.associatedLeadId === lead.id));
        else filtered = filtered.filter(lead => state.allTasks.some(task => task.associatedLeadId === lead.id && task.status === pageState.filters.taskStatus));
    }

    renderLeadList(filtered);
    const isSelectedLeadVisible = filtered.some(l => l.id === pageState.selectedLeadId);

    if (pageState.selectedLeadId && isSelectedLeadVisible) {
        selectAndRenderLead(pageState.selectedLeadId, true);
    } else {
        pageState.selectedLeadId = null;
        renderDefaultDetailView();
        renderDefaultRightColumn();
    }
}

function renderLeadList(leads) {
    const container = document.getElementById('leads-list-panel');
    if (!container) return;
    container.innerHTML = `<h3>Leads (${leads.length})</h3><div class="list-container"></div>`;
    const listContainer = container.querySelector('.list-container');
    if (leads.length === 0) {
        listContainer.innerHTML = '<div class="no-items-message">No leads match filters.</div>';
        return;
    }
    const fragment = document.createDocumentFragment();
    leads.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)).forEach(lead => {
        const item = document.createElement('div');
        item.className = 'vision-list-item';
        item.dataset.leadId = lead.id;
        item.innerHTML = `<span class="item-title">${lead.name || 'Unnamed Lead'}</span><span class="item-subtitle">${lead.pipelineStage || 'New Lead'}</span>`;
        fragment.appendChild(item);
    });
    listContainer.appendChild(fragment);
}


// --- 5. DETAIL (MIDDLE COLUMN) RENDERING & SELECTION ---

function selectAndRenderLead(leadId, forceRender = false) {
    if (pageState.selectedLeadId === leadId && !forceRender) return;
    pageState.selectedLeadId = leadId;
    pageState.activeLogFilter = 'all';

    document.querySelectorAll('.vision-list-item.active').forEach(i => i.classList.remove('active'));
    document.querySelector(`.vision-list-item[data-lead-id="${leadId}"]`)?.classList.add('active');

    renderLeadDetail(leadId);
    renderRightColumn(pageState.activeRightColumnView, state.allLeads.find(l => l.id === leadId));
}

function renderDefaultDetailView() {
    const container = document.getElementById('leads-detail-panel');
    if (container) container.innerHTML = `<div class="default-view-message"><p>Select a lead from the list to view its details.</p></div>`;
}

function renderLeadDetail(leadId) {
    const container = document.getElementById('leads-detail-panel');
    const lead = state.allLeads.find(l => l.id === leadId);
    if (!container || !lead) { renderDefaultDetailView(); return; }

    const lastContactedNote = (lead.engagementNotes || []).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))[0];
    const lastContactedDate = lastContactedNote ? (lastContactedNote.createdAt?.toDate ? lastContactedNote.createdAt.toDate().toLocaleDateString() : 'N/A') : 'N/A';

    const socialLinksHTML = [
        { url: lead.facebook, icon: ICONS.facebook, name: 'Facebook' },
        { url: lead.instagram, icon: ICONS.instagram, name: 'Instagram' },
        { url: lead.linkedin, icon: ICONS.linkedin, name: 'LinkedIn' },
        { url: lead.twitter, icon: ICONS.twitter, name: 'Twitter' }
    ].filter(item => item.url).map(item => `<a href="${item.url.startsWith('http') ? item.url : 'https://' + item.url}" target="_blank" title="${item.name}">${item.icon}</a>`).join('');

    // ========================================================================
    // START: UI CHANGES - Removed 'Add Task' and renamed 'Edit' button
    // ========================================================================
    container.innerHTML = `
        <div class="detail-header">
            <div class="detail-title"><h2>${lead.name}</h2><span class="priority-badge priority-${(lead.priority || 'Warm').toLowerCase()}">${lead.priority || 'Warm'}</span></div>
            <div class="detail-header-actions">
                <button id="detailEditLeadButton" class="button-glass-subtle">View / Edit Details</button>
            </div>
        </div>
        <div class="detail-actions">
            <button class="card-action-button" data-view="engagement" title="Engagement Log">${ICONS.log}</button>
            <button class="card-action-button" data-view="tasks" title="Tasks">${ICONS.tasks}</button>
            <button class="card-action-button" data-view="workflow" title="Workflow">${ICONS.workflow}</button>
            <button class="card-action-button" data-view="documents" title="Documents">${ICONS.docs}</button>
            <button class="card-action-button" data-view="contacts" title="Associated Contacts">${ICONS.contacts}</button>
            <button class="card-action-button" data-view="emailLog" title="Email Log">${ICONS.emailLog}</button>
        </div>
        <div class="detail-body">
            <div class="detail-section"><h4>Contact Info</h4><p><strong>Email:</strong> ${lead.email || 'N/A'}</p><p><strong>Phone:</strong> ${lead.phone || 'N/A'}</p></div>
            <div class="detail-section"><h4>Status & Dates</h4>
                <p><strong>Stage:</strong> <select id="quickStageChange" class="quick-stage-select"></select></p>
                <p><strong>Last Contact:</strong> ${lastContactedDate}</p>
            </div>
            <div class="detail-section"><h4>Financial</h4><p><strong>Budget:</strong> ${lead.budget || 'N/A'}</p><p><strong>Financing:</strong> ${lead.financingStatus || 'N/A'}</p></div>
            <div class="detail-section"><h4>Details</h4><p><strong>Source:</strong> ${lead.source || 'N/A'}</p><p><strong>Type:</strong> ${lead.type || 'N/A'}</p></div>
            ${(lead.tags && lead.tags.length > 0) ? `<div class="detail-section full-width"><h4>Tags</h4><div class="tags-container">${lead.tags.map(t => `<span class="tag-item">${t}</span>`).join('')}</div></div>` : ''}
            ${socialLinksHTML ? `<div class="detail-section full-width"><h4>Social</h4><div class="social-icons-container">${socialLinksHTML}</div></div>` : ''}
            <div class="detail-section full-width"><h4>Notes</h4><p class="notes-content">${lead.notes?.replace(/\n/g, '<br>') || 'No notes'}</p></div>
        </div>
    `;
    // ========================================================================
    // END: UI CHANGES
    // ========================================================================
    populatePipelineStageDropdowns(container.querySelector('#quickStageChange'), true, false, lead.pipelineStage || 'New Lead');
}


// --- 6. RIGHT COLUMN MODULAR VIEWS ---

function renderDefaultRightColumn() {
    const container = document.getElementById('leads-right-panel');
    if (container) container.innerHTML = `<div class="default-view-message"><p>Select a lead to view associated information.</p></div>`;
}

function renderRightColumn(viewType, lead) {
    if (!lead) { renderDefaultRightColumn(); return; }

    pageState.activeRightColumnView = viewType;
    document.querySelectorAll('#leads-detail-panel .card-action-button').forEach(btn => {
        btn.classList.toggle('active-action-icon', btn.dataset.view === viewType);
    });

    const container = document.getElementById('leads-right-panel');
    const view = rightPanelViews[viewType];
    if (view) {
        container.innerHTML = view.render(lead);
    } else {
        renderDefaultRightColumn();
    }
}

const rightPanelViews = {
    engagement: {
        render: (lead) => {
            const notes = lead.engagementNotes || [];
            const filteredNotes = pageState.activeLogFilter === 'all' ? notes : notes.filter(n => typeof n === 'object' && n && n.type === pageState.activeLogFilter);
            filteredNotes.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

            const notesHtml = filteredNotes.length > 0 ? filteredNotes.map(note => {
                if (typeof note === 'object' && note && note.content) {
                    return `<div class="right-panel-list-item"><div class="log-entry-header">${ICONS[note.type] || ICONS.note}<span>${note.type.charAt(0).toUpperCase() + note.type.slice(1)}</span></div><p class="item-content">${note.content.replace(/\n/g, '<br>')}</p><p class="item-timestamp">${note.createdAt.toDate().toLocaleString()}</p></div>`;
                }
                return '';
            }).join('') : '<p class="no-items-message small">No entries match filter.</p>';

            return `
                <div class="right-panel-view">
                    <div class="right-panel-header"><h3>Engagement Log</h3><div class="log-filter-buttons"><button data-filter="all" class="button-glass-subtle ${pageState.activeLogFilter === 'all' ? 'active' : ''}">All</button><button data-filter="call" class="button-glass-subtle ${pageState.activeLogFilter === 'call' ? 'active' : ''}">Calls</button><button data-filter="email" class="button-glass-subtle ${pageState.activeLogFilter === 'email' ? 'active' : ''}">Emails</button><button data-filter="meeting" class="button-glass-subtle ${pageState.activeLogFilter === 'meeting' ? 'active' : ''}">Meetings</button><button data-filter="note" class="button-glass-subtle ${pageState.activeLogFilter === 'note' ? 'active' : ''}">Notes</button></div></div>
                    <div class="right-panel-content right-panel-list">${notesHtml}</div>
                    <div class="add-interaction-form"><textarea id="newInteractionText" placeholder="Log a call, email, or meeting..." rows="3"></textarea><div class="add-interaction-actions"><button data-type="call" title="Log a Call">${ICONS.call} Log Call</button><button data-type="email" title="Log an Email">${ICONS.email} Log Email</button><button data-type="meeting" title="Log a Meeting">${ICONS.meeting} Log Meeting</button><button data-type="note" title="Log a Note">${ICONS.note} Log Note</button></div></div>
                </div>`;
        },
        handleClicks: (event, lead) => {
            const filterBtn = event.target.closest('.log-filter-buttons button');
            const actionBtn = event.target.closest('.add-interaction-actions button');
            if (filterBtn) {
                pageState.activeLogFilter = filterBtn.dataset.filter;
                renderRightColumn('engagement', lead);
            }
            if (actionBtn) {
                handleInteractionSave(actionBtn.dataset.type, lead);
            }
        }
    },
    tasks: {
        render: (lead) => {
            const tasksForLead = state.allTasks.filter(task => task.associatedLeadId === lead.id);
            tasksForLead.sort((a, b) => (a.dueDate?.toDate() || Infinity) - (b.dueDate?.toDate() || Infinity));
            const tasksHtml = tasksForLead.length > 0 ? tasksForLead.map(task => `<button class="right-panel-list-item" data-task-id="${task.id}"><p class="item-content">${task.title}</p><p class="item-timestamp">Due: ${task.dueDate ? task.dueDate.toDate().toLocaleDateString() : 'N/A'} • ${task.status}</p></button>`).join('') : '<p class="no-items-message small">No tasks for this lead.</p>';
            return `<div class="right-panel-view"><h3 class="right-panel-header">Tasks</h3><div class="right-panel-content right-panel-list">${tasksHtml}</div><div class="modal-actions-footer" style="border:none; padding-top:0.5rem;"><button id="addNewTaskForLeadBtn">Add New Task</button></div></div>`;
        },
        handleClicks: (event, lead) => {
            const taskItem = event.target.closest('.right-panel-list-item');
            const addTaskBtn = event.target.closest('#addNewTaskForLeadBtn');
            if (taskItem) openTaskModal(state.allTasks.find(t => t.id === taskItem.dataset.taskId));
            if (addTaskBtn) openTaskModal({ associatedLeadId: lead.id });
        }
    },
    workflow: {
        render: (lead) => {
            const stage = lead.pipelineStage || 'New Lead';
            const flowData = state.flowSteps[stage];
            if (!flowData) return `<div class="right-panel-view"><p class="no-items-message small">No workflow defined for stage: <strong>${stage}</strong></p></div>`;

            const completedTasks = state.allTasks.filter(task => task.associatedLeadId === lead.id && task.status === 'Completed');
            const checklistHtml = flowData.checklist.map(item => `<button class="workflow-step-button ${completedTasks.some(t => t.title === item.title) ? 'completed' : ''}" data-title="${item.title}" data-desc="${item.description || ''}">${item.title}</button>`).join('');

            let upNextHtml = '';
            const currentStageIndex = state.pipelineStages.indexOf(stage);
            if (currentStageIndex > -1 && currentStageIndex < state.pipelineStages.length - 1) {
                const nextFlowData = state.flowSteps[state.pipelineStages[currentStageIndex + 1]];
                if (nextFlowData) {
                    const nextChecklistHtml = nextFlowData.checklist.map(item => `<button class="workflow-step-button" disabled>${item.title}</button>`).join('');
                    upNextHtml = `<div class="up-next-section"><h4>Up Next: ${nextFlowData.title}</h4><div class="up-next-checklist two-column-checklist">${nextChecklistHtml}</div></div>`;
                }
            }

            return `<div class="right-panel-view"><div class="workflow-view-header"><h3>${flowData.title}</h3><p><strong>Goal:</strong> ${flowData.goal}</p></div><div class="right-panel-content workflow-step-list two-column-checklist">${checklistHtml}</div>${upNextHtml}</div>`;
        },
        handleClicks: (event, lead) => {
            const workflowBtn = event.target.closest('.workflow-step-button:not([disabled])');
            if (workflowBtn) handleWorkflowStepClick(workflowBtn, lead);
        }
    },
    documents: {
        render: (lead) => {
            const docsForLead = state.allDocuments.filter(doc => doc.associatedLeadId === lead.id);
            const docsHtml = docsForLead.length > 0 ? docsForLead.map(doc => `<a href="${doc.fileURL}" target="_blank" class="right-panel-list-item document-item"><span class="item-content" title="${doc.fileName}">${doc.fileName}</span><span class="item-timestamp">${doc.uploadedAt.toDate().toLocaleDateString()}</span></a>`).join('') : '<p class="no-items-message small">No documents for this lead.</p>';
            return `<div class="right-panel-view"><h3 class="right-panel-header">Documents</h3><div class="right-panel-content right-panel-list">${docsHtml}</div><div class="modal-actions-footer" style="border:none; padding-top:0.5rem;"><button id="addNewDocForLeadBtn">Upload Document</button></div></div>`;
        },
        handleClicks: (event, lead) => {
            if (event.target.closest('#addNewDocForLeadBtn')) openUploadDocumentModal(lead.id);
        }
    },
    contacts: {
        render: (lead) => {
            const contacts = lead.associatedContacts || [];
            const contactsHtml = contacts.length > 0 ? contacts.map(c => `<div class="right-panel-list-item"><p class="item-content"><strong>${c.role || 'Contact'}:</strong> ${c.name || 'N/A'}</p><p class="item-timestamp">${c.email || ''} ${c.phone ? `• ${c.phone}` : ''}</p></div>`).join('') : '<p class="no-items-message small">No associated contacts.</p>';
            return `<div class="right-panel-view"><h3 class="right-panel-header">Associated Contacts</h3><div class="right-panel-content right-panel-list">${contactsHtml}</div><div class="modal-actions-footer" style="border:none; padding-top:0.5rem;"><button id="editLeadContactsBtn">Edit Lead & Contacts</button></div></div>`;
        },
        handleClicks: (event, lead) => {
            if (event.target.closest('#editLeadContactsBtn')) openLeadModal(lead);
        }
    },
    emailLog: {
        render: (lead) => {
            const log = (lead.emailLog || []).sort((a, b) => (b.sentAt?.toMillis() || 0) - (a.sentAt?.toMillis() || 0));
            const logHtml = log.length > 0 ? log.map(entry => `<div class="right-panel-list-item"><p class="item-content">${entry.subject}</p><p class="item-timestamp">Sent: ${entry.sentAt ? entry.sentAt.toDate().toLocaleString() : 'N/A'}</p></div>`).join('') : '<p class="no-items-message small">No emails have been logged for this lead.</p>';
            return `<div class="right-panel-view"><h3 class="right-panel-header">Email Log</h3><div class="right-panel-content right-panel-list">${logHtml}</div></div>`;
        },
        handleClicks: () => { }
    }
};


// --- 7. HELPER & UTILITY FUNCTIONS ---

async function handleInteractionSave(type, lead) {
    const contentEl = document.getElementById('newInteractionText');
    const content = contentEl.value.trim();
    if (!content) return;
    const newNote = { type, content, createdAt: fb.Timestamp.now() };
    const updatedNotes = [newNote, ...(lead.engagementNotes || [])];
    showLoading(true);
    try {
        await fb.updateLead(state.currentUser.uid, lead.id, { engagementNotes: updatedNotes });
        contentEl.value = '';
    } catch (error) {
        console.error("Error saving interaction:", error);
        alert("Failed to save interaction.");
    } finally {
        showLoading(false);
    }
}

async function handleWorkflowStepClick(button, lead) {
    const taskTitle = button.dataset.title;
    const isCompleted = button.classList.contains('completed');
    button.disabled = true;
    if (isCompleted) {
        const taskToDelete = state.allTasks.find(task => task.associatedLeadId === lead.id && task.title === taskTitle && task.status === 'Completed');
        if (taskToDelete) {
            try { await fb.deleteTask(state.currentUser.uid, taskToDelete.id); }
            catch (e) { console.error("Failed to delete workflow task:", e); alert("Could not remove task. Please try again."); }
        }
    } else {
        const taskData = { title: taskTitle, description: button.dataset.desc, associatedLeadId: lead.id, status: 'Completed', dueDate: null };
        try { await fb.addTask(state.currentUser.uid, taskData); }
        catch (e) { console.error("Failed to create workflow task:", e); alert("Could not create task. Please try again."); }
    }
    button.disabled = false;
}

function handleCsvImport(event) {
    const file = event.target.files[0]; if (!file || !state.currentUser) return; showLoading(true);
    Papa.parse(file, {
        header: true, skipEmptyLines: true, complete: async (results) => {
            const leads = results.data.map(row => ({ name: `${row["First Name"] || ""} ${row["Last Name"] || ""}`.trim() || row.Email || row.Phone, email: row.Email || "", phone: row.Phone || "", source: "CSV Import", pipelineStage: "New Lead" })).filter(lead => lead.name);
            try { await fb.importLeadsFromCSV(state.currentUser.uid, leads); alert(`${leads.length} leads imported successfully.`); } catch (error) { alert("Failed to import leads."); } finally { showLoading(false); }
        }, error: () => { alert("Failed to parse CSV file."); showLoading(false); }
    });
    event.target.value = null;
}

function handleVCardImport(event) {
    const file = event.target.files[0]; if (!file || !state.currentUser) return; showLoading(true); const reader = new FileReader();
    reader.onload = async (e) => {
        try { const contacts = parseVCard(e.target.result); await fb.importLeadsFromVCard(state.currentUser.uid, contacts); alert(`${contacts.length} contact(s) imported from vCard.`); } catch (error) { alert("Failed to import vCard."); } finally { showLoading(false); }
    };
    reader.readAsText(file); event.target.value = null;
}

function parseVCard(vcfContent) {
    const lines = vcfContent.split(/\r\n|\r|\n/); let contact = {}; const contacts = [];
    for (const line of lines) { if (line.trim().toUpperCase() === 'BEGIN:VCARD') contact = {}; else if (line.trim().toUpperCase() === 'END:VCARD' && Object.keys(contact).length) contacts.push(contact); else { let [key, ...val] = line.split(':'); let value = val.join(':'); if (key?.startsWith('FN')) contact.name = value; else if (key?.includes('EMAIL') && !contact.email) contact.email = value; else if (key?.includes('TEL') && !contact.phone) contact.phone = value; } }
    return contacts;
}