mapboxgl.accessToken = 'pk.eyJ1IjoidGlubmFtIiwiYSI6ImNtaDI4djdsYTJ3dW8ybXE0M3g0OGpwdXkifQ.52zB7C-sGgsdU1t-EWdHnw';

let map;
let collisionData;
let hourlyChart;
let typeChart;
function initMap() {
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v10',
        center: [-122.3321, 47.6062], 
        zoom: 11,
        pitch: 45,
        bearing: 0
    });
    map.addControl(new mapboxgl.NavigationControl());
    map.addControl(new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: 'imperial'
    }));
    map.on('load', function() {
        loadCollisionData();
    });
}

// load the collision data
function loadCollisionData() {
    console.log('Loading local GeoJSON data...');

    fetch('assets/sdot_collisions.geojson')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load GeoJSON file');
            }
            return response.json();
        })
        .then(data => {
            console.log('GeoJSON loaded:', data.features.length, 'features');

            const filtered = {
                type: "FeatureCollection",
                features: data.features.filter(feature => {
                    const dateStr = feature.properties.INCDATE;
                    if (!dateStr) return false;
                    
                    const incidentDate = new Date(dateStr);
                    if (isNaN(incidentDate.getTime())) return false;
                    
                    const start2025 = new Date(2025, 0, 1);
                    const start2026 = new Date(2026, 0, 1);
                    
                    return incidentDate >= start2025 && incidentDate < start2026;
                })
            };
            console.log("Filtered features:", filtered.features.length);
            
            collisionData = processSDOTData(filtered);
            
            addCollisionLayer();
            updateStatistics();
            createCharts();
            createLegend();
        })
        .catch(error => {
            console.error('Error loading data:', error);
        });
}

// processing sdot data to correct format
function processSDOTData(sdotData) {
    const processedData = {
        type: 'FeatureCollection',
        features: []
    };
    
    sdotData.features.forEach(feature => {
        const props = feature.properties;
        if (!feature.geometry || !props.INCDTTM) {  // Use INCDTTM for time
            return;
        }
        let severity = 'Property Damage Only';
        if (props.SEVERITYDESC) {
            if (props.SEVERITYDESC.includes('Fatal')) {
                severity = 'Fatality';
            } else if (props.SEVERITYDESC.includes('Serious')) {
                severity = 'Serious Injury';
            } else if (props.SEVERITYDESC.includes('Injury')) {
                severity = 'Injury';
            }
        }

        let hour = 0;
        if (props.INCDTTM) {
            const timeMatch = props.INCDTTM.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
                hour = parseInt(timeMatch[1]); // Extract hour
            } else {
                const dateTime = new Date(props.INCDTTM);
                if (!isNaN(dateTime.getTime())) {
                    hour = dateTime.getHours();
                }
            }
        }

        const injuries = parseInt(props.INJURIES) || 0;
        const fatalities = parseInt(props.FATALITIES) || 0;
        const pedCount = parseInt(props.PEDCOUNT) || 0;
        
        processedData.features.push({
            type: 'Feature',
            geometry: feature.geometry,
            properties: {
                severity: severity,
                collisionType: props.COLLISIONTYPE || 'Unknown',
                hour: hour,
                injuries: injuries,
                fatalities: fatalities,
                pedestrianInvolved: pedCount > 0,
                date: props.INCDATE,  
                datetime: props.INCDTTM, 
                address: props.LOCATION || 'Location unknown'
            }
        });
    });
    return processedData;
}

function addCollisionLayer() {
    map.addSource('collisions', {
        type: 'geojson',
        data: collisionData,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
    });

    map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'collisions',
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': [
                'step',
                ['get', 'point_count'],
                '#fbbf24',
                10,
                '#f97316',
                25,
                '#dc2626'
            ],
            'circle-radius': [
                'step',
                ['get', 'point_count'],
                15,
                10,
                20,
                25,
                25
            ],
            'circle-opacity': 0.8,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff'
        }
    });

    map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'collisions',
        filter: ['has', 'point_count'],
        layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
        },
        paint: {
            'text-color': '#ffffff'
        }
    });

    map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'collisions',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': [
                'match',
                ['get', 'severity'],
                'Property Damage Only', '#3b82f6',
                'Injury', '#fbbf24',
                'Serious Injury', '#f97316',
                'Fatality', '#dc2626',
                '#9ca3af'
            ],
            'circle-radius': 6,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
            'circle-opacity': 0.8
        }
    });

    map.on('click', 'clusters', function(e) {
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['clusters']
        });
        const clusterId = features[0].properties.cluster_id;
        map.getSource('collisions').getClusterExpansionZoom(
            clusterId,
            function(err, zoom) {
                if (err) return;
                map.easeTo({
                    center: features[0].geometry.coordinates,
                    zoom: zoom
                });
            }
        );
    });

    map.on('click', 'unclustered-point', function(e) {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const props = e.features[0].properties;
        
        const popupContent = `
            <div class="popup-title">${props.severity} Collision</div>
            <div class="popup-info">
                <strong>Type:</strong> ${props.collisionType}<br>
                <strong>Time:</strong> ${props.hour}:00<br>
                <strong>Location:</strong> ${props.address}<br>
                <strong>Injuries:</strong> ${props.injuries}<br>
                ${props.fatalities > 0 ? `<strong>Fatalities:</strong> ${props.fatalities}<br>` : ''}
                ${props.pedestrianInvolved === 'true' ? '<strong>Pedestrian Involved</strong><br>' : ''}
            </div>
        `;

        new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(popupContent)
            .addTo(map);
    });

    // cursor on hover
    map.on('mouseenter', 'clusters', function() {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters', function() {
        map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', 'unclustered-point', function() {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'unclustered-point', function() {
        map.getCanvas().style.cursor = '';
    });
}

// ppdate stats
function updateStatistics() {
    let totalCollisions = collisionData.features.length;
    let totalInjuries = 0;
    let totalFatalities = 0;
    let pedestrianCount = 0;

    collisionData.features.forEach(feature => {
        totalInjuries += feature.properties.injuries;
        totalFatalities += feature.properties.fatalities;
        if (feature.properties.pedestrianInvolved) {
            pedestrianCount++;
        }
    });

    // animate numbers
    animateValue('total-collisions', 0, totalCollisions, 1000);
    animateValue('total-injuries', 0, totalInjuries, 1000);
    animateValue('total-fatalities', 0, totalFatalities, 1000);
    animateValue('pedestrian-count', 0, pedestrianCount, 1000);
}

// number counting
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    const range = end - start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    let current = start;
    
    const timer = setInterval(function() {
        current += increment;
        obj.textContent = current;
        if (current === end) {
            clearInterval(timer);
        }
    }, stepTime);
}

// charts
function createCharts() {
    if (hourlyChart) hourlyChart.destroy();
    if (typeChart) typeChart.destroy();
    console.log("CollisionData count:", collisionData.features.length);
        // hourly distribution chart
        const hourlyData = Array(24).fill(0);

        collisionData.features.forEach(feature => {
            const hour = feature.properties.hour;

            if (hour !== undefined && hour >= 0 && hour <= 23) {
                hourlyData[hour]++;
            }
        });

        hourlyChart = c3.generate({
            bindto: '#hourly-chart',
            data: {
                columns: [
                    ['Collisions', ...hourlyData]
                ],
                type: 'bar',
                colors: {
                    'Collisions': '#fbbf24'
                }
            },
            tooltip: {
                format: {
                    title: function(d) {
                        const hour = parseInt(d);
                        const period = hour >= 12 ? 'PM' : 'AM';
                        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                        return hour + ':00 (' + displayHour + ' ' + period + ')';
                    },
                    value: function(value, ratio, id) {
                        return value + ' collisions';
                    }
                }
            },
            axis: {
                x: {
                    type: 'category',
                    categories: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', 
                                '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
                    tick: {
                        rotate: -45,
                        multiline: false
                    },
                    height: 50,
                    label: {
                        text: 'Hour of Day',
                        position: 'outer-center'
                    }
                },
                y: {
                    label: {
                        text: 'Collisions',
                        position: 'outer-middle'
                    },
                    padding: {
                        top: 0,
                        bottom: 0
                    }
                }
            },
            bar: {
                width: {
                    ratio: 0.7
                }
            },
            legend: {
                show: false
            },
            size: {
                height: 220
            },
            padding: {
                top: 10,
                right: 10,
                bottom: 5,
                left: 40
            }
        });

        // collision type distribution chart
        const typeCount = {};
        collisionData.features.forEach(feature => {
            const type = feature.properties.collisionType;
            typeCount[type] = (typeCount[type] || 0) + 1;
        });

        const typeData = Object.entries(typeCount).map(([type, count]) => [type, count]);

        typeChart = c3.generate({
            bindto: '#type-chart',
            data: {
                columns: typeData,
                type: 'donut',
                colors: {
                    'Rear End': '#3b82f6',
                    'Side Swipe': '#60a5fa',
                    'Head On': '#dc2626',
                    'Pedestrian': '#f97316',
                    'Bicycle': '#fbbf24',
                    'Parked Car': '#9ca3af',
                    'Fixed Object': '#6b7280'
                }
            },
            tooltip: {
                format: {
                    value: function(value, ratio, id) {
                        const percentage = (ratio * 100).toFixed(1);
                        return value + ' collisions (' + percentage + '%)';
                    }
                }
            },
            donut: {
                title: "By Type",
                label: {
                    format: function(value, ratio, id) {
                        return value;
                    }
                },
                width: 35
            },
            size: {
                height: 280
            },
            legend: {
                position: 'right'
            }
        });
}

// legend
function createLegend() {
    const legendData = [
        { color: '#3b82f6', label: 'Property Damage Only' },
        { color: '#fbbf24', label: 'Injury' },
        { color: '#f97316', label: 'Serious Injury' },
        { color: '#dc2626', label: 'Fatality' }
    ];

    const legendHTML = legendData.map(item => `
        <div class="legend-item">
            <div class="legend-color" style="background-color: ${item.color}"></div>
            <span>${item.label}</span>
        </div>
    `).join('');

    document.getElementById('legend').innerHTML = legendHTML;
}

// reset
function resetView() {
    map.flyTo({
        center: [-122.3321, 47.6062],
        zoom: 11,
        pitch: 45,
        bearing: 0
    });
}
document.getElementById('reset-btn').addEventListener('click', resetView);

window.onload = function() {
    initMap();
};