import * as state from './state.js';

/**
 * Populates a given select element with lead options.
 * @param {HTMLSelectElement} selectElement The <select> element to populate.
 */
export function populateLeadDropdowns(selectElement) {
    if (!selectElement) return;
    const currentVal = selectElement.value;
    selectElement.innerHTML = '<option value="">None</option>';
    state.allLeads.sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(lead => {
        if (lead && lead.id && lead.name) {
            const option = document.createElement('option');
            option.value = lead.id;
            option.textContent = lead.name;
            selectElement.appendChild(option);
        }
    });
    if (state.allLeads.some(l => l && l.id === currentVal)) {
        selectElement.value = currentVal;
    }
}

/**
 * Populates a given select element with pipeline stage options.
 * @param {HTMLSelectElement} selectElement The <select> element to populate.
 * @param {boolean} includeArchived Whether to include the 'Archived' stage.
 * @param {boolean} includeAll Whether to add an "All Stages" option.
 * @param {string | null} defaultValue The default value to select.
 */
export function populatePipelineStageDropdowns(selectElement, includeArchived = false, includeAll = false, defaultValue = 'New Lead') {
    if (!selectElement) return;
    selectElement.innerHTML = '';
    if (includeAll) {
        const allOption = document.createElement('option');
        allOption.value = "";
        allOption.textContent = "All Stages";
        selectElement.appendChild(allOption);
    }
    const stages = includeArchived ? state.pipelineStages : state.pipelineStages.filter(s => s !== 'Archived');
    stages.forEach(stage => {
        const option = document.createElement('option');
        option.value = stage;
        option.textContent = stage;
        selectElement.appendChild(option);
    });
    if (defaultValue !== undefined) selectElement.value = defaultValue;
}

/**
 * Formats bytes into a human-readable string (KB, MB, GB).
 * @param {number} bytes The number of bytes.
 * @param {number} [decimals=2] The number of decimal places.
 * @returns {string} The formatted string.
 */
export function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}