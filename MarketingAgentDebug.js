import { Scraper } from 'agent-twitter-client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

console.log('Skript wird geladen...');
dotenv.config();
console.log('Umgebungsvariablen geladen');

const COOKIES_FILE = 'cookies.json';
const COOKIE_BACKUPS_DIR = 'cookie-backups';

/**
 * Debug-Version des Marketing Agents
 */
class MarketingAgentDebug {
  constructor() {
    console.log('MarketingAgentDebug wird initialisiert...');
    this.scraper = new Scraper();
    this.isAuthenticated = false;
  }

  /**
   * Debug-Hilfsfunktion zur Ausgabe von Informationen
   */
  debug(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    if (data !== null) {
      try {
        console.log(typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
      } catch (error) {
        console.log('Konnte Daten nicht ausgeben:', error.message);
      }
    }
  }

  /**
   * Testet das Laden und Setzen von Cookies ohne Login-Validierung
   */
  async testCookies() {
    try {
      this.debug('=== Cookie-Test beginnt ===');
      
      // 1. Prüfe, ob Cookie-Datei existiert
      const fileExists = fs.existsSync(COOKIES_FILE);
      this.debug(`Cookie-Datei existiert: ${fileExists}`);
      
      if (!fileExists) {
        this.debug('Cookie-Datei nicht gefunden, Test beendet');
        return false;
      }
      
      // 2. Lese Cookie-Datei
      let cookieData;
      try {
        cookieData = fs.readFileSync(COOKIES_FILE, 'utf8');
        this.debug(`Cookie-Datei gelesen, Länge: ${cookieData.length} Zeichen`);
      } catch (error) {
        this.debug(`Fehler beim Lesen der Cookie-Datei: ${error.message}`);
        return false;
      }
      
      // 3. Parse Cookies
      let cookies;
      try {
        cookies = JSON.parse(cookieData);
        this.debug(`Cookies geparst, ${cookies.length} Cookies gefunden`);
      } catch (error) {
        this.debug(`Fehler beim Parsen der Cookies: ${error.message}`);
        return false;
      }
      
      // 4. Setze Cookies im Scraper
      try {
        this.debug('Setze Cookies im Scraper...');
        await this.scraper.setCookies(cookies);
        this.debug('Cookies im Scraper gesetzt');
      } catch (error) {
        this.debug(`Fehler beim Setzen der Cookies: ${error.message}`);
        return false;
      }
      
      // 5. Prüfe Login-Status
      try {
        this.debug('Prüfe Login-Status...');
        const isLoggedIn = await this.scraper.isLoggedIn();
        this.debug(`Login-Status: ${isLoggedIn ? 'angemeldet' : 'nicht angemeldet'}`);
        return isLoggedIn;
      } catch (error) {
        this.debug(`Fehler beim Prüfen des Login-Status: ${error.message}`);
        return false;
      }
    } catch (error) {
      this.debug(`Unerwarteter Fehler beim Cookie-Test: ${error.message}`);
      return false;
    }
  }
}

// Führe den Cookie-Test aus
async function main() {
  console.log('=== MarketingAgentDebug Test ===');
  const agent = new MarketingAgentDebug();
  
  try {
    const result = await agent.testCookies();
    console.log(`Cookie-Test Ergebnis: ${result ? 'ERFOLGREICH' : 'FEHLGESCHLAGEN'}`);
  } catch (error) {
    console.error('Fehler beim Ausführen des Tests:', error);
  }
}

// Starte den Test
main().catch(console.error); 