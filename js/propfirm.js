
document.addEventListener('DOMContentLoaded', () => {
    gsap.from('.content-card', {
        y: 30, opacity: 0, duration: 0.6, stagger: 0.15, ease: 'power3.out'
    });

    loadChallenges();
});

function openPropModal() {
    document.getElementById('prop-modal').classList.add('active');
    gsap.fromTo('#prop-modal .modal-content',
        { scale: 0.9, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.7)' }
    );

    // Set default start date to today
    document.getElementById('prop-start').value = new Date().toISOString().split('T')[0];
}

function closePropModal() {
    gsap.to('#prop-modal .modal-content', {
        scale: 0.9, opacity: 0, y: 20, duration: 0.2,
        onComplete: () => document.getElementById('prop-modal').classList.remove('active')
    });
}

async function saveChallenge(e) {
    e.preventDefault();

    if (!currentUser) return;

    const access = await checkAccess(currentUser);
    if (!access.hasAccess) {
        showPaywall();
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;

    try {
        const challengeData = {
            userId: currentUser.uid,
            firm: document.getElementById('prop-firm').value,
            accountSize: parseInt(document.getElementById('prop-size').value),
            phase: document.getElementById('prop-phase').value,
            startDate: new Date(document.getElementById('prop-start').value),
            profitTarget: parseFloat(document.getElementById('prop-target').value),
            maxDailyLoss: parseFloat(document.getElementById('prop-daily-loss').value),
            maxTotalLoss: parseFloat(document.getElementById('prop-total-loss').value),
            currentPnl: parseFloat(document.getElementById('prop-current').value),
            notes: document.getElementById('prop-notes').value,
            status: 'active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('challenges').add(challengeData);
        showToast('Challenge saved!', 'success');
        closePropModal();
        loadChallenges();

    } catch(e) {
        showToast('Error saving challenge', 'error');
    } finally {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Challenge';
        submitBtn.disabled = false;
    }
}

async function loadChallenges() {
    if (!currentUser) return;

    try {
        const snapshot = await db.collection('challenges')
            .where('userId', '==', currentUser.uid)
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc')
            .get();

        const container = document.getElementById('prop-challenges');

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="content-card" style="text-align: center; padding: 60px;">
                    <i class="fas fa-building" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px; display: block;"></i>
                    <p style="font-size: 16px; color: var(--text-secondary); margin-bottom: 8px;">No active challenges</p>
                    <p style="font-size: 14px; color: var(--text-muted);">Add your first prop firm challenge to start tracking</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        snapshot.forEach(doc => {
            const challenge = doc.data();
            const card = createChallengeCard(doc.id, challenge);
            container.appendChild(card);
        });

        gsap.from(container.children, {
            y: 30, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out'
        });

    } catch(e) {
        console.error('Error loading challenges:', e);
    }
}

function createChallengeCard(id, challenge) {
    const div = document.createElement('div');
    div.className = 'prop-card';

    const accountSize = challenge.accountSize.toLocaleString();
    const phaseClass = challenge.phase === 'phase1' ? 'phase-1' : challenge.phase === 'phase2' ? 'phase-2' : 'funded';
    const phaseText = challenge.phase === 'phase1' ? 'Phase 1' : challenge.phase === 'phase2' ? 'Phase 2' : 'Funded';

    const profitPercent = challenge.currentPnl;
    const targetPercent = challenge.profitTarget;
    const profitProgress = Math.min(100, Math.max(0, (profitPercent / targetPercent) * 100));

    const totalLossPercent = Math.abs(challenge.currentPnl < 0 ? challenge.currentPnl : 0);
    const maxTotalLoss = challenge.maxTotalLoss;
    const lossProgress = Math.min(100, (totalLossPercent / maxTotalLoss) * 100);

    const daysSinceStart = Math.floor((new Date() - challenge.startDate.toDate()) / (1000 * 60 * 60 * 24));

    div.innerHTML = `
        <div class="prop-header">
            <div>
                <div class="prop-name">${challenge.firm} — $${accountSize}</div>
                <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Started ${daysSinceStart} days ago</div>
            </div>
            <span class="prop-phase ${phaseClass}">${phaseText}</span>
        </div>

        <div class="prop-metrics">
            <div class="prop-metric">
                <span class="prop-metric-value" style="color: ${profitPercent >= 0 ? 'var(--success)' : 'var(--danger)'}">${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%</span>
                <span class="prop-metric-label">Current P&L</span>
            </div>
            <div class="prop-metric">
                <span class="prop-metric-value">${targetPercent}%</span>
                <span class="prop-metric-label">Profit Target</span>
            </div>
            <div class="prop-metric">
                <span class="prop-metric-value">${profitProgress.toFixed(1)}%</span>
                <span class="prop-metric-label">Progress</span>
            </div>
        </div>

        <div class="prop-limits">
            <div class="prop-limit">
                <div class="prop-limit-label">Profit Target Progress</div>
                <div class="prop-limit-bar">
                    <div class="progress-bar-fill green" style="width: ${profitProgress}%"></div>
                </div>
                <div class="prop-limit-value" style="color: var(--success);">${profitProgress.toFixed(1)}% of ${targetPercent}%</div>
            </div>
            <div class="prop-limit">
                <div class="prop-limit-label">Max Loss Used</div>
                <div class="prop-limit-bar">
                    <div class="progress-bar-fill ${lossProgress > 70 ? 'red' : lossProgress > 40 ? 'yellow' : 'green'}" style="width: ${lossProgress}%"></div>
                </div>
                <div class="prop-limit-value" style="color: ${lossProgress > 70 ? 'var(--danger)' : 'var(--text-secondary)'}">${totalLossPercent.toFixed(1)}% of ${maxTotalLoss}%</div>
            </div>
        </div>

        <div style="margin-top: 16px; display: flex; gap: 8px;">
            <button class="btn-primary" style="font-size: 13px; padding: 8px 16px;" onclick="updateChallenge('${id}')">
                <i class="fas fa-edit"></i> Update
            </button>
            <button class="btn-secondary" style="font-size: 13px; padding: 8px 16px;" onclick="completeChallenge('${id}')">
                <i class="fas fa-check"></i> Mark Complete
            </button>
            <button class="btn-danger" style="font-size: 13px; padding: 8px 16px; margin-left: auto;" onclick="deleteChallenge('${id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>

        ${challenge.notes ? `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); font-size: 13px; color: var(--text-secondary);"><i class="fas fa-sticky-note" style="margin-right: 6px;"></i>${challenge.notes}</div>` : ''}
    `;

    return div;
}

async function updateChallenge(id) {
    const newPnl = prompt('Enter current P&L percentage:');
    if (newPnl === null) return;

    try {
        await db.collection('challenges').doc(id).update({
            currentPnl: parseFloat(newPnl),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Challenge updated!', 'success');
        loadChallenges();
    } catch(e) {
        showToast('Error updating challenge', 'error');
    }
}

async function completeChallenge(id) {
    if (!confirm('Mark this challenge as complete?')) return;

    try {
        await db.collection('challenges').doc(id).update({
            status: 'completed',
            completedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Challenge marked complete!', 'success');
        loadChallenges();
    } catch(e) {
        showToast('Error completing challenge', 'error');
    }
}

async function deleteChallenge(id) {
    if (!confirm('Delete this challenge?')) return;

    try {
        await db.collection('challenges').doc(id).delete();
        showToast('Challenge deleted', 'success');
        loadChallenges();
    } catch(e) {
        showToast('Error deleting challenge', 'error');
    }
}

window.openPropModal = openPropModal;
window.closePropModal = closePropModal;
window.saveChallenge = saveChallenge;
window.updateChallenge = updateChallenge;
window.completeChallenge = completeChallenge;
window.deleteChallenge = deleteChallenge;
