import * as state from '../state.js';

const CAPTURE_FUNCTION_URL = '/api/capture'; // UPDATED from hardcoded URL

export function init() {
    renderPremadeFormSelector();
    document.getElementById('selectedFormDisplayArea').innerHTML = '<div class="default-view-message"><p>Select a template from above to configure</p></div>';
}

function renderPremadeFormSelector() {
    const selectorRow = document.getElementById('premadeFormsSelector');
    if (!selectorRow) return;
    selectorRow.innerHTML = '';
    state.premadeCaptureFormTemplates.forEach(template => {
        const card = document.createElement('button');
        card.className = 'template-selector-btn';
        card.textContent = template.title;
        card.addEventListener('click', () => {
            document.querySelectorAll('.template-selector-btn.active').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            renderSelectedCaptureForm(template);
        });
        selectorRow.appendChild(card);
    });
}

function renderSelectedCaptureForm(template) {
    const displayArea = document.getElementById('selectedFormDisplayArea');
    if (!displayArea) return;

    const formId = `dynamic-form-${template.key}`;
    const codeId = `code-display-${template.key}`;

    // A new wrapper to center the content within the display area
    displayArea.innerHTML = `
    <div class="form-display-content vision-panel">
        <div class="form-preview-container">
            <h3>Preview: ${template.title}</h3>
            <div class="rendered-capture-form">${generateFormHtml(template, formId, false)}</div>
        </div>
        <div class="capture-form-actions">
            <button id="embedBtn">Copy Embed Code</button>
        </div>
        <textarea id="${codeId}" class="code-display-area" readonly></textarea>
    </div>
    `;

    document.getElementById('embedBtn').addEventListener('click', () => displayCode(template, codeId));
}

function generateFormHtml(template, formId, forEmbed = false) {
    const fields = template.fields.map(field => {
        const fieldId = `${formId}-${field.name}`;
        let inputHtml = '';
        if (field.type === 'select') {
            const options = field.options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
            inputHtml = `<select id="${fieldId}" name="${field.name}" ${field.required ? 'required' : ''}>${options}</select>`;
        } else if (field.type === 'textarea') {
            inputHtml = `<textarea id="${fieldId}" name="${field.name}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''} rows="3"></textarea>`;
        } else {
            inputHtml = `<input type="${field.type}" id="${fieldId}" name="${field.name}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>`;
        }
        return `<div class="form-group"><label for="${fieldId}">${field.label}</label>${inputHtml}</div>`;
    }).join('');

    let formHtml = `
        <h4>${template.formTitleForEmbed || template.title}</h4>
        ${template.subtextForEmbed ? `<p class="subtext">${template.subtextForEmbed}</p>` : ''}
        <form id="${formId}" onsubmit="submitDwellverseForm(event, '${formId}')">
            <input type="hidden" name="ownerId" value="${state.currentUser ? state.currentUser.uid : 'YOUR_USER_ID_HERE'}">
            <input type="hidden" name="formName" value="${template.title}">
            ${fields}
            <div class="form-message-area"></div>
            <button type="submit">${template.submitButtonText}</button>
        </form>`;

    if (forEmbed) {
        const script = `
<script>
    function submitDwellverseForm(event, formId) {
        event.preventDefault();
        const form = document.getElementById(formId);
        if (!form) return;

        const submitButton = form.querySelector('button[type="submit"]');
        const messageArea = form.querySelector(".form-message-area");
        
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";

        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        fetch('${CAPTURE_FUNCTION_URL}', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => Promise.reject(err));
            }
            return response.json();
        })
        .then(data => {
            messageArea.style.display = "block";
            messageArea.textContent = data.message || "Thank you! Your information has been submitted.";
            messageArea.style.backgroundColor = "var(--form-success-bg, #d4edda)";
            messageArea.style.color = "var(--form-success-text, #155724)";
            form.reset();
            submitButton.disabled = false;
            submitButton.textContent = '${template.submitButtonText}';
        })
        .catch(error => {
            console.error("Dwellverse Capture Form Error:", error);
            messageArea.style.display = "block";
            messageArea.textContent = error.message || "An error occurred. Please try again.";
            messageArea.style.backgroundColor = "var(--form-error-bg, #f8d7da)";
            messageArea.style.color = "var(--form-error-text, #721c24)";
            submitButton.disabled = false;
            submitButton.textContent = '${template.submitButtonText}';
        });
    }
</script>`;

        const styles = `
<style>
    .dwellverse-capture-form {
        /* Define CSS variables for theming */
        --form-bg: rgba(240, 240, 245, 0.7);
        --form-border: rgba(255, 255, 255, 0.7);
        --form-text-primary: #1d1d1f;
        --form-text-secondary: #6e6e73;
        --form-input-bg: rgba(255, 255, 255, 0.5);
        --form-input-border: rgba(0, 0, 0, 0.1);
        --form-button-bg: #007aff;
        --form-success-bg: #d4edda;
        --form-success-text: #155724;
        --form-error-bg: #f8d7da;
        --form-error-text: #721c24;

        max-width: 600px;
        margin: 20px auto;
        padding: 25px;
        border-radius: 16px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background-color: var(--form-bg);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid var(--form-border);
        color: var(--form-text-primary);
    }
    body.dark-mode .dwellverse-capture-form {
        /* Override variables if the host page has a .dark-mode class */
        --form-bg: rgba(28, 28, 30, 0.7);
        --form-border: rgba(85, 85, 90, 0.5);
        --form-text-primary: #f5f5f7;
        --form-text-secondary: #a1a1a6;
        --form-input-bg: rgba(50, 50, 52, 0.6);
        --form-input-border: rgba(110, 110, 115, 0.5);
        --form-button-bg: #0a84ff;
        --form-success-bg: #1c3c2b;
        --form-success-text: #a6f2c0;
        --form-error-bg: #4d1c24;
        --form-error-text: #ffb1b5;
    }
    .dwellverse-capture-form h4 {
        font-size: 1.5em;
        margin: 0 0 10px 0;
        color: var(--form-text-primary);
    }
    .dwellverse-capture-form .subtext {
        color: var(--form-text-secondary);
        margin-bottom: 20px;
    }
    .dwellverse-capture-form .form-group {
        margin-bottom: 15px;
    }
    .dwellverse-capture-form label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
        color: var(--form-text-secondary);
    }
    .dwellverse-capture-form input,
    .dwellverse-capture-form select,
    .dwellverse-capture-form textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid var(--form-input-border);
        border-radius: 12px;
        background-color: var(--form-input-bg);
        box-sizing: border-box;
        font-size: 1rem;
        color: var(--form-text-primary);
    }
    .dwellverse-capture-form button {
        width: 100%;
        padding: 12px;
        border-radius: 50px;
        border: none;
        background-color: var(--form-button-bg);
        color: white;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
    }
    .dwellverse-capture-form .form-message-area {
        display: none;
        margin-bottom: 15px;
        padding: 10px;
        border-radius: 6px;
    }
</style>`;

        formHtml = `${styles}<div class="dwellverse-capture-form">${formHtml}</div>${script}`;
    }
    return formHtml;
}

function displayCode(template, textareaId) {
    if (!state.currentUser || !state.currentUser.uid) {
        alert("You must be logged in to generate a valid embed code.");
        return;
    }
    const codeArea = document.getElementById(textareaId);
    if (!codeArea) return;
    codeArea.value = generateFormHtml(template, `embed-${template.key}`, true);
    codeArea.style.display = 'block';
    codeArea.select();
    try {
        document.execCommand('copy');
        alert('Embed code copied to clipboard!');
    } catch (err) {
        alert('Could not copy code. Please select and copy manually.');
    }
}