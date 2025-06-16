import * as ui from '../ui.js';
import * as state from '../state.js';
import * as fb from '../firebase-service.js';
import * as modals from '../modals.js';

let pageAbortController = null;
let currentDripDesign = Array(6).fill(null);
let currentlyDraggedDripTemplateData = null;

export function init() {
    pageAbortController = new AbortController();
    const { signal } = pageAbortController;

    // Attach event listeners
    document.getElementById('dripUserSelect').addEventListener('change', handleDripUserSelection, { signal });
    document.getElementById('dripCircleSaveButton').addEventListener('click', saveCurrentDripDesign, { signal });
    document.getElementById('loadCustomDripSelect').addEventListener('change', () => loadSelectedDripCampaign(document.getElementById('loadCustomDripSelect').value), { signal });
    document.getElementById('activateDripButton').addEventListener('click', activateCurrentDripForLead, { signal });
    window.addEventListener('resize', renderDripDesignerSlotsAndLines, { signal });

    // Initial UI setup
    populateDripUserSelect();
    renderDraggableDripTemplates();
    renderDripDesignerSlotsAndLines();
    checkDripSaveButtonState();

    // Set up data listeners
    fb.setupDripCampaignsListener(state.currentUser.uid, handleDripCampaignsUpdate);
    window.addEventListener('leadsUpdated', populateDripUserSelect, { signal });
}

export function destroy() {
    if (pageAbortController) {
        pageAbortController.abort();
    }
    // Any listener cleanup would go here if not handled by the controller
    currentDripDesign = Array(6).fill(null);
}

function handleDripCampaignsUpdate(campaigns, error) {
    if (error) {
        console.error("Error fetching drip campaigns:", error);
        document.getElementById('savedDripsDisplayGrid').innerHTML = `<p style="color:red;">Error loading campaigns.</p>`;
        return;
    }
    renderSavedDripsDisplay(campaigns);
    loadSavedDripCampaignsForSelect(campaigns);
}

function populateDripUserSelect() {
    const dripUserSelect = document.getElementById('dripUserSelect');
    if (!dripUserSelect) return;

    const currentVal = dripUserSelect.value;
    dripUserSelect.innerHTML = '<option value="">-- Select a Lead --</option>';
    state.allLeads.forEach(lead => {
        const option = document.createElement('option');
        option.value = lead.id;
        option.textContent = `${lead.name} (${lead.email || 'No Email'})`;
        dripUserSelect.appendChild(option);
    });
    dripUserSelect.value = currentVal;
}

function handleDripUserSelection() {
    // Logic to handle when a user is selected can be added here if needed
}

function renderDraggableDripTemplates() {
    const dripTemplateSourceList = document.getElementById('dripTemplateSourceList');
    dripTemplateSourceList.innerHTML = '';

    // Get drip-compatible email templates
    const dripEmailTemplates = state.emailTemplates.flatMap(category =>
        category.tasks.filter(template => template.isDripCompatible)
    );

    // Get task templates
    const dripTaskTemplates = state.dripTaskTemplates;

    const allDripTemplates = [...dripEmailTemplates, ...dripTaskTemplates];

    allDripTemplates.forEach(template => {
        const div = document.createElement('div');
        div.className = 'drip-source-template';
        div.draggable = true;

        const templateDataForDrag = {
            id: template.id,
            name: template.name,
            type: template.type || 'email', // Default to email if not specified
            description: template.description || '',
            subject: template.subject || null,
            body: template.body || null,
            taskTitle: template.taskTitle || null,
        };

        div.dataset.template = JSON.stringify(templateDataForDrag);

        div.innerHTML = `<h5>${template.name}</h5><p>${templateDataForDrag.description}</p>`;

        div.addEventListener('dragstart', (e) => {
            currentlyDraggedDripTemplateData = JSON.parse(e.currentTarget.dataset.template);
            e.dataTransfer.setData('text/plain', 'drip-template');
            e.dataTransfer.effectAllowed = 'copy';
        });
        dripTemplateSourceList.appendChild(div);
    });
}

function renderDripDesignerSlotsAndLines() {
    const designer = document.getElementById('dripCampaignDesigner');
    const circle = document.getElementById('dripCircle');
    const slotsContainer = document.getElementById('dripCampaignSlots');
    const linesSvg = document.getElementById('dripCampaignLines');

    if (!designer || !circle || !slotsContainer || !linesSvg) return;

    slotsContainer.innerHTML = '';
    linesSvg.innerHTML = '';

    const numSlots = 6;
    const designerRect = designer.getBoundingClientRect();
    const designerCenterX = designerRect.width / 2;
    const designerCenterY = designerRect.height / 2;

    const slotWidth = 140;
    const slotHeight = 90;
    const slotPlacementRadius = Math.min(designerRect.width / 2, designerRect.height / 2) - Math.max(slotWidth, slotHeight) / 2 - 20;

    for (let i = 0; i < numSlots; i++) {
        const angle = (-Math.PI / 2) + (i * (2 * Math.PI / numSlots));
        const slotX = designerCenterX + slotPlacementRadius * Math.cos(angle) - (slotWidth / 2);
        const slotY = designerCenterY + slotPlacementRadius * Math.sin(angle) - (slotHeight / 2);

        const slot = document.createElement('div');
        slot.className = 'drip-slot';
        slot.dataset.slotIndex = i;
        slot.style.left = `${slotX}px`;
        slot.style.top = `${slotY}px`;

        const stepData = currentDripDesign[i];
        if (stepData && stepData.templateId) {
            slot.classList.add('populated');
            slot.innerHTML = `<span class="template-name">${stepData.templateName}</span>`;
            if (stepData.delayDays !== undefined && stepData.delayDays > 0) {
                slot.innerHTML += `<span class="template-delay">Delay: ${stepData.delayDays}d</span>`;
            }
        } else {
            slot.textContent = `Step ${i + 1}`;
        }

        slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('drag-over'); e.dataTransfer.dropEffect = 'copy'; });
        slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
        slot.addEventListener('drop', handleDropOnDripSlot);
        slotsContainer.appendChild(slot);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const lineEndX = slotX + (slotWidth / 2);
        const lineEndY = slotY + (slotHeight / 2);
        line.setAttribute('x1', designerCenterX.toString());
        line.setAttribute('y1', designerCenterY.toString());
        line.setAttribute('x2', lineEndX.toString());
        line.setAttribute('y2', lineEndY.toString());
        linesSvg.appendChild(line);
    }
    checkDripSaveButtonState();
}

function handleDropOnDripSlot(event) {
    event.preventDefault();
    const slotDiv = event.target.closest('.drip-slot');
    if (!slotDiv || !currentlyDraggedDripTemplateData) return;

    slotDiv.classList.remove('drag-over');
    const slotIndex = parseInt(slotDiv.dataset.slotIndex);
    const templateData = currentlyDraggedDripTemplateData;

    const processDrop = (delayInput) => {
        let delayDays = parseInt(delayInput);
        if (isNaN(delayDays) || delayDays < 0) {
            delayDays = 0;
            modals.showSimpleAlert("Invalid delay. Setting to 0 days.");
        }
        currentDripDesign[slotIndex] = {
            templateId: templateData.id,
            templateName: templateData.name,
            templateType: templateData.type,
            taskTitle: templateData.taskTitle || null,
            subject: templateData.subject || null,
            body: templateData.body || null,
            delayDays: delayDays
        };
        currentlyDraggedDripTemplateData = null;
        renderDripDesignerSlotsAndLines();
    };

    if (slotIndex > 0) {
        modals.showSimplePrompt("Enter delay in days before this step:", "1", processDrop);
    } else {
        processDrop("0");
    }
}

function checkDripSaveButtonState() {
    const saveButton = document.getElementById('dripCircleSaveButton');
    if (!saveButton) return;
    const populatedSlots = currentDripDesign.filter(step => step && step.templateId).length;
    saveButton.disabled = populatedSlots < 1; // Allow saving with 1 or more steps
    saveButton.title = saveButton.disabled ? "Add at least 1 step to save" : "Save this drip campaign design";
}

async function saveCurrentDripDesign() {
    const campaignNameInput = document.getElementById('dripCircleCampaignNameInput');
    const campaignName = campaignNameInput.value.trim();
    if (!campaignName) {
        modals.showSimpleAlert("Please enter a name for your custom drip campaign.", () => campaignNameInput.focus());
        return;
    }
    const populatedSteps = currentDripDesign.filter(step => step && step.templateId);
    if (populatedSteps.length === 0) {
        modals.showSimpleAlert("Please add at least one template to the drip campaign slots before saving.");
        return;
    }
    const dripData = {
        campaignName,
        steps: currentDripDesign.map((step, index) => ({ slot: index, ...step })).filter(step => step.templateId)
    };
    ui.showLoading(true);
    try {
        await fb.saveDripCampaign(state.currentUser.uid, dripData);
        modals.showSimpleAlert(`Drip campaign "${campaignName}" saved successfully!`);
        campaignNameInput.value = '';
        currentDripDesign = Array(6).fill(null);
        renderDripDesignerSlotsAndLines();
    } catch (error) {
        console.error("Error saving drip campaign:", error);
        modals.showSimpleAlert("Failed to save drip campaign: " + error.message);
    } finally {
        ui.showLoading(false);
    }
}

function renderSavedDripsDisplay(campaigns = []) {
    const grid = document.getElementById('savedDripsDisplayGrid');
    grid.innerHTML = '';
    if (campaigns.length === 0) {
        grid.innerHTML = `<p>No custom drip campaigns saved yet.</p>`;
        return;
    }
    campaigns.forEach(campaign => {
        const card = document.createElement('div');
        card.className = 'saved-drip-card';
        card.dataset.campaignId = campaign.id;
        const stepNames = (campaign.steps || []).sort((a, b) => a.slot - b.slot).map(s => `${s.templateName}${s.delayDays > 0 ? ` (+${s.delayDays}d)` : ''}`).join('<br>');
        card.innerHTML = `<h5>${campaign.campaignName}</h5><p><small>${stepNames || 'No steps.'}</small></p>`;
        card.addEventListener('click', () => loadSelectedDripCampaign(campaign.id));
        grid.appendChild(card);
    });
}

function loadSavedDripCampaignsForSelect(campaigns = []) {
    const select = document.getElementById('loadCustomDripSelect');
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Load Saved Drip --</option>';
    campaigns.forEach(campaign => {
        const option = document.createElement('option');
        option.value = campaign.id;
        option.textContent = campaign.campaignName;
        select.appendChild(option);
    });
    if (currentVal) select.value = currentVal;
}

async function loadSelectedDripCampaign(campaignId) {
    const campaignNameInput = document.getElementById('dripCircleCampaignNameInput');
    if (!campaignId) {
        campaignNameInput.value = "";
        currentDripDesign = Array(6).fill(null);
        renderDripDesignerSlotsAndLines();
        return;
    }
    ui.showLoading(true);
    try {
        const campaignData = await fb.getDripCampaignById(state.currentUser.uid, campaignId);
        if (campaignData) {
            campaignNameInput.value = campaignData.campaignName;
            currentDripDesign = Array(6).fill(null);
            (campaignData.steps || []).forEach(step => {
                if (step.slot >= 0 && step.slot < 6) {
                    currentDripDesign[step.slot] = step;
                }
            });
            renderDripDesignerSlotsAndLines();
            document.getElementById('loadCustomDripSelect').value = campaignId;
        } else {
            modals.showSimpleAlert("Could not find selected drip campaign.");
        }
    } catch (error) {
        console.error("Error loading selected drip campaign:", error);
        modals.showSimpleAlert("Failed to load drip campaign: " + error.message);
    } finally {
        ui.showLoading(false);
    }
}

async function activateCurrentDripForLead() {
    const selectedLeadId = document.getElementById('dripUserSelect').value;
    if (!selectedLeadId) {
        modals.showSimpleAlert("Please select a lead first from the 'Activate For' dropdown.", () => document.getElementById('dripUserSelect').focus());
        return;
    }
    const populatedSteps = currentDripDesign.filter(step => step && step.templateId);
    if (populatedSteps.length === 0) {
        modals.showSimpleAlert("The current drip design is empty. Design a campaign or load a saved one.");
        return;
    }
    const leadToActivate = state.allLeads.find(l => l.id === selectedLeadId);
    if (!leadToActivate) {
        modals.showSimpleAlert("Could not find the selected lead's data.");
        return;
    }
    const campaignName = document.getElementById('dripCircleCampaignNameInput').value.trim() || "Untitled Custom Drip";

    ui.showLoading(true);
    try {
        await fb.activateDripCampaign(leadToActivate, campaignName, populatedSteps);
        modals.showSimpleAlert(`Successfully scheduled drip campaign "${campaignName}" for ${leadToActivate.name}.`);
    } catch (error) {
        console.error("Error activating drip campaign:", error);
        modals.showSimpleAlert(`Failed to activate drip campaign: ${error.message}`);
    } finally {
        ui.showLoading(false);
    }
}