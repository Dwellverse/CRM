import * as state from './state.js';

// --- DOM Elements ---
const userProfileCircle = document.getElementById('userProfileCircle');
const darkModeToggle = document.getElementById('darkModeToggle');
const body = document.body;

// --- Loading Indicator ---
export function showLoading(show) {
    // This function is now intentionally left blank to disable the loading indicator.
    return;
}

// --- Header & Profile Circle ---
export function getInitials(email) {
    if (!email) return '';
    const namePart = email.split('@')[0];
    const parts = namePart.split(/[.\-_ ]+/);
    let initials = '';
    if (parts.length > 0 && parts[0]) { initials += parts[0][0]; }
    if (parts.length > 1 && parts[1]) { initials += parts[1][0]; }
    if (initials.length === 0 && namePart.length > 0) { initials = namePart[0]; }
    return initials.toUpperCase();
}

export function updateUserProfileCircleDisplay(photoUrl, email) {
    if (userProfileCircle) {
        if (photoUrl) {
            userProfileCircle.innerHTML = `<img src="${photoUrl}" alt="User Profile">`;
        } else {
            userProfileCircle.textContent = getInitials(email);
        }
        userProfileCircle.title = email;
    }
}

// --- Dark Mode ---
export function initializeDarkMode() {
    // Safety check for darkModeToggle in case this is called where it doesn't exist.
    if (!darkModeToggle) return;

    if (localStorage.getItem('darkMode') === 'enabled') {
        body.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️';
    } else {
        darkModeToggle.textContent = '🌙';
    }

    darkModeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isEnabled = body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isEnabled ? 'enabled' : 'disabled');
        darkModeToggle.textContent = isEnabled ? '☀️' : '🌙';
    });
}

// --- UI Components ---
export function initializeCollapsibleSections(container) {
    if (!container) return;
    const headers = container.querySelectorAll('.collapsible-header');
    headers.forEach(header => {
        header.addEventListener('click', function () {
            this.classList.toggle('active');
            const content = this.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });
}

export function renderCustomLegend(legendContainerEl, labels, backgroundColors, counts) {
    if (!legendContainerEl) return;
    legendContainerEl.innerHTML = '';
    if (labels.length === 0 || (labels.length === 1 && labels[0] === "No Data")) {
        const noDataItem = document.createElement('div');
        noDataItem.className = 'legend-item';
        noDataItem.textContent = 'No data available';
        legendContainerEl.appendChild(noDataItem);
        return;
    }

    labels.forEach((label, index) => {
        const color = backgroundColors[index % backgroundColors.length];
        const count = counts[label];

        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';

        const colorSwatch = document.createElement('span');
        colorSwatch.className = 'legend-color-swatch';
        colorSwatch.style.backgroundColor = color;

        let labelTextContent = label;
        if (label === "Unknown") {
            labelTextContent = "Not Set";
        } else if (label === "N/A") {
            labelTextContent = "N/A (Seller)";
        }
        const labelText = document.createTextNode(labelTextContent);

        const valueText = document.createElement('span');
        valueText.className = 'legend-value';
        valueText.textContent = `(${count})`;

        legendItem.appendChild(colorSwatch);
        legendItem.appendChild(labelText);
        legendItem.appendChild(valueText);

        legendContainerEl.appendChild(legendItem);
    });
}