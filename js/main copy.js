mapboxgl.accessToken = 'pk.eyJ1IjoiZG5zYWxhemFyMTAiLCJhIjoiY2tsbWZrOXJ1MDBpbDJucW1samV2bm1mYiJ9.YEsHNfZ2Uuq24dU71UPTUA';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/dnsalazar10/cl076mdm8000w14mzm9vt4rpq', // Your Mapbox style
    center: [13.01, 47.8], // Initial center [longitude, latitude]
    zoom: 12.2,
    pitch: 45, // Tilt the map to give it a 3D effect
    bearing: 0
});

// Wait for the map to load before adding any layers
map.on('load', function() {
    // Load the GeoJSON file (bu.geojson is your external file)
    fetch('data/bu_cafe.geojson')  // Replace this path with the actual location of bu.geojson
        .then(response => response.json())
        .then(buildingsGeoJSON => {
            // Add the building data as a source
            map.addSource('buildings', {
                type: 'geojson',
                data: buildingsGeoJSON // Use the fetched GeoJSON
            });

            // Add a 3D building extrusion layer
            map.addLayer({
                'id': 'buildings-3d',
                'type': 'fill-extrusion',
                'source': 'buildings',
                'paint': {
                    'fill-extrusion-color': '#301934',
                    'fill-extrusion-height': [
                        'case',
                        ['==', ['get', 'NUMPOINTS'], null], // Check if the height exists
                        50, // Default height if no height is found
                        ['get', 'height'] // Use height from the GeoJSON data
                    ],
                    'fill-extrusion-base': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        12, 0,
                        20, 50 // Default base height for buildings
                    ],
                    'fill-extrusion-opacity': 0.6
                }
            });

            // Dynamically update building heights based on zoom level
            map.on('zoom', function() {
                updateBuildingHeight();
            });

            // Update building heights dynamically based on zoom
            function updateBuildingHeight() {
                var zoom = map.getZoom();
                map.setPaintProperty('buildings-3d', 'fill-extrusion-height', [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    12, 0,
                    20, zoom * 30 // Adjust height dynamically based on zoom
                ]);
            }

            // Update the left-hand panel with buildings inside the current viewport
            map.on('moveend', function() {
                updateBuildingPanel();
            });

            // Function to update the building information in the panel
            function updateBuildingPanel() {
                // Get the bounding box of the current map view
                var bbox = map.getBounds();

                // Query features (buildings) within the bounding box
                var features = map.queryRenderedFeatures(bbox, {
                    layers: ['buildings-3d'] // Specify the layer containing the building features
                });

                // Update the HTML panel with the building information
                var buildingList = document.getElementById('building-list');
                buildingList.innerHTML = ''; // Clear previous data

                if (features.length > 0) {
                    features.forEach(function(feature) {
                        var building = feature.properties;
                        var buildingItem = document.createElement('div');
                        buildingItem.className = 'building-item';
                        buildingItem.innerHTML = `
                            <h4>${building.name || 'Unnamed Building'}</h4>
                            <p><strong>Height:</strong> ${building.height || 'N/A'} meters</p>
                            <p><strong>Area:</strong> ${building.area ? building.area.toFixed(2) : 'N/A'} m²</p>
                        `;
                        buildingList.appendChild(buildingItem);
                    });
                } else {
                    buildingList.innerHTML = '<p>No buildings found in the current view.</p>';
                }
            }

            // Initial call to update the panel with buildings in the viewport
            updateBuildingPanel();
        })
        .catch(error => {
            console.error("Error loading GeoJSON:", error);
        });
});
