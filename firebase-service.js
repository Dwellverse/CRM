import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, doc, setDoc, deleteDoc, onSnapshot, orderBy, updateDoc, writeBatch, getDoc, Timestamp, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
export { Timestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, connectStorageEmulator } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-functions.js";

// --- INITIALIZATION ---
const firebaseConfig = {
    apiKey: "AIzaSyCtSvypYxUavS787oXsj7nSuN3SoiX7ibI",
    authDomain: "dwellversecrm-e3181.firebaseapp.com",
    projectId: "dwellversecrm-e3181",
    storageBucket: "dwellversecrm-e3181.firebasestorage.app",
    messagingSenderId: "270771004645",
    appId: "1:270771004645:web:ff4af0da3f6bb69529200c",
    measurementId: "G-W1G5B4PX96"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    console.log("Development environment detected. Connecting to Firebase Emulators.");
    connectAuthEmulator(auth, "http://localhost:9099");
    connectFirestoreEmulator(db, "localhost", 8080);
    connectFunctionsEmulator(functions, "localhost", 5001);
    connectStorageEmulator(storage, "localhost", 9199);
}

// --- AUTHENTICATION FUNCTIONS ---
export { auth, functions };
export function loginUser(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}
export function logoutUser() {
    return signOut(auth);
}
export function onAuth(callback) {
    return onAuthStateChanged(auth, callback);
}

// --- USER PROFILE FUNCTIONS ---
export function getUserProfile(userId) {
    const profileRef = doc(db, "userProfiles", userId);
    return getDoc(profileRef);
}

export async function saveUserProfile(userId, profileData, photoFile) {
    if (photoFile) {
        const photoRef = ref(storage, `users/${userId}/profilePicture/profile.jpg`);
        await uploadBytes(photoRef, photoFile);
        const photoUrl = await getDownloadURL(photoRef);
        profileData.photoUrl = photoUrl;
    }
    const profileRef = doc(db, "userProfiles", userId);
    await setDoc(profileRef, profileData, { merge: true });
    return profileData;
}

// --- LEAD FUNCTIONS ---
export function setupLeadListener(userId, callback) {
    const q = query(collection(db, `users/${userId}/leads`), orderBy("updatedAt", "desc"));
    return onSnapshot(q, callback, error => {
        console.error("Error in lead listener: ", error);
        callback(null, error);
    });
}

export function addLead(userId, leadData) {
    leadData.createdAt = Timestamp.now();
    leadData.updatedAt = Timestamp.now();
    return addDoc(collection(db, `users/${userId}/leads`), leadData);
}

export function updateLead(userId, leadId, leadData) {
    leadData.updatedAt = Timestamp.now();
    const leadRef = doc(db, `users/${userId}/leads`, leadId);
    return setDoc(leadRef, leadData, { merge: true });
}

export function updateLeadAssociatedContacts(userId, leadId, newContacts) {
    const leadRef = doc(db, `users/${userId}/leads`, leadId);
    return updateDoc(leadRef, {
        associatedContacts: newContacts,
        updatedAt: Timestamp.now()
    });
}

export async function deleteLeadAndAssociatedData(userId, leadId) {
    const batch = writeBatch(db);

    // Delete associated tasks
    const tasksQuery = query(collection(db, `users/${userId}/tasks`), where("associatedLeadId", "==", leadId));
    const taskSnap = await getDocs(tasksQuery);
    taskSnap.docs.forEach(d => batch.delete(d.ref));

    // Delete associated documents from Firestore and Storage
    const docsQuery = query(collection(db, `users/${userId}/documents`), where("associatedLeadId", "==", leadId));
    const docsSnap = await getDocs(docsQuery);
    const storageDeletePromises = [];
    docsSnap.docs.forEach(d => {
        const docData = d.data();
        if (docData.storagePath) {
            storageDeletePromises.push(deleteObject(ref(storage, docData.storagePath)));
        }
        batch.delete(d.ref);
    });

    // Delete the lead itself
    batch.delete(doc(db, `users/${userId}/leads`, leadId));

    // Execute all deletes
    await Promise.all(storageDeletePromises);
    return batch.commit();
}

export async function importLeadsFromCSV(userId, leadsToImport) {
    const batch = writeBatch(db);
    leadsToImport.forEach(leadData => {
        const newLeadRef = doc(collection(db, `users/${userId}/leads`));
        batch.set(newLeadRef, leadData);
    });
    return batch.commit();
}

export async function importLeadsFromVCard(userId, vCardContacts) {
    const batch = writeBatch(db);
    vCardContacts.forEach(contact => {
        if (contact.name || contact.email || contact.phone) {
            const newLeadRef = doc(collection(db, `users/${userId}/leads`));
            const leadData = { name: contact.name || contact.email || contact.phone, email: contact.email || "", phone: contact.phone || "", companyName: contact.companyName || "", homeAddress: contact.homeAddress || "", notes: `Imported from vCard. Title: ${contact.jobTitle || 'N/A'}`, pipelineStage: 'New Lead', source: 'vCard Import', createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
            batch.set(newLeadRef, leadData);
        }
    });
    return batch.commit();
}

// --- TASK FUNCTIONS ---
export function setupTaskListener(userId, callback) {
    const q = query(collection(db, `users/${userId}/tasks`), orderBy("createdAt", "desc"));
    return onSnapshot(q, callback, error => {
        console.error("Error in task listener: ", error);
        callback(null, error);
    });
}

export function addTask(userId, taskData) {
    taskData.createdAt = Timestamp.now();
    taskData.updatedAt = Timestamp.now();
    return addDoc(collection(db, `users/${userId}/tasks`), taskData);
}

export function updateTask(userId, taskId, taskData) {
    taskData.updatedAt = Timestamp.now();
    const taskRef = doc(db, `users/${userId}/tasks`, taskId);
    return setDoc(taskRef, taskData, { merge: true });
}

export function updateTaskDate(userId, taskId, newDate) {
    const taskRef = doc(db, `users/${userId}/tasks`, taskId);
    return updateDoc(taskRef, { dueDate: Timestamp.fromDate(newDate), updatedAt: Timestamp.now() });
}

export function deleteTask(userId, taskId) {
    return deleteDoc(doc(db, `users/${userId}/tasks`, taskId));
}

// --- EMAIL AND ATTACHMENT FUNCTIONS ---
export async function uploadTempAttachment(userId, file) {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const filePath = `users/${userId}/temp_attachments/${uniqueId}-${file.name}`;
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return { name: file.name, url: downloadURL };
}

export async function sendEmail(emailData) {
    const sendEmailFunction = httpsCallable(functions, 'sendEmail');
    return sendEmailFunction(emailData);
}

// --- DRIP CAMPAIGN FUNCTIONS ---
export function setupDripCampaignsListener(userId, callback) {
    const q = query(collection(db, `users/${userId}/dripCampaigns`), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const campaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(campaigns, null);
    }, error => {
        console.error("Error in drip campaigns listener: ", error);
        callback(null, error);
    });
}

export async function getDripCampaignById(userId, campaignId) {
    const docRef = doc(db, `users/${userId}/dripCampaigns`, campaignId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
}

export function saveDripCampaign(userId, dripData) {
    dripData.createdAt = Timestamp.now();
    dripData.updatedAt = Timestamp.now();
    dripData.userId = userId;
    return addDoc(collection(db, `users/${userId}/dripCampaigns`), dripData);
}

export function activateDripCampaign(lead, campaignName, steps) {
    const activateFunction = httpsCallable(functions, 'activateDripCampaign');
    return activateFunction({ lead, campaignName, steps });
}

// --- CUSTOM EMAIL TEMPLATE FUNCTIONS ---
export function setupCustomEmailListener(userId, callback) {
    const q = query(collection(db, `users/${userId}/customEmailTemplates`), orderBy("createdAt", "desc"));
    return onSnapshot(q, callback, error => {
        console.error("Error in custom email listener: ", error);
        callback(null, error);
    });
}

export function saveCustomEmailTemplate(userId, templateData) {
    templateData.createdAt = Timestamp.now();
    return addDoc(collection(db, `users/${userId}/customEmailTemplates`), templateData);
}

export function updateCustomEmailTemplate(userId, templateId, templateData) {
    templateData.updatedAt = Timestamp.now();
    const templateRef = doc(db, `users/${userId}/customEmailTemplates`, templateId);
    return updateDoc(templateRef, templateData);
}

export function deleteCustomEmailTemplate(userId, templateId) {
    const templateRef = doc(db, `users/${userId}/customEmailTemplates`, templateId);
    return deleteDoc(templateRef);
}

// --- DOCUMENT FUNCTIONS ---
export function setupDocumentsListener(userId, callback) {
    const q = query(collection(db, `users/${userId}/documents`), orderBy("uploadedAt", "desc"));
    return onSnapshot(q, callback, error => {
        console.error("Error in documents listener: ", error);
        callback(null, error);
    });
}

export async function uploadDocumentAndSaveMetadata(userId, leadId, file, description) {
    const newDocRef = doc(collection(db, `users/${userId}/documents`));
    const docId = newDocRef.id;
    const storagePath = leadId ? `users/${userId}/leads/${leadId}/${docId}-${file.name}` : `users/${userId}/documents/${docId}-${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadResult = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(uploadResult.ref);
    const metadata = {
        id: docId,
        fileName: file.name,
        fileURL: downloadURL,
        storagePath: storagePath,
        fileSize: file.size,
        fileType: file.type,
        associatedLeadId: leadId || null,
        description: description,
        uploadedAt: Timestamp.now(),
        userId: userId
    };
    await setDoc(newDocRef, metadata);
    return metadata;
}

export async function deleteDocument(userId, docId) {
    const docRef = doc(db, `users/${userId}/documents`, docId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) { throw new Error("Document metadata not found."); }
    const storagePath = docSnap.data().storagePath;
    if (!storagePath) { await deleteDoc(docRef); return; }
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    await deleteDoc(docRef);
}