import { showLoading, renderCustomLegend } from '../ui.js';
import * as state from '../state.js';
import * as fb from '../firebase-service.js';
import { openLeadModal, openTaskModal } from '../modals.js';
import { navigateTo } from '../main.js';
import { populateLeadDropdowns, populatePipelineStageDropdowns } from '../utilities.js';

Chart.register(ChartDataLabels);

let pipelineStageChartInstance = null;
let taskStatusChartInstance = null;
let leadBudgetChartInstance = null;
let leadSourceChartInstance = null;

export function init() {
    // Populate dropdowns
    populatePipelineStageDropdowns(document.getElementById('quickLeadPipelineStage'), false, false, 'New Lead');
    populateLeadDropdowns(document.getElementById('quickTaskAssociatedLead'));
    populatePipelineStageDropdowns(document.getElementById('hotLeadsStageFilter'), true, true, '');

    addDashboardEventListeners();
    updateAllCharts();
    renderCurrentTasksList();
    renderHotLeadsList(); // New function call

    // Listen for global data updates
    window.addEventListener('leadsUpdated', () => {
        updateAllCharts();
        renderHotLeadsList();
    });
    window.addEventListener('tasksUpdated', () => {
        updateTaskStatusChart();
        renderCurrentTasksList();
    });
}

function addDashboardEventListeners() {
    // Quick Add Listeners
    document.getElementById('quickAddLeadButton').addEventListener('click', quickAddLead);
    document.getElementById('openAddLeadModalButton').addEventListener('click', () => openLeadModal());
    document.getElementById('quickAddTaskButton').addEventListener('click', quickAddTask);
    document.getElementById('openAddTaskModalButton').addEventListener('click', () => openTaskModal());
    document.querySelectorAll('.premade-task-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.getElementById('quickTaskTitle').value = button.textContent;
        });
    });

    // Filter Listeners
    document.getElementById('filterDashboardTaskStatus').addEventListener('change', renderCurrentTasksList);
    document.getElementById('hotLeadsStageFilter').addEventListener('change', renderHotLeadsList);
    document.getElementById('hotLeadsFinancialFilter').addEventListener('change', renderHotLeadsList);
}

// Quick Add Functions (unchanged)
async function quickAddLead() {
    if (!state.currentUser) return;
    const name = document.getElementById('quickLeadName').value.trim();
    if (!name) { alert("Lead name is required."); return; }
    try {
        const leadData = { name, email: document.getElementById('quickLeadEmail').value.trim(), phone: document.getElementById('quickLeadPhone').value.trim(), pipelineStage: document.getElementById('quickLeadPipelineStage').value, type: '', budget: '', financingStatus: '' };
        await fb.addLead(state.currentUser.uid, leadData);
        document.getElementById('quickLeadName').value = '';
        document.getElementById('quickLeadEmail').value = '';
        document.getElementById('quickLeadPhone').value = '';
    } catch (e) { console.error("Error quick adding lead: ", e); alert("Failed to add lead."); }
}
async function quickAddTask() {
    if (!state.currentUser) return;
    const title = document.getElementById('quickTaskTitle').value.trim();
    if (!title) { alert("Task title is required."); return; }
    try {
        const dueDate = document.getElementById('quickTaskDueDate').value;
        const taskData = { title, status: document.getElementById('quickTaskStatus').value, dueDate: dueDate ? fb.Timestamp.fromDate(new Date(dueDate + "T00:00:00")) : null, associatedLeadId: document.getElementById('quickTaskAssociatedLead').value || null };
        await fb.addTask(state.currentUser.uid, taskData);
        document.getElementById('quickTaskTitle').value = '';
        document.getElementById('quickTaskDueDate').value = '';
        document.getElementById('quickTaskAssociatedLead').value = '';
    } catch (e) { console.error("Error quick adding task: ", e); alert("Failed to add task."); }
}

// --- NEW: Priority Leads List Rendering ---
function renderHotLeadsList() {
    const container = document.getElementById('hotLeadsListContainer');
    if (!container) return;

    const stageFilter = document.getElementById('hotLeadsStageFilter').value;
    const financialFilter = document.getElementById('hotLeadsFinancialFilter').value;

    let leadsToDisplay = [...state.allLeads];

    if (stageFilter) {
        leadsToDisplay = leadsToDisplay.filter(lead => lead.pipelineStage === stageFilter);
    }
    if (financialFilter) {
        leadsToDisplay = leadsToDisplay.filter(lead => lead.financingStatus === financialFilter);
    }

    const priorityOrder = { 'Hot': 1, 'Warm': 2, 'Cold': 3 };
    leadsToDisplay.sort((a, b) => {
        const priorityA = priorityOrder[a.priority || 'Warm'] || 4;
        const priorityB = priorityOrder[b.priority || 'Warm'] || 4;
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }
        const lastNameA = a.name?.split(' ').pop() || '';
        const lastNameB = b.name?.split(' ').pop() || '';
        return lastNameA.localeCompare(lastNameB);
    });

    container.innerHTML = '';
    if (leadsToDisplay.length === 0) {
        container.innerHTML = `<div class="no-items-message">No leads match criteria.</div>`;
        return;
    }

    leadsToDisplay.forEach(lead => {
        const item = document.createElement('div');
        item.className = 'hot-lead-item';
        item.innerHTML = `
            <div class="lead-info">
                <span class="lead-name">${lead.name}</span>
                <span class="lead-stage">${lead.pipelineStage || 'New Lead'}</span>
            </div>
            <span class="priority-badge priority-${(lead.priority || 'Warm').toLowerCase()}">${lead.priority || 'Warm'}</span>
        `;
        item.addEventListener('click', () => openLeadModal(lead));
        container.appendChild(item);
    });
}


// --- Task List Rendering (Updated to use correct container ID) ---
function renderCurrentTasksList() {
    const container = document.getElementById('dashboardTasksListContainer');
    if (!container) return;

    let tasksToDisplay = [...state.allTasks];
    const filterValue = document.getElementById('filterDashboardTaskStatus').value;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    if (filterValue) {
        if (filterValue === "Past Due") tasksToDisplay = tasksToDisplay.filter(t => t.dueDate?.toDate() < today && t.status !== 'Completed');
        else tasksToDisplay = tasksToDisplay.filter(t => t.status === filterValue);
    }

    tasksToDisplay.sort((a, b) => (a.dueDate?.toDate() || Infinity) - (b.dueDate?.toDate() || Infinity));

    container.innerHTML = '';
    if (tasksToDisplay.length === 0) {
        container.innerHTML = `<div class="no-items-message">No tasks match criteria.</div>`;
        return;
    }

    tasksToDisplay.forEach(task => {
        const item = document.createElement('div');
        item.className = 'vision-task-item';
        const dueDateObj = task.dueDate?.toDate();
        const isPastDue = dueDateObj && dueDateObj < today && task.status !== 'Completed';
        if (isPastDue) item.classList.add('past-due');
        const associatedLead = state.allLeads.find(l => l.id === task.associatedLeadId);
        item.innerHTML = `
            <span class="task-title">${task.title || 'Untitled'}</span>
            <span class="task-lead-name">${associatedLead?.name || 'General'}</span>
            <span class="task-due-date">${dueDateObj ? dueDateObj.toLocaleDateString() : 'N/A'}</span>
            <span class="task-status-badge status-${task.status.toLowerCase().replace(' ', '')}">${task.status}</span>
        `;
        item.addEventListener('click', () => openTaskModal(task));
        container.appendChild(item);
    });
}

// Charting Functions (unchanged)
function updateChart(chartInstance, canvasId, totalValueElId, legendContainerId, dataSet, labelProperty, chartLabel, colorMap, onClick) {
    const canvas = document.getElementById(canvasId);
    const totalValueEl = document.getElementById(totalValueElId);
    const legendContainerEl = document.getElementById(legendContainerId);
    if (!canvas || !totalValueEl || !legendContainerEl) return chartInstance;
    totalValueEl.textContent = dataSet.length;
    const ctx = canvas.getContext('2d');
    const counts = dataSet.reduce((acc, item) => {
        const key = item[labelProperty] || 'Unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    if (chartInstance) chartInstance.destroy();
    const labels = Object.keys(counts).length ? Object.keys(counts) : ["No Data"];
    const data = Object.values(counts).length ? Object.values(counts) : [1];
    const bgColors = labels[0] === "No Data" ? ['#e9ecef'] : labels.map(l => colorMap[l] || '#B0BEC5');
    renderCustomLegend(legendContainerEl, labels, bgColors, counts);
    return new Chart(ctx, {
        type: 'doughnut', data: { labels, datasets: [{ label: chartLabel, data, backgroundColor: bgColors, borderColor: 'transparent', borderWidth: 2 }] },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '70%',
            onClick: (e, els) => { if (els.length > 0 && onClick) onClick(labels[els[0].index]); },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => `${c.label}: ${c.raw} (${(c.raw / c.chart.getDatasetMeta(0).total * 100).toFixed(1)}%)` } },
                datalabels: { display: false }
            }
        }
    });
}
function updateAllCharts() {
    updatePipelineStageChart();
    updateTaskStatusChart();
    updateLeadBudgetChart();
    updateLeadSourceChart();
}
function updatePipelineStageChart() {
    const colors = { 'New Lead': '#90CAF9', 'Contacted': '#FFF59D', 'Appointment Set': '#FFD180', 'Nurturing': '#FFCC80', 'Active Buyer': '#A5D6A7', 'Pre-Listing': '#B39DDB', 'Active Seller': '#80CBC4', 'Active Listing': '#80DEEA', 'Offer/Contract': '#F48FB1', 'Under Contract': '#81D4FA', 'Closed': '#C5E1A5', 'Archived': '#B0BEC5', 'Unknown': '#E0E0E0' };
    pipelineStageChartInstance = updateChart(pipelineStageChartInstance, 'pipeline-chart-canvas', 'pipeline-metric-value', 'pipeline-metric-legend', state.allLeads, 'pipelineStage', 'Pipeline', colors, l => { if (l !== "No Data") { sessionStorage.setItem('pendingPipelineFilter', l); navigateTo('leads'); } });
}
function updateTaskStatusChart() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const openTasks = state.allTasks.filter(t => t.status !== 'Completed');
    const data = openTasks.map(t => ({ ...t, chartStatus: t.dueDate?.toDate() < today ? 'Past Due' : 'To Do' }));
    taskStatusChartInstance = updateChart(taskStatusChartInstance, 'tasks-chart-canvas', 'tasks-metric-value', 'tasks-metric-legend', data, 'chartStatus', 'Tasks', { 'To Do': '#81D4FA', 'In Progress': '#81D4FA', 'Past Due': '#F48FB1', 'Unknown': '#B0BEC5' }, l => { if (l !== "No Data") { sessionStorage.setItem('pendingTaskFilter', l); navigateTo('tasks'); } });
}
function updateLeadBudgetChart() {
    const budgetData = state.allLeads.filter(l => l.budget);
    leadBudgetChartInstance = updateChart(leadBudgetChartInstance, 'budget-chart-canvas', 'budget-metric-value', 'budget-metric-legend', budgetData, 'budget', 'Budgets', { '<200k': '#C8E6C9', '200k-400k': '#B2DFDB', '400k-600k': '#BBDEFB', '600k-800k': '#D1C4E9', '800k-1M': '#FFCCBC', '1M+': '#F8BBD0', 'N/A': '#CFD8DC', 'Unknown': '#B0BEC5' }, l => { if (l !== "No Data") { sessionStorage.setItem('pendingBudgetFilter', l); navigateTo('leads'); } });
}
function updateLeadSourceChart() {
    const sourceData = state.allLeads.filter(l => l.source);
    leadSourceChartInstance = updateChart(leadSourceChartInstance, 'source-chart-canvas', 'source-metric-value', 'source-metric-legend', sourceData, 'source', 'Sources', { 'Website': '#a5d6a7', 'Referral': '#b2ebf2', 'Social Media': '#ef9a9a', 'Online Ad': '#ffcc80', 'Open House': '#ce93d8', 'Networking': '#90caf9', 'Cold Call': '#eeeeee', 'Capture Form': '#b39ddb', 'USA-HUD': '#ffab91', 'CSV Import': '#e0e0e0', 'vCard Import': '#d1c4e9', 'Other': '#d7ccc8', 'Unknown': '#b0bec5' }, l => { if (l !== "No Data") { sessionStorage.setItem('pendingSourceFilter', l); navigateTo('leads'); } });
}