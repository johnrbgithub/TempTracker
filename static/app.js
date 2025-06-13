const sensors = [45, 32, 35, 31, 42];
const seriesOptions = [
    { key: 'temperature', label: 'Temp (°C)' },
    { key: 'humidity', label: 'Humidity (%)' }
];
let chart;
let rawData = [];
let lastFetched = null;
let currentSetting = '24_hours';

function toIsoDateString(str) {
    // Converts '2025-06-12 03:04:26Z' to '2025-06-12T03:04:26Z'
    return str ? str.replace(' ', 'T') : '';
}

function createCheckboxes() {
    // Sensor checkboxes
    const sensorDiv = document.getElementById('sensor-checkboxes');
    sensorDiv.innerHTML = '<b>Sensors:</b> ';
    sensors.forEach(num => {
        const id = `sensor-${num}`;
        sensorDiv.innerHTML += `<label><input type="checkbox" id="${id}" value="${num}" checked> ${num}</label> `;
    });
    // Series checkboxes
    const seriesDiv = document.getElementById('series-checkboxes');
    seriesDiv.innerHTML = '<b>Data Series:</b> ';
    seriesOptions.forEach(opt => {
        const id = `series-${opt.key}`;
        seriesDiv.innerHTML += `<label><input type="checkbox" id="${id}" value="${opt.key}" ${opt.key==='temperature' ? 'checked' : ''}> ${opt.label}</label> `;
    });
}
function getSelectedSensors() {
    return sensors.filter(num => document.getElementById(`sensor-${num}`).checked);
}
function getSelectedSeries() {
    return seriesOptions.filter(opt => document.getElementById(`series-${opt.key}`).checked);
}
function getSelectedUnit() {
    return document.querySelector('input[name="unit"]:checked').value;
}
function groupBySensor(data) {
    const grouped = {};
    data.forEach(row => {
        if (!grouped[row.sensor_number]) grouped[row.sensor_number] = [];
        grouped[row.sensor_number].push(row);
    });
    return grouped;
}
function getColor(idx) {
    const palette = [
        '#1a2a4f',
        '#3b5b92',
        '#2c3e50',
        '#0d47a1',
        '#1976d2',
        '#1565c0',
        '#263238'
    ];
    return palette[idx % palette.length];
}
// Format UTC timestamp to Arizona local time (UTC-7, no DST)
function formatArizonaTime(utcString) {
    if (!utcString) return '';
    const isoString = toIsoDateString(utcString);
    const utcDate = new Date(isoString);
    if (isNaN(utcDate.getTime())) return '';
    const arizonaTime = new Date(utcDate.getTime() - 7 * 60 * 60 * 1000);
    return arizonaTime.toLocaleString('en-US', {
        year: '2-digit', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
        timeZone: 'UTC'
    });
}
function convertTemp(tempC, unit) {
    if (unit === 'f') return tempC * 9/5 + 32;
    return tempC;
}
function updateLastUpdated() {
    const el = document.getElementById('last-updated');
    if (lastFetched) {
        const dt = new Date(lastFetched);
        el.textContent = 'Last updated: ' + dt.toLocaleString('en-US', { hour12: false });
    } else {
        el.textContent = '';
    }
}
async function fetchData(setting) {
    const response = await fetch(`/data?setting=${setting}`);
    lastFetched = new Date().toISOString();
    updateLastUpdated();
    return await response.json();
}
function filterValidData(data) {
    return data.filter(row => {
        const iso = toIsoDateString(row.sensor_time);
        return row.sensor_time && !isNaN(new Date(iso).getTime());
    });
}
async function renderChart() {
    console.log(rawData);
    const selectedSensors = getSelectedSensors();
    const selectedSeries = getSelectedSeries();
    const selectedUnit = getSelectedUnit();
    const data = filterValidData(rawData);
    const grouped = groupBySensor(data);
    let allTimestamps = new Set();
    selectedSensors.forEach(num => {
        (grouped[num] || []).forEach(row => allTimestamps.add(row.sensor_time));
    });
    const labelsRaw = Array.from(allTimestamps).sort();
    const labels = labelsRaw.map(formatArizonaTime);
    let datasets = [];
    selectedSeries.forEach((series, sIdx) => {
        selectedSensors.forEach((num, idx) => {
            const sensorData = (grouped[num] || []);
            const timeMap = {};
            sensorData.forEach(row => {
                let val = row[series.key];
                if (series.key === 'temperature') val = convertTemp(val, selectedUnit);
                timeMap[row.sensor_time] = val;
            });
            datasets.push({
                label: `${series.label.replace('Temperature', 'Temp')} (Sensor ${num})${series.key==='temperature' && selectedUnit==='f' ? ' [°F]' : ''}`,
                data: labelsRaw.map(ts => timeMap[ts] !== undefined ? timeMap[ts] : null),
                borderColor: getColor(idx + sIdx * sensors.length),
                backgroundColor: 'rgba(0,0,0,0)',
                fill: false,
                tension: 0.2,
                pointRadius: 3,
                pointHoverRadius: 6,
                borderWidth: 2,
                spanGaps: true
            });
        });
    });
    if (chart) chart.destroy();
    const ctx = document.getElementById('tempChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: { legend: { display: true } },
            scales: {
                x: {
                    display: true,
                    title: { display: true, text: 'Time (Arizona)' },
                    offset: false
                },
                y: {
                    display: true,
                    title: { display: true, text: selectedSeries.map(s => s.label.replace('Temperature', 'Temp')).join(', ') + (selectedUnit==='f' ? ' [°F]' : '') }
                }
            }
        }
    });
    updateLastUpdated();
}
async function initialLoad() {
    createCheckboxes();
    const settingSelect = document.getElementById('setting-select');
    settingSelect.value = '24_hours';
    currentSetting = settingSelect.value;
    rawData = await fetchData(currentSetting);
    renderChart();
    settingSelect.addEventListener('change', async () => {
        currentSetting = settingSelect.value;
        rawData = await fetchData(currentSetting);
        renderChart();
    });
}
window.addEventListener('DOMContentLoaded', initialLoad);
document.getElementById('sensor-checkboxes').addEventListener('change', renderChart);
document.getElementById('series-checkboxes').addEventListener('change', renderChart);
document.querySelectorAll('input[name="unit"]').forEach(el => el.addEventListener('change', renderChart)); 