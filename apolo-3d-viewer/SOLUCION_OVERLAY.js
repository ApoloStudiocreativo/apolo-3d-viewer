// ========================================
// SOLUCIÓN FINAL PARA EL OVERLAY AR
// ========================================

/**
 * PROBLEMA IDENTIFICADO:
 * El overlay SÍ aparece pero desaparece inmediatamente (flashazo)
 * porque el evento 'visibilitychange' lo oculta cuando cambias a la app de AR.
 * 
 * SOLUCIÓN:
 * Comentar/eliminar el listener de visibilitychange
 */

// ========================================
// PASO 1: Busca las líneas 906-915 en index.html
// ========================================
// Deberías ver esto:

// Solo ocultar overlay cuando el usuario vuelve a la página
// (esto permite que el overlay se mantenga mientras AR se abre)
document.addEventListener('visibilitychange', () => {
    // Esperar un poco para asegurar que AR realmente se abrió
    if (!document.hidden) {
        setTimeout(() => {
            hideARLoading();
        }, 500);
    }
});

// ========================================
// PASO 2: REEMPLÁZALO con esto (comentado):
// ========================================

// ⚠️ DESHABILITADO: No ocultar automáticamente el overlay
// El overlay debe mantenerse visible hasta que AR cargue completamente
// Solo se ocultará por timeout (60s)
/*
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    setTimeout(() => {
      hideARLoading();
    }, 500);
  }
});
*/

// ========================================
// RESULTADO ESPERADO:
// ========================================
// 1. Tocas botón AR
// 2. Overlay aparece INMEDIATAMENTE con fondo oscuro
// 3. Cambias a la app de AR
// 4. Overlay SE MANTIENE VISIBLE (no desaparece)
// 5. AR carga y se abre
// 6. Cuando vuelves a la página, el overlay sigue ahí
// 7. Solo desaparece por timeout (60s) o si cierras manualmente

// ========================================
// ALTERNATIVA: Si quieres que desaparezca al volver
// ========================================
// Puedes dejarlo así pero con un delay MÁS LARGO:

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Esperar 5 segundos después de volver
        setTimeout(() => {
            hideARLoading();
        }, 5000); // 5 segundos
    }
});
