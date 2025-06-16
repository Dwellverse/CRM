import * as state from '../state.js';
import * as ui from '../ui.js';
import * as fb from '../firebase-service.js';
import { openTaskModal } from '../modals.js';

let pageAbortController = null;

export function init() {
    pageAbortController = new AbortController();
    const { signal } = pageAbortController;

    renderTaskTemplatesSidebar();
    populateLeadFilterDropdown();

    // Attach listeners
    document.getElementById('filterTaskPageStatus').addEventListener('change', applyTaskFiltersAndRender, { signal });
    document.getElementById('filterTaskPageByLead').addEventListener('change', applyTaskFiltersAndRender, { signal });
    document.getElementById('showAddTaskFormButtonTasksPage').addEventListener('click', () => openTaskModal(), { signal });

    // =========================================================================
    // START: DEFINITIVE FIX FOR TASK DELETION
    // This single listener uses event delegation to handle all clicks within the grid.
    document.getElementById('tasksGridContainer').addEventListener('click', handleTaskGridClick, { signal });
    // END: DEFINITIVE FIX
    // =========================================================================

    applyTaskFiltersAndRender();

    window.addEventListener('tasksUpdated', applyTaskFiltersAndRender, { signal });
    window.addEventListener('leadsUpdated', populateLeadFilterDropdown, { signal });
}

export function destroy() {
    if (pageAbortController) {
        pageAbortController.abort();
    }
}

// NEW: Delegated event handler for the entire task grid
async function handleTaskGridClick(event) {
    const editButton = event.target.closest('.edit-task');
    const deleteButton = event.target.closest('.delete-task');

    if (editButton) {
        const taskItem = editButton.closest('.vision-task-item-detailed');
        const taskId = taskItem.dataset.taskId;
        const taskToEdit = state.allTasks.find(t => t.id === taskId);
        if (taskToEdit) {
            openTaskModal(taskToEdit);
        }
    }

    if (deleteButton) {
        const taskItem = deleteButton.closest('.vision-task-item-detailed');
        const taskId = taskItem.dataset.taskId;

        if (confirm("Are you sure you want to delete this task?")) {
            ui.showLoading(true);
            try {
                await fb.deleteTask(state.currentUser.uid, taskId);
            } catch (e) {
                alert("Failed to delete task.");
                console.error("Task deletion error:", e);
            } finally {
                ui.showLoading(false);
            }
        }
    }
}

function renderTaskTemplatesSidebar() {
    const sidebar = document.getElementById('taskTemplatesSidebar');
    if (!sidebar) return;

    sidebar.innerHTML = `
        <div class="sidebar-header">
            <h3>Templates</h3>
        </div>
        <div class="sidebar-content"></div>
    `;

    const sidebarContent = sidebar.querySelector('.sidebar-content');

    const templatesFragment = document.createDocumentFragment();
    state.taskTemplates.forEach(category => {
        const section = document.createElement('div');
        section.className = 'collapsible-section';

        let taskButtonsHtml = '';
        category.tasks.forEach(task => {
            taskButtonsHtml += `<button type="button" class="template-btn" data-title="${task.title}" data-desc="${task.description || ''}">${task.title}</button>`;
        });

        section.innerHTML = `
            <button class="collapsible-header">${category.category}</button>
            <div class="collapsible-content">
                <div class="template-buttons-container">${taskButtonsHtml}</div>
            </div>
        `;
        templatesFragment.appendChild(section);
    });

    sidebarContent.appendChild(templatesFragment);

    sidebar.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            openTaskModal({ title: btn.dataset.title, description: btn.dataset.desc });
        });
    });

    ui.initializeCollapsibleSections(sidebar);
}

function populateLeadFilterDropdown() {
    const select = document.getElementById('filterTaskPageByLead');
    if (!select) return;
    const currentVal = select.value;

    while (select.options.length > 2) {
        select.remove(2);
    }

    state.allLeads
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        .forEach(lead => {
            const option = document.createElement('option');
            option.value = lead.id;
            option.textContent = lead.name;
            select.appendChild(option);
        });
    select.value = currentVal;
}

function applyTaskFiltersAndRender() {
    let filtered = [...state.allTasks];
    const status = document.getElementById('filterTaskPageStatus').value;
    const leadId = document.getElementById('filterTaskPageByLead').value;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    if (status) {
        if (status === "Past Due") {
            filtered = filtered.filter(t => t.dueDate?.toDate() < today && t.status !== 'Completed');
        } else {
            filtered = filtered.filter(t => t.status === status);
        }
    }
    if (leadId) {
        if (leadId === "NO_ASSOCIATED_LEAD") {
            filtered = filtered.filter(t => !t.associatedLeadId);
        } else {
            filtered = filtered.filter(t => t.associatedLeadId === leadId);
        }
    }
    renderTaskGrid(filtered);
}

function renderTaskGrid(tasks) {
    const container = document.getElementById('tasksGridContainer');
    if (!container) return;
    container.innerHTML = '';

    if (tasks.length === 0) {
        container.innerHTML = '<div class="no-items-message">No tasks match your filters.</div>';
        return;
    }

    tasks.sort((a, b) => (a.dueDate?.toDate() || Infinity) - (b.dueDate?.toDate() || Infinity));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    tasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'vision-task-item-detailed';
        item.dataset.taskId = task.id; // Set the ID on the parent element

        const dueDateObj = task.dueDate?.toDate();
        const isPastDue = dueDateObj && dueDateObj < today && task.status !== 'Completed';
        if (isPastDue) {
            item.classList.add('past-due');
        }

        const associatedLead = state.allLeads.find(l => l.id === task.associatedLeadId);

        item.innerHTML = `
            <span class="task-title">${task.title}</span>
            <span class="task-lead-name">${associatedLead ? associatedLead.name : 'General'}</span>
            <span class="task-due-date">${dueDateObj ? dueDateObj.toLocaleDateString() : 'N/A'}</span>
            <span class="task-status-badge status-${task.status.toLowerCase().replace(' ', '')}">${task.status}</span>
            <div class="task-actions">
                <button class="button-glass-subtle edit-task">Edit</button>
                <button class="button-glass-subtle danger-text delete-task">Delete</button>
            </div>
        `;

        // Individual event listeners are no longer needed here.
        container.appendChild(item);
    });
}