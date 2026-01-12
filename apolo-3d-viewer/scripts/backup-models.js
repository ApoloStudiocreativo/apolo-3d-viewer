/**
 * Script para crear backups de todos los modelos .glb
 * antes de comprimir
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '../models');
const BACKUP_DIR = path.join(__dirname, '../models-backup');

function createBackup() {
    console.log('🔄 Creando backup de modelos originales...\n');

    // Crear directorio de backup si no existe
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        console.log(`✅ Directorio de backup creado: ${BACKUP_DIR}\n`);
    }

    // Buscar todos los .glb
    function findAndCopy(dir, relativePath = '') {
        const items = fs.readdirSync(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                const newRelativePath = path.join(relativePath, item);
                const newBackupDir = path.join(BACKUP_DIR, newRelativePath);

                if (!fs.existsSync(newBackupDir)) {
                    fs.mkdirSync(newBackupDir, { recursive: true });
                }

                findAndCopy(fullPath, newRelativePath);
            } else if (item.endsWith('.glb')) {
                const backupPath = path.join(BACKUP_DIR, relativePath, item);
                fs.copyFileSync(fullPath, backupPath);

                const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
                console.log(`  ✓ ${path.join(relativePath, item)} (${sizeMB} MB)`);
            }
        }
    }

    findAndCopy(MODELS_DIR);

    console.log('\n✅ Backup completado');
    console.log(`📁 Los archivos originales están en: ${BACKUP_DIR}`);
}

createBackup();
