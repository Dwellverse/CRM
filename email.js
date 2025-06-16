import { showLoading, initializeCollapsibleSections } from '../ui.js';
import * as state from '../state.js';
import * as fb from '../firebase-service.js';
import { openSelectLeadModal, openSelectCcModal } from '../modals.js';

let quillEditor = null;
let currentEmailContext = {
    lead: null,
    attachments: [],
    editingTemplateId: null
};
let pageAbortController = null;

export function init() {
    pageAbortController = new AbortController();
    const { signal } = pageAbortController;

    // Initialize the editor first to ensure it's available for other functions.
    initializeQuillEditor();

    resetEmailContext();
    initializeEmailEventListeners(signal);
    renderAllEmailTemplates();
    updateWorkflowSteps();

    window.addEventListener('leadsUpdated', renderAllEmailTemplates, { signal });
    window.addEventListener('emailTemplatesUpdated', renderAllEmailTemplates, { signal });
}

export function destroy() {
    if (pageAbortController) {
        pageAbortController.abort();
    }
    resetEmailContext();
    // Destroy the Quill instance to prevent memory leaks and bugs on re-initialization.
    quillEditor = null;
}

function resetEmailContext() {
    currentEmailContext = {
        lead: null,
        attachments: [],
        editingTemplateId: null
    };
    document.getElementById('emailTo').value = '';
    document.getElementById('emailCc').value = '';
    document.getElementById('emailSubject').value = '';
    if (quillEditor) quillEditor.setContents([]);

    // Clear send button state
    const sendStep = document.getElementById('workflow-step-send');
    if (sendStep) {
        sendStep.classList.remove('sending', 'sent-success');
    }

    renderAttachmentsUI();
    updateTemplateEditState(null);
    updateWorkflowSteps();
}

function initializeEmailEventListeners(signal) {
    document.getElementById('workflow-step-lead').addEventListener('click', () => {
        openSelectLeadModal();
        renderLeadSelectionList();
    }, { signal });
    document.getElementById('workflow-step-template').addEventListener('click', () => quillEditor.focus(), { signal });
    document.getElementById('workflow-step-attach').addEventListener('click', () => document.getElementById('emailAttachmentInput').click(), { signal });
    document.getElementById('workflow-step-cc').addEventListener('click', () => {
        openSelectCcModal(currentEmailContext.lead);
        if (currentEmailContext.lead) {
            renderCcContactList(currentEmailContext.lead.associatedContacts || []);
        }
    }, { signal });
    document.getElementById('workflow-step-send').addEventListener('click', handleSendEmail, { signal });

    document.getElementById('leadSearchInput').addEventListener('input', () => renderLeadSelectionList(), { signal });
    document.getElementById('addSelectedToCcButton').addEventListener('click', handleAddSelectedToCc, { signal });
    document.getElementById('ccSelectAllCheckbox').addEventListener('change', (e) => handleCcSelectAll(e), { signal });
    document.getElementById('addNewCcContactButton').addEventListener('click', handleAddNewCcContact, { signal });

    quillEditor.on('text-change', updateWorkflowSteps);
    document.getElementById('emailSubject').addEventListener('input', updateWorkflowSteps, { signal });
    document.getElementById('emailCc').addEventListener('input', updateWorkflowSteps, { signal });
    document.getElementById('emailAttachmentInput').addEventListener('change', handleAttachmentSelection, { signal });
    document.getElementById('saveCustomEmailButton').addEventListener('click', saveCustomEmailTemplate, { signal });
    document.getElementById('updateCustomEmailButton').addEventListener('click', updateCustomEmailTemplate, { signal });
    document.getElementById('emailInsertField').addEventListener('change', insertPersonalizationField, { signal });
    document.getElementById('emailInsertSignature').addEventListener('click', generateAndInsertSignature, { signal });
}

function initializeQuillEditor() {
    // If an old instance exists from a previous page visit, do not re-use it.
    // The destroy() function now sets quillEditor to null, ensuring this runs fresh.
    if (quillEditor) return;

    const toolbarEl = document.getElementById('emailToolbar');
    toolbarEl.innerHTML = `
        <span class="ql-formats"><select class="ql-header"><option value="1"></option><option value="2"></option><option selected></option></select></span>
        <span class="ql-formats"><button class="ql-bold"></button><button class="ql-italic"></button><button class="ql-underline"></button></span>
        <span class="ql-formats"><button class="ql-list" value="ordered"></button><button class="ql-list" value="bullet"></button></span>
        <span class="ql-formats"><button class="ql-link"></button><button class="ql-blockquote"></button><button class="ql-clean"></button></span>
    `;
    quillEditor = new Quill('#emailEditor', {
        modules: { toolbar: '#emailToolbar' },
        placeholder: 'Compose an email...',
        theme: 'snow'
    });
}

function updateWorkflowSteps() {
    const leadStep = document.getElementById('workflow-step-lead');
    const composeStep = document.getElementById('workflow-step-template');
    const attachStep = document.getElementById('workflow-step-attach');
    const ccStep = document.getElementById('workflow-step-cc');
    const sendStep = document.getElementById('workflow-step-send');

    const hasLead = !!currentEmailContext.lead;
    leadStep.classList.toggle('completed', hasLead);
    leadStep.querySelector('.step-icon').textContent = hasLead ? '✓' : '+';

    const hasContent = quillEditor && quillEditor.getLength() > 1 && document.getElementById('emailSubject').value.trim() !== '';
    composeStep.classList.toggle('completed', hasContent);
    composeStep.querySelector('.step-icon').textContent = hasContent ? '✓' : '+';

    const hasAttachments = currentEmailContext.attachments.length > 0;
    attachStep.classList.toggle('completed', hasAttachments);
    attachStep.querySelector('.step-icon').textContent = hasAttachments ? '✓' : '+';

    const hasCc = document.getElementById('emailCc').value.trim() !== '';
    ccStep.classList.toggle('completed', hasCc);
    ccStep.querySelector('.step-icon').textContent = hasCc ? '✓' : '+';

    // Do not manage send step's "completed" state here, it's now handled on success
    if (!sendStep.classList.contains('sent-success')) {
        sendStep.querySelector('.step-icon').textContent = '→';
    }
}

function handleAttachmentSelection(event) {
    if (event.target.files.length > 0) {
        currentEmailContext.attachments.push(...Array.from(event.target.files));
        renderAttachmentsUI();
        updateWorkflowSteps();
    }
    event.target.value = '';
}

function renderAttachmentsUI() {
    const container = document.getElementById('emailAttachmentsContainer');
    container.innerHTML = '';
    if (currentEmailContext.attachments.length > 0) {
        currentEmailContext.attachments.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'attachment-pill';
            item.innerHTML = `<span>${file.name}</span><button class="remove-pill" data-index="${index}">×</button>`;
            container.appendChild(item);
        });
        container.querySelectorAll('.remove-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentEmailContext.attachments.splice(parseInt(e.currentTarget.dataset.index, 10), 1);
                renderAttachmentsUI();
                updateWorkflowSteps();
            });
        });
    }
}

async function handleSendEmail() {
    const to = document.getElementById('emailTo').value.trim();
    const subject = document.getElementById('emailSubject').value.trim();
    const sendStep = document.getElementById('workflow-step-send');

    if (!to || !subject || (quillEditor && quillEditor.getLength() <= 1)) {
        alert("Recipient, subject, and email body are all required.");
        return;
    }

    sendStep.classList.add('sending');
    showLoading(true);

    try {
        let attachmentPayloads = [];
        if (currentEmailContext.attachments.length > 0) {
            const uploadPromises = currentEmailContext.attachments.map(file =>
                fb.uploadTempAttachment(state.currentUser.uid, file)
            );
            attachmentPayloads = await Promise.all(uploadPromises);
        }

        const emailData = {
            to,
            cc: document.getElementById('emailCc').value.trim(),
            subject,
            body: quillEditor.root.innerHTML,
            attachmentUrls: attachmentPayloads,
        };

        const result = await fb.sendEmail(emailData);

        if (result.data.success) {
            sendStep.classList.remove('sending');
            sendStep.classList.add('sent-success');
            sendStep.querySelector('.step-icon').textContent = '✓';
            // Do not reset context immediately, let user see the success state
            setTimeout(resetEmailContext, 2000); // Reset after 2 seconds
        } else {
            throw new Error(result.data.message || "An unknown error occurred on the server.");
        }

    } catch (error) {
        console.error("Error sending email:", error);
        alert(`Failed to send email: ${error.message}`);
        sendStep.classList.remove('sending');
    } finally {
        showLoading(false);
    }
}

function renderAllEmailTemplates() {
    const sidebar = document.getElementById('emailTemplatesSidebar');
    if (!sidebar) return;
    sidebar.innerHTML = `<div class="sidebar-header"><h3>Templates</h3></div><div class="sidebar-content"></div>`;
    const sidebarContent = sidebar.querySelector('.sidebar-content');

    const templatesByCategory = {};

    // 1. Add custom templates
    if (state.allCustomEmailTemplates.length > 0) {
        templatesByCategory['My Custom Templates'] = state.allCustomEmailTemplates.map(t => ({ ...t, isCustom: true }));
    }

    // 2. Add system templates
    state.emailTemplates.forEach(category => {
        templatesByCategory[category.category] = (templatesByCategory[category.category] || []).concat(
            category.tasks.map(t => ({ ...t, isCustom: false }))
        );
    });

    Object.keys(templatesByCategory).sort((a, b) => a === 'My Custom Templates' ? -1 : b === 'My Custom Templates' ? 1 : a.localeCompare(b))
        .forEach(category => {
            const section = document.createElement('div');
            section.className = 'collapsible-section';
            const tasksHtml = templatesByCategory[category].map(t => `
            <div class="template-item">
                <button type="button" class="template-btn" data-subject="${t.subject}" data-body="${btoa(unescape(encodeURIComponent(t.body)))}">${t.name}</button>
                ${t.isCustom ? `<div class="template-actions"><button class="edit-template" title="Edit Template" data-id="${t.id}">✏️</button><button class="delete-template" title="Delete Template" data-id="${t.id}">🗑️</button></div>` : ''}
            </div>`).join('');
            section.innerHTML = `<button class="collapsible-header">${category}</button><div class="collapsible-content"><div class="template-buttons-container">${tasksHtml}</div></div>`;
            sidebarContent.appendChild(section);
        });

    sidebar.querySelectorAll('.template-btn').forEach(btn => btn.addEventListener('click', () => {
        loadTemplate(btn.dataset.subject, btn.dataset.body);
        updateTemplateEditState(null);
    }));
    sidebar.querySelectorAll('.edit-template').forEach(btn => btn.addEventListener('click', (e) => loadCustomTemplateForEdit(e.currentTarget.dataset.id)));
    sidebar.querySelectorAll('.delete-template').forEach(btn => btn.addEventListener('click', (e) => deleteCustomEmailTemplate(e.currentTarget.dataset.id)));

    initializeCollapsibleSections(sidebar);
}

function loadTemplate(subject, base64Body) {
    const leadName = currentEmailContext.lead ? currentEmailContext.lead.name.split(' ')[0] : 'Valued Client';
    document.getElementById('emailSubject').value = subject.replace(/{{lead_name}}/g, leadName);
    const bodyHtml = decodeURIComponent(escape(atob(base64Body))).replace(/{{lead_name}}/g, leadName);
    quillEditor.setContents([]);
    quillEditor.clipboard.dangerouslyPasteHTML(0, bodyHtml);
    generateAndInsertSignature();
    updateWorkflowSteps();
}

function loadCustomTemplateForEdit(templateId) {
    const template = state.allCustomEmailTemplates.find(t => t.id === templateId);
    if (!template) return;
    document.getElementById('emailSubject').value = template.subject;
    quillEditor.clipboard.dangerouslyPasteHTML(0, template.body);
    updateTemplateEditState(templateId);
}

function updateTemplateEditState(templateId) {
    currentEmailContext.editingTemplateId = templateId;
    document.getElementById('updateCustomEmailButton').style.display = templateId ? 'inline-flex' : 'none';
    document.getElementById('saveCustomEmailButton').style.display = templateId ? 'none' : 'inline-flex';
}

async function saveCustomEmailTemplate() {
    const name = prompt("Enter a name for this new template:", document.getElementById('emailSubject').value);
    if (!name) return;
    const templateData = { name: name.trim(), subject: document.getElementById('emailSubject').value.trim(), body: quillEditor.root.innerHTML };
    if (!templateData.name || !templateData.subject || quillEditor.getLength() <= 1) { alert("Template name, subject, and body are required."); return; }
    showLoading(true);
    try { await fb.saveCustomEmailTemplate(state.currentUser.uid, templateData); alert("Template saved successfully!"); }
    catch (e) { console.error("Error saving template:", e); alert("Failed to save template."); }
    finally { showLoading(false); }
}

async function updateCustomEmailTemplate() {
    if (!currentEmailContext.editingTemplateId) return;
    const templateData = { subject: document.getElementById('emailSubject').value.trim(), body: quillEditor.root.innerHTML };
    if (!templateData.subject || quillEditor.getLength() <= 1) { alert("Subject and body cannot be empty."); return; }
    showLoading(true);
    try { await fb.updateCustomEmailTemplate(state.currentUser.uid, currentEmailContext.editingTemplateId, templateData); alert("Template updated successfully!"); updateTemplateEditState(null); }
    catch (e) { console.error("Error updating template:", e); alert("Failed to update template."); }
    finally { showLoading(false); }
}

async function deleteCustomEmailTemplate(templateId) {
    if (!confirm("Are you sure you want to permanently delete this template?")) return;
    showLoading(true);
    try { await fb.deleteCustomEmailTemplate(state.currentUser.uid, templateId); alert("Template deleted."); }
    catch (e) { console.error("Error deleting template:", e); alert("Failed to delete template."); }
    finally { showLoading(false); }
}

function insertPersonalizationField() {
    const select = document.getElementById('emailInsertField');
    if (!quillEditor || !select.value) return;
    const range = quillEditor.getSelection(true);
    quillEditor.insertText(range.index, select.value, 'user');
    select.value = '';
}

function generateAndInsertSignature() {
    if (!state.currentUser || !quillEditor) return;
    const profile = state.userProfile;
    if (!profile.signature || profile.signature.trim() === '') {
        let defaultSig = `<br><p>--<br><strong>${profile.fullName || state.currentUser.email}</strong></p>`;
        quillEditor.clipboard.dangerouslyPasteHTML(quillEditor.getLength(), defaultSig);
    } else {
        quillEditor.clipboard.dangerouslyPasteHTML(quillEditor.getLength(), `<br>${profile.signature}`);
    }
}

export function setSelectedLead(lead) {
    currentEmailContext.lead = lead;
    document.getElementById('emailTo').value = lead.email;
    updateWorkflowSteps();
}

export function addEmailsToCc(emails) {
    const existingCc = document.getElementById('emailCc').value.split(',').map(e => e.trim()).filter(Boolean);
    const newCcSet = new Set([...existingCc, ...emails]);
    document.getElementById('emailCc').value = Array.from(newCcSet).join(', ');
    updateWorkflowSteps();
}

function renderLeadSelectionList() {
    const searchFilter = document.getElementById('leadSearchInput').value.trim().toLowerCase();
    const leadListContainer = document.getElementById('leadListContainer');
    leadListContainer.innerHTML = '';

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
    } catch (e) {
        console.error("Error adding new associated contact:", e);
        alert("Failed to save new contact.");
    } finally {
        showLoading(false);
    }
}