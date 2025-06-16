import { showLoading } from './ui.js';
import * as state from './state.js';
import * as fb from './firebase-service.js';
import { populateLeadDropdowns, populatePipelineStageDropdowns } from './utilities.js';
import { setSelectedLead, addEmailsToCc } from './page-modules/email.js';

// =========================================================================
// START: DEFINITIVE FIX FOR GHOST MODAL ISSUE
// This new function will be called by the router to ensure a clean UI state on navigation.
export function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}
// END: DEFINITIVE FIX
// =========================================================================

// --- MODAL INITIALIZATION ---
export function initModals() {
    const safeAddListener = (id, event, handler) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
        }
    };

    const modals = [
        { id: 'leadModal', closeBtnId: 'closeLeadModalButton' },
        { id: 'taskModal', closeBtnId: 'closeTaskModalButton' },
        { id: 'viewContactsModal', closeBtnId: 'closeViewContactsModalButton' },
        { id: 'uploadDocumentModal', closeBtnId: 'closeUploadDocumentModalButton' },
        { id: 'selectLeadModal', closeBtnId: 'closeSelectLeadModalButton' },
        { id: 'selectCcModal', closeBtnId: 'closeSelectCcModalButton' },
        { id: 'leadDocumentsModal', closeBtnId: 'closeLeadDocumentsModalButton' },
        { id: 'flowModal', closeBtnId: 'closeFlowModalButton' },
        { id: 'simpleModal', closeBtnId: 'simpleModalCancelBtn' },
    ];

    modals.forEach(modalInfo => {
        const modalEl = document.getElementById(modalInfo.id);
        if (modalEl) {
            const closeButton = document.getElementById(modalInfo.closeBtnId);
            if (closeButton) {
                closeButton.addEventListener('click', () => modalEl.style.display = 'none');
            }
            window.addEventListener('click', (event) => {
                if (event.target === modalEl) {
                    modalEl.style.display = 'none';
                }
            });
        }
    });

    const simpleModalConfirmBtn = document.getElementById('simpleModalConfirmBtn');
    if (simpleModalConfirmBtn) {
        simpleModalConfirmBtn.addEventListener('click', (e) => {
            if (!e.defaultPrevented) {
                document.getElementById('simpleModal').style.display = 'none';
            }
        });
    }

    // Event delegation for lead modal actions
    const leadModal = document.getElementById('leadModal');
    if (leadModal) {
        leadModal.addEventListener('click', (e) => {
            if (e.target.closest('#saveLeadButton')) {
                e.preventDefault();
                saveLead();
            }
            if (e.target.closest('#deleteLeadModalButton')) {
                e.preventDefault();
                const leadId = document.getElementById('leadId').value;
                if (leadId) {
                    deleteLead(leadId);
                }
            }
        });
    }

    safeAddListener('addAssociatedContactButton', 'click', () => addAssociatedContactField());

    safeAddListener('saveTaskButton', 'click', saveTask);
    safeAddListener('saveDocumentButton', 'click', saveDocument);
    safeAddListener('leadSearchInput', 'input', () => {
        const searchInput = document.getElementById('leadSearchInput');
        if (searchInput) renderLeadSelectionList(searchInput.value);
    });
    safeAddListener('addSelectedToCcButton', 'click', handleAddSelectedToCc);
    safeAddListener('ccSelectAllCheckbox', 'change', (e) => handleCcSelectAll(e));
    safeAddListener('addNewCcContactButton', 'click', handleAddNewCcContact);
}

// --- SIMPLE MODAL (NEW from Drip Integration) ---
export function showSimpleAlert(message, onConfirm) {
    const modal = document.getElementById('simpleModal');
    if (!modal) return;

    document.getElementById('simpleModalTitle').textContent = 'Alert';
    document.getElementById('simpleModalMessage').textContent = message;
    document.getElementById('simpleModalInput').style.display = 'none';
    document.getElementById('simpleModalCancelBtn').style.display = 'none';

    document.getElementById('simpleModalConfirmBtn').onclick = (e) => {
        e.preventDefault();
        modal.style.display = 'none';
        if (onConfirm) onConfirm();
    };

    modal.style.display = 'flex';
}

export function showSimplePrompt(message, defaultValue, onConfirm) {
    const modal = document.getElementById('simpleModal');
    if (!modal) return;

    document.getElementById('simpleModalTitle').textContent = 'Input Required';
    document.getElementById('simpleModalMessage').textContent = message;
    const inputEl = document.getElementById('simpleModalInput');
    inputEl.style.display = 'block';
    inputEl.value = defaultValue;

    const cancelBtn = document.getElementById('simpleModalCancelBtn');
    cancelBtn.style.display = 'inline-flex';

    document.getElementById('simpleModalConfirmBtn').onclick = (e) => {
        e.preventDefault();
        modal.style.display = 'none';
        if (onConfirm) onConfirm(inputEl.value);
    };

    cancelBtn.onclick = () => {
        modal.style.display = 'none';
    };

    modal.style.display = 'flex';
    inputEl.focus();
    inputEl.select();
}


// --- PRESERVED MODAL FUNCTIONS FROM ORIGINAL CODE ---

// --- FLOW MODAL ---
export function openFlowModal(leadId) {
    const lead = state.allLeads.find(l => l.id === leadId);
    const flowModal = document.getElementById('flowModal');
    const flowModalTitle = document.getElementById('flowModalTitle');
    const flowModalContent = document.getElementById('flowModalContent');
    if (!lead || !flowModal || !flowModalTitle || !flowModalContent) return;
    flowModalTitle.textContent = `Workflow for ${lead.name}`;
    const stage = lead.pipelineStage || 'New Lead';
    const flowData = state.flowSteps[stage];
    if (typeof flowData === 'object' && flowData !== null) {
        const checklistHtml = flowData.checklist.map((item, index) => `<li><input type="checkbox" id="flow-task-${index}" data-title="${item.title}" data-desc="${item.description}"><label for="flow-task-${index}">${item.title}</label></li>`).join('');
        flowModalContent.innerHTML = `<h3><span class="nav-icon">${flowData.title}</span></h3><p><strong>Goal:</strong> ${flowData.goal}</p><p><strong>Triggered By:</strong> ${flowData.trigger}</p><ul class="flow-checklist">${checklistHtml}</ul>`;
        flowModalContent.querySelectorAll('.flow-checklist input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => handleFlowCheckboxChange(e, leadId));
        });
        updateFlowChecklistState(leadId);
    } else {
        flowModalContent.innerHTML = `<p>No flow defined for stage: <strong>${stage}</strong></p>`;
    }
    flowModal.style.display = 'flex';
}
function updateFlowChecklistState(leadId) {
    const flowModalContent = document.getElementById('flowModalContent');
    if (!flowModalContent) return;
    const checklistItems = flowModalContent.querySelectorAll('.flow-checklist input[type="checkbox"]');
    if (checklistItems.length === 0) return;
    const completedTasksForLead = state.allTasks.filter(task => task.associatedLeadId === leadId && task.status === 'Completed');
    checklistItems.forEach(checkbox => {
        checkbox.checked = completedTasksForLead.some(task => task.title === checkbox.dataset.title);
        checkbox.disabled = false;
    });
}
async function handleFlowCheckboxChange(event, leadId) {
    const checkbox = event.target;
    if (!leadId || !state.currentUser) return;
    checkbox.disabled = true;
    const taskTitle = checkbox.dataset.title;
    if (checkbox.checked) {
        const taskData = { title: taskTitle, description: checkbox.dataset.desc, associatedLeadId: leadId, status: 'Completed', dueDate: null };
        try { await fb.addTask(state.currentUser.uid, taskData); }
        catch (e) { console.error("Failed to create task from flow:", e); alert("Could not create the task. Please try again."); checkbox.checked = false; }
    } else {
        const taskToDelete = state.allTasks.find(task => task.associatedLeadId === leadId && task.title === taskTitle && task.status === 'Completed');
        if (taskToDelete) {
            try { await fb.deleteTask(state.currentUser.uid, taskToDelete.id); }
            catch (e) { console.error("Failed to delete task from flow:", e); alert("Could not uncheck the task. Please try again."); checkbox.checked = true; }
        }
    }
    checkbox.disabled = false;
}

// --- LEAD DOCUMENTS MODAL ---
export function openLeadDocumentsModal(leadId) {
    const lead = state.allLeads.find(l => l.id === leadId);
    const leadDocumentsModal = document.getElementById('leadDocumentsModal');
    if (!lead || !leadDocumentsModal) return;
    document.getElementById('leadDocumentsModalTitle').textContent = `Documents for ${lead.name}`;
    renderLeadDocumentsList(leadId);
    document.getElementById('addLeadDocumentButton').onclick = () => { leadDocumentsModal.style.display = 'none'; openUploadDocumentModal(leadId); };
    leadDocumentsModal.style.display = 'flex';
}
function renderLeadDocumentsList(leadId) {
    const leadDocumentsList = document.getElementById('leadDocumentsList');
    leadDocumentsList.innerHTML = '';
    const docsForLead = state.allDocuments.filter(doc => doc.associatedLeadId === leadId);
    if (docsForLead.length === 0) { leadDocumentsList.innerHTML = '<p>No documents found for this lead.</p>'; return; }
    docsForLead.forEach(doc => {
        const item = document.createElement('div');
        item.className = 'document-item';
        item.innerHTML = `<a href="${doc.fileURL}" target="_blank">${doc.fileName}</a><button class="delete-doc danger" data-doc-id="${doc.id}">Delete</button>`;
        item.querySelector('.delete-doc').addEventListener('click', async (e) => {
            const docId = e.currentTarget.dataset.docId;
            if (confirm(`Are you sure you want to delete "${doc.fileName}"?`)) {
                showLoading(true);
                try { await fb.deleteDocument(state.currentUser.uid, docId); renderLeadDocumentsList(leadId); }
                catch (err) { console.error("Error deleting document from modal:", err); alert("Failed to delete document."); }
                finally { showLoading(false); }
            }
        });
        leadDocumentsList.appendChild(item);
    });
}

// --- DOCUMENT UPLOAD MODAL ---
export function openUploadDocumentModal(leadId = null) {
    const uploadDocumentModal = document.getElementById('uploadDocumentModal');
    if (!uploadDocumentModal) return;
    document.getElementById('uploadDocumentForm').reset();
    const leadDropdown = document.getElementById('documentAssociatedLead');
    populateLeadDropdowns(leadDropdown);
    if (leadId) {
        leadDropdown.value = leadId;
        leadDropdown.disabled = true;
    } else {
        leadDropdown.disabled = false;
        if (leadDropdown.options[0]?.value !== "") {
            const noneOption = document.createElement('option');
            noneOption.value = "";
            noneOption.textContent = "None (General Document)";
            leadDropdown.prepend(noneOption);
        }
        leadDropdown.value = "";
    }
    uploadDocumentModal.style.display = "flex";
}
async function saveDocument() {
    if (!state.currentUser) return;
    const fileInput = document.getElementById('documentFileInput');
    const leadId = document.getElementById('documentAssociatedLead').value;
    const description = document.getElementById('documentDescription').value.trim();
    const file = fileInput.files[0];
    if (!file) { alert("Please select a file to upload."); return; }
    showLoading(true);
    try {
        await fb.uploadDocumentAndSaveMetadata(state.currentUser.uid, leadId || null, file, description);
        document.getElementById('uploadDocumentModal').style.display = "none";
    } catch (e) { console.error("Error uploading document:", e); alert("Failed to upload document. Please check the console for details."); }
    finally { showLoading(false); }
}

// --- EMAIL WORKFLOW MODALS ---
export function openSelectLeadModal() {
    const selectLeadModal = document.getElementById('selectLeadModal');
    if (!selectLeadModal) return;
    renderLeadSelectionList();
    selectLeadModal.style.display = 'flex';
    document.getElementById('leadSearchInput').focus();
}

function renderLeadSelectionList(filter = '') {
    const leadListContainer = document.getElementById('leadListContainer');
    leadListContainer.innerHTML = '';
    const searchFilter = filter.trim().toLowerCase();
    const filteredLeads = state.allLeads.filter(lead => lead.email && ((lead.name && lead.name.toLowerCase().includes(searchFilter)) || (lead.email.toLowerCase().includes(searchFilter))));

    if (filteredLeads.length === 0) {
        leadListContainer.innerHTML = '<p class="no-results-message">No leads found.</p>';
        return;
    }

    filteredLeads.forEach(lead => {
        const item = document.createElement('div');
        item.className = 'vision-selection-item';
        item.innerHTML = `
            <span class="item-title">${lead.name || 'N/A'}</span>
            <span class="item-subtitle">${lead.email}</span>
        `;
        item.addEventListener('click', () => {
            setSelectedLead(lead);
            document.getElementById('selectLeadModal').style.display = 'none';
        });
        leadListContainer.appendChild(item);
    });
}

export function openSelectCcModal(currentLead) {
    if (!currentLead) { alert("Please select a primary lead first."); return; }
    const selectCcModal = document.getElementById('selectCcModal');
    if (!selectCcModal) return;
    document.getElementById('addNewCcContactButton').dataset.leadId = currentLead.id;
    renderCcContactList(currentLead.associatedContacts || []);
    selectCcModal.style.display = 'flex';
}
function renderCcContactList(contacts) {
    const ccContactListContainer = document.getElementById('ccContactListContainer');
    ccContactListContainer.innerHTML = '';
    const existingCcEmails = document.getElementById('emailCc').value.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    document.getElementById('ccSelectAllContainer').style.display = contacts.length > 1 ? 'block' : 'none';
    document.getElementById('ccSelectAllCheckbox').checked = false;
    if (contacts.length === 0) { ccContactListContainer.innerHTML = '<p class="no-results-message">No associated contacts. Add one below.</p>'; return; }
    contacts.forEach((contact, index) => {
        if (!contact.email) return;
        const item = document.createElement('div');
        item.className = 'cc-selection-item';
        const isChecked = existingCcEmails.includes(contact.email.toLowerCase());
        item.innerHTML = `<input type="checkbox" value="${contact.email}" id="cc-contact-${index}" ${isChecked ? 'checked' : ''}><label for="cc-contact-${index}">${contact.name || 'N/A'} (${contact.email})</label>`;
        ccContactListContainer.appendChild(item);
    });
}
function handleAddSelectedToCc() {
    const selectedEmails = Array.from(document.querySelectorAll('#ccContactListContainer input[type="checkbox"]:checked')).map(cb => cb.value);
    addEmailsToCc(selectedEmails);
    document.getElementById('selectCcModal').style.display = 'none';
}
function handleCcSelectAll(e) {
    document.querySelectorAll('#ccContactListContainer input[type="checkbox"]').forEach(checkbox => { checkbox.checked = e.target.checked; });
}
async function handleAddNewCcContact() {
    const newCcContactInput = document.getElementById('newCcContactInput');
    const leadId = document.getElementById('addNewCcContactButton').dataset.leadId;
    const newContactEmail = newCcContactInput.value.trim();
    const lead = state.allLeads.find(l => l.id === leadId);
    if (!newContactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newContactEmail)) { alert("Please enter a valid email address."); return; }
    if (!lead) { alert("Internal error: Could not find the current lead."); return; }
    const existingContacts = lead.associatedContacts || [];
    if (existingContacts.some(c => c.email && c.email.toLowerCase() === newContactEmail.toLowerCase())) { alert("This contact is already associated with the lead."); return; }
    showLoading(true);
    try {
        const newContact = { name: newContactEmail.split('@')[0], email: newContactEmail, phone: '', role: 'CC Contact' };
        const updatedContacts = [...existingContacts, newContact];
        await fb.updateLeadAssociatedContacts(state.currentUser.uid, leadId, updatedContacts);
        renderCcContactList(updatedContacts);
        newCcContactInput.value = '';
        alert("Contact added and saved to lead record.");
    } catch (e) { console.error("Error adding new associated contact:", e); alert("Failed to save new contact."); }
    finally { showLoading(false); }
}

// --- LEAD MODAL ---
export function openLeadModal(leadToEdit = null) {
    const leadModal = document.getElementById('leadModal');
    const leadForm = document.getElementById('leadForm');
    const deleteBtn = document.getElementById('deleteLeadModalButton');

    if (!leadModal || !leadForm || !deleteBtn) return;

    leadForm.reset();
    document.getElementById('associatedContactsContainer').innerHTML = '';
    populatePipelineStageDropdowns(document.getElementById('leadPipelineStageModal'), true, false, 'New Lead');

    if (leadToEdit) {
        document.getElementById('leadModalTitle').textContent = "Edit Lead";
        document.getElementById('leadId').value = leadToEdit.id;
        document.getElementById('leadNameModal').value = leadToEdit.name || '';
        document.getElementById('leadEmailModal').value = leadToEdit.email || '';
        document.getElementById('leadPhoneModal').value = leadToEdit.phone || '';
        document.getElementById('leadPropertyAddressModal').value = leadToEdit.propertyAddress || '';
        document.getElementById('leadHomeAddressModal').value = leadToEdit.homeAddress || '';
        document.getElementById('leadCompanyNameModal').value = leadToEdit.companyName || '';
        document.getElementById('leadDobModal').value = leadToEdit.dob || '';
        document.getElementById('leadTypeModal').value = leadToEdit.type || '';
        document.getElementById('leadSourceModal').value = leadToEdit.source || '';
        document.getElementById('leadBudgetModal').value = leadToEdit.budget || '';
        document.getElementById('leadFinancingStatusModal').value = leadToEdit.financingStatus || '';
        document.getElementById('leadPipelineStageModal').value = leadToEdit.pipelineStage || 'New Lead';
        document.getElementById('leadPriorityModal').value = leadToEdit.priority || 'Warm';
        document.getElementById('leadAssignedToModal').value = leadToEdit.assignedTo || '';
        document.getElementById('leadInstagramModal').value = leadToEdit.instagram || '';
        document.getElementById('leadFacebookModal').value = leadToEdit.facebook || '';
        document.getElementById('leadLinkedInModal').value = leadToEdit.linkedin || '';
        const gender = leadToEdit.gender || 'Other/Prefer not to say';
        const genderRadio = document.querySelector(`input[name="genderModal"][value="${gender}"]`);
        if (genderRadio) genderRadio.checked = true;
        else document.getElementById('genderOtherModal').checked = true;
        document.getElementById('leadTags').value = Array.isArray(leadToEdit.tags) ? leadToEdit.tags.join(', ') : '';
        document.getElementById('leadNotes').value = leadToEdit.notes || '';
        if (leadToEdit.associatedContacts && Array.isArray(leadToEdit.associatedContacts)) {
            leadToEdit.associatedContacts.forEach(contact => addAssociatedContactField(contact));
        }

        deleteBtn.style.display = 'inline-flex';
        // Note: The onclick logic is now handled by the delegated listener in initModals
        deleteBtn.onclick = null;

    } else {
        document.getElementById('leadModalTitle').textContent = "Add New Lead";
        document.getElementById('leadId').value = '';
        document.getElementById('genderOtherModal').checked = true;
        document.getElementById('leadPriorityModal').value = 'Warm';

        deleteBtn.style.display = 'none';
        deleteBtn.onclick = null;
    }

    leadModal.style.display = "flex";
}
async function saveLead() {
    if (!state.currentUser) return;
    const userId = state.currentUser.uid;
    const leadId = document.getElementById('leadId').value;
    const associatedContactsData = [];
    document.querySelectorAll('#associatedContactsContainer .associated-contact-entry').forEach(entry => {
        const contact = {
            role: entry.querySelector('.contact-role').value.trim(),
            name: entry.querySelector('.contact-name').value.trim(),
            email: entry.querySelector('.contact-email').value.trim(),
            phone: entry.querySelector('.contact-phone').value.trim(),
        };
        if (contact.role || contact.name || contact.email || contact.phone) associatedContactsData.push(contact);
    });
    const selectedGenderRadio = document.querySelector('input[name="genderModal"]:checked');
    const leadData = {
        name: document.getElementById('leadNameModal').value.trim(), email: document.getElementById('leadEmailModal').value.trim(), phone: document.getElementById('leadPhoneModal').value.trim(),
        propertyAddress: document.getElementById('leadPropertyAddressModal').value.trim(), homeAddress: document.getElementById('leadHomeAddressModal').value.trim(), companyName: document.getElementById('leadCompanyNameModal').value.trim(),
        dob: document.getElementById('leadDobModal').value, type: document.getElementById('leadTypeModal').value, source: document.getElementById('leadSourceModal').value,
        budget: document.getElementById('leadBudgetModal').value, financingStatus: document.getElementById('leadFinancingStatusModal').value, pipelineStage: document.getElementById('leadPipelineStageModal').value,
        priority: document.getElementById('leadPriorityModal').value, assignedTo: document.getElementById('leadAssignedToModal').value.trim(), instagram: document.getElementById('leadInstagramModal').value.trim(),
        facebook: document.getElementById('leadFacebookModal').value.trim(), linkedin: document.getElementById('leadLinkedInModal').value.trim(), gender: selectedGenderRadio ? selectedGenderRadio.value : 'Other/Prefer not to say',
        tags: document.getElementById('leadTags').value.split(',').map(t => t.trim()).filter(Boolean), notes: document.getElementById('leadNotes').value.trim(), associatedContacts: associatedContactsData,
    };
    if (!leadData.name) { alert("Lead name is required."); return; }
    showLoading(true);
    try {
        if (leadId) await fb.updateLead(userId, leadId, leadData);
        else await fb.addLead(userId, leadData);
        document.getElementById('leadModal').style.display = "none";
    } catch (e) { console.error("Error saving lead:", e); alert("Failed to save lead."); }
    finally { showLoading(false); }
}
async function deleteLead(leadId) {
    if (!state.currentUser || !confirm("Delete lead? Associated tasks and documents will also be deleted.")) return;
    showLoading(true);
    try {
        await fb.deleteLeadAndAssociatedData(state.currentUser.uid, leadId);
        document.getElementById('leadModal').style.display = "none";
    }
    catch (e) {
        console.error("Error deleting lead:", e);
        alert("Failed to delete lead.");
    }
    finally {
        showLoading(false);
    }
}

// --- TASK MODAL ---
export function openTaskModal(taskToEdit = null) {
    const taskModal = document.getElementById('taskModal');
    if (!taskModal) return;
    document.getElementById('taskForm').reset();
    populateLeadDropdowns(document.getElementById('taskAssociatedLeadModal'));
    if (taskToEdit) {
        document.getElementById('taskModalTitle').textContent = "Edit Task";
        document.getElementById('taskId').value = taskToEdit.id || '';
        document.getElementById('taskTitleModal').value = taskToEdit.title || '';
        document.getElementById('taskDescription').value = taskToEdit.description || '';
        document.getElementById('taskDueDateModal').value = taskToEdit.dueDate?.toDate ? new Date(taskToEdit.dueDate.toDate().getTime() - (taskToEdit.dueDate.toDate().getTimezoneOffset() * 60000)).toISOString().split('T')[0] : '';
        document.getElementById('taskStatusModal').value = taskToEdit.status || 'To Do';
        document.getElementById('taskAssociatedLeadModal').value = taskToEdit.associatedLeadId || '';
    } else {
        document.getElementById('taskModalTitle').textContent = "Add New Task";
        document.getElementById('taskId').value = '';
    }
    taskModal.style.display = "flex";
}
async function saveTask() {
    if (!state.currentUser) return;
    const userId = state.currentUser.uid;
    const taskId = document.getElementById('taskId').value;
    const dueDateValue = document.getElementById('taskDueDateModal').value;
    const taskData = {
        title: document.getElementById('taskTitleModal').value.trim(), description: document.getElementById('taskDescription').value.trim(),
        dueDate: dueDateValue ? fb.Timestamp.fromDate(new Date(dueDateValue + "T00:00:00")) : null, status: document.getElementById('taskStatusModal').value,
        associatedLeadId: document.getElementById('taskAssociatedLeadModal').value || null,
    };
    if (!taskData.title) { alert("Task title is required."); return; }
    showLoading(true);
    try {
        if (taskId) await fb.updateTask(userId, taskId, taskData);
        else await fb.addTask(userId, taskData);
        document.getElementById('taskModal').style.display = "none";
    } catch (e) { console.error("Error saving task:", e); alert("Failed to save task."); }
    finally { showLoading(false); }
}

// --- ASSOCIATED CONTACTS ---
function addAssociatedContactField(contact = {}) {
    const container = document.getElementById('associatedContactsContainer');
    if (!container) return;
    const entryDiv = document.createElement('div');
    entryDiv.className = 'modal-form-row associated-contact-entry';
    entryDiv.style.cssText = 'align-items: flex-end; border-top: 1px dashed #ddd; padding-top: 15px; margin-top: 15px;';
    entryDiv.innerHTML = `<div class="form-group" style="flex: 1.5;"><label>Role:</label><input type="text" class="contact-role" placeholder="e.g., Spouse" value="${contact.role || ''}"></div><div class="form-group" style="flex: 2;"><label>Name:</label><input type="text" class="contact-name" placeholder="Contact Name" value="${contact.name || ''}"></div><div class="form-group" style="flex: 2;"><label>Email:</label><input type="email" class="contact-email" placeholder="Contact Email" value="${contact.email || ''}"></div><div class="form-group" style="flex: 2;"><label>Phone:</label><input type="tel" class="contact-phone" placeholder="Contact Phone" value="${contact.phone || ''}"></div><div class="form-group" style="flex: 0 0 40px; margin-bottom: 18px;"><button type="button" class="danger remove-contact-btn" style="padding: 10px; width: 100%; font-size: 1.1em;">×</button></div>`;
    entryDiv.querySelector('.remove-contact-btn').addEventListener('click', () => entryDiv.remove());
    container.appendChild(entryDiv);
}
export function openViewContactsModal(leadId) {
    const lead = state.allLeads.find(l => l.id === leadId);
    const viewContactsModal = document.getElementById('viewContactsModal');
    if (!lead || !viewContactsModal) return;
    document.getElementById('viewContactsModalTitle').textContent = `Contacts for ${lead.name}`;
    const viewContactsContent = document.getElementById('viewContactsContent');
    viewContactsContent.innerHTML = '';
    if (!lead.associatedContacts || lead.associatedContacts.length === 0) {
        viewContactsContent.innerHTML = '<p>No associated contacts found for this lead.</p>';
    } else {
        const list = document.createElement('ul');
        list.style.cssText = 'list-style: none; padding: 0;';
        lead.associatedContacts.forEach(contact => {
            const li = document.createElement('li');
            li.style.cssText = 'margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee;';
            li.innerHTML = `<strong>${contact.role || 'Contact'}:</strong> ${contact.name || 'N/A'}${contact.email ? `<br><a href="mailto:${contact.email}">${contact.email}</a>` : ''}${contact.phone ? `<br><a href="tel:${contact.phone}">${contact.phone}</a>` : ''}`;
            list.appendChild(li);
        });
        viewContactsContent.appendChild(list);
    }
    document.getElementById('editLeadFromContactsViewButton').onclick = () => { viewContactsModal.style.display = 'none'; openLeadModal(lead); };
    viewContactsModal.style.display = 'flex';
}