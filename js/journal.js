let uploadedImages = [];
let allTrades = [];

document.addEventListener('DOMContentLoaded', () => {
    // Set default datetime to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('trade-datetime').value = now.toISOString().slice(0, 16);

    // Animate page entrance
    gsap.from('.content-card', {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: 'power3.out'
    });

    // Load trades
    loadTrades();

    // Auto-calculate on input change
    ['trade-entry', 'trade-exit', 'trade-sl', 'trade-tp', 'trade-lot', 'trade-pair'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', calculateTradeMetrics);
    });

    // Filter listeners
    ['search-trades', 'filter-pair', 'filter-result', 'filter-strategy'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', filterTrades);
        document.getElementById(id)?.addEventListener('change', filterTrades);
    });
});

function openTradeModal() {
    document.getElementById('trade-modal').classList.add('active');
    gsap.fromTo('#trade-modal .modal-content', 
        { scale: 0.9, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.7)' }
    );

    // Reset form
    document.getElementById('trade-form').reset();
    uploadedImages = [];
    document.getElementById('image-preview').innerHTML = '';
    document.querySelectorAll('.mood-option').forEach(m => m.classList.remove('selected'));
    document.getElementById('trade-emotion').value = '';

    // Reset calculated fields
    document.getElementById('trade-pips').value = '';
    document.getElementById('trade-rr').value = '';
    document.getElementById('trade-pnl').value = '';
    
    // Set default datetime
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('trade-datetime').value = now.toISOString().slice(0, 16);
}

function closeTradeModal() {
    gsap.to('#trade-modal .modal-content', {
        scale: 0.9, opacity: 0, y: 20, duration: 0.2,
        onComplete: () => document.getElementById('trade-modal').classList.remove('active')
    });
}

function selectMood(el) {
    document.querySelectorAll('.mood-option').forEach(m => m.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('trade-emotion').value = el.dataset.mood;
}

function previewImages(input) {
    const preview = document.getElementById('image-preview');
    
    if (!input.files) return;

    Array.from(input.files).forEach(file => {
        if (uploadedImages.length >= 4) {
            showToast('Maximum 4 images allowed', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImages.push({ file, dataUrl: e.target.result });

            const div = document.createElement('div');
            div.className = 'image-preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="Chart">
                <div class="image-preview-remove" onclick="removeImage(${uploadedImages.length - 1}, this)">
                    <i class="fas fa-times"></i>
                </div>
            `;
            preview.appendChild(div);

            gsap.from(div, { scale: 0, duration: 0.3, ease: 'back.out(1.7)' });
        };
        reader.readAsDataURL(file);
    });
}

function removeImage(index, el) {
    uploadedImages.splice(index, 1);
    el.parentElement.remove();
}

function calculateTradeMetrics() {
    const pair = document.getElementById('trade-pair').value;
    const entry = parseFloat(document.getElementById('trade-entry').value);
    const exit = parseFloat(document.getElementById('trade-exit').value);
    const sl = parseFloat(document.getElementById('trade-sl').value);
    const tp = parseFloat(document.getElementById('trade-tp').value);
    const lot = parseFloat(document.getElementById('trade-lot').value);
    const direction = document.getElementById('trade-direction').value;

    if (!entry || !exit || !lot) return;

    // Calculate pips based on pair type
    let pips = 0;
    const isJPY = pair.includes('JPY');
    const isCrypto = ['BTCUSD', 'ETHUSD', 'BTC/USD', 'ETH/USD'].includes(pair);
    const isIndex = ['US30', 'NAS100', 'SPX500', 'DJ30'].includes(pair);
    const isGold = pair.includes('XAU') || pair.includes('GOLD');
    
    let pipMultiplier;
    if (isJPY) {
        pipMultiplier = 100; // For JPY pairs, 1 pip = 0.01
    } else if (isCrypto) {
        pipMultiplier = 100000; // For crypto
    } else if (isIndex) {
        pipMultiplier = 1; // For indices
    } else if (isGold) {
        pipMultiplier = 100; // For Gold
    } else {
        pipMultiplier = 10000; // For standard forex pairs
    }

    if (direction === 'Buy') {
        pips = (exit - entry) * pipMultiplier;
    } else {
        pips = (entry - exit) * pipMultiplier;
    }
    
    pips = Math.round(pips * 10) / 10;

    // Calculate P&L in USD
    let usdPnl;
    if (isCrypto) {
        usdPnl = pips * lot * 1; // Crypto: $1 per pip per lot
    } else if (isIndex) {
        usdPnl = pips * lot * 1; // Indices: $1 per point per lot
    } else {
        usdPnl = pips * lot * 10; // Forex: $10 per pip per standard lot
    }
    
    // Calculate R:R
    let rr = 'N/A';
    if (sl && tp) {
        let risk, reward;
        if (direction === 'Buy') {
            risk = (entry - sl) * pipMultiplier;
            reward = (tp - entry) * pipMultiplier;
        } else {
            risk = (sl - entry) * pipMultiplier;
            reward = (entry - tp) * pipMultiplier;
        }
        if (risk > 0) {
            const ratio = reward / risk;
            rr = '1:' + ratio.toFixed(1);
        }
    }

    document.getElementById('trade-pips').value = pips;
    document.getElementById('trade-pnl').value = Math.round(usdPnl);
    document.getElementById('trade-rr').value = rr;
}

async function saveTrade(e) {
    e.preventDefault();

    if (!currentUser) {
        showToast('Please sign in first', 'error');
        return;
    }

    const access = await checkAccess(currentUser);
    if (!access.hasAccess) {
        showPaywall();
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;

    try {
        // Upload images to Firebase Storage
        const imageUrls = [];
        for (let i = 0; i < uploadedImages.length; i++) {
            const img = uploadedImages[i];
            try {
                // Convert data URL to blob
                const response = await fetch(img.dataUrl);
                const blob = await response.blob();
                
                const fileName = `trade_${Date.now()}_${i}_${img.file.name}`;
                const storageRef = storage.ref(`trades/${currentUser.uid}/${fileName}`);
                await storageRef.put(blob);
                const url = await storageRef.getDownloadURL();
                imageUrls.push(url);
            } catch(imgError) {
                console.error('Error uploading image:', imgError);
                // Continue with other images
            }
        }

        const tradeData = {
            userId: currentUser.uid,
            pair: document.getElementById('trade-pair').value,
            direction: document.getElementById('trade-direction').value,
            entryPrice: parseFloat(document.getElementById('trade-entry').value),
            exitPrice: parseFloat(document.getElementById('trade-exit').value),
            stopLoss: parseFloat(document.getElementById('trade-sl').value) || null,
            takeProfit: parseFloat(document.getElementById('trade-tp').value) || null,
            lotSize: parseFloat(document.getElementById('trade-lot').value),
            pips: parseFloat(document.getElementById('trade-pips').value) || 0,
            pnl: parseFloat(document.getElementById('trade-pnl').value) || 0,
            riskReward: document.getElementById('trade-rr').value,
            timeframe: document.getElementById('trade-timeframe').value,
            session: document.getElementById('trade-session').value,
            strategy: document.getElementById('trade-strategy').value,
            condition: document.getElementById('trade-condition').value,
            emotion: document.getElementById('trade-emotion').value,
            mistake: document.getElementById('trade-mistake').value,
            notes: document.getElementById('trade-notes').value,
            images: imageUrls,
            createdAt: document.getElementById('trade-datetime').value 
                ? new Date(document.getElementById('trade-datetime').value) 
                : firebase.firestore.FieldValue.serverTimestamp()
        };

        // Validate required fields
        if (!tradeData.pair || !tradeData.entryPrice || !tradeData.exitPrice || !tradeData.lotSize) {
            throw new Error('Please fill in all required fields');
        }

        await db.collection('trades').add(tradeData);

        showToast('Trade saved successfully!', 'success');

        // Update ranking system
        if (typeof updateRankingAfterTrade === 'function') {
            await updateRankingAfterTrade(tradeData);
        }

        closeTradeModal();
        loadTrades();

        // Update user stats
        const userRef = db.collection('users').doc(currentUser.uid);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            const data = userDoc.data();
            const isWin = tradeData.pnl > 0;
            await userRef.update({
                totalTrades: (data.totalTrades || 0) + 1,
                winCount: (data.winCount || 0) + (isWin ? 1 : 0),
                lossCount: (data.lossCount || 0) + (!isWin && tradeData.pnl < 0 ? 1 : 0),
                totalPnl: (data.totalPnl || 0) + tradeData.pnl
            });
        }

        // Refresh dashboard data if on dashboard page
        if (typeof loadDashboardData === 'function') {
            loadDashboardData();
        }

    } catch(e) {
        console.error('Error saving trade:', e);
        showToast('Error saving trade: ' + e.message, 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function loadTrades() {
    if (!currentUser) return;

    try {
        const snapshot = await db.collection('trades')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();

        allTrades = [];
        snapshot.forEach(doc => {
            allTrades.push({ id: doc.id, ...doc.data() });
        });

        renderTrades(allTrades);

        // Update count
        const countEl = document.getElementById('trade-count');
        if (countEl) {
            countEl.textContent = `${allTrades.length} trades logged`;
        }

    } catch(e) {
        console.error('Error loading trades:', e);
        showToast('Error loading trades', 'error');
    }
}

function renderTrades(trades) {
    const tbody = document.getElementById('trades-table');
    if (!tbody) return;

    if (trades.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; color: var(--text-muted); padding: 60px 40px;">
                    <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; display: block; opacity: 0.5;"></i>
                    <p style="font-size: 16px; margin-bottom: 8px;">No trades found</p>
                    <p style="font-size: 14px;">Click "New Trade" to log your first trade</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = trades.map(trade => {
        const status = trade.pnl > 0 ? 'win' : trade.pnl < 0 ? 'loss' : 'breakeven';
        const statusText = trade.pnl > 0 ? 'Win' : trade.pnl < 0 ? 'Loss' : 'BE';
        const date = trade.createdAt 
            ? (trade.createdAt.toDate ? trade.createdAt.toDate() : new Date(trade.createdAt)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'N/A';
        const pnlClass = trade.pnl >= 0 ? 'positive' : 'negative';
        const pnlSign = trade.pnl >= 0 ? '+' : '';

        return `
            <tr data-id="${trade.id}">
                <td>${date}</td>
                <td><strong>${trade.pair || 'N/A'}</strong></td>
                <td>${trade.direction || 'N/A'}</td>
                <td>${trade.session || 'N/A'}</td>
                <td><span style="background: var(--bg-input); padding: 4px 10px; border-radius: 100px; font-size: 12px;">${trade.strategy || 'N/A'}</span></td>
                <td>${trade.entryPrice || 'N/A'}</td>
                <td>${trade.exitPrice || 'N/A'}</td>
                <td>${trade.pips || 0}</td>
                <td class="trade-pnl ${pnlClass}">${pnlSign}$${(trade.pnl || 0).toLocaleString()}</td>
                <td><span class="trade-status ${status}">${statusText}</span></td>
                <td>
                    <button class="btn-icon" onclick="viewTrade('${trade.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="deleteTrade('${trade.id}')" title="Delete" style="margin-left: 4px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Animate rows
    gsap.from(tbody.querySelectorAll('tr'), {
        y: 10,
        opacity: 0,
        duration: 0.3,
        stagger: 0.03,
        ease: 'power2.out'
    });
}

function filterTrades() {
    const search = document.getElementById('search-trades').value.toLowerCase();
    const pair = document.getElementById('filter-pair').value;
    const result = document.getElementById('filter-result').value;
    const strategy = document.getElementById('filter-strategy').value;

    const filtered = allTrades.filter(trade => {
        const matchesSearch = !search || 
            (trade.pair && trade.pair.toLowerCase().includes(search)) ||
            (trade.notes && trade.notes.toLowerCase().includes(search));
        const matchesPair = !pair || trade.pair === pair;
        const matchesResult = !result || 
            (result === 'win' && trade.pnl > 0) ||
            (result === 'loss' && trade.pnl < 0);
        const matchesStrategy = !strategy || trade.strategy === strategy;

        return matchesSearch && matchesPair && matchesResult && matchesStrategy;
    });

    renderTrades(filtered);
}

function viewTrade(id) {
    const trade = allTrades.find(t => t.id === id);
    if (!trade) return;

    // Create a detail modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; max-height: 85vh; overflow-y: auto;">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                <i class="fas fa-times"></i>
            </button>
            <h2 style="margin-bottom: 4px;">Trade Details</h2>
            <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 20px;">${trade.pair} — ${trade.direction}</p>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
                <div style="background: var(--bg-input); padding: 12px; border-radius: var(--radius-sm);">
                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Entry</div>
                    <div style="font-weight: 700;">${trade.entryPrice}</div>
                </div>
                <div style="background: var(--bg-input); padding: 12px; border-radius: var(--radius-sm);">
                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Exit</div>
                    <div style="font-weight: 700;">${trade.exitPrice}</div>
                </div>
                <div style="background: var(--bg-input); padding: 12px; border-radius: var(--radius-sm);">
                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">P&L</div>
                    <div style="font-weight: 700; color: ${trade.pnl >= 0 ? 'var(--success)' : 'var(--danger)'};">
                        ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toLocaleString()}
                    </div>
                </div>
                <div style="background: var(--bg-input); padding: 12px; border-radius: var(--radius-sm);">
                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Pips</div>
                    <div style="font-weight: 700;">${trade.pips}</div>
                </div>
            </div>

            ${trade.notes ? `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px; font-weight: 600;">NOTES</div>
                    <div style="background: var(--bg-input); padding: 16px; border-radius: var(--radius-sm); font-size: 14px; line-height: 1.7;">${trade.notes}</div>
                </div>
            ` : ''}

            ${trade.images && trade.images.length > 0 ? `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px; font-weight: 600;">SCREENSHOTS</div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                        ${trade.images.map(url => `<img src="${url}" style="width: 100%; border-radius: var(--radius-sm); cursor: pointer;" onclick="window.open('${url}', '_blank')">`).join('')}
                    </div>
                </div>
            ` : ''}

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${trade.strategy ? `<span style="background: var(--bg-input); padding: 6px 12px; border-radius: 100px; font-size: 12px;">${trade.strategy}</span>` : ''}
                ${trade.session ? `<span style="background: var(--bg-input); padding: 6px 12px; border-radius: 100px; font-size: 12px;">${trade.session}</span>` : ''}
                ${trade.timeframe ? `<span style="background: var(--bg-input); padding: 6px 12px; border-radius: 100px; font-size: 12px;">${trade.timeframe}</span>` : ''}
                ${trade.emotion ? `<span style="background: var(--bg-input); padding: 6px 12px; border-radius: 100px; font-size: 12px;">Feeling: ${trade.emotion}</span>` : ''}
                ${trade.mistake && trade.mistake !== 'None' ? `<span style="background: rgba(231, 76, 60, 0.1); color: var(--danger); padding: 6px 12px; border-radius: 100px; font-size: 12px;">Mistake: ${trade.mistake}</span>` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    gsap.fromTo(modal.querySelector('.modal-content'),
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' }
    );
}

async function deleteTrade(id) {
    if (!confirm('Are you sure you want to delete this trade?')) return;

    try {
        await db.collection('trades').doc(id).delete();
        showToast('Trade deleted', 'success');
        loadTrades();
        
        // Refresh dashboard if on dashboard page
        if (typeof loadDashboardData === 'function') {
            loadDashboardData();
        }
    } catch(e) {
        console.error('Error deleting trade:', e);
        showToast('Error deleting trade', 'error');
    }
}

// Make functions global
window.openTradeModal = openTradeModal;
window.closeTradeModal = closeTradeModal;
window.selectMood = selectMood;
window.previewImages = previewImages;
window.removeImage = removeImage;
window.saveTrade = saveTrade;
window.viewTrade = viewTrade;
window.deleteTrade = deleteTrade;
