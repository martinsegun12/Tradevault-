
let allNotes = [];
let currentNoteId = null;
let autoSaveTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
    gsap.from('.notes-list', { x: -30, opacity: 0, duration: 0.5, ease: 'power3.out' });
    gsap.from('.note-editor', { x: 30, opacity: 0, duration: 0.5, delay: 0.1, ease: 'power3.out' });

    loadNotes();

    // Auto-save on input
    document.getElementById('note-title')?.addEventListener('input', () => {
        document.getElementById('note-status').textContent = 'Unsaved changes...';
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(saveCurrentNote, 2000);
    });

    document.getElementById('note-content')?.addEventListener('input', () => {
        document.getElementById('note-status').textContent = 'Unsaved changes...';
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(saveCurrentNote, 2000);
    });
});

async function loadNotes() {
    if (!currentUser) return;

    try {
        const snapshot = await db.collection('strategies')
            .where('userId', '==', currentUser.uid)
            .orderBy('updatedAt', 'desc')
            .get();

        allNotes = [];
        snapshot.forEach(doc => {
            allNotes.push({ id: doc.id, ...doc.data() });
        });

        renderNotesList(allNotes);

        // Load first note if exists
        if (allNotes.length > 0) {
            loadNote(allNotes[0].id);
        } else {
            createNewNote();
        }

    } catch(e) {
        console.error('Error loading notes:', e);
    }
}

function renderNotesList(notes) {
    const list = document.getElementById('notes-list');
    const countEl = document.getElementById('notes-count');

    if (countEl) countEl.textContent = `${notes.length} note${notes.length !== 1 ? 's' : ''}`;

    if (notes.length === 0) {
        list.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: var(--text-muted);">
                <i class="fas fa-lightbulb" style="font-size: 32px; margin-bottom: 12px; display: block; opacity: 0.5;"></i>
                <p style="font-size: 14px;">No strategies yet</p>
                <p style="font-size: 12px; margin-top: 4px;">Click "New Strategy" to create one</p>
            </div>
        `;
        return;
    }

    list.innerHTML = notes.map(note => {
        const date = note.updatedAt 
            ? (note.updatedAt.toDate ? note.updatedAt.toDate() : new Date(note.updatedAt)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : 'Just now';
        const isActive = note.id === currentNoteId;
        const preview = note.content ? note.content.substring(0, 60).replace(/\n/g, ' ') + '...' : 'No content';

        return `
            <div class="note-item ${isActive ? 'active' : ''}" onclick="loadNote('${note.id}')" data-id="${note.id}">
                <div class="note-item-title">${note.title || 'Untitled'}</div>
                <div class="note-item-meta">${date} · ${preview}</div>
            </div>
        `;
    }).join('');
}

async function loadNote(id) {
    const note = allNotes.find(n => n.id === id);
    if (!note) return;

    currentNoteId = id;

    document.getElementById('note-title').value = note.title || 'Untitled';
    document.getElementById('note-content').value = note.content || '';

    const date = note.updatedAt 
        ? (note.updatedAt.toDate ? note.updatedAt.toDate() : new Date(note.updatedAt)).toLocaleString('en-US')
        : 'Just now';
    document.getElementById('note-date').textContent = 'Last edited: ' + date;
    document.getElementById('note-status').textContent = 'Saved';

    // Update active state in list
    document.querySelectorAll('.note-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id === id);
    });

    gsap.fromTo('.note-editor', 
        { opacity: 0.7 },
        { opacity: 1, duration: 0.2 }
    );
}

async function createNewNote() {
    if (!currentUser) return;

    const access = await checkAccess(currentUser);
    if (!access.hasAccess) {
        showPaywall();
        return;
    }

    try {
        const newNote = {
            userId: currentUser.uid,
            title: 'New Strategy',
            content: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('strategies').add(newNote);
        newNote.id = docRef.id;
        allNotes.unshift(newNote);

        renderNotesList(allNotes);
        loadNote(docRef.id);

        showToast('New strategy created', 'success');

    } catch(e) {
        showToast('Error creating strategy', 'error');
    }
}

async function saveCurrentNote() {
    if (!currentUser || !currentNoteId) return;

    const title = document.getElementById('note-title').value || 'Untitled';
    const content = document.getElementById('note-content').value;

    try {
        await db.collection('strategies').doc(currentNoteId).update({
            title,
            content,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update local data
        const note = allNotes.find(n => n.id === currentNoteId);
        if (note) {
            note.title = title;
            note.content = content;
        }

        document.getElementById('note-status').textContent = 'Saved';
        renderNotesList(allNotes);

    } catch(e) {
        document.getElementById('note-status').textContent = 'Save failed';
        console.error('Error saving note:', e);
    }
}

async function deleteCurrentNote() {
    if (!currentNoteId) return;
    if (!confirm('Delete this strategy?')) return;

    try {
        await db.collection('strategies').doc(currentNoteId).delete();
        allNotes = allNotes.filter(n => n.id !== currentNoteId);
        currentNoteId = null;

        renderNotesList(allNotes);

        if (allNotes.length > 0) {
            loadNote(allNotes[0].id);
        } else {
            document.getElementById('note-title').value = '';
            document.getElementById('note-content').value = '';
            document.getElementById('note-status').textContent = 'Ready';
        }

        showToast('Strategy deleted', 'success');

    } catch(e) {
        showToast('Error deleting strategy', 'error');
    }
}

function filterNotes() {
    const search = document.getElementById('notes-search').value.toLowerCase();
    const filtered = allNotes.filter(note => 
        (note.title && note.title.toLowerCase().includes(search)) ||
        (note.content && note.content.toLowerCase().includes(search))
    );
    renderNotesList(filtered);
}

window.createNewNote = createNewNote;
window.loadNote = loadNote;
window.saveCurrentNote = saveCurrentNote;
window.deleteCurrentNote = deleteCurrentNote;
window.filterNotes = filterNotes;
