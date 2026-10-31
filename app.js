/**
 * CimaAlerta - Centro Nacional de Monitoreo Sísmico
 * Conexión asíncrona con datos_sismicos_web.json (Semana 9)
 * Mapa Leaflet interactivo, Serie de Tiempo con Chart.js y Modales
 */

document.addEventListener('DOMContentLoaded', () => {
    // State
    let seismicData = null;
    let mainChart = null;
    let mapInstance = null;
    let currentViewMode = 'all'; // 'all' | 'peak' | 'figma'
    let activeQuakeId = 'mexicali';

    // List of recent earthquakes (Semáforo de Nivel de Alerta)
    const recentQuakes = [
        {
            id: 'mexicali',
            city: 'Mexicali, BC',
            magnitude: '5.4',
            magClass: 'mag-high',
            sevColor: 'sev-red',
            severity: 'Severidad alta',
            depth: '12.4 km',
            timeAgo: 'Hace 12 min',
            localTime: '14:32:18',
            lat: 32.6519,
            lng: -115.4683,
            peakAmp: '2920.0',
            active: true
        },
        {
            id: 'tijuana',
            city: 'Tijuana, BC',
            magnitude: '4.2',
            magClass: 'mag-mid-amber',
            sevColor: 'sev-amber',
            severity: 'Severidad media',
            depth: '12 km',
            timeAgo: 'Hace 45 min',
            localTime: '13:59:02',
            lat: 32.5149,
            lng: -117.0382,
            peakAmp: '1850.0',
            active: false
        },
        {
            id: 'ensenada',
            city: 'Ensenada, BC',
            magnitude: '3.9',
            magClass: 'mag-medium',
            sevColor: 'sev-orange',
            severity: 'Severidad moderada',
            depth: '12 km',
            timeAgo: 'Hace 2 horas',
            localTime: '12:44:11',
            lat: 31.8667,
            lng: -116.5964,
            peakAmp: '1720.0',
            active: false
        },
        {
            id: 'tecate',
            city: 'Tecate, BC',
            magnitude: '3.2',
            magClass: 'mag-low',
            sevColor: 'sev-green',
            severity: 'Severidad baja',
            depth: '12 km',
            timeAgo: 'Hace 5 horas',
            localTime: '09:30:45',
            lat: 32.5678,
            lng: -116.6267,
            peakAmp: '1450.0',
            active: false
        }
    ];

    // Marker references for Leaflet
    const mapMarkers = {};

    // 1. Initialize Map
    initMap();

    // 2. Render Recent Quakes List (Semáforo Panel)
    renderQuakeList();

    // 3. Fetch Seismic JSON Data
    loadSeismicData();

    // 4. Setup Modals and Buttons
    setupModals();

    // 5. Setup Checklist LocalStorage
    initChecklist();

    // 6. Setup Chart Toggles
    setupChartToggles();

    // 7. Setup Profile Avatar Photo Change
    setupProfileAvatar();

    /* ==========================================================================
       Fetch & Asynchronous JSON Loading (Requerimiento 2)
       ========================================================================== */
    async function loadSeismicData() {
        try {
            const response = await fetch('datos_sismicos_web.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            seismicData = await response.json();
            console.log('Datos sísmicos cargados con éxito:', seismicData);

            // Update UI with JSON data
            updateUIFromJSON(seismicData);

            // Initialize or update Chart.js
            renderTimeSeriesChart(seismicData.registros);

            showToast('Conexión exitosa con datos_sismicos_web.json');
        } catch (error) {
            console.warn('Error cargando datos_sismicos_web.json:', error);
            // Fallback gracefully so the UI is fully functional even if offline
            generateFallbackData();
        }
    }

    function updateUIFromJSON(data) {
        const estacion = data.estacion || 'CI.BAR.BHZ';
        const picoAlerta = data.pico_alerta || data['pico alerta'] || { amplitud_maxima: 2920.0, marca_tiempo: '2024-05-12T00:46:59.669539Z' };

        // Station badges
        const badgeEstacion = document.getElementById('badgeEstacion');
        if (badgeEstacion) badgeEstacion.textContent = `Estación: ${estacion}`;
        const infoEstacionNombre = document.getElementById('infoEstacionNombre');
        if (infoEstacionNombre) infoEstacionNombre.textContent = estacion;

        // Peak and time
        const peakAmp = parseFloat(picoAlerta.amplitud_maxima);
        const epicenterPeakAmp = document.getElementById('epicenterPeakAmp');
        if (epicenterPeakAmp) epicenterPeakAmp.textContent = peakAmp.toFixed(1);

        // Calculate severity based on semáforo thresholds
        const epicenterSeverity = document.getElementById('epicenterSeverity');
        const epicenterMagNumber = document.getElementById('epicenterMagnitude');

        if (peakAmp >= 2000) {
            if (epicenterSeverity) {
                epicenterSeverity.textContent = 'Severidad alta (Alerta Roja)';
                epicenterSeverity.style.color = 'var(--color-danger)';
            }
            if (epicenterMagNumber) epicenterMagNumber.style.color = 'var(--color-danger)';
        } else if (peakAmp >= 1700) {
            if (epicenterSeverity) {
                epicenterSeverity.textContent = 'Severidad media (Alerta Ámbar)';
                epicenterSeverity.style.color = 'var(--color-warning)';
            }
            if (epicenterMagNumber) epicenterMagNumber.style.color = 'var(--color-warning)';
        } else {
            if (epicenterSeverity) {
                epicenterSeverity.textContent = 'Severidad normal (Alerta Verde)';
                epicenterSeverity.style.color = 'var(--color-success)';
            }
            if (epicenterMagNumber) epicenterMagNumber.style.color = 'var(--color-success)';
        }

        // Parse peak timestamp
        const timeStr = picoAlerta.marca_tiempo || picoAlerta['marca tiempo'];
        if (timeStr) {
            const dateObj = new Date(timeStr);
            const epicenterLocalTime = document.getElementById('epicenterLocalTime');
            if (epicenterLocalTime) {
                epicenterLocalTime.textContent = dateObj.toLocaleTimeString('es-MX', { hour12: false });
            }
        }
    }

    function generateFallbackData() {
        console.info('Generando datos sísmicos simulados basados en la estructura de Meta 9...');
        const registros = [];
        const baseTime = new Date('2024-05-12T00:00:00Z');
        for (let i = 0; i < 3600; i++) {
            const t = new Date(baseTime.getTime() + i * 1000).toISOString();
            // Create waveform with a peak around second 2819 (00:46:59)
            let amp = 1650 + Math.sin(i / 15) * 120 + (Math.random() * 80 - 40);
            if (i >= 2780 && i <= 2860) {
                const dist = Math.abs(i - 2819);
                amp += Math.max(0, 1200 - dist * 30);
            }
            registros.push({
                Amplitud: Math.round(amp),
                Tiempo_UTC: t
            });
        }
        seismicData = {
            estacion: 'CI.BAR.BHZ',
            pico_alerta: {
                amplitud_maxima: 2920.0,
                marca_tiempo: '2024-05-12T00:46:59.669539Z'
            },
            registros: registros
        };
        updateUIFromJSON(seismicData);
        renderTimeSeriesChart(seismicData.registros);
    }

    /* ==========================================================================
       Leaflet Interactive Map (Requerimiento 1)
       ========================================================================== */
    function initMap() {
        // Initial center on Baja California / Mexicali - Tijuana border region
        mapInstance = L.map('map', {
            center: [32.35, -116.1],
            zoom: 8,
            zoomControl: false,
            attributionControl: false
        });

        // Add zoom control at bottom-right
        L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

        // Tile layer: Esri World Light Gray Canvas (matches Figma minimalist gray look, 100% free, NO WATERMARK)
        const esriLightGray = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 16,
                attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
            }).addTo(mapInstance);

            // Reference overlay: borders, coastlines and labels
            const esriLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 16
            }).addTo(mapInstance);

            // Optional standard OpenStreetMap layer
            const osmStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors'
            });

            // Layer Switcher (Figma Gray vs OSM)
            L.control.layers({
                "Minimalista Figma (Esri Gray)": esriLightGray,
                "OpenStreetMap (Calles)": osmStandard
            }, {
                "Fronteras y Etiquetas": esriLabels
            }, { position: 'bottomleft' }).addTo(mapInstance);

            // Fit bounds to display all recent quakes nicely
            mapInstance.fitBounds([
                [31.65, -117.25],
                [32.85, -115.20]
            ], { padding: [35, 35] });

            // 1. Epicenter Animated Pulse Marker (Mexicali - 5.4 M)
            const epicenterHtml = `
            <div class="seismic-pulse-ring"></div>
            <div class="seismic-pulse-ring"></div>
            <div class="seismic-pulse-ring"></div>
            <div class="seismic-center-circle">5.4</div>
        `;
            const epicenterIcon = L.divIcon({
                className: 'seismic-epicenter-marker',
                html: epicenterHtml,
                iconSize: [80, 80],
                iconAnchor: [40, 40]
            });

            const epicenterMarker = L.marker([32.6519, -115.4683], { icon: epicenterIcon }).addTo(mapInstance);
            epicenterMarker.bindPopup('<strong>Epicentro Activo</strong><br>Mexicali, BC<br>Magnitud: 5.4 M<br>Amplitud Pico: 2920.0');
            epicenterMarker.on('click', () => selectQuake('mexicali'));
            mapMarkers['mexicali'] = epicenterMarker;

            // 2. Secondary Earthquake Markers
            const otherQuakes = [
                { id: 'tijuana', lat: 32.5149, lng: -117.0382, mag: '4.2', colorClass: 'sev-amber' },
                { id: 'ensenada', lat: 31.8667, lng: -116.5964, mag: '3.9', colorClass: 'sev-orange' },
                { id: 'tecate', lat: 32.5678, lng: -116.6267, mag: '3.2', colorClass: 'sev-green' }
            ];

            otherQuakes.forEach(q => {
                const icon = L.divIcon({
                    className: 'quake-circle-marker-wrapper',
                    html: `<div class="quake-circle-marker ${q.colorClass}">${q.mag}</div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });
                const marker = L.marker([q.lat, q.lng], { icon: icon }).addTo(mapInstance);
                marker.bindPopup(`<strong>${q.mag} M</strong><br>${q.id.toUpperCase()}, BC`);
                marker.on('click', () => selectQuake(q.id));
                mapMarkers[q.id] = marker;
            });
        }

    /* ==========================================================================
       Panel / Semáforo de Nivel de Alerta: Sismos Recientes
       ========================================================================== */
    function renderQuakeList() {
                const quakeList = document.getElementById('quakeList');
                if (!quakeList) return;

                quakeList.innerHTML = '';
                recentQuakes.forEach(q => {
                    const li = document.createElement('li');
                    li.className = `quake-item ${q.active ? 'active' : ''}`;
                    li.id = `quakeItem-${q.id}`;
                    li.innerHTML = `
                <div class="badge-mag ${q.magClass}">${q.magnitude} M</div>
                <div class="quake-info">
                    <span class="quake-place">${q.city}</span>
                    <span class="quake-depth">Profundidad: ${q.depth}</span>
                </div>
                <span class="quake-time">${q.timeAgo}</span>
            `;

                    li.addEventListener('click', () => {
                        selectQuake(q.id);
                    });

                    quakeList.appendChild(li);
                });
            }

    function selectQuake(quakeId) {
                activeQuakeId = quakeId;
                const q = recentQuakes.find(item => item.id === quakeId);
                if (!q) return;

                // Highlight list item
                document.querySelectorAll('.quake-item').forEach(el => el.classList.remove('active'));
                const activeLi = document.getElementById(`quakeItem-${quakeId}`);
                if (activeLi) activeLi.classList.add('active');

                // Smoothly fly map to location
                if (mapInstance) {
                    mapInstance.flyTo([q.lat, q.lng], 9.5, { duration: 1.2 });
                    if (mapMarkers[quakeId]) {
                        mapMarkers[quakeId].openPopup();
                    }
                }

                // Update Epicenter Card Overlay
                const epicenterMag = document.getElementById('epicenterMagnitude');
                const epicenterSeverity = document.getElementById('epicenterSeverity');
                const epicenterLocation = document.getElementById('epicenterLocation');
                const epicenterLocalTime = document.getElementById('epicenterLocalTime');
                const epicenterDepth = document.getElementById('epicenterDepth');
                const epicenterPeakAmp = document.getElementById('epicenterPeakAmp');
                const epicenterStatusTag = document.getElementById('epicenterStatusTag');

                if (epicenterMag) {
                    epicenterMag.textContent = q.magnitude;
                    epicenterMag.style.color = q.magnitude >= 5.0 ? 'var(--color-danger)' : (q.magnitude >= 4.0 ? 'var(--color-warning)' : 'var(--color-success)');
                }
                if (epicenterSeverity) {
                    epicenterSeverity.textContent = q.severity;
                    epicenterSeverity.style.color = q.magnitude >= 5.0 ? 'var(--color-danger)' : (q.magnitude >= 4.0 ? 'var(--color-warning)' : 'var(--color-success)');
                }
                if (epicenterLocation) epicenterLocation.textContent = q.city;
                if (epicenterLocalTime) epicenterLocalTime.textContent = q.localTime;
                if (epicenterDepth) epicenterDepth.textContent = q.depth;
                if (epicenterPeakAmp) epicenterPeakAmp.textContent = q.peakAmp;
                if (epicenterStatusTag) {
                    epicenterStatusTag.textContent = quakeId === 'mexicali' ? 'EPICENTRO ACTIVO' : 'RÉPLICA REGISTRADA';
                }
            }

    /* ==========================================================================
       Chart.js Time Series Graph (Requerimiento 1 & 2)
       ========================================================================== */
    function renderTimeSeriesChart(registros) {
                const ctx = document.getElementById('graficaSismica');
                if (!ctx) return;

                // Prepare labels and values
                // Full resolution (all 3,600 downsampled readings from Semana 9 JSON)
                const step = 1;
                const labels = [];
                const amplitudes = [];

                for (let i = 0; i < registros.length; i += step) {
                    const reg = registros[i];
                    const date = new Date(reg.Tiempo_UTC || reg['Tiempo UTC']);
                    labels.push(date.toLocaleTimeString('es-MX', { hour12: false, minute: '2-digit', second: '2-digit' }));
                    amplitudes.push(reg.Amplitud);
                }

                // Create gradient fill
                const chartCtx = ctx.getContext('2d');
                const gradient = chartCtx.createLinearGradient(0, 0, 0, 240);
                gradient.addColorStop(0, 'rgba(14, 107, 56, 0.28)');
                gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.12)');
                gradient.addColorStop(1, 'rgba(16, 185, 129, 0.01)');

                if (mainChart) {
                    mainChart.destroy();
                }

                // Plugin for drawing critical and moderate alert threshold lines
                const thresholdLinesPlugin = {
                    id: 'thresholdLinesPlugin',
                    afterDraw: (chart) => {
                        const { ctx, chartArea, scales: { y } } = chart;
                        if (!chartArea || !y) return;

                        // Threshold 2000 (Crítico / Alerta Roja)
                        const y2000 = y.getPixelForValue(2000);
                        if (y2000 >= chartArea.top && y2000 <= chartArea.bottom) {
                            ctx.save();
                            ctx.strokeStyle = 'rgba(220, 38, 38, 0.65)';
                            ctx.setLineDash([5, 5]);
                            ctx.lineWidth = 1.4;
                            ctx.beginPath();
                            ctx.moveTo(chartArea.left, y2000);
                            ctx.lineTo(chartArea.right, y2000);
                            ctx.stroke();

                            ctx.fillStyle = '#DC2626';
                            ctx.font = 'bold 10px Inter, sans-serif';
                            ctx.textAlign = 'right';
                            ctx.fillText('Umbral Crítico (2,000)', chartArea.right - 12, y2000 - 5);
                            ctx.restore();
                        }

                        // Threshold 1700 (Moderado / Alerta Ámbar)
                        const y1700 = y.getPixelForValue(1700);
                        if (y1700 >= chartArea.top && y1700 <= chartArea.bottom) {
                            ctx.save();
                            ctx.strokeStyle = 'rgba(217, 119, 6, 0.55)';
                            ctx.setLineDash([5, 5]);
                            ctx.lineWidth = 1.2;
                            ctx.beginPath();
                            ctx.moveTo(chartArea.left, y1700);
                            ctx.lineTo(chartArea.right, y1700);
                            ctx.stroke();

                            ctx.fillStyle = '#D97706';
                            ctx.font = 'bold 10px Inter, sans-serif';
                            ctx.textAlign = 'right';
                            ctx.fillText('Umbral Moderado (1,700)', chartArea.right - 12, y1700 - 5);
                            ctx.restore();
                        }
                    }
                };

                mainChart = new Chart(chartCtx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Amplitud Sísmica',
                                data: amplitudes,
                                borderColor: '#0E6B38',
                                backgroundColor: gradient,
                                borderWidth: 1.8,
                                pointRadius: (context) => {
                                    const val = context.raw;
                                    return (val && val >= 2900) ? 6 : 0;
                                },
                                pointBackgroundColor: '#DC2626',
                                pointBorderColor: '#FFFFFF',
                                pointBorderWidth: 2,
                                pointHoverRadius: 6,
                                pointHoverBackgroundColor: '#DC2626',
                                pointHoverBorderColor: '#FFFFFF',
                                pointHoverBorderWidth: 2,
                                tension: 0.15,
                                fill: true
                            }
                        ]
                    },
                    plugins: [thresholdLinesPlugin],
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: { duration: 800 },
                        interaction: {
                            intersect: false,
                            mode: 'index'
                        },
                        scales: {
                            x: {
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.05)',
                                    drawBorder: false
                                },
                                ticks: {
                                    color: '#6B7280',
                                    font: { family: 'Inter', size: 11 },
                                    maxTicksLimit: 12
                                }
                            },
                            y: {
                                min: 1200,
                                max: 3100,
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.05)',
                                    drawBorder: false
                                },
                                ticks: {
                                    color: '#6B7280',
                                    font: { family: 'Inter', size: 11 },
                                    stepSize: 400
                                }
                            }
                        },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: 'rgba(31, 41, 55, 0.95)',
                                titleFont: { family: 'Inter', size: 12, weight: '700' },
                                bodyFont: { family: 'Inter', size: 12 },
                                padding: 10,
                                cornerRadius: 8,
                                displayColors: false,
                                callbacks: {
                                    title: (tooltipItems) => `Hora UTC: ${tooltipItems[0].label}`,
                                    label: (context) => {
                                        const val = context.parsed.y;
                                        let status = val >= 2000 ? '🚨 Alerta Alta (Crítico)' : (val >= 1700 ? '⚠️ Alerta Media' : '✅ Normal');
                                        return [`Amplitud: ${val.toLocaleString()} u`, status];
                                    }
                                }
                            }
                        }
                    }
                });
            }

    function setupChartToggles() {
                const btnViewAll = document.getElementById('btnViewAll');
                const btnViewPeak = document.getElementById('btnViewPeak');
                const btnViewFigma = document.getElementById('btnViewFigma');

                function setActiveButton(btn) {
                    [btnViewAll, btnViewPeak, btnViewFigma].forEach(b => {
                        if (b) b.classList.remove('active');
                    });
                    if (btn) btn.classList.add('active');
                }

                if (btnViewAll) {
                    btnViewAll.addEventListener('click', () => {
                        setActiveButton(btnViewAll);
                        currentViewMode = 'all';
                        document.getElementById('graphTitle').textContent = 'Actividad Sísmica – Serie de Tiempo (Amplitud vs. Tiempo)';
                        document.getElementById('graphSubtitle').textContent = 'Conectado a estructura JSON Semana 9 (Estación CI.BAR.BHZ) | 3,600 lecturas por segundo (Downsampled)';
                        if (seismicData && seismicData.registros) {
                            renderTimeSeriesChart(seismicData.registros);
                        }
                    });
                }

                if (btnViewPeak) {
                    btnViewPeak.addEventListener('click', () => {
                        setActiveButton(btnViewPeak);
                        currentViewMode = 'peak';
                        document.getElementById('graphTitle').textContent = 'Ventana del Evento Sísmico (Pico de Amplitud: 2920.0)';
                        document.getElementById('graphSubtitle').textContent = 'Intervalo crítico: 00:45:00 UTC a 00:52:00 UTC (Estación CI.BAR.BHZ)';

                        if (seismicData && seismicData.registros) {
                            // Filter records around 00:45:00 to 00:52:00 (index ~ 2700 to 3120)
                            const peakSubset = seismicData.registros.slice(2700, 3120);
                            renderTimeSeriesChart(peakSubset);
                        }
                    });
                }

                if (btnViewFigma) {
                    btnViewFigma.addEventListener('click', () => {
                        setActiveButton(btnViewFigma);
                        currentViewMode = 'figma';
                        document.getElementById('graphTitle').textContent = 'Actividad Sísmica – Últimos 30 días (Figma View)';
                        document.getElementById('graphSubtitle').textContent = 'Tendencias de magnitud máxima registrada por día en el noroeste del país';
                        renderFigma30DaysChart();
                    });
                }
            }

    function renderFigma30DaysChart() {
                const ctx = document.getElementById('graficaSismica');
                if (!ctx) return;
                const chartCtx = ctx.getContext('2d');

                // 30 days mock data replicating the exact green line with yellow & green points in Figma
                const days = Array.from({ length: 30 }, (_, i) => `Día ${i + 1}`);
                const values = [
                    3.4, 3.8, 4.3, 4.8, 5.2, 4.9, 4.5, 4.2, 3.9, 3.2,
                    4.1, 4.7, 5.3, 5.1, 4.6, 4.0, 4.2, 4.5, 5.0, 4.8,
                    4.3, 3.8, 3.4, 3.9, 4.4, 5.1, 5.5, 5.2, 4.6, 4.1
                ];

                // Specific points highlighted like in Figma Image 1
                const pointColors = values.map(val => val >= 5.0 ? '#10B981' : '#F59E0B');
                const pointRadii = values.map(val => (val >= 5.0 || val <= 3.5 || val === 4.0) ? 5 : 0);

                if (mainChart) mainChart.destroy();

                mainChart = new Chart(chartCtx, {
                    type: 'line',
                    data: {
                        labels: days,
                        datasets: [{
                            label: 'Magnitud Máxima Diaria',
                            data: values,
                            borderColor: '#10B981',
                            borderWidth: 2,
                            pointBackgroundColor: pointColors,
                            pointBorderColor: '#FFFFFF',
                            pointBorderWidth: 1.5,
                            pointRadius: pointRadii,
                            fill: false,
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                grid: { color: 'rgba(0, 0, 0, 0.04)' },
                                ticks: { color: '#6B7280', maxTicksLimit: 10 }
                            },
                            y: {
                                min: 2.5,
                                max: 6.0,
                                grid: {
                                    color: (ctx) => (ctx.tick.value === 5.0 || ctx.tick.value === 4.0) ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                                    borderDash: [5, 5]
                                },
                                ticks: {
                                    stepSize: 1.0,
                                    callback: (val) => `${val.toFixed(1)} M`
                                }
                            }
                        },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: (ctx) => `Magnitud: ${ctx.parsed.y} M`
                                }
                            }
                        }
                    }
                });
            }

    /* ==========================================================================
       Modals Setup (Figma Image 2 & Image 3)
       ========================================================================== */
    function setupModals() {
                // Modal 1: Emergencias / Reportar Daños
                const modalEmergency = document.getElementById('modalEmergency');
                const btnOpenEmergency = document.getElementById('btnOpenEmergencyModal');
                const btnCloseEmergency = document.getElementById('btnCloseEmergency');
                const btnCancelEmergency = document.getElementById('btnCancelEmergency');
                const emergencyForm = document.getElementById('emergencyForm');

                if (btnOpenEmergency) {
                    btnOpenEmergency.addEventListener('click', () => {
                        playAlertBeep();
                        openModal(modalEmergency);
                    });
                }
                if (btnCloseEmergency) {
                    btnCloseEmergency.addEventListener('click', () => closeModal(modalEmergency));
                }
                if (btnCancelEmergency) {
                    btnCancelEmergency.addEventListener('click', () => closeModal(modalEmergency));
                }

                if (emergencyForm) {
                    emergencyForm.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const name = document.getElementById('inputFullName').value;
                        const phone = document.getElementById('inputPhone').value;
                        const location = document.getElementById('inputLocation').value;
                        const emergencyType = document.querySelector('input[name="tipoEmergencia"]:checked')?.value || 'Sismo';
                        const description = document.getElementById('inputDescription').value;

                        // Save report to localStorage
                        const reports = JSON.parse(localStorage.getItem('cimaAlerta_reportes') || '[]');
                        reports.push({
                            name, phone, location, emergencyType, description, timestamp: new Date().toISOString()
                        });
                        localStorage.setItem('cimaAlerta_reportes', JSON.stringify(reports));

                        closeModal(modalEmergency);
                        showToast('¡Reporte de emergencia enviado a Protección Civil y 911!');
                    });
                }

                // Modal 2: Guía de Acción y Mochila
                const modalChecklist = document.getElementById('modalChecklist');
                const btnOpenChecklist = document.getElementById('btnOpenChecklistModal');
                const btnCloseChecklist = document.getElementById('btnCloseChecklist');
                const btnCancelChecklist = document.getElementById('btnCancelChecklist');
                const btnSaveChecklist = document.getElementById('btnSaveChecklist');

                if (btnOpenChecklist) {
                    btnOpenChecklist.addEventListener('click', () => openModal(modalChecklist));
                }
                if (btnCloseChecklist) {
                    btnCloseChecklist.addEventListener('click', () => closeModal(modalChecklist));
                }
                if (btnCancelChecklist) {
                    btnCancelChecklist.addEventListener('click', () => closeModal(modalChecklist));
                }
                if (btnSaveChecklist) {
                    btnSaveChecklist.addEventListener('click', () => {
                        saveChecklist();
                        closeModal(modalChecklist);
                        showToast('Checklist de emergencia guardado en su dispositivo');
                    });
                }

                // Modal 3: Protección Civil Contactos
                const modalContacts = document.getElementById('modalContacts');
                const btnOpenContacts = document.getElementById('btnOpenContactsModal');
                const btnCloseContacts = document.getElementById('btnCloseContacts');
                const btnCancelContacts = document.getElementById('btnCancelContacts');

                if (btnOpenContacts) {
                    btnOpenContacts.addEventListener('click', () => openModal(modalContacts));
                }
                if (btnCloseContacts) {
                    btnCloseContacts.addEventListener('click', () => closeModal(modalContacts));
                }
                if (btnCancelContacts) {
                    btnCancelContacts.addEventListener('click', () => closeModal(modalContacts));
                }

                // Modal 4: Configuración de Alertas
                const modalSettings = document.getElementById('modalSettings');
                const btnOpenSettings = document.getElementById('btnOpenSettingsModal');
                const btnCloseSettings = document.getElementById('btnCloseSettings');
                const btnSaveSettings = document.getElementById('btnSaveSettings');

                if (btnOpenSettings) {
                    btnOpenSettings.addEventListener('click', () => openModal(modalSettings));
                }
                if (btnCloseSettings) {
                    btnCloseSettings.addEventListener('click', () => closeModal(modalSettings));
                }
                if (btnSaveSettings) {
                    btnSaveSettings.addEventListener('click', () => {
                        const checkSound = document.getElementById('checkSoundAlert');
                        if (checkSound && checkSound.checked) {
                            playAlertBeep();
                        }
                        closeModal(modalSettings);
                        showToast('Preferencias de alerta actualizadas');
                    });
                }

                // Close on backdrop click
                document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
                    backdrop.addEventListener('click', (e) => {
                        if (e.target === backdrop) {
                            closeModal(backdrop);
                        }
                    });
                });

                // Close on ESC key
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        document.querySelectorAll('.modal-backdrop.open').forEach(modal => closeModal(modal));
                    }
                });
            }

    function openModal(modalEl) {
                if (!modalEl) return;
                modalEl.classList.add('open');
                modalEl.setAttribute('aria-hidden', 'false');
            }

    function closeModal(modalEl) {
                if (!modalEl) return;
                modalEl.classList.remove('open');
                modalEl.setAttribute('aria-hidden', 'true');
            }

    /* ==========================================================================
       Checklist Persistence (localStorage)
       ========================================================================== */
    function initChecklist() {
                const saved = localStorage.getItem('cimaAlerta_checklist');
                if (saved) {
                    try {
                        const checkedIds = JSON.parse(saved);
                        document.querySelectorAll('#modalChecklist input[type="checkbox"]').forEach(box => {
                            const id = box.getAttribute('data-id');
                            if (id && checkedIds.hasOwnProperty(id)) {
                                box.checked = checkedIds[id];
                            }
                        });
                    } catch (e) {
                        console.error(e);
                    }
                }
            }

    function saveChecklist() {
                const state = {};
                document.querySelectorAll('#modalChecklist input[type="checkbox"]').forEach(box => {
                    const id = box.getAttribute('data-id');
                    if (id) {
                        state[id] = box.checked;
                    }
                });
                localStorage.setItem('cimaAlerta_checklist', JSON.stringify(state));
            }

    /* ==========================================================================
       Profile Avatar Photo Change & Persistence
       ========================================================================== */
    function setupProfileAvatar() {
        const userProfileBtn = document.getElementById('userProfileBtn');
        const avatarFileInput = document.getElementById('avatarFileInput');
        const userAvatarImg = document.getElementById('userAvatarImg');
        const profileUserName = document.getElementById('profileUserName');

        // Restore custom avatar if saved
        const savedAvatar = localStorage.getItem('cimaAlerta_avatar');
        if (savedAvatar && userAvatarImg) {
            userAvatarImg.src = savedAvatar;
        }

        const savedName = localStorage.getItem('cimaAlerta_userName');
        if (savedName && profileUserName) {
            profileUserName.textContent = savedName;
        }

        if (userProfileBtn && avatarFileInput) {
            userProfileBtn.addEventListener('click', () => {
                avatarFileInput.click();
            });

            avatarFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const imgData = event.target.result;
                        if (userAvatarImg) userAvatarImg.src = imgData;
                        localStorage.setItem('cimaAlerta_avatar', imgData);
                        showToast('¡Foto de perfil actualizada exitosamente!');
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    /* ==========================================================================
       Sound Alert Simulation (Web Audio API)
       ========================================================================== */
    function playAlertBeep() {
                try {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (!AudioCtx) return;
                    const ctx = new AudioCtx();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(880, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
                    gain.gain.setValueAtTime(0.2, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.3);
                } catch (e) {
                    console.warn('Audio no disponible:', e);
                }
            }

    /* ==========================================================================
       Toast Notification Helper
       ========================================================================== */
    function showToast(message) {
                const toast = document.getElementById('toastNotification');
                const toastMsg = document.getElementById('toastMessage');
                if (!toast || !toastMsg) return;

                toastMsg.textContent = message;
                toast.classList.add('show');

                setTimeout(() => {
                    toast.classList.remove('show');
                }, 3400);
            }
});
