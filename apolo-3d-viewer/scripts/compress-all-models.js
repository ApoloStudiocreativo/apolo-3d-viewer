/**
 * ========================================
 * Script de Compresión Draco - ULTRA ALTA CALIDAD
 * Para modelos de patrimonio histórico
 * ========================================
 * 
 * Este script comprime todos los archivos .glb con configuración
 * de MÁXIMA CALIDAD para preservar:
 * - Detalles de la talla (geometría suave, no poligonal)
 * - Texturas de policromado (UVs de alta precisión)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuración ULTRA ALTA CALIDAD (14 bits)
const DRACO_CONFIG = {
    quantizePosition: 14,    // Máxima precisión geométrica
    quantizeNormal: 10,      // Normales (suficiente para iluminación)
    quantizeTexcoord: 14,    // 🔥 CRÍTICO: Máxima calidad para texturas
    quantizeColor: 10,       // Colores de vértices
    quantizeGeneric: 12      // Otros atributos
};

const MODELS_DIR = path.join(__dirname, '../models');
const REPORT_FILE = path.join(__dirname, '../compression-report.txt');

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m'
};

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function findGlbFiles(dir) {
    const files = [];

    function searchDir(currentDir) {
        const items = fs.readdirSync(currentDir);

        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                searchDir(fullPath);
            } else if (item.endsWith('.glb')) {
                files.push(fullPath);
            }
        }
    }

    searchDir(dir);
    return files;
}

function compressModel(filePath) {
    const fileName = path.basename(filePath);
    const dirName = path.dirname(filePath);
    const backupPath = filePath.replace('.glb', '.original.glb');

    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}📦 Procesando: ${fileName}${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    // Tamaño original
    const originalSize = fs.statSync(filePath).size;
    console.log(`📏 Tamaño original: ${formatBytes(originalSize)}`);

    // Crear backup
    console.log(`💾 Creando backup: ${path.basename(backupPath)}`);
    fs.copyFileSync(filePath, backupPath);

    // Construir comando gltf-transform
    const tempOutput = filePath.replace('.glb', '.compressed.glb');

    const command = `npx gltf-transform draco "${filePath}" "${tempOutput}" ` +
        `--quantize-position ${DRACO_CONFIG.quantizePosition} ` +
        `--quantize-normal ${DRACO_CONFIG.quantizeNormal} ` +
        `--quantize-texcoord ${DRACO_CONFIG.quantizeTexcoord} ` +
        `--quantize-color ${DRACO_CONFIG.quantizeColor} ` +
        `--quantize-generic ${DRACO_CONFIG.quantizeGeneric}`;

    try {
        console.log(`⚙️  Comprimiendo con Draco (ultra-alta calidad)...`);
        console.log(`   - Position: ${DRACO_CONFIG.quantizePosition} bits`);
        console.log(`   - Texcoord: ${DRACO_CONFIG.quantizeTexcoord} bits (máxima calidad para policromado)`);

        execSync(command, { stdio: 'inherit' });

        // Reemplazar archivo original con comprimido
        fs.unlinkSync(filePath);
        fs.renameSync(tempOutput, filePath);

        // Tamaño comprimido
        const compressedSize = fs.statSync(filePath).size;
        const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);
        const savedMB = ((originalSize - compressedSize) / (1024 * 1024)).toFixed(2);

        console.log(`${colors.green}✅ Compresión completada${colors.reset}`);
        console.log(`📏 Tamaño final: ${formatBytes(compressedSize)}`);
        console.log(`${colors.green}💾 Reducción: ${reduction}% (${savedMB} MB ahorrados)${colors.reset}`);

        return {
            file: fileName,
            originalSize,
            compressedSize,
            reduction: parseFloat(reduction),
            saved: parseFloat(savedMB)
        };

    } catch (error) {
        console.error(`${colors.red}❌ Error comprimiendo ${fileName}:${colors.reset}`, error.message);

        // Restaurar backup si algo falla
        if (fs.existsSync(backupPath)) {
            if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
            if (!fs.existsSync(filePath)) fs.copyFileSync(backupPath, filePath);
        }

        return null;
    }
}

function generateReport(results) {
    let report = '═══════════════════════════════════════════════════════════\n';
    report += '  REPORTE DE COMPRESIÓN DRACO - ULTRA ALTA CALIDAD\n';
    report += '═══════════════════════════════════════════════════════════\n\n';
    report += `Generado: ${new Date().toLocaleString('es-ES')}\n\n`;
    report += 'CONFIGURACIÓN UTILIZADA:\n';
    report += `  - quantizePosition: ${DRACO_CONFIG.quantizePosition} bits (máxima precisión geométrica)\n`;
    report += `  - quantizeTexcoord: ${DRACO_CONFIG.quantizeTexcoord} bits (máxima calidad para texturas)\n`;
    report += `  - quantizeNormal: ${DRACO_CONFIG.quantizeNormal} bits\n`;
    report += `  - quantizeColor: ${DRACO_CONFIG.quantizeColor} bits\n\n`;

    report += '───────────────────────────────────────────────────────────\n';
    report += 'RESULTADOS POR MODELO:\n';
    report += '───────────────────────────────────────────────────────────\n\n';

    const successful = results.filter(r => r !== null);
    let totalOriginal = 0;
    let totalCompressed = 0;

    successful.forEach(result => {
        report += `📦 ${result.file}\n`;
        report += `   Original:    ${formatBytes(result.originalSize)}\n`;
        report += `   Comprimido:  ${formatBytes(result.compressedSize)}\n`;
        report += `   Reducción:   ${result.reduction}%\n`;
        report += `   Ahorrado:    ${result.saved} MB\n\n`;

        totalOriginal += result.originalSize;
        totalCompressed += result.compressedSize;
    });

    const totalReduction = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1);
    const totalSaved = ((totalOriginal - totalCompressed) / (1024 * 1024)).toFixed(2);

    report += '═══════════════════════════════════════════════════════════\n';
    report += 'TOTALES:\n';
    report += '═══════════════════════════════════════════════════════════\n';
    report += `  Tamaño original total:    ${formatBytes(totalOriginal)}\n`;
    report += `  Tamaño comprimido total:  ${formatBytes(totalCompressed)}\n`;
    report += `  Reducción total:          ${totalReduction}%\n`;
    report += `  Espacio ahorrado:         ${totalSaved} MB\n\n`;
    report += `  Modelos procesados:       ${successful.length}\n`;
    report += `  Modelos fallidos:         ${results.length - successful.length}\n\n`;

    report += '───────────────────────────────────────────────────────────\n';
    report += 'BACKUPS CREADOS:\n';
    report += '───────────────────────────────────────────────────────────\n';
    report += 'Todos los archivos originales fueron respaldados con la\n';
    report += 'extensión .original.glb en el mismo directorio.\n\n';
    report += 'Para restaurar un modelo original:\n';
    report += '  1. Elimina el archivo .glb comprimido\n';
    report += '  2. Renombra el archivo .original.glb a .glb\n';
    report += '═══════════════════════════════════════════════════════════\n';

    return report;
}

// Función principal
function main() {
    console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  COMPRESIÓN DRACO - ULTRA ALTA CALIDAD                    ║${colors.reset}`);
    console.log(`${colors.cyan}║  Modelo de Patrimonio Histórico                           ║${colors.reset}`);
    console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);

    console.log(`${colors.yellow}⚙️  CONFIGURACIÓN:${colors.reset}`);
    console.log(`   - Posiciones: ${DRACO_CONFIG.quantizePosition} bits (previene apariencia poligonal)`);
    console.log(`   - Texturas:   ${DRACO_CONFIG.quantizeTexcoord} bits (máxima calidad para policromado)`);
    console.log(`   - Normales:   ${DRACO_CONFIG.quantizeNormal} bits\n`);

    // Buscar archivos .glb
    console.log(`🔍 Buscando archivos .glb en: ${MODELS_DIR}\n`);
    const glbFiles = findGlbFiles(MODELS_DIR);

    if (glbFiles.length === 0) {
        console.log(`${colors.red}❌ No se encontraron archivos .glb${colors.reset}`);
        return;
    }

    console.log(`${colors.green}✅ Encontrados ${glbFiles.length} archivos .glb${colors.reset}\n`);

    // Comprimir cada archivo
    const results = [];
    for (const file of glbFiles) {
        const result = compressModel(file);
        results.push(result);
    }

    // Generar reporte
    const report = generateReport(results);
    fs.writeFileSync(REPORT_FILE, report, 'utf8');

    console.log(`\n${colors.green}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.green}║  ✅ COMPRESIÓN COMPLETADA                                 ║${colors.reset}`);
    console.log(`${colors.green}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);
    console.log(`📄 Reporte guardado en: ${REPORT_FILE}\n`);
}

// Ejecutar
main();
