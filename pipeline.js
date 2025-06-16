import * as state from '../state.js';
import * as fb from '../firebase-service.js';
import { openLeadModal } from '../modals.js';
import { showLoading } from '../ui.js';
import { ICONS } from '../icons.js';

let pageAbortController = null;

export function init() {
    pageAbortController = new AbortController();
    const { signal } = pageAbortController;

    document.getElementById('pipelineFilterSearch').addEventListener('input', renderPipeline, { signal });
    document.getElementById('pipelineFilterPriority').addEventListener('change', renderPipeline, { signal });
    document.getElementById('pipelineFilterType').addEventListener('change', renderPipeline, { signal });

    renderPipeline();

    window.addEventListener('leadsUpdated', renderPipeline, { signal });
    window.addEventListener('tasksUpdated', renderPipeline, { signal });
    window.addEventListener('documentsUpdated', renderPipeline, { signal });
}

export function destroy() {
    if (pageAbortController) {
        pageAbortController.abort();
    }
}

function renderPipeline() {
    const pipelineContainer = document.getElementById('pipeline-board-container');
    if (!pipelineContainer) return;

    const searchTerm = document.getElementById('pipelineFilterSearch').value.toLowerCase();
    const priorityFilter = document.getElementById('pipelineFilterPriority').value;
    const typeFilter = document.getElementById('pipelineFilterType').value;

    let filteredLeads = [...state.allLeads];

    if (searchTerm) {
        filteredLeads = filteredLeads.filter(lead => lead.name && lead.name.toLowerCase().includes(searchTerm));
    }
    if (priorityFilter) {
        filteredLeads = filteredLeads.filter(lead => (lead.priority || 'Warm') === priorityFilter);
    }
    if (typeFilter) {
        filteredLeads = filteredLeads.filter(lead => lead.type === typeFilter);
    }

    pipelineContainer.innerHTML = '';

    const stagesToDisplay = state.pipelineStages.filter(s => s !== 'Archived');

    stagesToDisplay.forEach(stage => {
        const column = document.createElement('div');
        column.className = 'pipeline-column';
        column.dataset.stage = stage;

        const leadsInStage = filteredLeads.filter(lead => (lead.pipelineStage || 'New Lead') === stage);

        column.innerHTML = `
            <div class="pipeline-column-header">
                <h3>${stage}</h3>
                <span>${leadsInStage.length}</span>
            </div>
            <div class="pipeline-column-body"></div>
        `;

        const columnBody = column.querySelector('.pipeline-column-body');
        leadsInStage
            .sort((a, b) => (a.updatedAt?.toDate() || 0) < (b.updatedAt?.toDate() || 0) ? 1 : -1)
            .forEach(lead => {
                const card = createPipelineCard(lead);
                columnBody.appendChild(card);
            });
        pipelineContainer.appendChild(column);
    });

    addDragAndDropListeners();
}

function createPipelineCard(lead) {
    const card = document.createElement('div');
    card.className = 'vision-pipeline-card';
    card.dataset.leadId = lead.id;
    card.draggable = false;

    const priority = lead.priority || 'Warm';

    card.innerHTML = `
        <div class="card-header">
            <h4>${lead.name || 'N/A'}</h4>
            <div class="card-header-actions">
                <span class="priority-badge priority-${priority.toLowerCase()}">${priority}</span>
                <div class="pipeline-drag-handle" draggable="true" title="Drag to move">
                    ${ICONS.dragHandle}
                </div>
            </div>
        </div>
        <div class="card-body">
            <p><span>Type:</span> ${lead.type || 'N/A'}</p>
            <p><span>Budget:</span> ${lead.budget || 'N/A'}</p>
        </div>
        <div class="card-footer">
            <div></div> <!-- Spacer to push details button to the right -->
            <button class="details-btn">Details</button>
        </div>
    `;

    card.querySelector('.details-btn').addEventListener('click', () => openLeadModal(lead));

    return card;
}

function addDragAndDropListeners() {
    document.querySelectorAll('.pipeline-drag-handle').forEach(handle => handle.addEventListener('dragstart', handleDragStart));
    document.querySelectorAll('.vision-pipeline-card').forEach(card => card.addEventListener('dragend', handleDragEnd));
    document.querySelectorAll('.pipeline-column').forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('dragleave', handleDragLeave);
        column.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    const card = e.target.closest('.vision-pipeline-card');
    e.dataTransfer.setData('text/plain', card.dataset.leadId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setDragImage(card, card.offsetWidth / 2, 20);
    setTimeout(() => card.classList.add('dragging'), 0);
}

function handleDragEnd(e) {
    const draggingCard = document.querySelector('.vision-pipeline-card.dragging');
    if (draggingCard) draggingCard.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

async function handleDrop(e) {
    e.preventDefault();
    const column = e.currentTarget;
    column.classList.remove('drag-over');
    const leadId = e.dataTransfer.getData('text/plain');
    const newStage = column.dataset.stage;
    const lead = state.allLeads.find(l => l.id === leadId);

    if (!lead || !newStage || (lead.pipelineStage || 'New Lead') === newStage) return;

    showLoading(true);
    try {
        await fb.updateLead(state.currentUser.uid, leadId, { pipelineStage: newStage });
    } catch (err) {
        console.error("Error updating lead stage:", err);
        alert("Failed to move lead. The view will refresh with the correct data.");
    } finally {
        showLoading(false);
    }
}