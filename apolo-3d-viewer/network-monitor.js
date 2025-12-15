/* ========================================
   Network Monitor - Adaptive Loading
   Detecta velocidad de conexión y adapta
   la calidad de los assets
   ======================================== */

/**
 * Obtiene información de la conexión actual
 * @returns {Object} Información de conexión { type, saveData, downlink, rtt }
 */
export function getConnectionSpeed() {
    // Network Information API (Chrome/Edge)
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (!conn) {
        return {
            type: 'unknown',
            saveData: false,
            downlink: null,
            rtt: null,
            isSlowConnection: false
        };
    }

    const effectiveType = conn.effectiveType; // 'slow-2g', '2g', '3g', '4g'
    const saveData = conn.saveData || false;
    const downlink = conn.downlink; // Mbps
    const rtt = conn.rtt; // Round-trip time en ms

    // Considerar conexión lenta si es 2G, 3G lento, o SaveData activado
    const isSlowConnection =
        ['slow-2g', '2g'].includes(effectiveType) ||
        (effectiveType === '3g' && rtt > 400) ||
        saveData;

    return {
        type: effectiveType,
        saveData,
        downlink,
        rtt,
        isSlowConnection
    };
}

/**
 * Determina si se deben usar assets de alta calidad
 * @param {Object} connection - Información de conexión
 * @returns {boolean}
 */
export function shouldUseHighQuality(connection) {
    if (!connection) {
        connection = getConnectionSpeed();
    }

    return connection.type === '4g' && !connection.saveData;
}

/**
 * Selecciona la URL del asset según la velocidad de conexión
 * @param {string} originalUrl - URL original del asset
 * @param {string} type - Tipo: 'hdr', 'model', 'image', 'audio'
 * @returns {string} URL optimizada según conexión
 */
export function selectAssetQuality(originalUrl, type = 'image') {
    const conn = getConnectionSpeed();

    // Si conexión rápida o desconocida, usar original
    if (!conn.isSlowConnection) {
        return originalUrl;
    }

    // Estrategias según tipo de asset
    switch (type) {
        case 'hdr':
            // En conexión lenta, usar HDR de menor resolución (2k → 1k)
            if (originalUrl.includes('2k.hdr')) {
                return originalUrl.replace('2k.hdr', '1k.hdr');
            }
            return originalUrl;

        case 'image':
        case 'poster':
            // Usar versión low-res si está disponible
            if (originalUrl.includes('/posters/desktop/')) {
                return originalUrl.replace('/posters/desktop/', '/posters/mobile/');
            }
            return originalUrl;

        case 'model':
            // Los modelos ya están optimizados, devolver original
            // (futura optimización: versión preview ultra-ligera)
            return originalUrl;

        case 'audio':
            // Audio ya optimizado, devolver original
            return originalUrl;

        default:
            return originalUrl;
    }
}

/**
 * Muestra un aviso al usuario si la conexión es muy lenta
 * @param {Function} showToastFn - Función toast del proyecto
 */
export function warnIfSlowConnection(showToastFn) {
    const conn = getConnectionSpeed();

    if (conn.type === 'slow-2g' || conn.type === '2g') {
        showToastFn?.('⚠️ Conexión lenta detectada. La carga puede tardar más de lo habitual.', 4000);
    }
}

/**
 * Listener de cambios en la conexión
 * @param {Function} callback - Función a ejecutar cuando cambie la conexión
 */
export function onConnectionChange(callback) {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (!conn) return null;

    const handler = () => {
        callback(getConnectionSpeed());
    };

    conn.addEventListener('change', handler);

    // Retornar función de cleanup
    return () => {
        conn.removeEventListener('change', handler);
    };
}

/**
 * Determina si se debe habilitar prefetch basado en conexión
 * @returns {boolean}
 */
export function shouldPrefetch() {
    const conn = getConnectionSpeed();

    // Solo prefetch en 4G o mejor, sin save-data
    return (conn.type === '4g' || conn.type === 'unknown') && !conn.saveData;
}

/* Log para debugging */
if (typeof window !== 'undefined') {
    const conn = getConnectionSpeed();
    console.log('[Network Monitor] Conexión detectada:', {
        tipo: conn.type,
        saveData: conn.saveData,
        lenta: conn.isSlowConnection,
        downlink: conn.downlink ? `${conn.downlink} Mbps` : 'N/A',
        rtt: conn.rtt ? `${conn.rtt}ms` : 'N/A'
    });
}
