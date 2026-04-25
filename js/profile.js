document.addEventListener('DOMContentLoaded', () => {
    gsap.from('.content-card', {
        y: 30, opacity: 0, duration: 0.6, stagger: 0.15, ease: 'power3.out'
    });

    loadProfileData();
});

async function loadProfileData() {
    if (!currentUser) return;

    // Update profile info
    document.getElementById('profile-name').textContent = currentUser.displayName || 'Trader';
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('settings-name').value = currentUser.displayName || '';
    document.getElementById('settings-email').value = currentUser.email;

    // Update avatar
    const avatarEl = document.querySelector('.profile-avatar');
    const initialsEl = document.getElementById('profile-initials');

    if (currentUser.photoURL) {
        avatarEl.innerHTML = `
            <img src="${currentUser.photoURL}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover;">
            <div class="profile-avatar-overlay"><i class="fas fa-camera"></i></div>
        `;
        if (initialsEl) initialsEl.style.display = 'none';
    } else {
        if (initialsEl) {
            const initials = (currentUser.displayName || 'T').split(' ').map(n => n[0]).join('').toUpperCase();
            initialsEl.textContent = initials;
            initialsEl.style.display = 'flex';
        }
    }

    // Load user data
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    if (userDoc.exists) {
        const data = userDoc.data();

        document.getElementById('profile-trades').textContent = data.totalTrades || 0;
        document.getElementById('profile-score').textContent = data.consistencyScore || 0;

        // Render rank badge
        if (typeof renderRankBadge === 'function') {
            renderRankBadge('profile-rank-badge', data.stars || 0);
        }

        // Render star history
        renderStarHistory(data.starHistory || []);

        // Update subscription info
        const now = new Date();
        const trialEnd = data.trialEnd ? data.trialEnd.toDate() : new Date(0);
        const daysLeft = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));

        const subBadge = document.getElementById('subscription-badge');
        const subStatus = document.getElementById('sub-status');
        const subDays = document.getElementById('sub-days');
        const subExpires = document.getElementById('sub-expires');

        if (subBadge) {
            subBadge.textContent = data.isPaid ? 'Pro Member' : (daysLeft > 0 ? 'Free Trial' : 'Trial Expired');
        }
        if (subStatus) {
            subStatus.textContent = data.isPaid ? 'Active' : (daysLeft > 0 ? 'Trial Active' : 'Expired');
            subStatus.style.color = data.isPaid ? 'var(--success)' : (daysLeft > 0 ? 'var(--primary)' : 'var(--danger)');
        }
        if (subDays) {
            subDays.textContent = data.isPaid ? '∞' : daysLeft;
            subDays.style.color = data.isPaid ? 'var(--success)' : (daysLeft > 0 ? 'var(--primary)' : 'var(--danger)');
        }
        if (subExpires) {
            subExpires.textContent = data.isPaid ? 'Lifetime' : trialEnd.toLocaleDateString('en-US');
        }

        // Update badges
        updateBadges(data);
    }
}

function updateBadges(data) {
    const badges = {
        'badge-first-trade': (data.totalTrades || 0) >= 1,
        'badge-10-trades': (data.totalTrades || 0) >= 10,
        'badge-50-trades': (data.totalTrades || 0) >= 50,
        'badge-100-trades': (data.totalTrades || 0) >= 100,
        'badge-green-month': data.totalPnl > 0,
        'badge-no-mistakes': false, // Would need to query trades
        'badge-5-streak': (data.streakDays || 0) >= 5,
        'badge-prop-funded': false
    };

    Object.entries(badges).forEach(([id, unlocked]) => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.toggle('locked', !unlocked);
            el.classList.toggle('unlocked', unlocked);
        }
    });
}

async function uploadAvatar(input) {
    if (!input.files || !input.files[0] || !currentUser) {
        showToast('Please select an image first', 'warning');
        return;
    }

    const file = input.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showToast('Image must be under 2MB', 'error');
        return;
    }

    const uploadBtn = document.querySelector('#avatar-upload + label');
    const originalText = uploadBtn?.innerHTML;
    
    if (uploadBtn) {
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        uploadBtn.disabled = true;
    }

    try {
        // Create a unique filename
        const fileName = `avatar_${currentUser.uid}_${Date.now()}.jpg`;
        const storageRef = storage.ref(`avatars/${fileName}`);
        
        // Upload file
        const snapshot = await storageRef.put(file);
        const url = await snapshot.ref.getDownloadURL();

        // Update user profile
        await currentUser.updateProfile({ photoURL: url });
        
        // Update Firestore
        await db.collection('users').doc(currentUser.uid).update({ 
            avatar: url,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update UI - Profile page avatar
        const avatarEl = document.querySelector('.profile-avatar');
        if (avatarEl) {
            avatarEl.innerHTML = `
                <img src="${url}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover;">
                <div class="profile-avatar-overlay"><i class="fas fa-camera"></i></div>
            `;
        }

        // Update sidebar avatar
        const sidebarAvatar = document.querySelector('.sidebar-user .user-avatar');
        if (sidebarAvatar) {
            sidebarAvatar.innerHTML = `<img src="${url}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        }

        // Hide initials if showing
        const initialsEl = document.getElementById('profile-initials');
        if (initialsEl) {
            initialsEl.style.display = 'none';
        }

        showToast('Profile picture updated successfully!', 'success');
        
        // Clear the input
        input.value = '';

    } catch(e) {
        console.error('Error uploading avatar:', e);
        showToast('Error uploading image: ' + e.message, 'error');
    } finally {
        if (uploadBtn) {
            uploadBtn.innerHTML = originalText;
            uploadBtn.disabled = false;
        }
    }
}

async function updateProfile(e) {
    e.preventDefault();

    if (!currentUser) return;

    const name = document.getElementById('settings-name').value;
    const experience = document.getElementById('settings-experience').value;

    if (!name || name.trim() === '') {
        showToast('Please enter a valid name', 'error');
        return;
    }

    const saveBtn = e.target.querySelector('button[type="submit"]');
    const originalText = saveBtn?.innerHTML;
    
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;
    }

    try {
        await currentUser.updateProfile({ displayName: name });
        await db.collection('users').doc(currentUser.uid).update({
            name: name,
            experience: experience,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('profile-name').textContent = name;

        // Update sidebar
        const userNameEl = document.querySelector('.user-name');
        if (userNameEl) userNameEl.textContent = name;

        showToast('Profile updated successfully!', 'success');

    } catch(e) {
        console.error('Error updating profile:', e);
        showToast('Error updating profile: ' + e.message, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
}

async function exportData() {
    if (!currentUser) return;

    try {
        showToast('Preparing export...', 'info');

        // Get all trades
        const tradesSnapshot = await db.collection('trades')
            .where('userId', '==', currentUser.uid)
            .get();

        const trades = [];
        tradesSnapshot.forEach(doc => trades.push(doc.data()));

        if (trades.length === 0) {
            showToast('No trades to export', 'warning');
            return;
        }

        // Create CSV
        const headers = ['Date', 'Pair', 'Direction', 'Entry', 'Exit', 'SL', 'TP', 'Lot', 'Pips', 'P&L', 'Strategy', 'Session', 'Emotion', 'Mistake', 'Notes'];
        const rows = trades.map(t => [
            t.createdAt ? new Date(t.createdAt.toDate()).toISOString() : '',
            t.pair || '', t.direction || '', t.entryPrice || '', t.exitPrice || '', 
            t.stopLoss || '', t.takeProfit || '', t.lotSize || '', t.pips || '', t.pnl || '',
            t.strategy || '', t.session || '', t.emotion || '', t.mistake || '', 
            `"${(t.notes || '').replace(/"/g, '""')}"`
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        // Download
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trade_vault_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`${trades.length} trades exported successfully!`, 'success');

    } catch(e) {
        console.error('Error exporting data:', e);
        showToast('Error exporting data: ' + e.message, 'error');
    }
}

async function deleteAccount() {
    if (!confirm('WARNING: This will permanently delete your account and all data. This cannot be undone. Are you sure?')) return;
    if (!confirm('FINAL WARNING: All your trades, strategies, and progress will be lost forever. Type "DELETE" to confirm.')) return;

    const confirmText = prompt('Type DELETE to permanently delete your account:');
    if (confirmText !== 'DELETE') {
        showToast('Account deletion cancelled', 'warning');
        return;
    }

    try {
        // Delete user data from Firestore
        await db.collection('users').doc(currentUser.uid).delete();

        // Delete all trades
        const tradesSnapshot = await db.collection('trades').where('userId', '==', currentUser.uid).get();
        const batch = db.batch();
        tradesSnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        // Delete all strategies
        const strategiesSnapshot = await db.collection('strategies').where('userId', '==', currentUser.uid).get();
        const strategyBatch = db.batch();
        strategiesSnapshot.forEach(doc => strategyBatch.delete(doc.ref));
        await strategyBatch.commit();

        // Delete user auth
        await currentUser.delete();

        showToast('Account deleted successfully', 'success');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);

    } catch(e) {
        console.error('Error deleting account:', e);
        showToast('Error deleting account. You may need to re-authenticate.', 'error');
    }
}

// Render star history chart
function renderStarHistory(history) {
    const ctx = document.getElementById('starHistoryCanvas');
    if (!ctx) return;

    if (window.starHistoryChart) {
        window.starHistoryChart.destroy();
    }

    const labels = history.map((h, i) => `Trade ${i + 1}`);
    const data = history.map(h => h.totalStars);

    window.starHistoryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length > 0 ? labels : ['Start'],
            datasets: [{
                label: 'Total Stars',
                data: data.length > 0 ? data : [0],
                borderColor: '#00d4aa',
                backgroundColor: 'rgba(0, 212, 170, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#00d4aa'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#6c6c7e', font: { size: 10 } } },
                y: { grid: { color: '#2a2a3e' }, ticks: { color: '#6c6c7e', font: { size: 10 } } }
            }
        }
    });
}

// Load and render leaderboard
async function loadLeaderboardUI(timeframe) {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 12px; display: block;"></i>
            Loading...
        </div>
    `;

    try {
        const leaderboard = await loadLeaderboard(timeframe);

        if (leaderboard.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fas fa-trophy" style="font-size: 32px; margin-bottom: 12px; display: block; opacity: 0.5;"></i>
                    <p>No rankings yet. Start trading to climb the ranks!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = leaderboard.map((user, index) => {
            const medal = index < 3 ? `<span style="font-size: 20px; margin-right: 8px;">${['🥇','🥈','🥉'][index]}</span>` : `<span style="width: 28px; display: inline-block; text-align: center; color: var(--text-muted); font-weight: 700;">${index + 1}</span>`;
            const rankInfo = getRank(user.stars);

            return `
                <div style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--border); ${user.name === (currentUser?.displayName || 'Trader') ? 'background: rgba(0, 212, 170, 0.05);' : ''}">
                    ${medal}
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: ${rankInfo.color}20; display: flex; align-items: center; justify-content: center; font-size: 18px;">${rankInfo.icon}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 14px;">${user.name} ${user.name === (currentUser?.displayName || 'Trader') ? '<span style="color: var(--primary); font-size: 11px;">(You)</span>' : ''}</div>
                        <div style="font-size: 12px; color: ${rankInfo.color}; font-weight: 600;">${rankInfo.name}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 700; font-size: 16px; color: var(--primary);">${user.stars} ⭐</div>
                        <div style="font-size: 11px; color: var(--text-muted);">${rankInfo.title}</div>
                    </div>
                </div>
            `;
        }).join('');

        gsap.from(container.children, {
            y: 10, opacity: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out'
        });

    } catch(e) {
        console.error('Error loading leaderboard:', e);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fas fa-exclamation-circle" style="font-size: 24px; margin-bottom: 12px; display: block;"></i>
                <p>Error loading leaderboard</p>
            </div>
        `;
    }
}

// Make functions global
window.uploadAvatar = uploadAvatar;
window.updateProfile = updateProfile;
window.exportData = exportData;
window.deleteAccount = deleteAccount;
window.renderStarHistory = renderStarHistory;
window.loadLeaderboardUI = loadLeaderboardUI;
