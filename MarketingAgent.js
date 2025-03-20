import { Scraper } from 'agent-twitter-client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Cookie } from 'tough-cookie';

console.log('Skript wird geladen...');
dotenv.config();
console.log('Umgebungsvariablen geladen');

// Überprüfe, ob die benötigten Umgebungsvariablen vorhanden sind
console.log('Twitter-Anmeldedaten: ', {
  username: process.env.TWITTER_USERNAME ? 'vorhanden' : 'fehlt',
  password: process.env.TWITTER_PASSWORD ? 'vorhanden' : 'fehlt',
  email: process.env.TWITTER_EMAIL ? 'vorhanden' : 'fehlt'
});

const COOKIES_FILE = 'cookies.json';
const COOKIE_BACKUPS_DIR = 'cookie-backups';

/**
 * Hilfsfunktion zum Parsen der Cookie-Objekte in tough-cookie-Format
 */
function parseCookies(cookiesArray) {
  try {
    return cookiesArray.map(cookieObj => {
      const cookie = new Cookie({
        key: cookieObj.key,
        value: cookieObj.value,
        expires: cookieObj.expires ? new Date(cookieObj.expires) : undefined,
        domain: cookieObj.domain,
        path: cookieObj.path,
        secure: cookieObj.secure,
        httpOnly: cookieObj.httpOnly,
        hostOnly: cookieObj.hostOnly,
        sameSite: cookieObj.sameSite
      });
      return cookie;
    });
  } catch (error) {
    console.error('Fehler beim Parsen der Cookies:', error);
    return [];
  }
}

/**
 * Marketing Agent mit Cookie-Funktionalität
 */
class MarketingAgent {
  constructor() {
    console.log('MarketingAgent wird initialisiert...');
    this.scraper = new Scraper();
    this.isAuthenticated = false;
  }

  /**
   * Initialisiert den Agent - versucht zuerst via Cookies anzumelden,
   * falls das fehlschlägt mit Anmeldedaten
   */
  async init() {
    try {
      console.log('Initialisiere Marketing Agent...');
      
      // Versuche zuerst, mit gespeicherten Cookies anzumelden
      console.log('Rufe loadCookies() auf...');
      const cookieLoginSuccess = await this.loadCookies();
      console.log(`loadCookies() Ergebnis: ${cookieLoginSuccess}`);
      
      if (cookieLoginSuccess) {
        console.log('Erfolgreich mit gespeicherten Cookies angemeldet');
        return;
      }
      
      // Cookie-Anmeldung fehlgeschlagen, versuche normale Anmeldung
      console.log('Cookie-Anmeldung fehlgeschlagen, verwende Anmeldedaten...');
      
      if (!process.env.TWITTER_USERNAME || !process.env.TWITTER_PASSWORD) {
        throw new Error('Twitter Anmeldedaten fehlen in der .env Datei');
      }
      
      // Login mit Anmeldedaten
      await this.scraper.login(
        process.env.TWITTER_USERNAME,
        process.env.TWITTER_PASSWORD,
        process.env.TWITTER_EMAIL
      );
      
      // Nach erfolgreicher Anmeldung Cookies speichern
      await this.saveCookies();
      console.log('Erfolgreich angemeldet und Cookies gespeichert');
      
      this.isAuthenticated = true;
    } catch (error) {
      console.error('Fehler bei der Initialisierung:', error);
      throw error;
    }
  }

  /**
   * Lädt gespeicherte Cookies und versucht, damit anzumelden
   * @returns {Promise<boolean>} True, wenn Anmeldung erfolgreich
   */
  async loadCookies() {
    try {
      console.log('Versuche, Cookies zu laden...');
      
      // Prüfe, ob Cookie-Datei existiert
      if (!fs.existsSync(COOKIES_FILE)) {
        console.log('Keine Cookie-Datei gefunden');
        return false;
      }
      
      console.log(`Cookie-Datei ${COOKIES_FILE} gefunden`);
      
      // Lese Cookies aus Datei
      const cookiesData = fs.readFileSync(COOKIES_FILE, 'utf8');
      console.log(`Cookie-Datei gelesen, Länge: ${cookiesData.length} Zeichen`);
      
      const cookiesJson = JSON.parse(cookiesData);
      console.log(`Cookies erfolgreich geparst, ${cookiesJson.length} Cookies gefunden`);
      
      if (!cookiesJson || !cookiesJson.length) {
        console.log('Cookie-Datei leer oder ungültig');
        return false;
      }
      
      // Konvertiere zu tough-cookie Format
      const cookies = parseCookies(cookiesJson);
      console.log(`Cookies in tough-cookie Format konvertiert: ${cookies.length}`);
      
      // Setze Cookies im Scraper
      console.log('Cookies werden im Scraper gesetzt...');
      try {
        await this.scraper.setCookies(cookies);
        console.log('Cookies im Scraper gesetzt');
      } catch (error) {
        console.error('Fehler beim Setzen der Cookies:', error);
        return false;
      }
      
      // Prüfe, ob Anmeldung erfolgreich war
      console.log('Prüfe, ob Login erfolgreich ist...');
      try {
        this.isAuthenticated = await this.scraper.isLoggedIn();
        console.log(`Login-Status: ${this.isAuthenticated ? 'erfolgreich' : 'fehlgeschlagen'}`);
      } catch (error) {
        console.error('Fehler beim Prüfen des Login-Status:', error);
        return false;
      }
      
      return this.isAuthenticated;
    } catch (error) {
      console.error('Fehler beim Laden der Cookies:', error);
      return false;
    }
  }

  /**
   * Speichert die aktuellen Cookies
   */
  async saveCookies() {
    try {
      // Erstelle Backup-Verzeichnis falls nicht vorhanden
      if (!fs.existsSync(COOKIE_BACKUPS_DIR)) {
        fs.mkdirSync(COOKIE_BACKUPS_DIR);
      }
      
      // Hole aktuelle Cookies
      const cookies = await this.scraper.getCookies();
      
      // Speichere Cookies in Hauptdatei
      fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies));
      
      // Erstelle Backup mit Zeitstempel
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const backupPath = path.join(COOKIE_BACKUPS_DIR, `cookies-${timestamp}.json`);
      fs.writeFileSync(backupPath, JSON.stringify(cookies));
      
      console.log('Cookies gespeichert und Backup erstellt');
    } catch (error) {
      console.error('Fehler beim Speichern der Cookies:', error);
    }
  }

  /**
   * Führt Logout durch und löscht Cookie-Datei
   */
  async logout() {
    try {
      await this.scraper.logout();
      this.isAuthenticated = false;
      console.log('Erfolgreich abgemeldet');
    } catch (error) {
      console.error('Fehler beim Abmelden:', error);
    }
  }
}

// Beispiel für die Verwendung
async function main() {
  console.log('main() Funktion wird ausgeführt');
  const agent = new MarketingAgent();
  await agent.init();
  
  if (agent.isAuthenticated) {
    console.log('Agent ist authentifiziert und bereit');
    
    // Hier können weitere Marketing-Aktionen erfolgen
    // z.B. Tweets senden, Trends analysieren, etc.
  }
}

// Direkte Ausführung der main-Funktion, wenn dieses Skript ausgeführt wird
console.log('Starte main() Funktion...');
main().catch(error => console.error('Fehler in main():', error));

export default MarketingAgent; 