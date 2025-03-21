#!/usr/bin/env node

import MarketingAgent from './MarketingAgent.js';
import dotenv from 'dotenv';
import fs from 'fs';
import { scheduleJob } from 'node-schedule';

// Lade Umgebungsvariablen
dotenv.config();

// Konfigurationsdatei für den Scheduler
const CONFIG_FILE = 'scheduler-config.json';

// Standard-Konfiguration
const DEFAULT_CONFIG = {
  // Aktiviere/deaktiviere das automatische Posting
  enabled: true,
  
  // Anzahl der Tweets pro Tag (1-2 laut Strategie)
  tweetsPerDay: 2,
  
  // Optimale Posting-Zeiten für USA-Zielgruppe (von Berlin aus)
  // Format: [Stunde, Minute]
  scheduledTimes: [
    [16, 30],  // 16:30 Berlin = 10:30 ET / 7:30 PT (Vormittag USA)
    [20, 0]    // 20:00 Berlin = 14:00 ET / 11:00 PT (Mittag USA)
  ],
  
  // Letzte Ausführung
  lastRun: null,
  
  // Logging
  logging: true
};

/**
 * Lädt die Konfiguration oder erstellt eine neue
 * @returns {Object} Die Konfiguration
 */
function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      console.log('Konfiguration geladen');
      return { ...DEFAULT_CONFIG, ...config };
    } catch (error) {
      console.error('Fehler beim Laden der Konfiguration:', error);
      return { ...DEFAULT_CONFIG };
    }
  } else {
    // Erstelle eine neue Konfigurationsdatei
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log('Neue Konfigurationsdatei erstellt');
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Speichert die Konfiguration
 * @param {Object} config - Die zu speichernde Konfiguration
 */
function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log('Konfiguration gespeichert');
}

/**
 * Sendet einen Tweet und protokolliert die Aktivität
 * @param {MarketingAgent} agent - Der Marketing-Agent
 * @param {Object} config - Die aktuelle Konfiguration
 * @returns {Promise<boolean>} True, wenn erfolgreich
 */
async function postScheduledTweet(agent, config) {
  try {
    if (!agent.isAuthenticated) {
      console.error('Agent ist nicht authentifiziert');
      return false;
    }
    
    // Sende Tweet gemäß der tagesabhängigen Inhaltsplanung
    const contentType = agent.selectContentPillarByDay();
    
    console.log(`Scheduled Tweet: Erstelle Tweet vom Typ "${contentType}"...`);
    const result = await agent.createAndSendTweet(contentType);
    
    // Aktualisiere die Konfiguration mit dem Zeitstempel der letzten Ausführung
    config.lastRun = new Date().toISOString();
    saveConfig(config);
    
    console.log(`Scheduled Tweet erfolgreich gesendet, ID: ${result?.id || 'unbekannt'}`);
    return true;
  } catch (error) {
    console.error('Fehler beim Senden des geplanten Tweets:', error);
    return false;
  }
}

/**
 * Initialisiert den Scheduler und plant die Tweets
 */
async function initScheduler() {
  console.log('Starte Scheduler für automatisches Posting...');
  
  // Lade Konfiguration
  const config = loadConfig();
  
  if (!config.enabled) {
    console.log('Automatisches Posting ist deaktiviert.');
    return;
  }
  
  // Initialisiere den Marketing-Agenten
  const agent = new MarketingAgent();
  
  try {
    console.log('Initialisiere Marketing-Agent...');
    await agent.init();
    
    if (!agent.isAuthenticated) {
      console.error('Marketing-Agent konnte nicht authentifiziert werden.');
      return;
    }
    
    console.log('Marketing-Agent erfolgreich initialisiert und authentifiziert.');
    
    // Plane die Tweets gemäß der konfigurierten Zeiten
    const jobs = [];
    
    for (let i = 0; i < config.scheduledTimes.length && i < config.tweetsPerDay; i++) {
      const [hour, minute] = config.scheduledTimes[i];
      
      // Erstelle einen Schedule-Ausdruck für node-schedule
      // Sekunde Minute Stunde Tag Monat Wochentag
      const scheduleExpression = `0 ${minute} ${hour} * * *`;
      
      console.log(`Plane Tweet für ${hour}:${minute} Uhr (cron: ${scheduleExpression})`);
      
      // Erstelle den Job
      const job = scheduleJob(scheduleExpression, async () => {
        console.log(`Ausführung des geplanten Tweets um ${new Date().toLocaleTimeString()}...`);
        try {
          await postScheduledTweet(agent, config);
        } catch (error) {
          console.error('Fehler bei der Ausführung des geplanten Tweets:', error);
        }
      });
      
      jobs.push(job);
    }
    
    console.log(`${jobs.length} Tweet(s) geplant. Scheduler läuft...`);
    
    // Verhindern, dass das Skript endet
    process.stdin.resume();
    
    // Handler für sauberes Beenden
    function shutdown() {
      console.log('Scheduler wird beendet...');
      jobs.forEach(job => job.cancel());
      process.exit(0);
    }
    
    // Registriere Ereignishandler für sauberes Beenden
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
    // Sofort einen Tweet senden, wenn das gewünscht ist (für Tests)
    const args = process.argv.slice(2);
    if (args.includes('--post-now')) {
      console.log('Sofortiger Tweet angefordert...');
      await postScheduledTweet(agent, config);
    }
    
  } catch (error) {
    console.error('Fehler beim Initialisieren des Schedulers:', error);
  }
}

// Starte den Scheduler
initScheduler().catch(error => {
  console.error('Unbehandelter Fehler:', error);
  process.exit(1);
}); 