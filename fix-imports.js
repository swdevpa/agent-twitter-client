#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Verzeichnis, in dem die TypeScript-Dateien gesucht werden sollen
const srcDir = path.join(process.cwd(), 'src');

// Regex-Muster, um relative Importpfade zu finden, denen die .js-Endung fehlt
const importRegex = /from\s+['"](\.[^'"]*)['"]/g;

// Funktion zum rekursiven Durchsuchen eines Verzeichnisses
function processDirectory(dir) {
  // Verzeichnisinhalt auslesen
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      // Wenn es ein Verzeichnis ist, rekursiv verarbeiten
      processDirectory(itemPath);
    } else if (stats.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx')) && !item.endsWith('.d.ts')) {
      // TypeScript-Dateien verarbeiten (keine Deklarationsdateien)
      processFile(itemPath);
    }
  }
}

// Funktion zum Verarbeiten einer Datei
function processFile(filePath) {
  console.log(`Verarbeite Datei: ${filePath}`);
  
  // Dateiinhalt lesen
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Anzahl der Änderungen zählen
  let changesCount = 0;
  
  // Alle relativen Importpfade finden und .js hinzufügen, wenn sie nicht bereits enden mit .js, .css, usw.
  const newContent = content.replace(importRegex, (match, importPath) => {
    // Überprüfen, ob der Importpfad bereits eine Erweiterung hat
    if (
      importPath.endsWith('.js') || 
      importPath.endsWith('.css') || 
      importPath.endsWith('.json') || 
      importPath.endsWith('.jsx')
    ) {
      return match; // Keine Änderung nötig
    }
    
    changesCount++;
    return `from '${importPath}.js'`;
  });
  
  // Wenn Änderungen vorgenommen wurden, die Datei aktualisieren
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`  ${changesCount} Import(s) in ${path.basename(filePath)} korrigiert`);
  } else {
    console.log(`  Keine Änderungen in ${path.basename(filePath)} erforderlich`);
  }
}

// Hauptfunktion
function main() {
  console.log('Starte Korrektur der Import-Pfade...');
  
  try {
    processDirectory(srcDir);
    console.log('Import-Pfade wurden erfolgreich korrigiert!');
  } catch (error) {
    console.error('Fehler bei der Verarbeitung:', error);
    process.exit(1);
  }
}

// Skript ausführen
main(); 