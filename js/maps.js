// 1) Inicializa el mapa (WebMercator)
var map = L.map('map').setView([-1.4043226899226577, -78.454611807775], 18);

// Función para convertir WGS84 a UTM 17S (EPSG:32717)
function wgs84ToUtm17s(lat, lng) {
    // Parámetros para UTM Zone 17S
    var a = 6378137.0; // Semi-eje mayor WGS84
    var f = 1/298.257223563; // Aplanamiento WGS84
    var k0 = 0.9996; // Factor de escala
    var e = Math.sqrt(2*f - f*f); // Excentricidad
    var e2 = e*e;
    var n = (a - a*(1-f)) / (a + a*(1-f));
    
    var latRad = lat * Math.PI / 180;
    var lngRad = lng * Math.PI / 180;
    
    // Meridiano central de la zona UTM 17
    var lng0 = -81 * Math.PI / 180;
    var deltaLng = lngRad - lng0;
    
    var A = a / (1 + n) * (1 + n*n/4 + n*n*n*n/64);
    var alpha1 = n/2 - 2*n*n*n/3;
    var alpha2 = 13*n*n/48 - 3*n*n*n*n/5;
    var alpha3 = 61*n*n*n/240;
    
    var t = Math.tan(latRad);
    var eta2 = e2 * Math.cos(latRad) * Math.cos(latRad) / (1 - e2);
    var N = a / Math.sqrt(1 - e2 * Math.sin(latRad) * Math.sin(latRad));
    
    var T = t * t;
    var C = eta2;
    
    var x = k0 * N * (deltaLng + (1 - T + C) * deltaLng*deltaLng*deltaLng / 6 + 
                      (5 - 18*T + T*T + 72*C - 58*eta2) * Math.pow(deltaLng, 5) / 120);
    
    var M = A * (latRad - alpha1 * Math.sin(2*latRad) + alpha2 * Math.sin(4*latRad) - alpha3 * Math.sin(6*latRad));
    
    var y = k0 * (M + N * Math.tan(latRad) * (deltaLng*deltaLng/2 + 
                  (5 - T + 9*C + 4*C*C) * Math.pow(deltaLng, 4) / 24 + 
                  (61 - 58*T + T*T + 600*C - 330*eta2) * Math.pow(deltaLng, 6) / 720));
    
    // Ajustes para hemisferio sur y false easting
    x += 500000; // False Easting
    y += 10000000; // False Northing para hemisferio sur
    
    return {
        x: Math.round(x * 1000) / 1000,
        y: Math.round(y * 1000) / 1000
    };
}

// 2) Capas base
var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

// Capa satelital de Google Maps
var googleSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '© Google Maps'
});

// Capa híbrida de Google Maps (satelital con etiquetas)
var googleHybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '© Google Maps'
});

// 3) Capa WMS dinámica
var ortoBanos = L.tileLayer.wms('https://acroming.xyz/geoserver/Banos2/wms', {
    layers: 'Banos2:ORTOMOSAICO_WGS84_OPT_BAÑOS',
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    crs: L.CRS.EPSG3857,
    maxZoom: 23,
    attribution: 'Ortofoto Baños2'
}).addTo(map);

// 4) Control de capas con múltiples mapas base
var baseMaps = {
    'OpenStreetMap': osmLayer,
    'Google Satelital': googleSatellite,
    'Google Híbrido': googleHybrid
};

var overlayMaps = {
    'Ortomosaico Baños': ortoBanos
};

L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

// 5) Control de escala
L.control.scale({ position: 'bottomright' }).addTo(map);

// 6) Control de coordenadas - Función simple y directa
map.on('mousemove', function (e) {
    var coordDiv = document.getElementById('coordinates');
    var utmDiv = document.getElementById('coordinates-utm');
    
    if (coordDiv) {
        coordDiv.innerHTML = 'Lat: ' + e.latlng.lat.toFixed(6) + '<br>Lng: ' + e.latlng.lng.toFixed(6);
    }
    
    if (utmDiv) {
        var utm = wgs84ToUtm17s(e.latlng.lat, e.latlng.lng);
        utmDiv.innerHTML = 'X: ' + utm.x.toFixed(3) + '<br>Y: ' + utm.y.toFixed(3);
    }
});

// Mostrar coordenadas al hacer clic
map.on('click', function (e) {
    var coordDiv = document.getElementById('coordinates');
    var utmDiv = document.getElementById('coordinates-utm');
    
    if (coordDiv) {
        coordDiv.innerHTML = '<strong>Clicked WGS84:</strong><br>Lat: ' + e.latlng.lat.toFixed(6) + '<br>Lng: ' + e.latlng.lng.toFixed(6);
    }
    
    if (utmDiv) {
        var utm = wgs84ToUtm17s(e.latlng.lat, e.latlng.lng);
        utmDiv.innerHTML = '<strong>Clicked UTM 17S:</strong><br>X: ' + utm.x.toFixed(3) + '<br>Y: ' + utm.y.toFixed(3);
    }
});

// 7) Controles del sidebar
window.addEventListener('load', function() {
    // Control de checkbox para ortofoto
    var ortoCheckbox = document.getElementById('ortoChk');
    if (ortoCheckbox) {
        ortoCheckbox.addEventListener('change', function(e) {
            if (e.target.checked) {
                if (!map.hasLayer(ortoBanos)) {
                    map.addLayer(ortoBanos);
                }
            } else {
                if (map.hasLayer(ortoBanos)) {
                    map.removeLayer(ortoBanos);
                }
            }
        });
    }
    
    // Control de radio buttons para capas base
    var osmRadio = document.getElementById('osmRadio');
    var satelliteRadio = document.getElementById('satelliteRadio');
    var hybridRadio = document.getElementById('hybridRadio');
    
    if (osmRadio) {
        osmRadio.addEventListener('change', function(e) {
            if (e.target.checked) {
                map.removeLayer(googleSatellite);
                map.removeLayer(googleHybrid);
                map.addLayer(osmLayer);
            }
        });
    }
    
    if (satelliteRadio) {
        satelliteRadio.addEventListener('change', function(e) {
            if (e.target.checked) {
                map.removeLayer(osmLayer);
                map.removeLayer(googleHybrid);
                map.addLayer(googleSatellite);
            }
        });
    }
    
    if (hybridRadio) {
        hybridRadio.addEventListener('change', function(e) {
            if (e.target.checked) {
                map.removeLayer(osmLayer);
                map.removeLayer(googleSatellite);
                map.addLayer(googleHybrid);
            }
        });
    }
});
