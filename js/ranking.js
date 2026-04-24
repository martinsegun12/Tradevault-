
// ========== TRADE VAULT RANKING SYSTEM ==========
// Like Free Fire but for trading discipline

const RANK_TIERS = [
    { name: 'Bronze', minStars: 0, maxStars: 9, color: '#cd7f32', icon: '🥉', title: 'New Trader' },
    { name: 'Silver', minStars: 10, maxStars: 24, color: '#c0c0c0', icon: '🥈', title: 'Developing Trader' },
    { name: 'Gold', minStars: 25, maxStars: 49, color: '#ffd700', icon: '🥇', title: 'Consistent Trader' },
    { name: 'Platinum', minStars: 50, maxStars: 79, color: '#e5e4e2', icon: '💎', title: 'Skilled Trader' },
    { name: 'Diamond', minStars: 80, maxStars: 119, color: '#b9f2ff', icon: '💠', title: 'Professional Trader' },
    { name: 'Master', minStars: 120, maxStars: 179, color: '#9b59b6', icon: '👑', title: 'Elite Trader' },
    { name: 'Grandmaster', minStars: 180, maxStars: 99999, color: '#ff6b6b', icon: '🔥', title: 'Legendary Trader' }
];

// Calculate stars gained/lost from a trade
function calculateStarChange(trade, winStreak, lossStreak) {
    let stars = 0;
    const pnl = trade.pnl || 0;
    const rr = trade.riskReward ? parseFloat(trade.riskReward.split(':')[1]) : 0;
    const mistake = trade.mistake || 'None';
    const emotion = trade.emotion || '';

    // WIN SCENARIOS
    if (pnl > 0) {
        stars += 1; // Base win = +1 star

        // Bonus for good R:R
        if (rr >= 3) stars += 2;      // R:R 1:3+ = +2 bonus
        else if (rr >= 2) stars += 1;  // R:R 1:2+ = +1 bonus

        // Bonus for discipline
        if (mistake === 'None') stars += 1;

        // Streak bonuses
        if (winStreak >= 10) stars += 5;
        else if (winStreak >= 5) stars += 3;
        else if (winStreak >= 3) stars += 1;

    // LOSS SCENARIOS
    } else if (pnl < 0) {
        stars -= 1; // Base loss = -1 star

        // Penalty for mistakes
        if (mistake !== 'None') stars -= 1;

        // Heavy penalty for revenge trading
        if (mistake === 'Revenge Trading' || emotion === 'revenge') stars -= 1;

        // Streak penalties
        if (lossStreak >= 5) stars -= 2;
        else if (lossStreak >= 3) stars -= 1;
    }
    // Break-even = 0 stars

    return stars;
}

// Get current rank based on total stars
function getRank(totalStars) {
    for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
        if (totalStars >= RANK_TIERS[i].minStars) {
            return RANK_TIERS[i];
        }
    }
    return RANK_TIERS[0];
}

// Get next rank info
function getNextRank(totalStars) {
    const currentRank = getRank(totalStars);
    const currentIndex = RANK_TIERS.indexOf(currentRank);

    if (currentIndex < RANK_TIERS.length - 1) {
        return RANK_TIERS[currentIndex + 1];
    }
    return null; // Already Grandmaster
}

// Check if rank changed and trigger animation
function checkRankChange(oldStars, newStars) {
    const oldRank = getRank(oldStars);
    const newRank = getRank(newStars);

    if (oldRank.name !== newRank.name) {
        if (newStars > oldStars) {
            return { type: 'RANK_UP', from: oldRank, to: newRank };
        } else {
            return { type: 'RANK_DOWN', from: oldRank, to: newRank };
        }
    }
    return null;
}

// Update user ranking after a trade
async function updateRankingAfterTrade(trade) {
    if (!currentUser) return;

    const userRef = db.collection('users').doc(currentUser.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return;

    const userData = userDoc.data();
    const currentStars = userData.stars || 0;
    const winStreak = userData.currentWinStreak || 0;
    const lossStreak = userData.currentLossStreak || 0;

    // Calculate star change
    const starChange = calculateStarChange(trade, winStreak, lossStreak);
    const newStars = Math.max(0, currentStars + starChange); // Can't go below 0

    // Check for rank change
    const rankChange = checkRankChange(currentStars, newStars);

    // Build star history entry
    const historyEntry = {
        change: starChange,
        totalStars: newStars,
        reason: trade.pnl > 0 
            ? `Win on ${trade.pair} (+${trade.pnl.toFixed(0)}₦)` 
            : trade.pnl < 0 
                ? `Loss on ${trade.pair} (${trade.pnl.toFixed(0)}₦)`
                : `Break-even on ${trade.pair}`,
        date: new Date().toISOString(),
        tradeId: trade.id || null
    };

    // Update user data
    const updateData = {
        stars: newStars,
        rank: getRank(newStars).name,
        rankColor: getRank(newStars).color,
        lastStarChange: starChange,
        lastTradeAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Add to star history array (keep last 100 entries)
    const currentHistory = userData.starHistory || [];
    currentHistory.push(historyEntry);
    if (currentHistory.length > 100) currentHistory.shift();
    updateData.starHistory = currentHistory;

    await userRef.update(updateData);

    // Show notifications
    if (starChange > 0) {
        showToast(`⭐ +${starChange} stars! Total: ${newStars}`, 'success');
    } else if (starChange < 0) {
        showToast(`⭐ ${starChange} stars. Total: ${newStars}`, 'warning');
    }

    // Rank up/down animation
    if (rankChange) {
        if (rankChange.type === 'RANK_UP') {
            showRankUpAnimation(rankChange.to);
        } else {
            showRankDownAnimation(rankChange.to);
        }
    }

    return { newStars, starChange, rankChange };
}

// GSAP Rank Up Animation
function showRankUpAnimation(newRank) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 9999;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
    `;
    overlay.innerHTML = `
        <div class="rank-up-content" style="text-align: center;">
            <div style="font-size: 80px; margin-bottom: 20px;">${newRank.icon}</div>
            <div style="font-size: 18px; color: #a0a0b0; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 3px;">Rank Up!</div>
            <div style="font-size: 48px; font-weight: 800; color: ${newRank.color}; margin-bottom: 10px;">${newRank.name}</div>
            <div style="font-size: 20px; color: #fff;">${newRank.title}</div>
        </div>
    `;
    document.body.appendChild(overlay);

    // GSAP animation
    const tl = gsap.timeline();
    tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3 })
      .fromTo('.rank-up-content', 
          { scale: 0.5, opacity: 0, rotation: -10 },
          { scale: 1, opacity: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.7)' }
      )
      .to('.rank-up-content', { scale: 1.1, duration: 0.2, yoyo: true, repeat: 1 })
      .to(overlay, { opacity: 0, duration: 0.3, delay: 1.5, onComplete: () => overlay.remove() });
}

// GSAP Rank Down Animation
function showRankDownAnimation(newRank) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(231, 76, 60, 0.2); z-index: 9999;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
    `;
    overlay.innerHTML = `
        <div class="rank-down-content" style="text-align: center;">
            <div style="font-size: 60px; margin-bottom: 20px;">⚠️</div>
            <div style="font-size: 18px; color: #e74c3c; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 3px;">Rank Down</div>
            <div style="font-size: 36px; font-weight: 800; color: ${newRank.color}; margin-bottom: 10px;">${newRank.name}</div>
            <div style="font-size: 16px; color: #a0a0b0;">Review your strategy and come back stronger</div>
        </div>
    `;
    document.body.appendChild(overlay);

    gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    gsap.fromTo('.rank-down-content', 
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
    );
    gsap.to(overlay, { opacity: 0, duration: 0.3, delay: 2, onComplete: () => overlay.remove() });
}

// Render rank badge
function renderRankBadge(containerId, totalStars) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const rank = getRank(totalStars);
    const nextRank = getNextRank(totalStars);
    const progressInRank = totalStars - rank.minStars;
    const starsNeeded = nextRank ? nextRank.minStars - rank.minStars : 0;
    const progressPercent = starsNeeded > 0 ? (progressInRank / starsNeeded) * 100 : 100;

    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 20px; padding: 24px; background: var(--bg-card); border-radius: var(--radius); border: 1px solid var(--border);">
            <div style="position: relative; width: 100px; height: 100px;">
                <svg viewBox="0 0 100 100" style="transform: rotate(-90deg);">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" stroke-width="6"/>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="${rank.color}" stroke-width="6"
                            stroke-dasharray="263.9" stroke-dashoffset="${263.9 - (263.9 * progressPercent / 100)}"
                            stroke-linecap="round"/>
                </svg>
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 40px;">${rank.icon}</div>
            </div>
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                    <span style="font-size: 24px; font-weight: 800; color: ${rank.color};">${rank.name}</span>
                    <span style="font-size: 13px; color: var(--text-muted); background: var(--bg-input); padding: 2px 10px; border-radius: 100px;">${rank.title}</span>
                </div>
                <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 12px;">
                    ${totalStars} ⭐ total
                    ${nextRank ? ` · ${nextRank.minStars - totalStars} more to ${nextRank.name}` : ' · Max Rank Achieved!'}
                </div>
                <div style="height: 8px; background: var(--border); border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; width: ${progressPercent}%; background: ${rank.color}; border-radius: 4px; transition: width 0.6s ease;"></div>
                </div>
            </div>
        </div>
    `;
}

// Render mini rank (for sidebar)
function renderMiniRank(containerId, totalStars) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const rank = getRank(totalStars);
    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: ${rank.color}15; border-radius: var(--radius-sm); border: 1px solid ${rank.color}30;">
            <span style="font-size: 20px;">${rank.icon}</span>
            <div>
                <div style="font-size: 12px; font-weight: 700; color: ${rank.color};">${rank.name}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${totalStars} ⭐</div>
            </div>
        </div>
    `;
}

// Leaderboard (optional feature)
async function loadLeaderboard(timeframe = 'weekly') {
    try {
        const cutoff = new Date();
        if (timeframe === 'weekly') cutoff.setDate(cutoff.getDate() - 7);
        else if (timeframe === 'monthly') cutoff.setMonth(cutoff.getMonth() - 1);

        const snapshot = await db.collection('users')
            .where('stars', '>', 0)
            .orderBy('stars', 'desc')
            .limit(20)
            .get();

        const leaderboard = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            leaderboard.push({
                name: data.name || 'Trader',
                stars: data.stars || 0,
                rank: data.rank || 'Bronze',
                rankColor: data.rankColor || '#cd7f32'
            });
        });

        return leaderboard;
    } catch(e) {
        console.error('Error loading leaderboard:', e);
        return [];
    }
}

// Make functions global
window.calculateStarChange = calculateStarChange;
window.getRank = getRank;
window.getNextRank = getNextRank;
window.updateRankingAfterTrade = updateRankingAfterTrade;
window.renderRankBadge = renderRankBadge;
window.renderMiniRank = renderMiniRank;
window.loadLeaderboard = loadLeaderboard;
