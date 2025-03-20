import { Scraper } from 'agent-twitter-client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Cookie } from 'tough-cookie';
import ImageGenerator from './imageGenerator.js';

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
    this.imageGenerator = new ImageGenerator();
    
    // Content Pillars mit prozentualer Aufteilung
    this.contentPillars = {
      productUpdates: { weight: 15, name: 'Product Updates' },
      tutorialContent: { weight: 25, name: 'Tutorial Content' },
      aiGenerationShowcases: { weight: 20, name: 'AI Generation Showcases' },
      aiEditingShowcases: { weight: 20, name: 'AI Editing Showcases' },
      industryContent: { weight: 10, name: 'Industry Content' },
      communityEngagement: { weight: 10, name: 'Community Engagement' }
    };
    
    // Optimale Posting-Zeiten
    this.optimalPostingTimes = [
      { hour: 8, minute: 0 },  // 8:00 AM
      { hour: 9, minute: 0 },  // 9:00 AM
      { hour: 12, minute: 30 }, // 12:30 PM
      { hour: 17, minute: 30 }, // 5:30 PM
      { hour: 18, minute: 30 }  // 6:30 PM
    ];
    
    // Primäre Hashtags (bei den meisten Tweets verwenden)
    this.primaryHashtags = ['#AIPhotoEditor', '#PromptBasedEditing', '#AIImageGeneration'];
    
    // Sekundäre Hashtags (je nach Inhalt rotieren)
    this.secondaryHashtags = {
      productUpdates: ['#AITools', '#PhotoEditing', '#AIUpdates', '#AppUpdate'],
      tutorialContent: ['#PromptEngineering', '#AITutorial', '#PhotoEditingTips', '#AITips'],
      aiGenerationShowcases: ['#AIArt', '#TextToImage', '#AICreativity', '#GenerativeAI'],
      aiEditingShowcases: ['#BeforeAfter', '#ImageTransformation', '#PhotoEnhancement', '#AIEdits'],
      industryContent: ['#AITrends', '#FutureOfAI', '#TechNews', '#DigitalArt'],
      communityEngagement: ['#AIChallenge', '#ShareYourArt', '#AICommunity', '#CreativePrompts']
    };
    
    // Wochentags-Planung
    this.weekdayPlan = {
      1: 'productUpdates',        // Montag
      2: 'tutorialContent',       // Dienstag
      3: 'aiGenerationShowcases', // Mittwoch
      4: 'aiEditingShowcases',    // Donnerstag
      5: 'industryContent',       // Freitag
      6: 'communityEngagement',   // Samstag
      0: 'mixed'                  // Sonntag (Mix aus erfolgreichen Inhalten)
    };
    
    // Tweet-Templates
    this.tweetTemplates = {
      productUpdates: [
        '🚀 NEW UPDATE ALERT! 🚀\nWe just launched {{feature}} in our AI Photo Editor v{{version}}!\nNow you can {{benefit}} with just a simple text prompt!',
        '✨ FEATURE UPDATE ✨\nOur latest version brings {{feature}} to your creative toolkit.\nTry it today and see how it transforms your workflow!',
        '📱 APP UPDATE 📱\n{{feature}} is now available in the latest version of our AI Photo Editor.\nUpgrade now to unlock new creative possibilities!'
      ],
      tutorialContent: [
        '📱✨ PROMPT ENGINEERING TIP #{{number}} ✨📱\nLearn how to {{accomplish}} with this prompt formula:\n"{{prompt}}"\nPro tip: {{advice}}',
        '🔍 TUTORIAL: {{title}} 🔍\nFollow these steps to create stunning images:\n1️⃣ {{step1}}\n2️⃣ {{step2}}\n3️⃣ {{step3}}\nShare your results with us!',
        '💡 PROMPT HACK 💡\nWant to {{goal}}? Try adding "{{promptTip}}" to your prompts for better results!\nExperiment and let us know how it works for you.'
      ],
      aiGenerationShowcases: [
        '✨ CREATED WITH AI ✨\nThis stunning image was generated with our app using the prompt:\n"{{prompt}}"\nWhat would YOU create with this prompt?',
        '🎨 AI MASTERPIECE 🎨\nOur users are creating incredible art like this with prompts such as:\n"{{prompt}}"\nDownload our app and unleash your creativity!',
        '🌟 FROM TEXT TO IMAGE 🌟\nJust a few words can create amazing visuals. This was generated from:\n"{{prompt}}"\nTry our app and see what you can create!'
      ],
      aiEditingShowcases: [
        '🔄 BEFORE → AFTER TRANSFORMATION 🔄\nWe turned this {{before}} into {{after}} using the prompt:\n"{{prompt}}"\nTry it yourself with our app!',
        '✂️ AI EDITING MAGIC ✂️\nSee how our app transformed this {{before}} with a simple text prompt.\nBefore ⬅️ After ➡️\nPrompt used: "{{prompt}}"',
        '📸 PHOTO ENHANCEMENT 📸\nFrom {{before}} to {{after}} in seconds with AI!\nAll it took was this prompt: "{{prompt}}"\nElevate your photos today!'
      ],
      industryContent: [
        '🔮 AI ART TREND ALERT 🔮\n{{trend}} is taking over in {{year}}!\nHere\'s a prompt to achieve this look with our app:\n"{{prompt}}"',
        '📊 INDUSTRY INSIGHTS 📊\nDid you know {{fact}} about AI image generation?\nOur app stays at the cutting edge of these innovations.',
        '🌐 AI NEWS 🌐\n{{news}}\nSee how our app is embracing these changes to give you the best creative experience.'
      ],
      communityEngagement: [
        '✏️ PROMPT CHALLENGE TIME! ✏️\nThis week we\'re challenging you to create {{challenge}} using our app.\nThe best prompt formula wins {{prize}}!\nShare your results with #AIPhotoEditorChallenge',
        '❓ POLL TIME ❓\nWhat feature would you most like to see next in our AI Photo Editor?\n{{option1}}\n{{option2}}\n{{option3}}\n{{option4}}',
        '🏆 COMMUNITY SPOTLIGHT 🏆\nCheck out this amazing creation by {{username}}!\nThey used our app to create {{description}}.\nShow them some love and share your creations too!'
      ],
      mixed: [
        '🌟 WEEKLY HIGHLIGHT 🌟\n{{content}}\nLike what you see? Try our AI Photo Editor app today!',
        '📲 WEEKEND INSPIRATION 📲\n{{content}}\nOpen our app and start creating your own AI masterpieces!'
      ]
    };
    
    // Log-Datei für gepostete Tweets
    this.tweetLogFile = 'tweet-log.json';
    
    // Lade bisherige Tweets, wenn die Datei existiert
    this.postedTweets = [];
    if (fs.existsSync(this.tweetLogFile)) {
      try {
        this.postedTweets = JSON.parse(fs.readFileSync(this.tweetLogFile, 'utf8'));
      } catch (error) {
        console.error('Fehler beim Laden der Tweet-Historie:', error);
        this.postedTweets = [];
      }
    }
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
        return true;
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
      return true;
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
      
      // Prüfe, ob die Datei valides JSON enthält
      let cookiesJson;
      try {
        cookiesJson = JSON.parse(cookiesData);
      } catch (parseError) {
        console.error('Cookie-Datei enthält ungültiges JSON:', parseError.message);
        return false;
      }
      
      console.log(`Cookies erfolgreich geparst, ${cookiesJson.length} Cookies gefunden`);
      
      if (!cookiesJson || !cookiesJson.length || !Array.isArray(cookiesJson)) {
        console.log('Cookie-Datei leer, ungültig oder keine Array-Struktur');
        return false;
      }
      
      // Prüfe, ob wichtige Twitter-Cookies dabei sind
      const requiredCookieKeys = ['auth_token', 'ct0', 'twid'];
      const foundKeys = cookiesJson.map(cookie => cookie.key);
      
      const missingKeys = requiredCookieKeys.filter(key => !foundKeys.includes(key));
      if (missingKeys.length > 0) {
        console.log(`Wichtige Twitter-Cookies fehlen: ${missingKeys.join(', ')}`);
        return false;
      }
      
      // Prüfe, ob ein Cookie abgelaufen ist
      const now = new Date().getTime();
      const expiredCookies = cookiesJson.filter(
        cookie => cookie.expires && new Date(cookie.expires).getTime() < now
      );
      
      if (expiredCookies.length > 0) {
        console.log(`${expiredCookies.length} Cookies sind abgelaufen`);
        
        // Wenn kritische Cookies abgelaufen sind, kehre zurück
        const expiredKeys = expiredCookies.map(cookie => cookie.key);
        const expiredCritical = requiredCookieKeys.some(key => expiredKeys.includes(key));
        
        if (expiredCritical) {
          console.log('Kritische Cookies sind abgelaufen, Cookie-Login nicht möglich');
          return false;
        }
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
      
      // Prüfe, ob Anmeldung erfolgreich war - mit Retry
      console.log('Prüfe, ob Login erfolgreich ist...');
      
      // Manchmal kann der erste Check fehlschlagen. Versuche es 2x
      let isLoggedIn = false;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`Login-Check Versuch ${attempt}...`);
          isLoggedIn = await this.scraper.isLoggedIn();
          
          if (isLoggedIn) {
            console.log('Login erfolgreich beim Versuch', attempt);
            break;
          } else {
            console.log(`Login-Status beim Versuch ${attempt}: fehlgeschlagen`);
            
            // Kurz warten vor dem nächsten Versuch
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } catch (error) {
          console.error(`Fehler beim Prüfen des Login-Status (Versuch ${attempt}):`, error);
          
          // Bei Fehler im letzten Versuch, nicht erneut versuchen
          if (attempt >= 2) {
            return false;
          }
          
          // Kurz warten vor dem nächsten Versuch
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      this.isAuthenticated = isLoggedIn;
      return isLoggedIn;
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

  /**
   * Wählt eine Content-Säule basierend auf dem aktuellen Wochentag
   * @returns {string} Name der Content-Säule
   */
  selectContentPillarByDay() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sonntag, 1 = Montag, ...
    
    const contentType = this.weekdayPlan[dayOfWeek];
    console.log(`Content-Typ für heute (Tag ${dayOfWeek}): ${contentType}`);
    
    // Sonderfall für Sonntag: Mische die Content-Typen
    if (contentType === 'mixed') {
      // Wähle zufällig einen Content-Typ aus, gewichtet nach deren Prozentsätzen
      const pillars = Object.entries(this.contentPillars);
      const totalWeight = pillars.reduce((sum, [_, pillar]) => sum + pillar.weight, 0);
      let randomValue = Math.random() * totalWeight;
      
      for (const [key, pillar] of pillars) {
        randomValue -= pillar.weight;
        if (randomValue <= 0) {
          console.log(`Zufällig ausgewählter Content-Typ für Sonntag: ${key}`);
          return key;
        }
      }
      
      // Fallback, sollte nie erreicht werden
      return 'productUpdates';
    }
    
    return contentType;
  }

  /**
   * Erstellt Hashtags für einen Tweet basierend auf dem Content-Typ
   * @param {string} contentType - Der Typ des Inhalts
   * @param {number} maxHashtags - Maximale Anzahl von Hashtags (Standard: 5)
   * @returns {string[]} Liste der Hashtags
   */
  createHashtags(contentType, maxHashtags = 5) {
    // Starte mit primären Hashtags
    const hashtags = [...this.primaryHashtags];
    
    // Füge sekundäre Hashtags hinzu, die zum Content-Typ passen
    if (this.secondaryHashtags[contentType]) {
      // Mische die sekundären Hashtags und wähle einige aus
      const secondaryOptions = [...this.secondaryHashtags[contentType]];
      this.shuffleArray(secondaryOptions);
      
      // Füge so viele sekundäre Hashtags hinzu, dass maxHashtags erreicht werden
      const remainingSlots = maxHashtags - hashtags.length;
      const selectedSecondary = secondaryOptions.slice(0, remainingSlots);
      
      hashtags.push(...selectedSecondary);
    }
    
    return hashtags;
  }

  /**
   * Mischt ein Array mit dem Fisher-Yates Algorithmus
   * @param {Array} array - Das zu mischende Array
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Wählt eine zufällige Vorlage für den Content-Typ aus
   * @param {string} contentType - Der Typ des Inhalts
   * @returns {string} Die ausgewählte Vorlage
   */
  selectTemplate(contentType) {
    const templates = this.tweetTemplates[contentType];
    if (!templates || templates.length === 0) {
      console.error(`Keine Vorlagen für Content-Typ ${contentType} gefunden`);
      return '';
    }
    
    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
  }

  /**
   * Füllt eine Vorlage mit Inhalt
   * @param {string} template - Die zu füllende Vorlage
   * @param {Object} content - Die Inhalte zum Füllen der Platzhalter
   * @returns {string} Der gefüllte Text
   */
  fillTemplate(template, content) {
    return template.replace(/{{(\w+)}}/g, (match, key) => {
      return content[key] !== undefined ? content[key] : match;
    });
  }

  /**
   * Erstellt einen Tweet für Product Updates
   * @returns {Promise<string>} Der fertige Tweet-Text
   */
  async createProductUpdateTweet() {
    const template = this.selectTemplate('productUpdates');
    
    const content = {
      feature: 'Advanced Lighting Effects',
      version: '2.5.0',
      benefit: 'create professional studio-quality lighting in any photo'
    };
    
    const text = this.fillTemplate(template, content);
    const hashtags = this.createHashtags('productUpdates').join(' ');
    
    return `${text}\n\n${hashtags}`;
  }

  /**
   * Erstellt einen Tweet für Tutorial Content
   * @returns {Promise<string>} Der fertige Tweet-Text
   */
  async createTutorialTweet() {
    const template = this.selectTemplate('tutorialContent');
    
    // Generiere eine zufällige Nummer für den Tipp
    const tipNumber = Math.floor(Math.random() * 100) + 1;
    
    const content = {
      number: tipNumber,
      title: 'Mastering Background Removal',
      accomplish: 'remove any background with extreme precision',
      prompt: 'remove background, keep details, transparent edges, studio quality',
      advice: 'add "preserve fine details" for complex objects like hair or fur',
      step1: 'Upload your photo and select "Prompt Mode"',
      step2: 'Type "isolate subject, remove background, perfect edges"',
      step3: 'Adjust refinement sliders for optimal results',
      goal: 'create perfect portrait lighting',
      promptTip: 'soft rim light, subtle fill, dramatic contrast'
    };
    
    const text = this.fillTemplate(template, content);
    const hashtags = this.createHashtags('tutorialContent').join(' ');
    
    return `${text}\n\n${hashtags}`;
  }

  /**
   * Erstellt einen Tweet für AI Generation Showcases
   * @returns {Promise<string>} Der fertige Tweet-Text
   */
  async createGenerationShowcaseTweet() {
    const template = this.selectTemplate('aiGenerationShowcases');
    
    const content = {
      prompt: 'Enchanted forest waterfall at sunset, 8k, hyperdetailed, magical lighting, mystical atmosphere, volumetric rays'
    };
    
    const text = this.fillTemplate(template, content);
    const hashtags = this.createHashtags('aiGenerationShowcases').join(' ');
    
    return `${text}\n\n${hashtags}`;
  }

  /**
   * Erstellt einen Tweet für AI Editing Showcases
   * @returns {Promise<string>} Der fertige Tweet-Text
   */
  async createEditingShowcaseTweet() {
    const template = this.selectTemplate('aiEditingShowcases');
    
    const content = {
      before: 'simple portrait photo',
      after: 'stunning fantasy character portrait',
      prompt: 'transform to fantasy elf, pointy ears, ethereal skin, forest background, magical glow, cinematic lighting'
    };
    
    const text = this.fillTemplate(template, content);
    const hashtags = this.createHashtags('aiEditingShowcases').join(' ');
    
    return `${text}\n\n${hashtags}`;
  }

  /**
   * Erstellt einen Tweet für Industry Content
   * @returns {Promise<string>} Der fertige Tweet-Text
   */
  async createIndustryTweet() {
    const template = this.selectTemplate('industryContent');
    
    const currentYear = new Date().getFullYear();
    
    const content = {
      trend: 'Cinematic Hyper-Realism',
      year: currentYear,
      prompt: 'cinematic lighting, photorealistic, hyper-detailed, shallow depth of field, ultra-sharp',
      fact: '78% of professional designers now use AI tools to enhance their workflow',
      news: 'New research shows that combining specific prompt terms can increase image quality by up to 40%'
    };
    
    const text = this.fillTemplate(template, content);
    const hashtags = this.createHashtags('industryContent').join(' ');
    
    return `${text}\n\n${hashtags}`;
  }

  /**
   * Erstellt einen Tweet für Community Engagement
   * @returns {Promise<string>} Der fertige Tweet-Text
   */
  async createCommunityTweet() {
    const template = this.selectTemplate('communityEngagement');
    
    const content = {
      challenge: 'an autumn-themed fantasy landscape',
      prize: 'a premium subscription upgrade',
      option1: 'Advanced Portrait Retouching',
      option2: 'Background Replacement AI',
      option3: 'Style Transfer Presets',
      option4: 'Batch Processing for Multiple Images',
      username: '@creative_user123',
      description: 'a stunning portrait with magical light effects'
    };
    
    const text = this.fillTemplate(template, content);
    const hashtags = this.createHashtags('communityEngagement').join(' ');
    
    return `${text}\n\n${hashtags}`;
  }

  /**
   * Erstellt einen Tweet basierend auf dem Content-Typ
   * @param {string} contentType - Der Typ des zu erstellenden Contents
   * @returns {Promise<string>} Der fertige Tweet-Text
   */
  async createTweetByType(contentType) {
    // Versuche zuerst, den Tweet mit Grok zu erstellen, wenn verfügbar
    try {
      // Prüfen, ob Grok verfügbar ist
      const grokAvailable = await this.isGrokAvailable();
      
      if (grokAvailable) {
        console.log(`Generiere strategischen ${this.contentPillars[contentType].name}-Tweet mit Grok...`);
        const grokTweet = await this.createTweetWithGrok(contentType);
        
        if (grokTweet && grokTweet.trim().length > 0) {
          console.log('Grok hat erfolgreich einen Tweet generiert');
          return grokTweet;
        } else {
          console.warn('Grok hat einen leeren Tweet zurückgegeben, verwende Standard-Methode');
        }
      } else {
        console.log('Grok ist nicht verfügbar, verwende Standard-Tweet-Methode');
      }
    } catch (grokError) {
      console.warn('Fehler bei der Grok-Tweet-Generierung:', grokError.message);
      console.log('Verwende Standard-Tweet-Methode als Fallback');
    }
    
    // Fallback zur Standard-Methode, wenn Grok nicht verfügbar oder fehlschlägt
    console.log(`Verwende Standard-Methode für Content-Typ: ${contentType}`);
    
    // Fallback zur Standard-Methode
    switch(contentType) {
      case 'productUpdates':
        return this.createProductUpdateTweet();
      case 'tutorialContent':
        return this.createTutorialTweet();
      case 'aiGenerationShowcases':
        return this.createGenerationShowcaseTweet();
      case 'aiEditingShowcases':
        return this.createEditingShowcaseTweet();
      case 'industryContent':
        return this.createIndustryTweet();
      case 'communityEngagement':
        return this.createCommunityTweet();
      default:
        console.error(`Unbekannter Content-Typ: ${contentType}`);
        return '';
    }
  }
  
  /**
   * Prüft, ob Grok für die Tweet-Generierung verfügbar ist
   * @returns {Promise<boolean>} True, wenn Grok verfügbar ist
   */
  async isGrokAvailable() {
    try {
      // Prüfen, ob die grokChat-Methode existiert
      return this.isAuthenticated && typeof this.scraper.grokChat === 'function';
    } catch (error) {
      console.warn('Grok nicht verfügbar:', error.message);
      return false;
    }
  }
  
  /**
   * Erstellt einen Tweet mit Grok basierend auf dem Content-Typ
   * @param {string} contentType - Der Typ des zu erstellenden Contents
   * @returns {Promise<string>} Der von Grok generierte Tweet-Text
   */
  async createTweetWithGrok(contentType) {
    // Content Typ für Grok-Prompt vorbereiten
    const typeInfo = this.contentPillars[contentType];
    if (!typeInfo) {
      throw new Error(`Unbekannter Content-Typ für Grok: ${contentType}`);
    }
    
    // Template für diesen Content-Typ als Beispiel auswählen
    const templateExamples = this.tweetTemplates[contentType] || [];
    const exampleTemplate = templateExamples.length > 0 ? 
      templateExamples[Math.floor(Math.random() * templateExamples.length)] : '';
    
    // Primäre und sekundäre Hashtags kombinieren
    const primaryTags = [...this.primaryHashtags];
    const secondaryTags = this.secondaryHashtags[contentType] || [];
    this.shuffleArray(secondaryTags);
    
    // 1-2 primäre und 2-3 sekundäre Hashtags auswählen
    const selectedPrimaryTags = primaryTags.slice(0, Math.min(2, primaryTags.length));
    const selectedSecondaryTags = secondaryTags.slice(0, Math.min(3, secondaryTags.length));
    const hashtagText = [...selectedPrimaryTags, ...selectedSecondaryTags].join(' ');
    
    // Aktuelles Datum für zeitlich relevante Inhalte
    const currentYear = new Date().getFullYear();
    const currentDay = new Date().getDay();
    const isWeekend = currentDay === 0 || currentDay === 6;
    
    // Basis-Prompt für Grok
    let prompt = `Create a strategic marketing tweet for my AI Photo Editor App following our content strategy.
The tweet MUST be in ENGLISH and UNDER 250 characters (including hashtags).
Today's content pillar: ${typeInfo.name}

TWEET STRUCTURE GUIDELINES:
- Start with an engaging emoji
- Include a clear call-to-action
- End with these hashtags: ${hashtagText}
- Maintain a professional but enthusiastic tone
- Focus on benefits for our target audience (photographers, content creators, digital artists)

EXAMPLE TEMPLATE for this content type:
"${exampleTemplate}"`;
    
    // Spezifische Anweisungen basierend auf dem Content-Typ
    switch(contentType) {
      case 'productUpdates':
        prompt += `
SPECIFICS FOR PRODUCT UPDATES:
- Feature to highlight: "Advanced Lighting Effects" in version 2.5.0
- Key benefit: Create professional studio-quality lighting in any photo using AI
- Convey excitement about the new capability
- Encourage users to update/download the app
- Use product-focused emoji like 🚀, ✨, or 📱`;
        break;
        
      case 'tutorialContent':
        prompt += `
SPECIFICS FOR TUTORIAL CONTENT:
- Focus on prompt engineering techniques for better photo editing
- Include a specific prompt formula example that users can try
- Add a short tip that feels valuable even in the limited characters
- Use educational emoji like 📱✨, 🔍, or 💡
- Position our app as an educational tool for creativity`;
        break;
        
      case 'aiGenerationShowcases':
        prompt += `
SPECIFICS FOR AI GENERATION SHOWCASES:
- Emphasize the creative possibilities of our AI generator
- Include this example prompt: "Enchanted forest waterfall at sunset, magical lighting"
- Express amazement at the quality of AI-generated images
- Encourage users to share their own creations
- Use creative emoji like ✨, 🎨, or 🌟`;
        break;
        
      case 'aiEditingShowcases':
        prompt += `
SPECIFICS FOR AI EDITING SHOWCASES:
- Describe an impressive before/after transformation
- Before: "simple portrait photo"
- After: "stunning fantasy character portrait"
- Include the transformation prompt: "transform to fantasy elf, magical glow"
- Use transformation emoji like 🔄, ✂️, or 📸`;
        break;
        
      case 'industryContent':
        prompt += `
SPECIFICS FOR INDUSTRY CONTENT:
- Mention the trending technique "Cinematic Hyper-Realism" in ${currentYear}
- Position our app at the cutting edge of AI image technology
- Include an interesting fact or recent development in AI imaging
- Use tech/trend emoji like 🔮, 📊, or 🌐`;
        break;
        
      case 'communityEngagement':
        prompt += `
SPECIFICS FOR COMMUNITY ENGAGEMENT:
- Create an autumn-themed creative challenge for our users
- Mention a possible prize (premium subscription) for participation
- Make it interactive and exciting
- Encourage sharing and using our specific hashtag #AIPhotoEditorChallenge
- Use community emoji like ✏️, ❓, or 🏆`;
        break;
    }
    
    // Zeitspezifische Anpassungen
    if (isWeekend) {
      prompt += `
NOTE: Today is a weekend, so the tone can be slightly more casual and focus on creative weekend projects.`;
    }
    
    prompt += `

CRITICAL REQUIREMENTS:
- The final tweet MUST be under 250 characters INCLUDING hashtags
- Keep it concise, impactful, and aligned with our brand voice
- Don't include quotation marks around the tweet
- The tweet should be ready to post exactly as you write it
- RETURN ONLY THE TWEET TEXT, no explanations`;
    
    try {
      // Rufe Grok mit dem Prompt auf
      const response = await this.scraper.grokChat({
        messages: [{ role: 'user', content: prompt }],
      });
      
      // Extrahiere den Tweet-Text aus der Antwort
      let tweetText = response.message.trim();
      
      // Entferne mögliche Anführungszeichen, die Grok manchmal hinzufügt
      if ((tweetText.startsWith('"') && tweetText.endsWith('"')) || 
          (tweetText.startsWith("'") && tweetText.endsWith("'"))) {
        tweetText = tweetText.substring(1, tweetText.length - 1);
      }
      
      // Stelle sicher, dass der Tweet wirklich kurz genug ist
      if (tweetText.length > 280) {
        tweetText = tweetText.substring(0, 277) + '...';
      }
      
      console.log(`Grok hat einen strategischen ${typeInfo.name}-Tweet mit ${tweetText.length} Zeichen generiert`);
      return tweetText;
    } catch (error) {
      console.error('Fehler bei der Tweet-Generierung mit Grok:', error);
      throw error;
    }
  }

  /**
   * Sendet einen Tweet
   * @param {string} text - Der zu sendende Text
   * @param {Object} options - Zusätzliche Optionen (z.B. Media)
   * @returns {Promise<Object>} Die Antwort vom Twitter-API
   */
  async sendTweet(text, options = {}) {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Nicht bei Twitter angemeldet');
      }
      
      // Überprüfe Tweet-Länge vor dem Senden (Twitter Limit ist 280 Zeichen)
      if (text.length > 280) {
        console.warn(`Tweet ist zu lang (${text.length} Zeichen). Kürze auf 280 Zeichen...`);
        text = text.substring(0, 277) + '...';
      }
      
      console.log(`Sende Tweet: ${text.substring(0, 50)}...`);
      
      // Sende den Tweet mit Unterstützung für Antworten und Medien
      const response = await this.scraper.sendTweet(
        text, 
        options.replyToTweetId, 
        options.mediaData
      );
      
      // Erweiterte Analyse der Antwort
      let tweetId = 'unknown';
      let success = false;
      
      try {
        // Versuche den Response JSON zu parsen
        const responseText = await response.text();
        console.log('Twitter API Antwort (Text):', responseText.substring(0, 300) + '...');
        
        try {
          const responseJson = JSON.parse(responseText);
          
          // Prüfe auf Fehler in der Antwort
          if (responseJson.errors && responseJson.errors.length > 0) {
            const error = responseJson.errors[0];
            console.error(`Twitter Fehler: ${error.message} (Code: ${error.code})`);
            throw new Error(`Twitter Fehler: ${error.message} (Code: ${error.code})`);
          }
          
          console.log('Twitter API Antwort (JSON Struktur):', 
            JSON.stringify(Object.keys(responseJson), null, 2));
            
          // Versuche die Tweet-ID aus verschiedenen möglichen Pfaden zu extrahieren
          if (responseJson?.data?.create_tweet?.tweet_results?.result?.rest_id) {
            tweetId = responseJson.data.create_tweet.tweet_results.result.rest_id;
            console.log('Tweet-ID aus data.create_tweet.tweet_results.result.rest_id:', tweetId);
            success = true;
          } else if (responseJson?.data?.id) {
            tweetId = responseJson.data.id;
            console.log('Tweet-ID aus data.id:', tweetId);
            success = true;
          } else {
            console.log('Keine bekannte Tweet-ID-Struktur gefunden, suche in der gesamten Antwort nach "id"-Feldern:');
            
            // Rekursive Funktion zum Durchsuchen der Antwort nach "id"-Feldern
            function findIds(obj, path = '') {
              if (!obj || typeof obj !== 'object') return;
              
              for (const [key, value] of Object.entries(obj)) {
                if (key === 'id' || key === 'rest_id' || key === 'tweet_id') {
                  console.log(`Mögliche ID gefunden in ${path}.${key}:`, value);
                  if (!success) {
                    tweetId = value;
                    success = true;
                  }
                }
                
                if (value && typeof value === 'object') {
                  findIds(value, path ? `${path}.${key}` : key);
                }
              }
            }
            
            findIds(responseJson);
          }
        } catch (jsonError) {
          console.log('Antwort ist kein valides JSON:', jsonError.message);
          throw new Error(`Ungültige Antwort vom Twitter-Server: ${jsonError.message}`);
        }
      } catch (idError) {
        console.log('Fehler beim Extrahieren der Tweet-ID:', idError.message);
        throw idError;
      }
      
      if (success) {
        // Protokolliere den gesendeten Tweet
        const tweetLog = {
          id: tweetId,
          timestamp: new Date().toISOString(),
          text: text,
          options: JSON.stringify(options)
        };
        
        this.postedTweets.push(tweetLog);
        
        // Speichere die aktualisierte Tweet-Historie
        fs.writeFileSync(this.tweetLogFile, JSON.stringify(this.postedTweets, null, 2));
        
        console.log(`Tweet erfolgreich gesendet, ID: ${tweetLog.id}`);
        return response;
      } else {
        throw new Error('Tweet konnte nicht gesendet werden: Keine Tweet-ID in der Antwort gefunden');
      }
    } catch (error) {
      console.error('Fehler beim Senden des Tweets:', error);
      throw error;
    }
  }

  /**
   * Erstellt und sendet einen Tweet basierend auf der Marketingstrategie
   * @param {string} [forcedContentType] - Optionaler spezifischer Content-Typ
   * @returns {Promise<Object>} Die Antwort vom Twitter-API
   */
  async createAndSendTweet(forcedContentType = null) {
    try {
      // Ermittle den Content-Typ (entweder vorgegeben oder basierend auf dem Tag)
      const contentType = forcedContentType || this.selectContentPillarByDay();
      console.log(`Erstelle Tweet für Content-Typ: ${contentType}`);
      
      // Erstelle den Tweet-Text
      const tweetText = await this.createTweetByType(contentType);
      
      if (!tweetText) {
        throw new Error(`Konnte keinen Tweet für Content-Typ ${contentType} erstellen`);
      }

      // Extrahiere den Content aus dem Tweet-Text für die Bildgenerierung
      const tweetContent = this.extractContentFromTweet(contentType, tweetText);
      
      // Optionen für den Tweet
      const options = {};
      
      // Erzeuge ein Bild mit Gemini, wenn wir nicht im Browser sind
      if (typeof window === 'undefined') {
        try {
          console.log('Generiere Bild mit Gemini...');
          
          // Generiere ein passendes Bild mit Gemini
          const imageData = await this.imageGenerator.generateImageForTweet(contentType, tweetContent);
          
          options.mediaData = [
            {
              data: imageData.buffer,
              mediaType: imageData.mediaType,
            },
          ];
          
          console.log(`Bild erfolgreich generiert: ${imageData.filepath}`);
        } catch (imageError) {
          console.error('Fehler bei der Bildgenerierung:', imageError);
          
          // Wenn Gemini fehlschlägt, versuche das Testbild zu verwenden
          if (fs.existsSync('./test-image.jpg')) {
            try {
              console.log('Verwende Testbild als Fallback...');
              const imageData = fs.readFileSync('./test-image.jpg');
              options.mediaData = [
                {
                  data: imageData,
                  mediaType: 'image/jpeg',
                },
              ];
            } catch (fallbackError) {
              console.error('Fehler beim Laden des Testbildes:', fallbackError);
              // Fahre ohne Bild fort
            }
          }
        }
      }
      
      // Sende den Tweet mit den Optionen
      console.log('Sende Tweet mit Optionen:', options.mediaData ? 'Mit Bild' : 'Ohne Bild');
      
      try {
        const result = await this.sendTweet(tweetText, options);
        console.log('Tweet erfolgreich gesendet!');
        return result;
      } catch (tweetError) {
        console.error('Tweet konnte nicht gesendet werden:', tweetError.message);
        
        // Versuche, den Tweet zu kürzen, falls er zu lang ist
        if (tweetError.message && tweetError.message.includes('bit shorter') || tweetError.message.includes('Code: 186')) {
          console.log('Versuche, Tweet zu kürzen und erneut zu senden...');
          
          // Kürze den Tweet deutlich (z.B. auf 220 Zeichen)
          const shortenedText = tweetText.substring(0, 220) + '...';
          
          try {
            console.log(`Sende gekürzten Tweet: ${shortenedText.substring(0, 50)}...`);
            const result = await this.sendTweet(shortenedText, options);
            console.log('Gekürzter Tweet erfolgreich gesendet!');
            return result;
          } catch (retryError) {
            console.error('Auch der gekürzte Tweet konnte nicht gesendet werden:', retryError.message);
            throw retryError;
          }
        }
        throw tweetError;
      }
    } catch (error) {
      console.error('Fehler beim Erstellen und Senden des Tweets:', error);
      throw error;
    }
  }

  /**
   * Extrahiert relevante Inhalte aus dem Tweet-Text für die Bildgenerierung
   * @param {string} contentType - Der Typ des Contents
   * @param {string} tweetText - Der generierte Tweet-Text
   * @returns {Object} Extrahierte Inhalte für die Bildgenerierung
   */
  extractContentFromTweet(contentType, tweetText) {
    console.log(`Extrahiere Content aus Tweet (${contentType}): ${tweetText.substring(0, 100)}...`);
    
    // Entferne Emojis und Hashtags für eine bessere Analyse
    const cleanText = tweetText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '')
                              .replace(/#\w+/g, '')
                              .trim();
    
    // Grundlegende Extraktion basierend auf dem Content-Typ
    let content = {
      rawTweet: tweetText,
      mainText: cleanText,
      contentType: contentType
    };
    
    // Spezifische Extraktion basierend auf Content-Typ
    switch(contentType) {
      case 'productUpdates': {
        // Suche nach Feature-Namen
        const featureMatch = cleanText.match(/(?:launched|introduces|brings|new|update)\s+"?([^",.!]+)"?/i) || 
                             cleanText.match(/new\s+feature:?\s+([^,.!]+)/i) ||
                             cleanText.match(/introducing\s+([^,.!]+)/i);
        
        // Suche nach Nutzen/Vorteil
        const benefitMatch = cleanText.match(/(?:can|helps|allows)\s+(?:you\s+)?(?:to\s+)?([^,.!]+)/i) ||
                             cleanText.match(/benefit:?\s+([^,.!]+)/i);
        
        // Suche nach Version
        const versionMatch = cleanText.match(/v(\d+\.\d+(?:\.\d+)?)/i) ||
                             cleanText.match(/version\s+(\d+\.\d+(?:\.\d+)?)/i);
        
        content = {
          ...content,
          feature: featureMatch ? featureMatch[1].trim() : 'Advanced Lighting Effects',
          benefit: benefitMatch ? benefitMatch[1].trim() : 'transform your photos with AI',
          version: versionMatch ? versionMatch[1] : '2.5.0'
        };
        break;
      }
      
      case 'tutorialContent': {
        // Suche nach der Technik/Tipp
        const tipMatch = cleanText.match(/tip:?\s+([^,.!]+)/i) ||
                         cleanText.match(/how\s+to\s+([^,.!]+)/i) ||
                         cleanText.match(/learn\s+to\s+([^,.!]+)/i) ||
                         cleanText.match(/master\s+([^,.!]+)/i);
        
        // Suche nach einem Prompt-Beispiel
        const promptMatch = cleanText.match(/"([^"]+)"/);
        
        // Suche nach speziellen Anweisungen oder Formeln
        const formulaMatch = cleanText.match(/formula:?\s+([^,.!]+)/i) ||
                             cleanText.match(/try\s+(?:adding|using)?\s+(?:this:?\s+)?([^,.!]+)/i);
        
        content = {
          ...content,
          technique: tipMatch ? tipMatch[1].trim() : 'prompt engineering',
          prompt: promptMatch ? promptMatch[1].trim() : 'enhance portrait with soft lighting',
          formula: formulaMatch ? formulaMatch[1].trim() : 'A [adjective] [subject] with [effect]'
        };
        break;
      }
      
      case 'aiGenerationShowcases': {
        // Extrahiere den kreativen Prompt
        const promptMatch = cleanText.match(/"([^"]+)"/);
        
        // Extrahiere die Art des generierten Bildes
        const imageTypeMatch = cleanText.match(/(?:created|generated|made)\s+(?:a|an)?\s+([^,.!]+)/i) ||
                               cleanText.match(/(?:stunning|beautiful|amazing)\s+([^,.!]+)(?:\s+with)/i);
        
        content = {
          ...content,
          prompt: promptMatch ? promptMatch[1].trim() : 'Enchanted forest waterfall at sunset, magical lighting',
          imageType: imageTypeMatch ? imageTypeMatch[1].trim() : 'AI artwork'
        };
        break;
      }
      
      case 'aiEditingShowcases': {
        // Extrahiere Before/After und Prompt
        const beforeMatch = cleanText.match(/(?:transformed|turned|changed)\s+(?:a|an)?\s+([^,.!]+)(?:\s+into)/i) ||
                            cleanText.match(/before:?\s+([^,.!]+)/i);
                            
        const afterMatch = cleanText.match(/(?:into|to)\s+(?:a|an)?\s+([^,.!]+)/i) ||
                           cleanText.match(/after:?\s+([^,.!]+)/i);
                           
        const promptMatch = cleanText.match(/"([^"]+)"/);
        
        content = {
          ...content,
          before: beforeMatch ? beforeMatch[1].trim() : 'ordinary portrait',
          after: afterMatch ? afterMatch[1].trim() : 'fantasy character',
          prompt: promptMatch ? promptMatch[1].trim() : 'transform to fantasy elf, magical glow'
        };
        break;
      }
      
      case 'industryContent': {
        // Extrahiere Trend und Jahr
        const trendMatch = cleanText.match(/trend:?\s+([^,.!]+)/i) ||
                           cleanText.match(/([^,.!]+)(?:\s+is\s+taking\s+over)/i) ||
                           cleanText.match(/latest\s+(?:in|trend):?\s+([^,.!]+)/i);
                           
        const yearMatch = cleanText.match(/(?:in|for)\s+(\d{4})/);
        
        // Extrahiere einen Fact oder News wenn vorhanden
        const factMatch = cleanText.match(/fact:?\s+([^.!]+)/i) ||
                          cleanText.match(/did\s+you\s+know\s+([^?!.]+)/i);
                          
        content = {
          ...content,
          trend: trendMatch ? trendMatch[1].trim() : 'Cinematic Hyper-Realism',
          year: yearMatch ? yearMatch[1] : new Date().getFullYear().toString(),
          fact: factMatch ? factMatch[1].trim() : null
        };
        break;
      }
      
      case 'communityEngagement': {
        // Extrahiere Challenge
        const challengeMatch = cleanText.match(/challenge:?\s+([^,.!?]+)/i) ||
                               cleanText.match(/create\s+(?:a|an)?\s+([^,.!?]+)/i) ||
                               cleanText.match(/share\s+(?:your)?\s+([^,.!?]+)/i);
                               
        // Extrahiere Preis falls vorhanden
        const prizeMatch = cleanText.match(/prize:?\s+([^,.!?]+)/i) ||
                           cleanText.match(/win\s+(?:a|an)?\s+([^,.!?]+)/i);
        
        content = {
          ...content,
          challenge: challengeMatch ? challengeMatch[1].trim() : 'creative AI-edited photos',
          prize: prizeMatch ? prizeMatch[1].trim() : 'premium subscription'
        };
        break;
      }
    }
    
    console.log('Extrahierter Content für Bildgenerierung:', content);
    return content;
  }

  /**
   * Lädt beliebte Trends und gibt sie zurück
   * @param {number} count - Anzahl der zu ladenden Trends
   * @returns {Promise<string[]>} Liste der Trends
   */
  async getPopularTrends(count = 5) {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Nicht bei Twitter angemeldet');
      }
      
      console.log('Lade aktuelle Trends...');
      
      // Hole die Trends von Twitter
      const trends = await this.scraper.getTrends();
      
      console.log(`${trends.length} Trends geladen`);
      
      // Gib die angeforderte Anzahl zurück
      return trends.slice(0, count);
    } catch (error) {
      console.error('Fehler beim Laden der Trends:', error);
      return [];
    }
  }

  /**
   * Analysiert die Performance der letzten gesendeten Tweets
   * @param {number} count - Anzahl der zu analysierenden Tweets
   * @returns {Promise<Object>} Analyse-Ergebnis
   */
  async analyzePerformance(count = 10) {
    try {
      // Prüfe, ob es bereits gesendete Tweets gibt
      if (!this.postedTweets || this.postedTweets.length === 0) {
        return {
          success: false,
          message: 'Keine gesendeten Tweets zur Analyse gefunden. Sende zuerst Tweets.'
        };
      }
      
      // Begrenze auf die Anzahl der vorhandenen Tweets
      const tweetCount = Math.min(count, this.postedTweets.length);
      const tweetsToAnalyze = this.postedTweets.slice(0, tweetCount);
      
      console.log(`Analysiere die letzten ${tweetCount} Tweets...`);
      
      // Vereinfachte Analyseergebnisse, da wir die V2 API nicht verwenden
      const analysis = {
        totalTweets: tweetCount,
        engagementByType: {},
        bestPerformingTweet: null,
        bestEngagement: -1
      };
      
      // Gruppiere nach Content-Typ (falls verfügbar)
      for (const tweet of tweetsToAnalyze) {
        // Extrahiere Content-Typ aus dem Tweet-Text falls möglich
        let contentType = 'unbekannt';
        
        // Versuche, Content-Typ aus dem Text zu extrahieren
        for (const [type, info] of Object.entries(this.contentPillars)) {
          if (tweet.text && tweet.text.includes(info.name)) {
            contentType = type;
            break;
          }
        }
        
        // Sammle Statistiken für diesen Content-Typ
        if (!analysis.engagementByType[contentType]) {
          analysis.engagementByType[contentType] = {
            count: 0,
            totalEngagement: 0,
            avgEngagement: 0
          };
        }
        
        analysis.engagementByType[contentType].count++;
        // Da wir keine V2 API verwenden, setzen wir einen fiktiven Engagement-Wert basierend auf der Zeit
        const daysAgo = (new Date() - new Date(tweet.timestamp)) / (1000 * 60 * 60 * 24);
        const fiktiveEngagement = Math.max(1, Math.round(10 - daysAgo)); // Neuere Tweets werden höher gewertet
        
        analysis.engagementByType[contentType].totalEngagement += fiktiveEngagement;
        analysis.engagementByType[contentType].avgEngagement = 
          analysis.engagementByType[contentType].totalEngagement / 
          analysis.engagementByType[contentType].count;
        
        // Aktualisiere besten Tweet
        if (fiktiveEngagement > analysis.bestEngagement) {
          analysis.bestEngagement = fiktiveEngagement;
          analysis.bestPerformingTweet = tweet;
        }
      }
      
      console.log('Performance-Analyse abgeschlossen');
      return analysis;
    } catch (error) {
      console.error('Fehler bei der Performance-Analyse:', error);
      return {
        success: false,
        message: `Fehler bei der Analyse: ${error.message}`,
        totalTweets: 0,
        engagementByType: {}
      };
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
    
    // Automatische Tests werden ausgeführt, um zu tweeten
    // Teste die Funktionalität
    try {
      // Erstelle und sende einen Tweet basierend auf dem aktuellen Wochentag
      await agent.createAndSendTweet();
      
      // Hole aktuelle Trends
      const trends = await agent.getPopularTrends(3);
      console.log('Aktuelle Trends:', trends);
      
      // Analysiere die Performance der letzten Tweets
      const performance = await agent.analyzePerformance();
      console.log('Performance-Analyse:', JSON.stringify(performance, null, 2));
    } catch (error) {
      console.error('Fehler bei der Ausführung:', error);
    }
  }
}

// Die automatische Ausführung wird entfernt, um doppelte Tweets zu vermeiden
// console.log('Starte main() Funktion...');
// main().catch(error => console.error('Fehler in main():', error));

export default MarketingAgent; 