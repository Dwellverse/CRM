import { openUploadDocumentModal } from '../modals.js';
import * as state from '../state.js';
import * as fb from '../firebase-service.js';
import { showLoading } from '../ui.js';
import { ICONS } from '../icons.js';

let pageAbortController = null;

export function init() {
    pageAbortController = new AbortController();
    const { signal } = pageAbortController;

    document.getElementById('uploadDocumentButton').addEventListener('click', () => openUploadDocumentModal(null), { signal });
    document.getElementById('documentSearchInput').addEventListener('input', renderDocumentsList, { signal });
    document.getElementById('documentSortSelect').addEventListener('change', renderDocumentsList, { signal });

    // =========================================================================
    // START: DEFINITIVE FIX FOR DOCUMENT DELETION
    // This single listener uses event delegation to handle all clicks within the list.
    document.getElementById('documentsListContainer').addEventListener('click', handleDocumentsListClick, { signal });
    // END: DEFINITIVE FIX
    // =========================================================================

    window.addEventListener('documentsUpdated', renderDocumentsList, { signal });
    window.addEventListener('leadsUpdated', renderDocumentsList, { signal });

    renderDocumentsList();
}

export function destroy() {
    if (pageAbortController) {
        pageAbortController.abort();
    }
}

// NEW: Delegated event handler for the entire documents list
async function handleDocumentsListClick(event) {
    const viewButton = event.target.closest('.view-doc');
    const deleteButton = event.target.closest('.delete-doc');

    if (viewButton) {
        const docRow = viewButton.closest('.document-list-row');
        const fileURL = docRow.querySelector('.doc-name a').href;
        if (fileURL) {
            window.open(fileURL, '_blank');
        }
    }

    if (deleteButton) {
        const docRow = deleteButton.closest('.document-list-row');
        const docId = docRow.dataset.docId;
        const docName = docRow.querySelector('.doc-name a').title;

        if (confirm(`Are you sure you want to delete "${docName}"? This cannot be undone.`)) {
            showLoading(true);
            try {
                await fb.deleteDocument(state.currentUser.uid, docId);
            } catch (e) {
                console.error("Error deleting document:", e);
                alert("Failed to delete document.");
            } finally {
                showLoading(false);
            }
        }
    }
}

function getIconForMimeType(mimeType) {
    if (!mimeType) return ICONS.defaultDoc;
    if (mimeType.startsWith('image/')) return ICONS.image;
    if (mimeType === 'application/pdf') return ICONS.pdf;
    if (mimeType.includes('wordprocessingml')) return ICONS.word;
    if (mimeType.includes('spreadsheetml') || mimeType.includes('csv')) return ICONS.excel;
    return ICONS.defaultDoc;
}

function renderDocumentsList() {
    const container = document.getElementById('documentsListContainer');
    if (!container) return;

    const searchTerm = document.getElementById('documentSearchInput').value.toLowerCase();
    const sortValue = document.getElementById('documentSortSelect').value;
    let filteredDocs = [...state.allDocuments];

    if (searchTerm) {
        filteredDocs = filteredDocs.filter(doc => {
            const lead = state.allLeads.find(l => l.id === doc.associatedLeadId);
            return (
                doc.fileName.toLowerCase().includes(searchTerm) ||
                (doc.description && doc.description.toLowerCase().includes(searchTerm)) ||
                (lead && lead.name.toLowerCase().includes(searchTerm))
            );
        });
    }

    switch (sortValue) {
        case 'date_asc': filteredDocs.sort((a, b) => (a.uploadedAt?.toMillis() || 0) - (b.uploadedAt?.toMillis() || 0)); break;
        case 'name_asc': filteredDocs.sort((a, b) => a.fileName.localeCompare(b.fileName)); break;
        case 'name_desc': filteredDocs.sort((a, b) => b.fileName.localeCompare(a.fileName)); break;
        default: filteredDocs.sort((a, b) => (b.uploadedAt?.toMillis() || 0) - (a.uploadedAt?.toMillis() || 0)); break;
    }

    container.innerHTML = `
        <div class="document-list-header">
            <div class="doc-name">Name</div>
            <div class="doc-lead">Associated Lead</div>
            <div class="doc-date">Date Added</div>
            <div class="doc-actions">Actions</div>
        </div>
        <div class="document-list-body"></div>
    `;
    const listBody = container.querySelector('.document-list-body');

    if (filteredDocs.length === 0) {
        listBody.innerHTML = '<div class="no-items-message">No documents match your search.</div>';
        return;
    }

    filteredDocs.forEach(doc => {
        const docRow = document.createElement('div');
        docRow.className = 'document-list-row';
        docRow.dataset.docId = doc.id;

        const associatedLead = state.allLeads.find(l => l.id === doc.associatedLeadId);
        const fileIcon = getIconForMimeType(doc.fileType);

        docRow.innerHTML = `
            <div class="doc-name">
                <span class="file-icon">${fileIcon}</span>
                <a href="${doc.fileURL}" target="_blank" title="${doc.fileName}">${doc.fileName}</a>
            </div>
            <div class="doc-lead">${associatedLead ? associatedLead.name : 'None'}</div>
            <div class="doc-date">${doc.uploadedAt?.toDate ? doc.uploadedAt.toDate().toLocaleDateString() : 'N/A'}</div>
            <div class="doc-actions">
                <button class="button-glass-subtle view-doc">View</button>
                <button class="button-glass-subtle danger-text delete-doc">Delete</button>
            </div>
        `;

        // Individual event listeners are no longer needed here.
        listBody.appendChild(docRow);
    });
}