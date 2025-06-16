import { showLoading, getInitials, updateUserProfileCircleDisplay } from '../ui.js';
import * as state from '../state.js';
import * as fb from '../firebase-service.js';

export function init() {
    addPageEventListeners();
    populateProfileForm();
}

function addPageEventListeners() {
    document.getElementById('saveUserProfileButton').addEventListener('click', saveUserProfileData);
    document.getElementById('exportVCardButton').addEventListener('click', exportMyVCard);
    document.getElementById('profilePictureContainer').addEventListener('click', () => {
        document.getElementById('userProfilePhotoInput').click();
    });
    document.getElementById('userProfilePhotoInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('profilePictureContainer').innerHTML = `<img src="${event.target.result}" alt="Profile photo preview">`;
            };
            reader.readAsDataURL(file);
        }
    });
}

function populateProfileForm() {
    if (!state.currentUser) return;
    const profile = state.userProfile;
    document.getElementById('userProfileForm').reset();
    document.getElementById('userProfilePhotoInput').value = null;

    // Basic Info
    document.getElementById('userProfileFullName').value = profile.fullName || '';
    document.getElementById('userProfileJobTitle').value = profile.jobTitle || '';
    document.getElementById('userProfileCompany').value = profile.companyName || '';
    document.getElementById('userProfileTimezone').value = profile.timezone || '';
    document.getElementById('userProfileBio').value = profile.bio || '';

    // Contact Info
    document.getElementById('userProfileEmail').value = state.currentUser.email;
    document.getElementById('userProfilePersonalEmail').value = profile.personalEmail || '';
    document.getElementById('userProfilePhone').value = profile.phoneNumber || '';
    document.getElementById('userProfileOfficePhone').value = profile.officePhone || '';

    // Social Media & Web
    document.getElementById('userProfileFacebook').value = profile.facebookUrl || '';
    document.getElementById('userProfileInstagram').value = profile.instagramUrl || '';
    document.getElementById('userProfileLinkedIn').value = profile.linkedInUrl || '';
    document.getElementById('userProfileTwitter').value = profile.twitterUrl || '';
    document.getElementById('userProfileWebsite').value = profile.websiteUrl || '';
    document.getElementById('userProfileCalendly').value = profile.calendlyUrl || '';

    // Business Details
    document.getElementById('userProfileBrokerage').value = profile.brokerage || '';
    document.getElementById('userProfileLicenseNumber').value = profile.licenseNumber || '';
    document.getElementById('userProfileServiceAreas').value = profile.serviceAreas || '';
    document.getElementById('userProfileMlsAffiliations').value = profile.mlsAffiliations || '';
    document.getElementById('userProfileSignature').value = profile.signature || '';

    const profilePictureContainer = document.getElementById('profilePictureContainer');
    if (profile.photoUrl) {
        profilePictureContainer.innerHTML = `<img src="${profile.photoUrl}" alt="Profile Picture">`;
    } else {
        profilePictureContainer.textContent = getInitials(state.currentUser.email);
    }
}

async function saveUserProfileData() {
    if (!state.currentUser) return;
    showLoading(true);

    const profileData = {
        fullName: document.getElementById('userProfileFullName').value.trim(),
        jobTitle: document.getElementById('userProfileJobTitle').value.trim(),
        companyName: document.getElementById('userProfileCompany').value.trim(),
        timezone: document.getElementById('userProfileTimezone').value.trim(),
        bio: document.getElementById('userProfileBio').value.trim(),
        personalEmail: document.getElementById('userProfilePersonalEmail').value.trim(),
        phoneNumber: document.getElementById('userProfilePhone').value.trim(),
        officePhone: document.getElementById('userProfileOfficePhone').value.trim(),
        facebookUrl: document.getElementById('userProfileFacebook').value.trim(),
        instagramUrl: document.getElementById('userProfileInstagram').value.trim(),
        linkedInUrl: document.getElementById('userProfileLinkedIn').value.trim(),
        twitterUrl: document.getElementById('userProfileTwitter').value.trim(),
        websiteUrl: document.getElementById('userProfileWebsite').value.trim(),
        calendlyUrl: document.getElementById('userProfileCalendly').value.trim(),
        brokerage: document.getElementById('userProfileBrokerage').value.trim(),
        licenseNumber: document.getElementById('userProfileLicenseNumber').value.trim(),
        serviceAreas: document.getElementById('userProfileServiceAreas').value.trim(),
        mlsAffiliations: document.getElementById('userProfileMlsAffiliations').value.trim(),
        signature: document.getElementById('userProfileSignature').value,
        updatedAt: fb.Timestamp.now()
    };

    const photoFile = document.getElementById('userProfilePhotoInput').files[0];

    try {
        const updatedProfileData = await fb.saveUserProfile(state.currentUser.uid, profileData, photoFile);
        state.setUserProfile(updatedProfileData);
        updateUserProfileCircleDisplay(updatedProfileData.photoUrl, state.currentUser.email);
        alert("Profile saved successfully!");
    } catch (error) {
        console.error("Error saving profile:", error);
        alert("Failed to save profile: " + error.message);
    } finally {
        showLoading(false);
    }
}

async function exportMyVCard() {
    if (!state.currentUser) return;
    const profile = state.userProfile;
    const fullName = profile.fullName || state.currentUser.email;
    let vCard = `BEGIN:VCARD\nVERSION:3.0\nFN:${fullName}\n`;
    if (profile.fullName) vCard += `N:${profile.fullName.split(' ').slice(-1)};${profile.fullName.split(' ').slice(0, -1).join(' ')};;;\n`;
    if (profile.jobTitle) vCard += `TITLE:${profile.jobTitle}\n`;
    if (profile.companyName) vCard += `ORG:${profile.companyName}\n`;
    if (profile.phoneNumber) vCard += `TEL;TYPE=CELL:${profile.phoneNumber}\n`;
    if (profile.officePhone) vCard += `TEL;TYPE=WORK:${profile.officePhone}\n`;
    if (state.currentUser.email) vCard += `EMAIL;TYPE=WORK,INTERNET:${state.currentUser.email}\n`;
    if (profile.personalEmail) vCard += `EMAIL;TYPE=HOME,INTERNET:${profile.personalEmail}\n`;
    if (profile.websiteUrl) vCard += `URL:${profile.websiteUrl}\n`;
    vCard += `END:VCARD\n`;
    const blob = new Blob([vCard], { type: "text/vcard;charset=utf-8" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${fullName.replace(/ /g, '_')}.vcf`;
    a.click();
    URL.revokeObjectURL(a.href);
}