// ==========================================
// CHART CONFIGURATIONS
// Revenue and rating charts setup
// ==========================================

import { AppState } from './config.js';

/**
 * Initialize revenue chart with nebula styling
 * @param {Array} data - Revenue data points
 */
export function initRevenueChart(data) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    if (AppState.revenueChart) AppState.revenueChart.destroy();
    
    AppState.revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Revenue',
                data: data || [45000, 62000, 38000, 55000],
                borderColor: '#0EA5E9',
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#A855F7',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#0EA5E9',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'rgba(255,255,255,0.7)',
                        callback: function(value) { return '₹' + value/1000 + 'k'; }
                    },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: 'rgba(255,255,255,0.7)' },
                    grid: { display: false }
                }
            }
        }
    });
}

/**
 * Initialize teacher rating chart with nebula design
 * @param {Array} ratingsData - Rating data points
 */
export function initTeacherRatingChart(ratingsData) {
    const ctx = document.getElementById('teacherRatingChart');
    if (!ctx) return;
    
    if (AppState.teacherRatingChart) AppState.teacherRatingChart.destroy();
    
    const data = ratingsData || [4.2, 4.5, 4.3, 4.7, 4.6, 4.8, 4.5];
    
    AppState.teacherRatingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Rating',
                data: data,
                borderColor: '#0EA5E9',
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(14, 165, 233, 0.4)');
                    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.1)');
                    return gradient;
                },
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#A855F7',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                        label: function(context) {
                            return '⭐ ' + context.parsed.y + ' / 5.0';
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 5,
                    ticks: {
                        color: 'rgba(255,255,255,0.7)',
                        stepSize: 1
                    },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: 'rgba(255,255,255,0.7)' },
                    grid: { display: false }
                }
            }
        }
    });
}