
let mistakesChart, emotionsChart, monthlyChart;

document.addEventListener('DOMContentLoaded', () => {
    gsap.from('.content-card', {
        y: 30, opacity: 0, duration: 0.6, stagger: 0.15, ease: 'power3.out'
    });

    setTimeout(() => {
        initAnalyticsCharts();
        loadAnalyticsData();
    }, 500);
});

function initAnalyticsCharts() {
    // Mistakes Chart
    const mistakesCtx = document.getElementById('mistakesCanvas');
    if (mistakesCtx) {
        mistakesChart = new Chart(mistakesCtx, {
            type: 'bar',
            data: { labels: [], datasets: [{ data: [], backgroundColor: '#e74c3c', borderRadius: 6 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#a0a0b0', font: { size: 11 } } },
                    y: { grid: { color: '#2a2a3e' }, ticks: { color: '#6c6c7e', font: { size: 11 } } }
                }
            }
        });
    }

    // Emotions Chart
    const emotionsCtx = document.getElementById('emotionsCanvas');
    if (emotionsCtx) {
        emotionsChart = new Chart(emotionsCtx, {
            type: 'doughnut',
            data: { labels: [], datasets: [{ data: [], backgroundColor: ['#e74c3c', '#f39c12', '#fdcb6e', '#6c5ce7', '#00d4aa'], borderWidth: 0 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: '#a0a0b0', font: { size: 12 } } } },
                cutout: '60%'
            }
        });
    }

    // Monthly Chart
    const monthlyCtx = document.getElementById('monthlyChart');
    if (monthlyCtx) {
        monthlyChart = new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    { label: 'Wins', data: [], backgroundColor: '#00d4aa', borderRadius: 4 },
                    { label: 'Losses', data: [], backgroundColor: '#e74c3c', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#a0a0b0' } } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#a0a0b0' } },
                    y: { grid: { color: '#2a2a3e' }, ticks: { color: '#6c6c7e' } }
                }
            }
        });
    }
}

async function loadAnalyticsData() {
    if (!currentUser) return;

    try {
        const snapshot = await db.collection('trades')
            .where('userId', '==', currentUser.uid)
            .get();

        const trades = [];
        snapshot.forEach(doc => trades.push(doc.data()));

        updateConsistencyScore(trades);
        updateStrategyTable(trades);
        updateSessionHeatmap(trades);
        updateBadSessionAnalysis(trades);
        updateMonthlyChart(trades);

    } catch(e) {
        console.error('Error loading analytics:', e);
    }
}

function updateConsistencyScore(trades) {
    if (trades.length === 0) return;

    const wins = trades.filter(t => t.pnl > 0).length;
    const total = trades.length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;

    const rrTrades = trades.filter(t => t.riskReward && parseFloat(t.riskReward.split(':')[1]) >= 1);
    const rrScore = total > 0 ? (rrTrades.length / total) * 100 : 0;

    const noMistakeTrades = trades.filter(t => !t.mistake || t.mistake === 'None');
    const disciplineScore = total > 0 ? (noMistakeTrades.length / total) * 100 : 0;

    const winRatePoints = (winRate / 100) * 40;
    const rrPoints = (rrScore / 100) * 30;
    const disciplinePoints = (disciplineScore / 100) * 30;
    const totalScore = Math.round(winRatePoints + rrPoints + disciplinePoints);

    // Update circle
    const circle = document.getElementById('analytics-score-circle');
    if (circle) {
        const circumference = 534;
        const offset = circumference - (totalScore / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    }

    document.getElementById('analytics-score').textContent = totalScore;
    document.getElementById('score-winrate').textContent = winRate.toFixed(1) + '%';
    document.getElementById('score-rr').textContent = rrScore.toFixed(1) + '%';
    document.getElementById('score-discipline').textContent = disciplineScore.toFixed(1) + '%';

    document.getElementById('bar-winrate').style.width = winRate + '%';
    document.getElementById('bar-rr').style.width = rrScore + '%';
    document.getElementById('bar-discipline').style.width = disciplineScore + '%';
}

function updateStrategyTable(trades) {
    const strategyStats = {};

    trades.forEach(trade => {
        const strategy = trade.strategy || 'Unknown';
        if (!strategyStats[strategy]) {
            strategyStats[strategy] = { total: 0, wins: 0, losses: 0, totalPnl: 0 };
        }
        strategyStats[strategy].total++;
        if (trade.pnl > 0) strategyStats[strategy].wins++;
        else if (trade.pnl < 0) strategyStats[strategy].losses++;
        strategyStats[strategy].totalPnl += trade.pnl || 0;
    });

    const tbody = document.querySelector('#strategy-table tbody');
    if (!tbody) return;

    const sortedStrategies = Object.entries(strategyStats)
        .sort((a, b) => b[1].totalPnl - a[1].totalPnl);

    if (sortedStrategies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">No data available</td></tr>';
        return;
    }

    tbody.innerHTML = sortedStrategies.map(([name, stats]) => {
        const winRate = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0;
        const avgPnl = stats.total > 0 ? (stats.totalPnl / stats.total).toFixed(0) : 0;
        const pnlColor = stats.totalPnl >= 0 ? 'var(--success)' : 'var(--danger)';
        const pnlSign = stats.totalPnl >= 0 ? '+' : '';

        return `
            <tr>
                <td><strong>${name}</strong></td>
                <td>${stats.total}</td>
                <td style="color: var(--success); font-weight: 600;">${stats.wins}</td>
                <td style="color: var(--danger); font-weight: 600;">${stats.losses}</td>
                <td>${winRate}%</td>
                <td>₦${avgPnl}</td>
                <td style="color: ${pnlColor}; font-weight: 700;">${pnlSign}₦${stats.totalPnl.toLocaleString()}</td>
            </tr>
        `;
    }).join('');
}

function updateSessionHeatmap(trades) {
    const grid = document.getElementById('session-heatmap');
    if (!grid) return;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const sessions = ['London', 'NY', 'Asian', 'Overlap'];

    // Calculate P&L for each day-session combination
    const heatmapData = {};
    days.forEach(day => {
        heatmapData[day] = {};
        sessions.forEach(session => {
            heatmapData[day][session] = { pnl: 0, count: 0 };
        });
    });

    trades.forEach(trade => {
        if (trade.createdAt) {
            const date = trade.createdAt.toDate ? trade.createdAt.toDate() : new Date(trade.createdAt);
            const dayIndex = date.getDay();
            const dayName = days[dayIndex === 0 ? 6 : dayIndex - 1];
            const session = trade.session || 'London';

            if (heatmapData[dayName] && heatmapData[dayName][session]) {
                heatmapData[dayName][session].pnl += trade.pnl || 0;
                heatmapData[dayName][session].count++;
            }
        }
    });

    // Find max absolute P&L for normalization
    let maxPnl = 0;
    days.forEach(day => {
        sessions.forEach(session => {
            maxPnl = Math.max(maxPnl, Math.abs(heatmapData[day][session].pnl));
        });
    });

    // Generate heatmap cells
    grid.innerHTML = '';
    sessions.forEach(session => {
        days.forEach(day => {
            const data = heatmapData[day][session];
            const intensity = maxPnl > 0 ? Math.abs(data.pnl) / maxPnl : 0;

            let bgColor;
            if (data.count === 0) {
                bgColor = '#1a1a2e';
            } else if (data.pnl > 0) {
                bgColor = `rgba(0, 212, 170, ${0.2 + intensity * 0.8})`;
            } else {
                bgColor = `rgba(231, 76, 60, ${0.2 + intensity * 0.8})`;
            }

            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            cell.style.background = bgColor;
            cell.style.color = data.count === 0 ? '#3a3a4e' : '#fff';
            cell.title = `${day} ${session}: ${data.count} trades, P&L ₦${data.pnl.toLocaleString()}`;
            cell.textContent = data.count > 0 ? data.count : '';
            grid.appendChild(cell);
        });
    });
}

function updateBadSessionAnalysis(trades) {
    // Mistakes analysis
    const mistakeCounts = {};
    const emotionCounts = {};

    trades.forEach(trade => {
        if (trade.mistake && trade.mistake !== 'None') {
            mistakeCounts[trade.mistake] = (mistakeCounts[trade.mistake] || 0) + 1;
        }
        if (trade.emotion && trade.pnl < 0) {
            emotionCounts[trade.emotion] = (emotionCounts[trade.emotion] || 0) + 1;
        }
    });

    // Update mistakes chart
    if (mistakesChart) {
        const sortedMistakes = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
        mistakesChart.data.labels = sortedMistakes.map(m => m[0]);
        mistakesChart.data.datasets[0].data = sortedMistakes.map(m => m[1]);
        mistakesChart.update();
    }

    // Update emotions chart
    if (emotionsChart) {
        emotionsChart.data.labels = Object.keys(emotionCounts);
        emotionsChart.data.datasets[0].data = Object.values(emotionCounts);
        emotionsChart.update();
    }

    // Red flags
    const redFlagsDiv = document.getElementById('red-flags');
    if (!redFlagsDiv) return;

    const flags = [];

    // Check for revenge trading
    const losingTrades = trades.filter(t => t.pnl < 0);
    const consecutiveLosses = [];
    let currentStreak = 0;

    for (let i = trades.length - 1; i >= 0; i--) {
        if (trades[i].pnl < 0) currentStreak++;
        else break;
    }

    if (currentStreak >= 3) {
        flags.push({
            icon: 'exclamation-triangle',
            color: 'var(--danger)',
            title: 'Losing Streak Detected',
            desc: `You've had ${currentStreak} consecutive losses. Consider taking a break.`
        });
    }

    // Check for overtrading
    const today = new Date().toDateString();
    const todayTrades = trades.filter(t => {
        if (!t.createdAt) return false;
        const date = t.createdAt.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        return date.toDateString() === today;
    });

    if (todayTrades.length > 5) {
        flags.push({
            icon: 'chart-line',
            color: 'var(--warning)',
            title: 'Overtrading Alert',
            desc: `You've placed ${todayTrades.length} trades today. Quality over quantity!`
        });
    }

    // Check for revenge trading pattern
    const revengeTrades = trades.filter(t => t.mistake === 'Revenge Trading');
    if (revengeTrades.length >= 3) {
        flags.push({
            icon: 'angry',
            color: 'var(--danger)',
            title: 'Revenge Trading Pattern',
            desc: `${revengeTrades.length} revenge trades detected. Stick to your plan!`
        });
    }

    // Check for no stop loss
    const noSLTrades = trades.filter(t => t.mistake === 'No SL');
    if (noSLTrades.length >= 2) {
        flags.push({
            icon: 'shield-alt',
            color: 'var(--danger)',
            title: 'Risk Management Issue',
            desc: `${noSLTrades.length} trades without stop loss. Always use a stop!`
        });
    }

    if (flags.length === 0) {
        redFlagsDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; padding: 16px; background: rgba(0, 184, 148, 0.1); border-radius: var(--radius-sm); border: 1px solid rgba(0, 184, 148, 0.2);">
                <i class="fas fa-check-circle" style="color: var(--success); font-size: 20px;"></i>
                <div>
                    <div style="font-weight: 600; color: var(--success);">Great Job!</div>
                    <div style="font-size: 13px; color: var(--text-secondary);">No red flags detected. Keep trading with discipline.</div>
                </div>
            </div>
        `;
    } else {
        redFlagsDiv.innerHTML = flags.map(flag => `
            <div style="display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--bg-input); border-radius: var(--radius-sm); border-left: 3px solid ${flag.color};">
                <i class="fas fa-${flag.icon}" style="color: ${flag.color}; font-size: 20px;"></i>
                <div>
                    <div style="font-weight: 600;">${flag.title}</div>
                    <div style="font-size: 13px; color: var(--text-secondary);">${flag.desc}</div>
                </div>
            </div>
        `).join('');
    }

    gsap.from(redFlagsDiv.children, {
        x: -20, opacity: 0, duration: 0.4, stagger: 0.1, ease: 'power2.out'
    });
}

function updateMonthlyChart(trades) {
    if (!monthlyChart) return;

    const monthlyData = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    trades.forEach(trade => {
        if (trade.createdAt) {
            const date = trade.createdAt.toDate ? trade.createdAt.toDate() : new Date(trade.createdAt);
            const key = months[date.getMonth()];

            if (!monthlyData[key]) {
                monthlyData[key] = { wins: 0, losses: 0 };
            }

            if (trade.pnl > 0) monthlyData[key].wins++;
            else if (trade.pnl < 0) monthlyData[key].losses++;
        }
    });

    const labels = Object.keys(monthlyData);
    const wins = labels.map(m => monthlyData[m].wins);
    const losses = labels.map(m => monthlyData[m].losses);

    monthlyChart.data.labels = labels;
    monthlyChart.data.datasets[0].data = wins;
    monthlyChart.data.datasets[1].data = losses;
    monthlyChart.update();
}
