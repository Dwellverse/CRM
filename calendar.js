import { showLoading } from '../ui.js';
import * as state from '../state.js';
import * as fb from '../firebase-service.js';
import { populateLeadDropdowns } from '../utilities.js';

let calendarInstance = null;
let pageAbortController = null;

export function init() {
    pageAbortController = new AbortController();
    const { signal } = pageAbortController;

    populateLeadFilterDropdown();
    initializeCalendar();
    initializeSidebar(signal);
    renderCalendarEvents();

    window.addEventListener('tasksUpdated', renderCalendarEvents, { signal });
    window.addEventListener('leadsUpdated', () => {
        populateLeadDropdowns(document.getElementById('eventFormLead'));
        populateLeadFilterDropdown();
    }, { signal });

    document.getElementById('calendarLeadFilter').addEventListener('change', renderCalendarEvents, { signal });
    document.getElementById('calendarTaskStatusFilter').addEventListener('change', renderCalendarEvents, { signal });
}

export function destroy() {
    if (pageAbortController) {
        pageAbortController.abort();
    }
    if (calendarInstance) {
        calendarInstance.destroy();
        calendarInstance = null;
    }
}

function initializeSidebar(signal) {
    populateLeadDropdowns(document.getElementById('eventFormLead'));
    document.getElementById('saveEventButton').addEventListener('click', saveEvent, { signal });
    document.getElementById('clearEventFormButton').addEventListener('click', resetEventForm, { signal });
    document.getElementById('deleteEventButton').addEventListener('click', deleteEvent, { signal });
    document.getElementById('exportICalButton').addEventListener('click', exportICal, { signal });
}

function populateLeadFilterDropdown() {
    const select = document.getElementById('calendarLeadFilter');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">All Leads</option>';
    state.allLeads
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        .forEach(lead => {
            if (lead.id && lead.name) {
                const option = document.createElement('option');
                option.value = lead.id;
                option.textContent = lead.name;
                select.appendChild(option);
            }
        });
    select.value = currentValue;
}

function initializeCalendar() {
    const calendarEl = document.getElementById('taskCalendar');
    if (!calendarEl || calendarInstance) return;

    calendarInstance = new FullCalendar.Calendar(calendarEl, {
        initialView: window.innerWidth < 768 ? 'listMonth' : 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listMonth'
        },
        editable: true,
        selectable: true,
        dayMaxEvents: true,
        navLinks: true,

        buttonText: { today: 'Today', month: 'Month', week: 'Week', list: 'List' },
        eventColor: '#0a84ff',

        dateClick: (info) => {
            resetEventForm();
            document.getElementById('eventFormDate').value = info.dateStr;
            document.getElementById('eventFormTitle').focus();
        },
        eventClick: (info) => {
            populateEventSidebar(info.event);
        },
        eventDrop: async (info) => {
            showLoading(true);
            try {
                await fb.updateTaskDate(state.currentUser.uid, info.event.id, info.event.start);
                populateEventSidebar(info.event);
            } catch (e) {
                console.error("Failed to update task date via drag-and-drop:", e);
                alert("Failed to update task date.");
                info.revert();
            } finally {
                showLoading(false);
            }
        },
        windowResize: (arg) => {
            const newView = window.innerWidth < 768 ? 'listMonth' : 'dayGridMonth';
            if (calendarInstance && newView !== calendarInstance.view.type) {
                calendarInstance.changeView(newView);
            }
        }
    });
    calendarInstance.render();
}

function renderCalendarEvents() {
    if (!calendarInstance) return;

    const filterStatus = document.getElementById('calendarTaskStatusFilter').value;
    const filterLeadId = document.getElementById('calendarLeadFilter').value;
    let tasksToDisplay = [...state.allTasks];

    if (filterStatus) tasksToDisplay = tasksToDisplay.filter(task => task.status === filterStatus);
    if (filterLeadId) tasksToDisplay = tasksToDisplay.filter(task => task.associatedLeadId === filterLeadId);

    const eventColorMap = {
        'Task': '#8e8e93', 'Appointment': '#0a84ff', 'Showing': '#5856d6',
        'Open House': '#ff9500', 'Inspection': '#ffcc00', 'Closing': '#34c759', 'Personal': '#ff3b30'
    };

    const events = tasksToDisplay.map(task => {
        if (!task.dueDate?.toDate) return null;
        const lead = state.allLeads.find(l => l.id === task.associatedLeadId);

        const eventDate = task.dueDate.toDate();
        const start = task.startTime ? new Date(`${eventDate.toISOString().split('T')[0]}T${task.startTime}`) : eventDate;
        const end = task.endTime ? new Date(`${eventDate.toISOString().split('T')[0]}T${task.endTime}`) : null;

        let title = task.title;
        if (lead) title += ` (${lead.name})`;

        return {
            id: task.id,
            title: title,
            start: start,
            end: end,
            allDay: !task.startTime,
            backgroundColor: eventColorMap[task.eventType] || eventColorMap['Task'],
            borderColor: eventColorMap[task.eventType] || eventColorMap['Task']
        };
    }).filter(Boolean);

    calendarInstance.removeAllEvents();
    calendarInstance.addEventSource(events);
}

function populateEventSidebar(event) {
    const task = state.allTasks.find(t => t.id === event.id);
    if (!task) {
        resetEventForm();
        return;
    }

    document.getElementById('eventFormId').value = task.id;
    document.getElementById('eventFormTitle').value = task.title || '';

    if (task.dueDate?.toDate) {
        const eventDate = task.dueDate.toDate();
        const yyyy = eventDate.getFullYear();
        const mm = String(eventDate.getMonth() + 1).padStart(2, '0');
        const dd = String(eventDate.getDate()).padStart(2, '0');
        document.getElementById('eventFormDate').value = `${yyyy}-${mm}-${dd}`;
    }

    document.getElementById('eventFormType').value = task.eventType || 'Task';
    document.getElementById('eventFormStartTime').value = task.startTime || '';
    document.getElementById('eventFormEndTime').value = task.endTime || '';
    document.getElementById('eventFormLead').value = task.associatedLeadId || '';

    document.getElementById('deleteEventButton').style.display = 'inline-flex';
}

function resetEventForm() {
    const form = document.getElementById('eventForm');
    if (form) form.reset();
    document.getElementById('eventFormId').value = '';
    document.getElementById('deleteEventButton').style.display = 'none';
    document.getElementById('eventFormTitle').focus();
}

async function saveEvent() {
    if (!state.currentUser) return;
    const id = document.getElementById('eventFormId').value;
    const title = document.getElementById('eventFormTitle').value.trim();
    const eventDateStr = document.getElementById('eventFormDate').value;

    if (!title || !eventDateStr) {
        alert("Event Title and Date are required.");
        return;
    }

    const startTime = document.getElementById('eventFormStartTime').value;
    const startDateTime = new Date(startTime ? `${eventDateStr}T${startTime}` : `${eventDateStr}T00:00:00`);

    const eventData = {
        title,
        status: 'To Do',
        dueDate: fb.Timestamp.fromDate(startDateTime),
        eventType: document.getElementById('eventFormType').value,
        startTime: startTime || null,
        endTime: document.getElementById('eventFormEndTime').value || null,
        associatedLeadId: document.getElementById('eventFormLead').value || null,
    };

    showLoading(true);
    try {
        if (id) {
            await fb.updateTask(state.currentUser.uid, id, eventData);
        } else {
            await fb.addTask(state.currentUser.uid, eventData);
        }
        resetEventForm();
    } catch (e) {
        console.error("Error saving event: ", e);
        alert("Failed to save event.");
    } finally {
        showLoading(false);
    }
}

async function deleteEvent() {
    const id = document.getElementById('eventFormId').value;
    if (!id || !confirm("Are you sure you want to delete this event?")) return;

    showLoading(true);
    try {
        await fb.deleteTask(state.currentUser.uid, id);
        resetEventForm();
    } catch (e) {
        console.error("Error deleting event:", e);
        alert("Failed to delete event.");
    } finally {
        showLoading(false);
    }
}

function exportICal() {
    if (typeof window.ics !== 'function') {
        alert("iCal library not loaded correctly."); return;
    }
    if (!state.allTasks || state.allTasks.length === 0) {
        alert("No tasks to export."); return;
    }
    const cal = window.ics();
    state.allTasks.forEach(task => {
        if (task.dueDate?.toDate) {
            cal.addEvent(task.title, task.description || '', task.location || '', task.dueDate.toDate(), task.dueDate.toDate());
        }
    });
    cal.download("dwellverse_crm_calendar");
}