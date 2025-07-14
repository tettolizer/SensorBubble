// ===================================================================================
// SENSOR DASHBOARD CONFIGURATION
// ===================================================================================
const THINGSPEAK_CHANNEL_ID = '2577520';
const THINGSPEAK_READ_API_KEY = '6KA9LPUYTB52DPCR';
const UPDATE_INTERVAL = 20000; 
const HISTORY_RESULTS = 50;

// ===================================================================================
// DOM ELEMENT REFERENCES
// ===================================================================================
const statusTextEl = document.getElementById('status-text');
const lastUpdatedEl = document.getElementById('last-updated');
const loadingSpinnerEl = document.getElementById('loading-spinner');
const longitudeEl = document.getElementById('longitude-val');
const latitudeEl = document.getElementById('latitude-val');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const filterButton = document.getElementById('filter-button');
const resetButton = document.getElementById('reset-button');
const filterContainer = document.getElementById('filter-container');

// ===================================================================================
// GLOBAL STATE
// ===================================================================================
let liveUpdateIntervalId = null;
let map;
let mapMarker = null;
let historyPath = null;
let historyPointsGroup = null; // Layer group for historical points
let temperatureChart, humidityChart, gasChart, accelerometerChart;

// ===================================================================================
// MAP & CHART INITIALIZATION
// ===================================================================================
function initializeMap() {
    map = L.map('map', { zoomControl: false }).setView([7.2906, 80.6337], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
}

// Creates a single-line chart.
function createChart(canvasId, label, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 150);
    gradient.addColorStop(0, `${color}30`);
    gradient.addColorStop(1, `${color}00`);

    return new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [{ label, data: [], borderColor: color, backgroundColor: gradient, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 6, borderWidth: 2 }] },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { 
                x: { display: false }, 
                y: { display: true, beginAtZero: true }
            }, 
            plugins: { 
                legend: { display: false }, 
                tooltip: { mode: 'index', intersect: false } 
            } 
        }
    });
}

// Creates a multi-line chart specifically for the accelerometer
function createMultiLineChart(canvasId) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'X-Axis', data: [], borderColor: '#ef4444', fill: false, tension: 0.4, pointRadius: 0, borderWidth: 2 },
                { label: 'Y-Axis', data: [], borderColor: '#22c55e', fill: false, tension: 0.4, pointRadius: 0, borderWidth: 2 },
                { label: 'Z-Axis', data: [], borderColor: '#3b82f6', fill: false, tension: 0.4, pointRadius: 0, borderWidth: 2 },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { display: false },
                y: { display: true }
            },
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: { mode: 'index', intersect: false }
            }
        }
    });
}


function initializeCharts() {
    temperatureChart = createChart('temperatureChart', 'Temperature', '#ef4444');
    humidityChart = createChart('humidityChart', 'Humidity', '#22c55e');
    gasChart = createChart('gasChart', 'Gas Level', '#8b5cf6');
    accelerometerChart = createMultiLineChart('accelerometerChart');
}

// ===================================================================================
// CORE LOGIC
// ===================================================================================
async function fetchDataAndUpdateDashboard(options = {}) {
    if (THINGSPEAK_CHANNEL_ID === 'YOUR_CHANNEL_ID' || THINGSPEAK_READ_API_KEY === 'YOUR_READ_API_KEY') {
        runDemoMode();
        return;
    }

    loadingSpinnerEl.style.display = 'block';
    let apiUrl = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_READ_API_KEY}`;

    if (options.start && options.end) {
        apiUrl += `&start=${options.start}&end=${options.end}`;
        statusTextEl.textContent = 'Historical Data';
        statusTextEl.className = 'text-blue-500';
    } else {
        apiUrl += `&results=${HISTORY_RESULTS}`;
        statusTextEl.textContent = 'Fetching Live Data...';
        statusTextEl.className = 'text-yellow-500';
    }

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`ThingSpeak API error! Status: ${response.status}`);
        const data = await response.json();
        
        if (data.feeds && data.feeds.length > 0) {
            updateUI(data.feeds);
            if (!options.start) {
               statusTextEl.textContent = 'Live';
               statusTextEl.className = 'text-green-500';
            }
        } else {
            statusTextEl.textContent = 'No data found';
            statusTextEl.className = 'text-gray-500';
            updateUI([]);
        }
    } catch (error) {
        console.error("Failed to fetch data:", error);
        statusTextEl.textContent = 'Error';
        statusTextEl.className = 'text-red-500';
    } finally {
        loadingSpinnerEl.style.display = 'none';
    }
}

function updateUI(feeds) {
    const latLngs = feeds.map(feed => {
        const lat = parseFloat(feed.field4);
        const lon = parseFloat(feed.field3);
        return (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) ? [lat, lon] : null;
    }).filter(Boolean);

    // Clear previous map layers
    if (mapMarker) mapMarker.remove();
    if (historyPath) historyPath.remove();
    if (historyPointsGroup) historyPointsGroup.clearLayers();
    
    if (latLngs.length > 0) {
        const latestPosition = latLngs[latLngs.length - 1];
        longitudeEl.textContent = latestPosition[1].toFixed(6);
        latitudeEl.textContent = latestPosition[0].toFixed(6);
        
        mapMarker = L.marker(latestPosition).addTo(map);
        const latestFeed = feeds[feeds.length - 1];
        mapMarker.bindPopup(`<b>Current Location</b><br>${new Date(latestFeed.created_at).toLocaleString()}`).openPopup();

        historyPath = L.polyline(latLngs, { color: '#3b82f6', weight: 5, opacity: 0.8 }).addTo(map);

        if (!historyPointsGroup) {
            historyPointsGroup = L.layerGroup().addTo(map);
        }
        feeds.forEach(feed => {
            const lat = parseFloat(feed.field4);
            const lon = parseFloat(feed.field3);

            if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
                const point = L.circleMarker([lat, lon], {
                    radius: 5,
                    color: '#0ea5e9',
                    fillColor: '#0ea5e9',
                    fillOpacity: 0.8
                }).addTo(historyPointsGroup);

                point.bindPopup(
                    `<b>Timestamp:</b> ${new Date(feed.created_at).toLocaleString()}<br>` +
                    `<b>Lat:</b> ${lat.toFixed(6)}<br>` +
                    `<b>Lon:</b> ${lon.toFixed(6)}`
                );
            }
        });

        map.fitBounds(historyPath.getBounds().pad(0.2));
    } else {
        longitudeEl.textContent = "N/A";
        latitudeEl.textContent = "N/A";
    }
    
    // **FIX:** Use toLocaleString() to show both date and time in chart tooltips.
    const labels = feeds.map(feed => new Date(feed.created_at).toLocaleString());
    
    updateChartData(temperatureChart, labels, feeds.map(f => f.field1 || null));
    updateChartData(humidityChart, labels, feeds.map(f => f.field2 || null));
    updateChartData(gasChart, labels, feeds.map(f => f.field8 || null));

    const accelX = feeds.map(f => f.field5 || null);
    const accelY = feeds.map(f => f.field6 || null);
    const accelZ = feeds.map(f => f.field7 || null);
    updateMultiLineChartData(accelerometerChart, labels, accelX, accelY, accelZ);

    lastUpdatedEl.textContent = feeds.length > 0 ? new Date(feeds[feeds.length - 1].created_at).toLocaleString() : 'N/A';
}

function updateChartData(chart, labels, data) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
}

function updateMultiLineChartData(chart, labels, dataX, dataY, dataZ) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = dataX;
    chart.data.datasets[1].data = dataY;
    chart.data.datasets[2].data = dataZ;
    chart.update();
}

function showMessage(message) {
    const messageBox = document.getElementById('message-box');
    const messageText = document.getElementById('message-text');
    messageText.textContent = message;
    messageBox.classList.remove('hidden');
    setTimeout(() => messageBox.classList.add('hidden'), 5000);
}

// ===================================================================================
// EVENT LISTENERS & INITIALIZATION
// ===================================================================================
filterButton.addEventListener('click', () => {
    const startValue = startDateInput.value;
    const endValue = endDateInput.value;

    if (!startValue || !endValue) return showMessage("Please select both a start and end date.");
    if (new Date(startValue) >= new Date(endValue)) return showMessage("Start date must be before the end date.");

    if (liveUpdateIntervalId) clearInterval(liveUpdateIntervalId);
    liveUpdateIntervalId = null;

    const formatForApi = (dateString) => dateString.replace('T', ' ');
    const startFormatted = encodeURIComponent(formatForApi(startValue));
    const endFormatted = encodeURIComponent(formatForApi(endValue));

    fetchDataAndUpdateDashboard({ start: startFormatted, end: endFormatted });
});

resetButton.addEventListener('click', () => {
    startDateInput.value = '';
    endDateInput.value = '';
    fetchDataAndUpdateDashboard();
    if (!liveUpdateIntervalId) startLiveUpdates();
});

function startLiveUpdates() {
    if (liveUpdateIntervalId) clearInterval(liveUpdateIntervalId);
    liveUpdateIntervalId = setInterval(fetchDataAndUpdateDashboard, UPDATE_INTERVAL);
}

function runDemoMode() {
    console.warn("Running in DEMO MODE.");
    statusTextEl.innerHTML = 'DEMO MODE';
    statusTextEl.className = 'text-orange-500';
    filterContainer.style.opacity = '0.5';
    filterContainer.style.pointerEvents = 'none';
    loadingSpinnerEl.style.display = 'none';

    const now = new Date();
    const fakeFeeds = [
        { created_at: new Date(now.getTime() - 240000).toISOString(), field1: '28.1', field2: '65', field3: '80.6337', field4: '7.2906', field5: '0.5', field6: '-0.2', field7: '9.8', field8: '15' },
        { created_at: new Date(now.getTime() - 180000).toISOString(), field1: '28.3', field2: '64', field3: '80.6350', field4: '7.2915', field5: '0.6', field6: '-0.1', field7: '9.9', field8: '16' },
        { created_at: new Date(now.getTime() - 120000).toISOString(), field1: '28.5', field2: '66', field3: '80.6365', field4: '7.2925', field5: '0.4', field6: '-0.3', field7: '9.7', field8: '14' },
        { created_at: new Date(now.getTime() - 60000).toISOString(), field1: '28.4', field2: '67', field3: '80.6380', field4: '7.2935', field5: '0.5', field6: '-0.2', field7: '9.8', field8: '15' },
        { created_at: now.toISOString(), field1: '28.6', field2: '65', field3: '80.6400', field4: '7.2950', field5: '0.7', field6: '0.0', field7: '10.0', field8: '16' },
    ];
    updateUI(fakeFeeds);
}

// The window.onload event ensures all HTML is loaded before the script runs.
window.onload = () => {
    initializeMap();
    initializeCharts();
    fetchDataAndUpdateDashboard(); 
    if (THINGSPEAK_CHANNEL_ID !== 'YOUR_CHANNEL_ID' && THINGSPEAK_READ_API_KEY !== 'YOUR_READ_API_KEY') {
        startLiveUpdates();
    }
};
