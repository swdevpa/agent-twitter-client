#!/usr/bin/env node

import MarketingAgent from './MarketingAgent.js';
import dotenv from 'dotenv';
import ImageGenerator from './imageGenerator.js';
import fs from 'fs';

// Lade Umgebungsvariablen
dotenv.config();

// Verfügbare Befehle
const COMMANDS = {
  POST: 'post',
  TRENDS: 'trends',
  ANALYZE: 'analyze',
  HELP: 'help',
  GENERATE_IMAGE: 'generate-image',
  TEST: 'test'
};

// Content-Typen
const CONTENT_TYPES = {
  PRODUCT: 'productUpdates',
  TUTORIAL: 'tutorialContent',
  GENERATION: 'aiGenerationShowcases',
  EDITING: 'aiEditingShowcases',
  INDUSTRY: 'industryContent',
  COMMUNITY: 'communityEngagement',
  DAILY: 'daily' // Verwendet den tagesabhängigen Content-Typ
};

/**
 * Zeigt die Hilfe an
 */
function showHelp() {
  console.log(`
AI Photo Editor - Twitter Marketing CLI
======================================

Verfügbare Befehle:

  post [content-type]   - Erstellt und sendet einen Tweet
                          content-type kann sein: 
                            product, tutorial, generation, editing, industry, community
                            (Standard ist "daily", was den tagesabhängigen Typ verwendet)
  
  trends [count]        - Zeigt die aktuellen Twitter Trends an
                          count ist die Anzahl der anzuzeigenden Trends (Standard: 5)
  
  analyze [count]       - Analysiert die Performance deiner letzten Tweets
                          count ist die Anzahl der zu analysierenden Tweets (Standard: 10)
  
  generate-image [prompt] - Generiert ein Testbild mit Gemini AI
                          prompt ist der zu verwendende Prompt (Standard: "AI photo editor interface")
  
  test [publish]        - Führt den Testmodus aus: Generiert 2 Beispiel-Tweets für jeden Content-Typ
                          publish kann sein: "true" oder "false" (Standard: "true")
                          Bei "true" werden alle generierten Tweets veröffentlicht
  
  help                  - Zeigt diese Hilfe an

Beispiele:
  node marketingCLI.js post tutorial   # Sendet einen Tutorial-Tweet
  node marketingCLI.js trends 10       # Zeigt die Top 10 Trends
  node marketingCLI.js analyze 20      # Analysiert die letzten 20 Tweets
  node marketingCLI.js generate-image "Magical forest with sunlight" # Generiert ein Testbild
  node marketingCLI.js test            # Führt den Testmodus aus und veröffentlicht alle Tweets
  node marketingCLI.js test false      # Führt den Testmodus aus ohne Tweets zu veröffentlichen
`);
}

/**
 * Verarbeitet die Befehlszeilenargumente und führt die entsprechende Aktion aus
 * @param {string[]} args - Befehlszeilenargumente
 * @returns {Promise<void>}
 */
async function processArgs(args) {
  // Entferne die ersten beiden Argumente (Node-Pfad und Skript-Pfad)
  const [command, option] = args.slice(2);
  
  if (!command || command === COMMANDS.HELP) {
    showHelp();
    return;
  }
  
  // Initialisiere den Marketing-Agenten
  console.log('Initialisiere Marketing-Agent...');
  const agent = new MarketingAgent();
  
  try {
    // Spezielle Behandlung für generate-image Befehl (benötigt keine Initialisierung)
    if (command.toLowerCase() === COMMANDS.GENERATE_IMAGE) {
      await handleGenerateImageCommand(option);
      return;
    }
    
    const initSuccess = await agent.init();
    
    if (!initSuccess) {
      console.error('Marketing-Agent konnte nicht initialisiert werden.');
      return;
    }
    
    console.log('Marketing-Agent erfolgreich initialisiert.');
    
    // Führe den angegebenen Befehl aus
    switch (command.toLowerCase()) {
      case COMMANDS.POST: {
        let contentType = null;
        
        // Bestimme den Content-Typ
        if (option) {
          switch (option.toLowerCase()) {
            case 'product':
              contentType = CONTENT_TYPES.PRODUCT;
              break;
            case 'tutorial':
              contentType = CONTENT_TYPES.TUTORIAL;
              break;
            case 'generation':
              contentType = CONTENT_TYPES.GENERATION;
              break;
            case 'editing':
              contentType = CONTENT_TYPES.EDITING;
              break;
            case 'industry':
              contentType = CONTENT_TYPES.INDUSTRY;
              break;
            case 'community':
              contentType = CONTENT_TYPES.COMMUNITY;
              break;
            default:
              console.log(`Unbekannter Content-Typ: ${option}, verwende tagesabhängigen Typ.`);
              contentType = null;
          }
        }
        
        // Wenn kein spezieller Content-Typ angegeben wurde, wird der tagesabhängige verwendet
        if (contentType === CONTENT_TYPES.DAILY || contentType === null) {
          contentType = agent.selectContentPillarByDay();
          console.log(`Verwende tagesabhängigen Content-Typ: ${contentType}`);
        } else {
          console.log(`Verwende angegebenen Content-Typ: ${contentType}`);
        }
        
        console.log(`Erstelle und sende Tweet vom Typ "${contentType}"...`);
        await agent.createAndSendTweet(contentType);
        console.log('Tweet erfolgreich gesendet!');
        break;
      }
      
      case COMMANDS.TRENDS: {
        const count = option ? parseInt(option, 10) : 5;
        console.log(`Lade die Top ${count} Twitter-Trends...`);
        
        const trends = await agent.getPopularTrends(count);
        console.log('\nAktuelle Twitter-Trends:');
        
        if (trends.length === 0) {
          console.log('Keine Trends gefunden.');
        } else {
          trends.forEach((trend, index) => {
            console.log(`${index + 1}. ${trend}`);
          });
        }
        break;
      }
      
      case COMMANDS.ANALYZE: {
        const count = option ? parseInt(option, 10) : 10;
        console.log(`Analysiere die letzten ${count} Tweets...`);
        
        const analysis = await agent.analyzePerformance(count);
        
        if (!analysis.success && analysis.message) {
          console.log(analysis.message);
          break;
        }
        
        console.log('\nPerformance-Analyse:');
        console.log(`Analysierte Tweets: ${analysis.totalTweets}`);
        
        if (analysis.bestPerformingTweet) {
          console.log('\nBester Tweet:');
          console.log(`ID: ${analysis.bestPerformingTweet.id}`);
          console.log(`Gesendet am: ${analysis.bestPerformingTweet.timestamp}`);
          console.log(`Text: ${analysis.bestPerformingTweet.text.substring(0, 50)}...`);
          console.log(`Engagement-Score: ${analysis.bestEngagement}`);
        }
        
        console.log('\nEngagement nach Content-Typ:');
        for (const [type, data] of Object.entries(analysis.engagementByType)) {
          console.log(`- ${type}: ${data.count} Tweets, Durchschnitt: ${data.avgEngagement.toFixed(2)} Engagements`);
        }
        break;
      }
      
      case COMMANDS.TEST: {
        console.log('Starte Testmodus...');
        
        // Prüfe, ob Tweets veröffentlicht werden sollen (Standard: true)
        const publishTweets = option !== 'false';
        console.log(`Die generierten Tweets werden ${publishTweets ? 'veröffentlicht' : 'nicht veröffentlicht'}.`);
        
        const results = await agent.runTestMode(publishTweets);
        
        // Zeige eine Zusammenfassung der Ergebnisse an
        console.log('\n=== Zusammenfassung Testmodus ===');
        for (const [contentType, data] of Object.entries(results)) {
          console.log(`\n${data.contentTypeName}:`);
          data.tweets.forEach((tweet, index) => {
            console.log(`  Beispiel ${index + 1}:`);
            console.log(`  - Tweet: ${tweet.text.substring(0, 50)}...`);
            console.log(`  - Bild: ${tweet.imagePath}`);
            console.log(`  - Status: ${tweet.published ? 'Veröffentlicht' : 'Nur generiert'}`);
          });
        }
        
        console.log('\nTestmodus erfolgreich abgeschlossen!');
        if (publishTweets) {
          console.log('Alle generierten Tweets wurden veröffentlicht!');
        } else {
          console.log('Die Tweets wurden nur generiert, aber nicht veröffentlicht.');
        }
        console.log('Die generierten Bilder findest du im Verzeichnis "generated-images".');
        break;
      }
      
      default:
        console.log(`Unbekannter Befehl: ${command}`);
        showHelp();
    }
  } catch (error) {
    console.error('Fehler bei der Ausführung:', error);
  } finally {
    // Aufräumen (optional)
    console.log('Marketing-Agent wird beendet...');
  }
}

/**
 * Behandelt den Generate-Image Befehl
 * @param {string} prompt - Der Prompt für die Bildgenerierung
 * @returns {Promise<void>}
 */
async function handleGenerateImageCommand(prompt) {
  try {
    console.log('Initialisiere Image Generator...');
    const imageGenerator = new ImageGenerator();
    
    const defaultPrompt = 'AI photo editor interface with beautiful UI design';
    const finalPrompt = prompt || defaultPrompt;
    
    console.log(`Generiere Bild mit Prompt: "${finalPrompt}"`);
    const imageData = await imageGenerator.generateImage(finalPrompt);
    
    console.log(`Bild erfolgreich generiert und gespeichert: ${imageData.filepath}`);
    console.log('Du kannst dieses Bild jetzt in deinen Tweets verwenden.');
    
  } catch (error) {
    console.error('Fehler bei der Bildgenerierung:', error);
  }
}

// Starte die Verarbeitung der Befehlszeilenargumente
processArgs(process.argv).catch(error => {
  console.error('Unbehandelter Fehler:', error);
  process.exit(1);
}); 