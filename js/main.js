mapboxgl.accessToken = 'pk.eyJ1IjoiZG5zYWxhemFyMTAiLCJhIjoiY2tsbWZrOXJ1MDBpbDJucW1samV2bm1mYiJ9.YEsHNfZ2Uuq24dU71UPTUA';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/dnsalazar10/cm6gj3src004401s3fzg2hnz5', // Your Mapbox style
    center: [13.01, 47.8], // Initial center [longitude, latitude]
    zoom: 12.2,
    pitch: 45, // Tilt the map for a 3D effect
    bearing: 0
});

/*     Importing the data     */

// GeoJSON for cafes
var buildingsGeoJSON = 'data/bu_cafe.geojson'; // Your GeoJSON data path

// GeoJSON for peaks
var pointsGeoJSON = 'data/peaks.geojson';

// GeoJSON for museums
var museumsGeoJSON = 'data/museums.geojson';


/*     Welcoming window     */

// Welcoming box HTML to the page dynamically
var welcomeBoxHTML = `
<div id="welcome-box" class="welcome-box">
<div class="welcome-content">
    <h2>Welcome to the Salzburg Survival Map: Your Adventure Starts Here!</h2>
    <br>
    <p>Ready to explore? Dive into our interactive map to discover hidden cafes, iconic landmarks, and exciting points of interest.</p>
    <p>Switch between layers with the toggle buttons, and click on any location for more details and fun facts!</p>
    <button id="close-welcome" class="close-button">Let's Go!</button>
</div>
</div>
`;

// Append the welcome box to the body
document.body.insertAdjacentHTML('beforeend', welcomeBoxHTML);

/*     Load map     */

map.on('load', function () {
    const pitchSlider = document.getElementById('pitch-slider');
    const pitchValueDisplay = document.getElementById('pitch-value');
    const bearingLeftButton = document.getElementById('bearing-left');
    const bearingRightButton = document.getElementById('bearing-right');
    const maximize3dBtn = document.getElementById('maximize-3d-btn');
    const controlsContainer = document.getElementById('control-box');
  
    /*     3d Controler     */
    let isMinimized = false;
  
    // Toggle between minimized and expanded states
    maximize3dBtn.addEventListener('click', function () {
      if (isMinimized) {
        controlsContainer.classList.remove('minimized'); // Expand the control box
        maximize3dBtn.innerHTML = '<i class="fa fa-cogs"></i>'; // Gear icon
      } else {
        controlsContainer.classList.add('minimized'); // Minimize the control box
        maximize3dBtn.innerHTML = '<i class="fa fa-cogs"></i>'; // Gear icon
      }
      isMinimized = !isMinimized; // Toggle state
    });
  
    pitchSlider.addEventListener('input', function () {
      const pitchValue = parseInt(pitchSlider.value, 10);
      pitchValueDisplay.textContent = `${pitchValue}°`;
      map.setPitch(pitchValue);
    });
  
    bearingLeftButton.addEventListener('click', function () {
      let currentBearing = map.getBearing();
      map.rotateTo(currentBearing - 10, { duration: 500 }); // Rotate by 10 degrees counter-clockwise
    });
  
    bearingRightButton.addEventListener('click', function () {
      let currentBearing = map.getBearing();
      map.rotateTo(currentBearing + 10, { duration: 500 }); // Rotate by 10 degrees clockwise
    });
  });

// Initialize the state of the control box on page load (minimized by default)
window.addEventListener('load', function () {
    const controlBox = document.getElementById('control-box');
    const maximizeBtn = document.getElementById('maximize-btn');
    
    // By default, minimize the control box
    controlBox.classList.add('minimized');
  
    // Toggle button to maximize/minimize the control box
    maximizeBtn.addEventListener('click', function() {
      controlBox.classList.toggle('minimized');
    });
  });
    

/*     Map initialization and layer setup     */

map.on('load', function () {
    fetch(buildingsGeoJSON) 
        .then(response => response.json())
        .then(buildingsGeoJSON => {
            map.addSource('buildings', {
                type: 'geojson',
                data: buildingsGeoJSON
            });

            // Add the cafe layer with zoom-dependent height
            map.addLayer({
                'id': 'buildings-3d',
                'type': 'fill-extrusion',
                'source': 'buildings',
                'paint': {
                    'fill-extrusion-color': '#301934', //dark pruple
                    'fill-extrusion-height': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        12, ['*', ['get', 'NUMPOINTS'], 10], // At zoom level 12, the building height will be NUMPOINTS * 10
                        20, ['*', ['get', 'NUMPOINTS'], 100] // At zoom level 18, the building height will be NUMPOINTS * 100
                    ],
                    'fill-extrusion-base': 0,
                    'fill-extrusion-opacity': 0.6
                },
                'layout': {
                    'visibility': 'visible' // Ensure it's initially visible
                }
            });

            // Add the museums
            map.addSource('museums', {
                type: 'geojson',
                data: museumsGeoJSON
            });

            // Add the museums layer with zoom-dependent height
            map.addLayer({
                'id': 'museums-3d',
                'type': 'fill-extrusion',
                'source': 'museums',
                'paint': {
                    'fill-extrusion-color': '#008000', //green
                    'fill-extrusion-height': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        12, ['*', 1, 10], // At zoom level 12, the building height will be NUMPOINTS * 10
                        20, ['*', 2, 100] // At zoom level 18, the building height will be NUMPOINTS * 100
                    ],
                    'fill-extrusion-base': 0,
                    'fill-extrusion-opacity': 0.6
                },
                'layout': {
                    'visibility': 'visible' // Ensure it's initially visible
                }
            });


            // Add the peaks layer
            map.addSource('points', {
                type: 'geojson',
                data: pointsGeoJSON
            });

            map.addLayer({
                'id': 'points-layer',
                'type': 'circle',
                'source': 'points',
                'paint': {
                    'circle-color': '#FF5733', // Color for the points
                    'circle-radius': 4 // Size of the points
                },
                'layout': {
                    'visibility': 'visible' // Ensure points are visible initially
                }
            });

            
            /*      Funtionalities      */

            // Store the original color of the buildings
            var originalColor = '#301934'; //purple
            var originalColor2 = '#008000'; //green
            var highlightedColor = '#FFFF00'; // Yellow color for highlighted building
            var highlightedBuildingId = null; // Track the ID of the currently highlighted building
            var highlightedPointId = null; // Track the ID of the currently highlighted point
            var highlightedMuseumId = null; // Track the ID of the currently highlighted building

            // Update the panel when the map view changes
            map.on('moveend', function () {
                updateBuildingPanel();
            });

            function updateBuildingPanel() {
                const buildingList = document.getElementById('building-list');
                buildingList.innerHTML = ''; // Clear the existing content
            
                // If there's a selected building, show its details
                if (highlightedBuildingId !== null) {
                    const buildingFeatures = map.queryRenderedFeatures({ layers: ['buildings-3d'] });
                    const highlightedBuilding = buildingFeatures.find(function (feature) {
                        return feature.properties.id === highlightedBuildingId;
                    });
            
                    if (highlightedBuilding) {
                        const building = highlightedBuilding.properties;
                        const buildingItem = document.createElement('div');
                        buildingItem.className = 'building-item';
                        buildingItem.innerHTML = `
                            <h4>${building.name_2 || 'Unnamed Building'}</h4>
                            <p><strong>Schedule:</strong> ${building.opening_hours || 'N/A'}</p>
                            <p><strong>Outdoor seating:</strong> ${building.outdoor_seating || 'N/A'}</p>
                            <p><strong>Website:</strong> ${building.website && building.website !== 'null' 
                                ? `<a href="${building.website}" target="_blank">${building.website}</a>` 
                                : 'N/A'}</p>
                        `;
                        buildingList.appendChild(buildingItem);
                    }
                }
            
                /* PDTE */
                // If there's a selected point, show its details
                else if (highlightedPointId !== null) {
                    const pointFeatures = map.queryRenderedFeatures({ layers: ['points-layer'] });
                    const highlightedPoint = pointFeatures.find(function (feature) {
                        return feature.properties.id === highlightedPointId;
                    });
            
                    if (highlightedPoint) {
                        const point = highlightedPoint.properties;
                        const pointItem = document.createElement('div');
                        pointItem.className = 'building-item';
                        pointItem.innerHTML = `
                            <h4>${point.name || 'Unnamed Point'}</h4>
                            <p><strong>Elevation:</strong> ${point.ele || 'N/A'}</p>
                        `;
                        buildingList.appendChild(pointItem);
                    }

                    // If there's a selected museum, show its details
                    else if (highlightedMuseumId !== null) {
                    const museumFeatures = map.queryRenderedFeatures({ layers: ['museums-3d'] });
                    const highlightedMuseum = museumFeatures.find(function (feature) {
                        return feature.properties.id === highlightedMuseumId;
                    });
            
                    if (highlightedMuseum) {
                        const museum = highlightedMuseum.properties;
                        const museumItem = document.createElement('div');
                        museumItem.className = 'museum-item';
                        museumItem.innerHTML = `
                            <h4>${museum.n_name || 'Unnamed Museum'}</h4>
                            <p><strong>Schedule:</strong> ${museum.opening_hours || 'N/A'}</p>
                            <p><strong>Website:</strong> ${museum.website && museum.website !== 'null' 
                                ? `<a href="${museum.website}" target="_blank">${museum.website}</a>` 
                                : 'N/A'}</p>
                        `;
                        buildingList.appendChild(museumItem);
                    }
                }
                }


            
                // If no feature is selected, show all visible buildings and points
                else {
                    let featuresFound = false;
            
                    // Check visibility of the 'buildings-3d' layer
                    if (map.getLayoutProperty('buildings-3d', 'visibility') === 'visible') {
                        const buildingFeatures = map.queryRenderedFeatures({ layers: ['buildings-3d'] });
                        if (buildingFeatures.length > 0) {
                            buildingFeatures.forEach(function (feature) {
                                const building = feature.properties;
                                const buildingItem = document.createElement('div');
                                buildingItem.className = 'building-item';
                                buildingItem.innerHTML = `
                                    <h4>${building.name_2 || 'Unnamed Building'}</h4>
                                    <p><strong>Schedule:</strong> ${building.opening_hours || 'N/A'}</p>
                                    <p><strong>Outdoor seating:</strong> ${building.outdoor_seating || 'N/A'}</p>
                                    <p><strong>Website:</strong> ${building.website && building.website !== 'null' 
                                        ? `<a href="${building.website}" target="_blank">${building.website}</a>` 
                                        : 'N/A'}</p>
                                `;
                                buildingList.appendChild(buildingItem);
                                featuresFound = true;
                            });
                        }
                    }
            
                    // Check visibility of the 'points-layer'
                    if (map.getLayoutProperty('points-layer', 'visibility') === 'visible') {
                        const pointFeatures = map.queryRenderedFeatures({ layers: ['points-layer'] });
                        if (pointFeatures.length > 0) {
                            pointFeatures.forEach(function (feature) {
                                const point = feature.properties;
                                const pointItem = document.createElement('div');
                                pointItem.className = 'building-item';
                                pointItem.innerHTML = `
                                    <h4>${point.name || 'Unnamed Point'}</h4>
                                    <p><strong>Elevation:</strong> ${point.ele || 'N/A'}</p>
                                `;
                                buildingList.appendChild(pointItem);
                                featuresFound = true;
                            });
                        }
                    }

                    // Check visibility of the 'museum-layer'
                    if (map.getLayoutProperty('museums-3d', 'visibility') === 'visible') {
                        const museumFeatures = map.queryRenderedFeatures({ layers: ['museums-3d'] });
                        if (museumFeatures.length > 0) {
                            museumFeatures.forEach(function (feature) {
                                const museum = feature.properties;
                                const museumItem = document.createElement('div');
                                museumItem.className = 'building-item';
                                museumItem.innerHTML = `
                                    <h4>${museum.n_name || 'Unnamed Museum'}</h4>
                                    <p><strong>Schedule:</strong> ${museum.opening_hours || 'N/A'}</p>
                                    <p><strong>Outdoor seating:</strong> ${museum.outdoor_seating || 'N/A'}</p>
                                    <p><strong>Website:</strong> ${museum.website && building.website !== 'null' 
                                        ? `<a href="${museum.website}" target="_blank">${museum.website}</a>` 
                                        : 'N/A'}</p>
                                `;
                                buildingList.appendChild(museumItem);
                                featuresFound = true;
                            });
                        }
                    }

                    // If no features were found in visible layers, show a default message
                    if (!featuresFound) {
                        buildingList.innerHTML = '<p>No features available in the visible layers.</p>';
                    }
                }
            }
            
            
            

            //*      Zoom event to reset highlighted building color and deselect if zoomed out too much     */
            map.on('zoomend', function () {
                // Get current zoom level
                var currentZoom = map.getZoom();
                var zoomThreshold = 14.5; // Threshold for deselecting

                // If the zoom level is lower than the threshold, reset highlighted features
                if (currentZoom < zoomThreshold) {
                    if (highlightedBuildingId !== null) {
                        // Reset building highlight
                        map.setPaintProperty('buildings-3d', 'fill-extrusion-color', originalColor);
                    }
                    if (highlightedPointId !== null) {
                        // Reset point highlight
                        map.setPaintProperty('points-layer', 'circle-color', '#FF5733'); // Default point color
                    }
                    if (highlightedMuseumId !== null) {
                        // Reset museum highlight
                        map.setPaintProperty('museums-3d', 'fill-extrusion-color', originalColor2);
                    }

                    highlightedBuildingId = null; // Deselect building
                    highlightedPointId = null; // Deselect point
                    highlightedMuseumId = null; // Deselect museum
                    updateBuildingPanel(); // Reset the building info panel
                } else {
                    // If zoom is above the threshold, reset the colors for the previously highlighted building
                    if (highlightedBuildingId !== null) {
                        map.setPaintProperty('buildings-3d', 'fill-extrusion-color', [
                            'case',
                            ['==', ['get', 'id'], highlightedBuildingId],
                            highlightedColor,
                            originalColor
                        ]);
                    }
                }
            });


            /*      Click event to the 'buildings-3d' layer     */
            map.on('click', 'buildings-3d', function (e) {
                const clickedFeature = e.features[0];  // The clicked building feature
                const building = clickedFeature.properties;

                // Reset highlights for both layers
                resetHighlights();

                // Highlight the clicked building
                highlightedBuildingId = building.id;
                map.setPaintProperty('buildings-3d', 'fill-extrusion-color', [
                    'case',
                    ['==', ['get', 'id'], highlightedBuildingId],
                    highlightedColor,
                    originalColor
                ]);

                // Fly to the building
                const coordinates = clickedFeature.geometry.coordinates[0][0]; // Assuming Polygon geometry
                map.flyTo({
                    center: coordinates,
                    zoom: 15,
                    pitch: 45,
                    bearing: 0
                });

                // Update the side panel with building information
                const buildingList = document.getElementById('building-list');
                buildingList.innerHTML = `
                    <div class="building-item">
                        <h4>${building.name_2 || 'Unnamed Building'}</h4>
                        <p><strong>Schedule:</strong> ${building.opening_hours || 'N/A'}</p>
                        <p><strong>Outdoor seating:</strong> ${building.outdoor_seating || 'N/A'}</p>
                        <p><strong>Website:</strong> ${building.website && building.website !== 'null' 
                            ? `<a href="${building.website}" target="_blank">${building.website}</a>` 
                            : 'N/A'}</p>
                    </div>
                `;
            });

            
            // Click event for 'points-layer'
            map.on('click', 'points-layer', function (e) {
                const clickedFeature = e.features[0]; // The clicked point feature
                const point = clickedFeature.properties;

                // Check if clickedFeature is not null or undefined
                if (!clickedFeature) {
                    console.log("No feature clicked.");
                    return;
                }

                // Reset highlights for both layers
                resetHighlights();

                // Highlight the clicked point
                highlightedPointId = point.id;
                map.setPaintProperty('points-layer', 'circle-color', [
                    'case',
                    ['==', ['get', 'id'], highlightedPointId],
                    '#FFFF00', // Highlighted point color
                    '#FF5733' // Default point color
                ]);

                // Zoom to the clicked point
                const coordinates = clickedFeature.geometry.coordinates; // [longitude, latitude]
                map.flyTo({
                    center: coordinates,
                    zoom: 15, 
                    speed: 0.5, 
                    curve: 1, 
                    easing: function (t) {
                        return t;
                    }
                });

                // Update the side panel with point information
                const buildingList = document.getElementById('building-list');
                buildingList.innerHTML = `
                    <div class="building-item">
                        <h4>${point.name || 'Unnamed Point'}</h4>
                        <p><strong>Elevation:</strong> ${point.ele || 'N/A'}</p>
                    </div>
                `;
            });

             /*      Click event to the 'museums-3d' layer     */
             map.on('click', 'museums-3d', function (e) {
                const clickedFeature = e.features[0];  // The clicked museum feature
                const museum = clickedFeature.properties;

                // Reset highlights for both layers
                resetHighlights();

                // Highlight the clicked building
                highlightedMuseumId = museum.id;
                map.setPaintProperty('museums-3d', 'fill-extrusion-color', [
                    'case',
                    ['==', ['get', 'id'], highlightedMuseumId],
                    highlightedColor,
                    originalColor2
                ]);

                // Fly to the museum
                const coordinates = clickedFeature.geometry.coordinates[0][0]; 
                map.flyTo({
                    center: coordinates,
                    zoom: 15,
                    pitch: 45,
                    bearing: 0
                });

                // Update the side panel with building information
                const buildingList = document.getElementById('building-list');
                buildingList.innerHTML = `
                    <h4>${museum.n_name || 'Unnamed Museum'}</h4>
                    <p><strong>Schedule:</strong> ${museum.opening_hours || 'N/A'}</p>
                    <p><strong>Outdoor seating:</strong> ${museum.outdoor_seating || 'N/A'}</p>
                    <p><strong>Website:</strong> ${museum.website && building.website !== 'null' 
                        ? `<a href="${museum.website}" target="_blank">${museum.website}</a>` 
                        : 'N/A'}</p>
                `;
            });




            /*      Function to reset highlights and clear the panel      */
            function resetHighlights() {
                // Reset building highlights
                if (highlightedBuildingId !== null) {
                    map.setPaintProperty('buildings-3d', 'fill-extrusion-color', originalColor);
                    highlightedBuildingId = null;
                }

                // Reset point highlights
                if (highlightedPointId !== null) {
                    map.setPaintProperty('points-layer', 'circle-color', '#FF5733'); // Default point color
                    highlightedPointId = null;
                }

                // Reset museum highlights
                if (highlightedMuseumId !== null) {
                    map.setPaintProperty('museums-3d', 'fill-extrusion-color', originalColor);
                    highlightedMuseumId = null;
                }

                // Clear the panel
                const buildingList = document.getElementById('building-list');
                buildingList.innerHTML = '';
            }



            /*    Change the cursor to a pointer when hovering over the features    */
            map.on('mouseenter', 'buildings-3d', function () {
                map.getCanvas().style.cursor = 'pointer';
            });

            map.on('mouseleave', 'points-layer', function () {
                map.getCanvas().style.cursor = '';
            });

            map.on('mouseleave', 'museums-3d', function () {
                map.getCanvas().style.cursor = '';
            });




            /*      Add the Layer Control     */
            var layerControl = document.createElement('div');
            layerControl.className = 'mapboxgl-ctrl-group mapboxgl-ctrl layer-control';

            // Button for Buildings
            var toggleBuildingsBtn = document.createElement('button');
            toggleBuildingsBtn.innerText = 'Cafes';
            toggleBuildingsBtn.className = 'toggle-button';

            toggleBuildingsBtn.addEventListener('click', function () {
                var visibility = map.getLayoutProperty('buildings-3d', 'visibility');
                if (visibility === 'visible') {
                    map.setLayoutProperty('buildings-3d', 'visibility', 'none');
                    document.getElementById('building-list').innerHTML = '<p>Layer is turned off.</p>'; // Clear the side container
                } else {
                    map.setLayoutProperty('buildings-3d', 'visibility', 'visible');
                    updateBuildingPanel(); // Update the panel when the layer is turned back on
                }
            });

            // Button for Points
            var togglePointsBtn = document.createElement('button1');
            togglePointsBtn.innerText = 'Peaks';
            togglePointsBtn.className = 'toggle-button'; // Assign a CSS class

            togglePointsBtn.addEventListener('click', function () {
                var visibility = map.getLayoutProperty('points-layer', 'visibility');
                if (visibility === 'visible') {
                    map.setLayoutProperty('points-layer', 'visibility', 'none');
                    document.getElementById('points-list').innerHTML = '<p>Layer is turned off.</p>'; // Clear the side container
                } else {
                    map.setLayoutProperty('points-layer', 'visibility', 'visible');
                    updateBuildingPanel(); // Update the panel when the layer is turned back on
                }
            });
 
            // Button for Museums
            var toggleMuseumsBtn = document.createElement('button2');
            toggleMuseumsBtn.innerText = 'Museums';
            toggleMuseumsBtn.className = 'toggle-button';

            toggleMuseumsBtn.addEventListener('click', function () {
                var visibility = map.getLayoutProperty('museums-3d', 'visibility');
                if (visibility === 'visible') {
                    map.setLayoutProperty('museums-3d', 'visibility', 'none');
                    document.getElementById('building-list').innerHTML = '<p>Layer is turned off.</p>'; // Clear the side container
                } else {
                    map.setLayoutProperty('museums-3d', 'visibility', 'visible');
                    updateBuildingPanel(); // Update the panel when the layer is turned back on
                }
            });

            layerControl.appendChild(toggleBuildingsBtn);
            layerControl.appendChild(togglePointsBtn);
            layerControl.appendChild(toggleMuseumsBtn);
            map.getContainer().appendChild(layerControl);
            // Event listener for the "Got it!" button to close the welcome box
            document.getElementById('close-welcome').addEventListener('click', function () {
                const welcomeBox = document.getElementById('welcome-box');
                welcomeBox.style.visibility = 'hidden'; // Hide the box
                welcomeBox.style.opacity = '0'; // Fade it out
            });
        })
        .catch(error => console.error("Error loading GeoJSON:", error));
});


