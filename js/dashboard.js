let equityChart, strategyChart, sessionChart;

document.addEventListener('DOMContentLoaded', () => {
    // Animate stats cards entrance
    gsap.from('.stat-card', {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out'
    });

    gsap.from('.content-card', {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.15,
        delay: 0.3,
        ease: 'power3.out'
    });

    // Initialize charts after a short delay to ensure DOM is ready
    setTimeout(() => {
        initCharts();
        loadDashboardData();
    }, 500);
});

function initCharts() {
    // Equity Curve Chart
    const equityCtx = document.getElementById('equityChart');
    if (equityCtx) {
        equityChart = new Chart(equityCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Account Balance',
                    data: [],
                    borderColor: '#00d4aa',
                    backgroundColor: 'rgba(0, 212, 170, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#00d4aa',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#12121a',
                        titleColor: '#fff',
                        bodyColor: '#a0a0b0',
                        borderColor: '#2a2a3e',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return '$' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false, color: '#2a2a3e' },
                        ticks: { color: '#6c6c7e', font: { size: 11 } }
                    },
                    y: {
                        grid: { color: '#2a2a3e' },
                        ticks: { 
                            color: '#6c6c7e', 
                            font: { size: 11 },
                            callback: function(value) {
                                return '$' + (value / 1000).toFixed(0) + 'k';
                            }
                        }
                    }
                }
            }
        });
    }

    // Strategy Chart
    const strategyCtx = document.getElementById('strategyChart');
    if (strategyCtx) {
        strategyChart = new Chart(strategyCtx, {
            type: 'doughnut',
            data: {
                labels: ['No Data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#2a2a3e'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#a0a0b0', font: { size: 12 }, padding: 16 }
                    }
                },
                cutout: '65%'
            }
        });
    }

    // Session Chart
    const sessionCtx = document.getElementById('sessionChart');
    if (sessionCtx) {
        sessionChart = new Chart(sessionCtx, {
            type: 'bar',
            data: {
                labels: ['London', 'NY', 'Asian', 'Overlap'],
                datasets: [{
                    label: 'Win Rate %',
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#00d4aa', '#6c5ce7', '#fdcb6e', '#e74c3c'],
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#a0a0b0', font: { size: 11 } }
                    },
                    y: {
                        grid: { color: '#2a2a3e' },
                        ticks: { color: '#6c6c7e', font: { size: 11 } },
                        max: 100
                    }
                }
            }
        });
    }
}

async function loadDashboardData() {
    if (!currentUser) return;

    try {
        // Load trades
        const tradesSnapshot = await db.collection('trades')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const trades = [];
        tradesSnapshot.forEach(doc => {
            trades.push({ id: doc.id, ...doc.data() });
        });

        // Update stats
        updateStats(trades);

        // Update recent trades table
        updateRecentTrades(trades.slice(0, 10));

        // Update equity curve
        updateEquityCurve(trades);

        // Update strategy chart
        updateStrategyChart(trades);

        // Update session chart
        updateSessionChart(trades);

        // Update consistency score
        updateConsistencyScore(trades);

        // Update rank badge
        if (userData && typeof renderRankBadge === 'function') {
            renderRankBadge('rank-badge-container', userData.stars || 0);
        }

        // Update sidebar mini rank
        if (userData && typeof renderMiniRank === 'function') {
            renderMiniRank('sidebar-rank', userData.stars || 0);
        }

    } catch(e) {
        console.error('Error loading dashboard:', e);
        showToast('Error loading dashboard data', 'error');
    }
}

function updateStats(trades) {
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.pnl > 0).length;
    const losses = trades.filter(t => t.pnl < 0).length;
    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0;

    // Calculate average R:R
    let totalRR = 0;
    let rrCount = 0;
    trades.forEach(t => {
        if (t.riskReward && t.riskReward > 0) {
            totalRR += t.riskReward;
            rrCount++;
        }
    });
    const avgRR = rrCount > 0 ? (totalRR / rrCount).toFixed(1) : 0;

    // Animate stat values
    animateValue('stat-pnl', totalPnl, '$');
    animateValue('stat-winrate', winRate, '', '%');
    animateValue('stat-trades', totalTrades, '');
    document.getElementById('stat-rr').textContent = '1:' + avgRR;

    // Update user stats in Firestore
    if (currentUser) {
        db.collection('users').doc(currentUser.uid).update({
            totalTrades,
            winCount: wins,
            lossCount: losses,
            totalPnl
        });
    }
}

function animateValue(id, value, prefix = '', suffix = '') {
    const el = document.getElementById(id);
    if (!el) return;

    const start = 0;
    const end = parseFloat(value);
    const duration = 1000;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const current = start + (end - start) * easeProgress;

        if (Number.isInteger(end)) {
            el.textContent = prefix + Math.round(current).toLocaleString() + suffix;
        } else {
            el.textContent = prefix + current.toFixed(1) + suffix;
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function updateRecentTrades(trades) {
    const tbody = document.getElementById('recent-trades-table');
    if (!tbody) return;

    if (trades.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 40px;">
                    <i class="fas fa-inbox" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
                    No trades logged yet. <a href="journal.html" style="color: var(--primary);">Log your first trade</a>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = trades.map(trade => {
        const status = trade.pnl > 0 ? 'win' : trade.pnl < 0 ? 'loss' : 'breakeven';
        const statusText = trade.pnl > 0 ? 'Win' : trade.pnl < 0 ? 'Loss' : 'BE';
        const date = trade.createdAt ? new Date(trade.createdAt.toDate()).toLocaleDateString() : 'N/A';
        const pnlClass = trade.pnl >= 0 ? 'positive' : 'negative';
        const pnlSign = trade.pnl >= 0 ? '+' : '';

        return `
            <tr>
                <td><strong>${trade.pair || 'N/A'}</strong></td>
                <td>${trade.direction || 'N/A'}</td>
                <td>${trade.entryPrice || 'N/A'}</td>
                <td>${trade.exitPrice || 'N/A'}</td>
                <td>${trade.pips || 0}</td>
                <td class="trade-pnl ${pnlClass}">${pnlSign}$${(trade.pnl || 0).toLocaleString()}</td>
                <td><span class="trade-status ${status}">${statusText}</span></td>
                <td>${date}</td>
            </tr>
        `;
    }).join('');

    // Animate rows
    gsap.from(tbody.querySelectorAll('tr'), {
        y: 10,
        opacity: 0,
        duration: 0.3,
        stagger: 0.05,
        ease: 'power2.out'
    });
}

function updateEquityCurve(trades) {
    if (!equityChart || trades.length === 0) return;

    // Sort by date
    const sortedTrades = [...trades].sort((a, b) => {
        const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
        return dateA - dateB;
    });

    let balance = 100000; // Starting balance
    const labels = [];
    const data = [];

    sortedTrades.forEach(trade => {
        balance += (trade.pnl || 0);
        const date = trade.createdAt ? new Date(trade.createdAt.toDate()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        labels.push(date);
        data.push(balance);
    });

    equityChart.data.labels = labels;
    equityChart.data.datasets[0].data = data;
    equityChart.update();
}

function updateStrategyChart(trades) {
    if (!strategyChart || trades.length === 0) return;

    const strategyStats = {};
    trades.forEach(trade => {
        const strategy = trade.strategy || 'Unknown';
        if (!strategyStats[strategy]) {
            strategyStats[strategy] = { wins: 0, total: 0 };
        }
        strategyStats[strategy].total++;
        if (trade.pnl > 0) strategyStats[strategy].wins++;
    });

    const labels = Object.keys(strategyStats);
    const data = labels.map(s => strategyStats[s].wins);
    const colors = ['#00d4aa', '#6c5ce7', '#fdcb6e', '#e74c3c', '#00b894', '#e17055'];

    strategyChart.data.labels = labels;
    strategyChart.data.datasets[0].data = data;
    strategyChart.data.datasets[0].backgroundColor = labels.map((_, i) => colors[i % colors.length]);
    strategyChart.update();
}

function updateSessionChart(trades) {
    if (!sessionChart || trades.length === 0) return;

    const sessionStats = { 'London': { wins: 0, total: 0 }, 'NY': { wins: 0, total: 0 }, 'Asian': { wins: 0, total: 0 }, 'Overlap': { wins: 0, total: 0 } };

    trades.forEach(trade => {
        const session = trade.session || 'London';
        if (sessionStats[session]) {
            sessionStats[session].total++;
            if (trade.pnl > 0) sessionStats[session].wins++;
        }
    });

    const data = Object.keys(sessionStats).map(s => {
        const stats = sessionStats[s];
        return stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;
    });

    sessionChart.data.datasets[0].data = data;
    sessionChart.update();
}

function updateConsistencyScore(trades) {
    if (trades.length === 0) return;

    const wins = trades.filter(t => t.pnl > 0).length;
    const losses = trades.filter(t => t.pnl < 0).length;
    const total = trades.length;

    // Calculate score components
    const winRateScore = total > 0 ? (wins / total) * 40 : 0; // 40 points for win rate

    // R:R adherence (trades with defined R:R)
    const rrTrades = trades.filter(t => t.riskReward && t.riskReward >= 1);
    const rrScore = total > 0 ? (rrTrades.length / total) * 30 : 0; // 30 points for R:R

    // Plan following (trades with no mistakes)
    const noMistakeTrades = trades.filter(t => !t.mistake || t.mistake === 'None');
    const planScore = total > 0 ? (noMistakeTrades.length / total) * 30 : 0; // 30 points for discipline

    const score = Math.round(winRateScore + rrScore + planScore);

    // Update circle
    const circle = document.getElementById('consistency-circle');
    const valueEl = document.getElementById('consistency-value');

    if (circle) {
        const circumference = 439.8;
        const offset = circumference - (score / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    }

    if (valueEl) {
        animateValue('consistency-value', score, '');
    }

    // Update score breakdown
    document.getElementById('score-wins').textContent = wins;
    document.getElementById('score-losses').textContent = losses;

    // Calculate current streak
    let streak = 0;
    for (let i = trades.length - 1; i >= 0; i--) {
        if (trades[i].pnl > 0) streak++;
        else break;
    }
    document.getElementById('score-streak').textContent = streak;

    // Update in Firestore
    if (currentUser) {
        db.collection('users').doc(currentUser.uid).update({
            consistencyScore: score,
            streakDays: streak
        });
    }
}

// Period filter for equity curve
document.getElementById('equity-period')?.addEventListener('change', async function() {
    const days = this.value === 'all' ? 9999 : parseInt(this.value);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const tradesSnapshot = await db.collection('trades')
        .where('userId', '==', currentUser.uid)
        .where('createdAt', '>=', cutoff)
        .orderBy('createdAt', 'asc')
        .get();

    const trades = [];
    tradesSnapshot.forEach(doc => trades.push({ id: doc.id, ...doc.data() }));
    updateEquityCurve(trades);
});
