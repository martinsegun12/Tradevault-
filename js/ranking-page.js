
document.addEventListener('DOMContentLoaded', () => {
    gsap.from('.content-card', {
        y: 30, opacity: 0, duration: 0.6, stagger: 0.15, ease: 'power3.out'
    });

    loadYourRank();
    renderRankTiers();
    loadRankingsLeaderboard('alltime');
    loadStarHistory();
});

async function loadYourRank() {
    if (!currentUser) return;

    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (!userDoc.exists) return;

        const data = userDoc.data();
        const stars = data.stars || 0;
        const rank = getRank(stars);
        const nextRank = getNextRank(stars);

        const container = document.getElementById('your-rank-display');
        if (!container) return;

        const progressInRank = stars - rank.minStars;
        const starsNeeded = nextRank ? nextRank.minStars - rank.minStars : 0;
        const progressPercent = starsNeeded > 0 ? (progressInRank / starsNeeded) * 100 : 100;

        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 30px; flex-wrap: wrap;">
                <div style="position: relative; width: 140px; height: 140px;">
                    <svg viewBox="0 0 140 140" style="transform: rotate(-90deg); width: 100%; height: 100%;">
                        <circle cx="70" cy="70" r="60" fill="none" stroke="var(--border)" stroke-width="8"/>
                        <circle cx="70" cy="70" r="60" fill="none" stroke="${rank.color}" stroke-width="8"
                                stroke-dasharray="377" stroke-dashoffset="${377 - (377 * progressPercent / 100)}"
                                stroke-linecap="round" style="transition: stroke-dashoffset 1s ease;"/>
                    </svg>
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                        <div style="font-size: 48px;">${rank.icon}</div>
                    </div>
                </div>
                <div style="flex: 1; min-width: 250px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <span style="font-size: 32px; font-weight: 800; color: ${rank.color};">${rank.name}</span>
                        <span style="background: ${rank.color}20; color: ${rank.color}; padding: 4px 14px; border-radius: 100px; font-size: 13px; font-weight: 700;">${rank.title}</span>
                    </div>
                    <div style="font-size: 16px; color: var(--text-secondary); margin-bottom: 16px;">
                        <strong style="color: var(--primary); font-size: 24px;">${stars}</strong> ⭐ total
                        ${nextRank ? `<span style="margin-left: 8px;">· ${nextRank.minStars - stars} more to ${nextRank.name}</span>` : '<span style="margin-left: 8px; color: var(--accent);">· Max Rank! 👑</span>'}
                    </div>
                    <div style="height: 10px; background: var(--border); border-radius: 5px; overflow: hidden; margin-bottom: 8px;">
                        <div style="height: 100%; width: ${progressPercent}%; background: ${rank.color}; border-radius: 5px; transition: width 0.8s ease;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted);">
                        <span>${rank.minStars} ⭐</span>
                        <span>${nextRank ? nextRank.minStars + ' ⭐' : 'MAX'}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 16px; text-align: center;">
                    <div style="background: var(--bg-input); padding: 16px 24px; border-radius: var(--radius-sm);">
                        <div style="font-size: 28px; font-weight: 800; color: var(--success);">${data.currentWinStreak || 0}</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Win Streak</div>
                    </div>
                    <div style="background: var(--bg-input); padding: 16px 24px; border-radius: var(--radius-sm);">
                        <div style="font-size: 28px; font-weight: 800; color: var(--accent);">${data.bestStreak || 0}</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Best Streak</div>
                    </div>
                    <div style="background: var(--bg-input); padding: 16px 24px; border-radius: var(--radius-sm);">
                        <div style="font-size: 28px; font-weight: 800; color: var(--secondary);">${data.totalTrades || 0}</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Total Trades</div>
                    </div>
                </div>
            </div>
        `;

        gsap.from(container.querySelectorAll('div > div'), {
            y: 20, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out'
        });

    } catch(e) {
        console.error('Error loading rank:', e);
    }
}

function renderRankTiers() {
    const container = document.getElementById('rank-tiers-grid');
    if (!container) return;

    const tiers = [
        { name: 'Bronze', stars: '0-9', color: '#cd7f32', icon: '🥉' },
        { name: 'Silver', stars: '10-24', color: '#c0c0c0', icon: '🥈' },
        { name: 'Gold', stars: '25-49', color: '#ffd700', icon: '🥇' },
        { name: 'Platinum', stars: '50-79', color: '#e5e4e2', icon: '💎' },
        { name: 'Diamond', stars: '80-119', color: '#b9f2ff', icon: '💠' },
        { name: 'Master', stars: '120-179', color: '#9b59b6', icon: '👑' },
        { name: 'Grandmaster', stars: '180+', color: '#ff6b6b', icon: '🔥' }
    ];

    container.innerHTML = tiers.map(tier => `
        <div style="text-align: center; padding: 16px 8px; background: var(--bg-input); border-radius: var(--radius-sm); border: 1px solid var(--border); transition: all 0.3s;" 
             onmouseover="this.style.borderColor='${tier.color}'; this.style.transform='translateY(-4px)'" 
             onmouseout="this.style.borderColor='var(--border)'; this.style.transform='translateY(0)'">
            <div style="font-size: 32px; margin-bottom: 8px;">${tier.icon}</div>
            <div style="font-weight: 700; color: ${tier.color}; font-size: 14px; margin-bottom: 4px;">${tier.name}</div>
            <div style="font-size: 12px; color: var(--text-muted);">${tier.stars} ⭐</div>
        </div>
    `).join('');
}

async function loadRankingsLeaderboard(timeframe) {
    const container = document.getElementById('rankings-leaderboard');
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
                <div style="text-align: center; padding: 60px 40px; color: var(--text-muted);">
                    <i class="fas fa-trophy" style="font-size: 48px; margin-bottom: 16px; display: block; opacity: 0.5;"></i>
                    <p style="font-size: 16px;">No rankings yet</p>
                    <p style="font-size: 14px; margin-top: 8px;">Be the first to climb the ranks!</p>
                </div>
            `;
            return;
        }

        const medals = ['🥇', '🥈', '🥉'];

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${leaderboard.map((user, index) => {
                    const rankInfo = getRank(user.stars);
                    const isYou = user.name === (currentUser?.displayName || 'Trader');
                    const bgStyle = isYou ? 'background: rgba(0, 212, 170, 0.08); border: 1px solid rgba(0, 212, 170, 0.3);' : 'background: var(--bg-input); border: 1px solid var(--border);';

                    return `
                        <div style="display: flex; align-items: center; gap: 16px; padding: 16px 20px; border-radius: var(--radius-sm); ${bgStyle} transition: all 0.3s;"
                             onmouseover="this.style.transform='translateX(8px)'" onmouseout="this.style.transform='translateX(0)'">
                            <div style="width: 40px; text-align: center; font-size: ${index < 3 ? '28px' : '18px'}; font-weight: ${index < 3 ? '400' : '700'}; color: ${index < 3 ? 'inherit' : 'var(--text-muted)'};">
                                ${index < 3 ? medals[index] : (index + 1)}
                            </div>
                            <div style="width: 48px; height: 48px; border-radius: 50%; background: ${rankInfo.color}20; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                                ${rankInfo.icon}
                            </div>
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-weight: 700; font-size: 15px;">${user.name}</span>
                                    ${isYou ? '<span style="background: var(--primary); color: white; font-size: 10px; padding: 2px 8px; border-radius: 100px; font-weight: 700;">YOU</span>' : ''}
                                </div>
                                <div style="font-size: 12px; color: ${rankInfo.color}; font-weight: 600; margin-top: 2px;">${rankInfo.name} · ${rankInfo.title}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 24px; font-weight: 800; color: var(--primary);">${user.stars} <span style="font-size: 16px;">⭐</span></div>
                                <div style="font-size: 11px; color: var(--text-muted);">${user.totalTrades || 0} trades</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        gsap.from(container.querySelectorAll('div > div'), {
            y: 15, opacity: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out'
        });

    } catch(e) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fas fa-exclamation-circle" style="font-size: 24px; margin-bottom: 12px; display: block;"></i>
                <p>Error loading leaderboard</p>
            </div>
        `;
    }
}

async function loadStarHistory() {
    if (!currentUser) return;

    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (!userDoc.exists) return;

        const data = userDoc.data();
        const history = data.starHistory || [];
        const container = document.getElementById('star-history-list');

        if (!container) return;

        if (history.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fas fa-history" style="font-size: 32px; margin-bottom: 12px; display: block; opacity: 0.5;"></i>
                    <p>No star history yet</p>
                    <p style="font-size: 13px; margin-top: 4px;">Start trading to earn stars!</p>
                </div>
            `;
            return;
        }

        // Show last 10 entries
        const recentHistory = history.slice(-10).reverse();

        container.innerHTML = recentHistory.map(entry => {
            const isGain = entry.change > 0;
            const color = isGain ? 'var(--success)' : entry.change < 0 ? 'var(--danger)' : 'var(--text-muted)';
            const sign = isGain ? '+' : '';
            const icon = isGain ? '▲' : entry.change < 0 ? '▼' : '●';
            const date = entry.date ? new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';

            return `
                <div style="display: flex; align-items: center; gap: 16px; padding: 12px 16px; border-bottom: 1px solid var(--border); transition: background 0.2s;"
                     onmouseover="this.style.background='var(--bg-card-hover)'" onmouseout="this.style.background='transparent'">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: ${color}15; display: flex; align-items: center; justify-content: center; color: ${color}; font-size: 14px; font-weight: 700;">
                        ${icon}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 14px;">${entry.reason || 'Trade completed'}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${date}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 700; color: ${color}; font-size: 16px;">${sign}${entry.change} ⭐</div>
                        <div style="font-size: 12px; color: var(--text-muted);">Total: ${entry.totalStars} ⭐</div>
                    </div>
                </div>
            `;
        }).join('');

    } catch(e) {
        console.error('Error loading star history:', e);
    }
}

window.loadYourRank = loadYourRank;
window.renderRankTiers = renderRankTiers;
window.loadRankingsLeaderboard = loadRankingsLeaderboard;
window.loadStarHistory = loadStarHistory;
