// ========================================
// VERSIÓN FORZADA DE showARLoading()
// ========================================
// Reemplaza la función showARLoading() (líneas 809-851) con este código:

function showARLoading() {
    console.log('🔥 showARLoading() LLAMADO'); // DEBUG

    const el = document.getElementById('arLoading');
    const btn = document.getElementById('arBtn');
    const textEl = document.getElementById('arLoadingText');

    if (!el) {
        console.error('❌ NO SE ENCONTRÓ #arLoading');
        return;
    }

    console.log('✅ Elemento arLoading encontrado:', el);

    // 🔥 FEEDBACK INSTANTÁNEO: Cambiar botón a estado loading INMEDIATAMENTE
    if (btn) {
        console.log('✅ Botón AR encontrado, cambiando estado...');
        btn.classList.add('is-loading');
        btn.setAttribute('disabled', 'true');

        // Cambiar texto del botón
        const arText = btn.querySelector('.ar-text');
        if (arText) arText.textContent = 'Preparando…';

        // Vibración háptica si está disponible
        try {
            if (navigator.vibrate) navigator.vibrate(20);
        } catch { }
    }

    // Mostrar overlay con mensaje específico por plataforma
    if (textEl) {
        if (isIOS) {
            textEl.textContent = 'Abriendo Quick Look…';
        } else if (isAndroid) {
            textEl.textContent = 'Iniciando Scene Viewer…';
        } else {
            textEl.textContent = 'Preparando experiencia AR…';
        }
    }

    // 🚨 FORZAR OVERLAY A APARECER CON ESTILOS INLINE
    console.log('🚨 FORZANDO OVERLAY A APARECER...');
    el.classList.remove('hidden');

    // Forzar estilos inline para que SÍ O SÍ aparezca
    el.style.display = 'flex';
    el.style.position = 'fixed';
    el.style.inset = '0';
    el.style.zIndex = '99999';
    el.style.background = 'rgba(10, 12, 16, 0.95)';
    el.style.opacity = '0';
    el.style.visibility = 'visible';

    // Forzar transición de opacidad
    requestAnimationFrame(() => {
        el.classList.add('visible');
        el.style.opacity = '1';
        console.log('✅ Overlay debería estar visible ahora');
    });

    // Timeout de seguridad: si tarda más de 45s, ocultar overlay
    clearTimeout(arLoadingTimeout);
    arLoadingTimeout = setTimeout(() => {
        console.warn('⏱️ TIMEOUT: AR tardó más de 45s');
        hideARLoading();
    }, 45000);
}

// ========================================
// INSTRUCCIONES:
// ========================================
// 1. Busca la función showARLoading() en index.html (líneas 809-851)
// 2. Reemplázala completamente con el código de arriba
// 3. Guarda y haz deploy
// 4. Abre la consola del navegador (F12) en tu móvil
// 5. Toca el botón AR
// 6. Deberías ver los console.log en la consola
// 7. El overlay DEBE aparecer con fondo oscuro
