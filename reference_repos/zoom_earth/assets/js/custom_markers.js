// Custom Marker Overlay System for Zoom Earth Clone
// This script runs in the parent sandbox window and mathematically projects 
// real-world coordinates onto the iframe screen based on the map's center.

const customPoints = [
    { id: 'landslide-1', lat: 25.75, lon: 91.88, label: 'Critical Sector A', color: '#ef4444' },
    { id: 'landslide-2', lat: 26.14, lon: 91.73, label: 'Guwahati Zone', color: '#f97316' },
    { id: 'flood-1', lat: 24.8, lon: 92.5, label: 'High Water Level', color: '#3b82f6' }
];

// Web Mercator Projection Math
function lonLatToMercator(lon, lat) {
    const r = 6378137; // Earth radius in meters
    const x = r * lon * Math.PI / 180;
    const y = r * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
    return { x, y };
}

function initOverlay() {
    console.log("Initializing Custom Marker Overlay...");
    const iframe = document.getElementById('map-frame');
    const overlay = document.getElementById('marker-overlay');

    // Create marker DOM elements
    const markerElements = {};
    customPoints.forEach(point => {
        const div = document.createElement('div');
        div.className = 'custom-marker';
        div.style.backgroundColor = point.color;
        div.style.boxShadow = `0 0 12px ${point.color}, 0 0 4px white inset`;
        
        const label = document.createElement('div');
        label.className = 'custom-marker-label';
        label.innerText = point.label;
        div.appendChild(label);
        
        overlay.appendChild(div);
        markerElements[point.id] = div;
    });

    // We need to continuously read the map state and update positions
    function updateMarkers() {
        try {
            // Attempt to read the hash from the iframe (e.g., #view=25.7,91.8,6z)
            const hash = iframe.contentWindow.location.hash;
            let centerLat = 22.21579;
            let centerLon = 78.49044;
            let zoom = 5;

            if (hash && hash.includes('view=')) {
                const match = hash.match(/view=([-.\d]+),([-.\d]+),([-.\d]+)z/);
                if (match) {
                    centerLat = parseFloat(match[1]);
                    centerLon = parseFloat(match[2]);
                    zoom = parseFloat(match[3]);
                }
            }

            // Screen dimensions
            const width = overlay.clientWidth;
            const height = overlay.clientHeight;

            // Calculate center mercator
            const centerM = lonLatToMercator(centerLon, centerLat);
            
            // Mapbox/Zoom Earth standard resolution at zoom 0 is 2 * PI * 6378137 / 512 pixels
            // (Assuming 512px tile size)
            const initialResolution = 2 * Math.PI * 6378137 / 512;
            const resolution = initialResolution / Math.pow(2, zoom);

            customPoints.forEach(point => {
                const pointM = lonLatToMercator(point.lon, point.lat);
                const el = markerElements[point.id];

                // Calculate pixel offset from center
                const dx = (pointM.x - centerM.x) / resolution;
                const dy = (centerM.y - pointM.y) / resolution; // Y axis is inverted on screen

                const screenX = (width / 2) + dx;
                const screenY = (height / 2) + dy;

                // Hide if way off screen
                if (screenX < -100 || screenX > width + 100 || screenY < -100 || screenY > height + 100) {
                    el.style.display = 'none';
                } else {
                    el.style.display = 'flex';
                    el.style.transform = `translate(${screenX}px, ${screenY}px)`;
                }
            });

        } catch (e) {
            // Ignore cross-origin errors during load
        }
        
        requestAnimationFrame(updateMarkers);
    }

    // Start render loop
    requestAnimationFrame(updateMarkers);
}

// Wait for iframe to load
window.onload = () => {
    setTimeout(initOverlay, 1000);
};
