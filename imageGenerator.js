import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Lade Umgebungsvariablen
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.0-flash-exp-image-generation';

// Verzeichnis für generierte Bilder
const IMAGE_DIR = 'generated-images';

// Stelle sicher, dass das Verzeichnis existiert
if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

/**
 * Klasse zur Verwaltung der Bildgenerierung mit Gemini
 */
class ImageGenerator {
  constructor() {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY ist nicht in der .env Datei definiert');
    }
    
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        responseModalities: ['Image', 'Text']
      }
    });
  }

  /**
   * Generiert ein Bild basierend auf dem Prompt
   * @param {string} prompt - Der Prompt für die Bildgenerierung
   * @returns {Promise<Object>} Pfad zur Bilddatei und Buffer-Daten
   */
  async generateImage(prompt) {
    try {
      console.log(`Generiere Bild mit Prompt: ${prompt}`);
      
      // Erstelle einen erweiterten Prompt für bessere Qualität
      const enhancedPrompt = this.enhancePrompt(prompt);
      
      // Generiere das Bild mit Gemini 2.0 Flash Experimental
      const result = await this.model.generateContent(enhancedPrompt);
      
      console.log("Antwort von Gemini erhalten, versuche Bild zu extrahieren...");
      
      // Logge die Antwortstruktur ohne große Bilddaten für Debugging-Zwecke
      const filteredResponse = JSON.parse(JSON.stringify(result.response));
      if (filteredResponse.candidates && filteredResponse.candidates[0] && 
          filteredResponse.candidates[0].content && filteredResponse.candidates[0].content.parts) {
        filteredResponse.candidates[0].content.parts = filteredResponse.candidates[0].content.parts.map(part => {
          if (part.inlineData && part.inlineData.data) {
            return { ...part, inlineData: { ...part.inlineData, data: '[BILD-DATEN AUSGEBLENDET]' } };
          }
          return part;
        });
      }
      console.log("Antwortstruktur:", JSON.stringify(filteredResponse, null, 2));
      
      // Extrahiere das generierte Bild
      const imageData = await this.getImageFromResponse(result);
      
      return imageData;
    } catch (error) {
      console.error('Fehler bei der Bildgenerierung:', error);
      
      // Fallback zum Testbild
      return this.getTestImage();
    }
  }

  /**
   * Liefert ein Test-Bild als Fallback
   * @returns {Promise<Object>} Bildpfad und Buffer-Daten
   */
  async getTestImage() {
    try {
      console.log('Verwende Test-Bild als Fallback...');
      
      // Lese das Test-Bild
      const testImagePath = './test-image.jpg';
      if (!fs.existsSync(testImagePath)) {
        throw new Error('Test-Bild nicht gefunden');
      }
      
      const imageBuffer = fs.readFileSync(testImagePath);
      
      // Kopiere das Test-Bild ins Zielverzeichnis
      const timestamp = new Date().getTime();
      const filename = `test_image_${timestamp}.jpg`;
      const filepath = path.join(IMAGE_DIR, filename);
      
      fs.writeFileSync(filepath, imageBuffer);
      console.log(`Test-Bild gespeichert: ${filepath}`);
      
      return {
        filepath,
        buffer: imageBuffer,
        mediaType: 'image/jpeg'
      };
    } catch (error) {
      console.error('Fehler beim Laden des Test-Bildes:', error);
      throw error;
    }
  }

  /**
   * Verbessert den ursprünglichen Prompt für bessere Bildqualität
   * @param {string} originalPrompt - Der ursprüngliche Prompt
   * @returns {string} Der verbesserte Prompt
   */
  enhancePrompt(originalPrompt) {
    // Füge qualitätsverbessernde Beschreibungen hinzu, falls nicht vorhanden
    const qualityModifiers = [
      'high quality', 'detailed', 'professional', '8k resolution', 
      'sharp focus', 'well-lit', 'photorealistic'
    ];
    
    let enhancedPrompt = originalPrompt;
    
    // Füge nur Modifikatoren hinzu, die noch nicht im Prompt enthalten sind
    for (const modifier of qualityModifiers) {
      if (!enhancedPrompt.toLowerCase().includes(modifier.toLowerCase())) {
        enhancedPrompt += `, ${modifier}`;
      }
    }
    
    return enhancedPrompt;
  }

  /**
   * Extrahiert und speichert das Bild aus der Gemini-Antwort
   * @param {Object} response - Die Antwort von Gemini
   * @returns {Promise<Object>} Pfad zur Bilddatei und Buffer-Daten
   */
  async getImageFromResponse(response) {
    try {
      // Durchsuche die Antwortteile nach Bilddaten
      let imageData = null;
      
      // Versuche alle möglichen Pfade, um die Bilddaten zu finden
      if (response.response && 
          response.response.candidates && 
          response.response.candidates[0] && 
          response.response.candidates[0].content &&
          response.response.candidates[0].content.parts) {
        
        const parts = response.response.candidates[0].content.parts;
        
        // Suche nach inlineData in allen Parts
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            imageData = part.inlineData.data;
            console.log("Bilddaten in inlineData gefunden");
            break;
          } else if (part.text) {
            console.log("Textantwort gefunden:", part.text);
          }
        }
      } else if (response.candidates && 
                response.candidates[0] && 
                response.candidates[0].content &&
                response.candidates[0].content.parts) {
        
        const parts = response.candidates[0].content.parts;
        
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            imageData = part.inlineData.data;
            console.log("Bilddaten in alternativer Struktur gefunden");
            break;
          }
        }
      } else {
        console.log("Unerwartete Antwortstruktur:", response);
      }
      
      if (!imageData) {
        throw new Error('Keine Bilddaten in der Antwort gefunden');
      }
      
      // Konvertiere Base64 zu Buffer
      const imageBuffer = Buffer.from(imageData, 'base64');
      
      // Generiere einen eindeutigen Dateinamen
      const timestamp = new Date().getTime();
      const filename = `gemini_image_${timestamp}.png`;
      const filepath = path.join(IMAGE_DIR, filename);
      
      // Speichere das Bild
      fs.writeFileSync(filepath, imageBuffer);
      console.log(`Bild gespeichert: ${filepath}`);
      
      return {
        filepath,
        buffer: imageBuffer,
        mediaType: 'image/png'
      };
    } catch (error) {
      console.error('Fehler beim Extrahieren des Bildes:', error);
      throw error;
    }
  }

  /**
   * Generiert ein passendes Bild basierend auf dem Tweet-Typ und Inhalt
   * @param {string} contentType - Der Typ des Tweet-Inhalts
   * @param {Object} tweetContent - Der Inhalt des Tweets
   * @returns {Promise<Object>} Pfad zur Bilddatei und Buffer-Daten
   */
  async generateImageForTweet(contentType, tweetContent) {
    console.log(`Generiere Bild für Tweet-Typ: ${contentType}`);
    
    let prompt = '';
    let demonstrationPrompt = '';
    
    // Verwende den Rohtext des Tweets, falls vorhanden, um besseren Kontext zu haben
    const rawTweet = tweetContent.rawTweet || '';
    
    // Prüfe, ob ein zu demonstrierender Prompt im Tweet vorhanden ist
    let tweetPrompt = tweetContent.prompt || '';
    const hasPromptToDemo = tweetPrompt && tweetPrompt.length > 5; // Sicherstellen, dass der Prompt nicht zu kurz ist
    
    // Prüfe, ob der Prompt Platzhalter enthält und ersetze sie bei Bedarf
    if (hasPromptToDemo && (tweetPrompt.includes('[') || tweetPrompt.includes(']'))) {
      console.log('Prompt enthält Platzhalter, erstelle konkrete Beispiele...');
      
      // Falls der Prompt eine Formel mit Platzhaltern enthält, ersetze sie
      const placeholderMap = {
        '[subject]': 'mountain landscape',
        '[object]': 'vintage camera',
        '[person]': 'professional photographer',
        '[setting]': 'sunset beach',
        '[style]': 'cinematic',
        '[color]': 'golden hour',
        '[time]': 'sunset',
        '[weather]': 'misty morning',
        '[lighting]': 'dramatic lighting',
        '[mood]': 'serene',
        '[texture]': 'smooth',
        '[effect]': 'bokeh effect',
        '[adjective]': 'vibrant',
        '[emotion]': 'peaceful'
      };
      
      // Ersetze alle Platzhalter durch konkrete Beispiele
      let concretePrompt = tweetPrompt;
      for (const [placeholder, replacement] of Object.entries(placeholderMap)) {
        concretePrompt = concretePrompt.replace(new RegExp(placeholder, 'gi'), replacement);
      }
      
      // Prüfe, ob alle Platzhalter ersetzt wurden
      if (concretePrompt.includes('[') && concretePrompt.includes(']')) {
        // Es gibt immer noch unbekannte Platzhalter, ersetze sie generisch
        concretePrompt = concretePrompt.replace(/\[\w+\]/g, 'beautiful scene');
      }
      
      console.log(`Formel "${tweetPrompt}" in konkretes Beispiel umgewandelt: "${concretePrompt}"`);
      
      // Speichere sowohl die Original-Formel als auch das konkrete Beispiel
      const originalPrompt = tweetPrompt;
      tweetPrompt = concretePrompt;
      
      // Erstelle einen speziellen Prompt für Prompt-Formeln
      if (contentType === 'tutorialContent') {
        demonstrationPrompt = `Create a professional tutorial image demonstrating how to use prompt formulas in photo editing.
                           Show a visual explanation of the formula: "${originalPrompt}"
                           Include a split-screen comparison with:
                           - Left side: A basic photo labeled "BEFORE"
                           - Right side: The same photo edited using the formula, becoming a "${concretePrompt}" (labeled "AFTER")
                           Add text explaining how placeholders work - for example: [subject] = mountain landscape
                           Make it educational with a clean, tutorial-style design and numbered steps.`;
      }
    }
    
    // Erstelle einen passenden Prompt je nach Content-Typ
    switch (contentType) {
      case 'productUpdates': {
        const feature = tweetContent.feature || 'Advanced Lighting Effects';
        const benefit = tweetContent.benefit || 'transform photos with professional lighting';
        const version = tweetContent.version || '2.5.0';
        
        prompt = `Generate a clean, professional image showing a mobile app interface highlighting the "${feature}" feature in AI Photo Editor version ${version}. 
                 Show the feature in action with a clear before-after demonstration of how it ${benefit}.
                 Use modern UI design, with a focus on the result. Include subtle app controls and interface elements.`;
        break;
      }
        
      case 'tutorialContent': {
        const technique = tweetContent.technique || 'prompt engineering';
        const promptExample = tweetContent.prompt || '';
        const formula = tweetContent.formula || '';
        
        if (hasPromptToDemo) {
          // Wenn ein konkreter Prompt im Tweet vorhanden ist, erstelle ein Bild, das diesen Prompt demonstriert
          
          // Wenn wir bereits einen speziellen Prompt für Formeln haben, verwende diesen
          if (demonstrationPrompt) {
            prompt = demonstrationPrompt;
          } else {
            // Ansonsten erstelle einen Standard-Demo-Prompt
            prompt = `Create a visual demonstration of what happens when using the photo editing prompt "${tweetPrompt}".
                              Show a clear before/after split-screen image:
                              - On the left: A standard photo labeled "BEFORE"
                              - On the right: The same photo with "${tweetPrompt}" applied, labeled "AFTER"
                              Make the effect of the prompt very visible and impressive.
                              Include a text overlay showing the prompt: "${tweetPrompt}"
                              Style it as a professional tutorial image with clean design.`;
          }
        } else {
          // Standard-Tutorial-Bild, wenn kein spezifischer Prompt zu demonstrieren ist
          prompt = `Create an educational, step-by-step tutorial image showing how to master ${technique} in photo editing. 
                   ${promptExample ? `Include an example of using the prompt: "${promptExample}"` : ''}
                   ${formula ? `Visualize the formula: ${formula}` : ''}
                   Show before and after results with clear markings of the steps involved.
                   Make it look like a professional tutorial with numbered steps and annotations.`;
        }
        break;
      }
        
      case 'aiGenerationShowcases': {
        // Verwende direkt den Prompt aus dem Tweet
        const imagePrompt = tweetContent.prompt || 'Enchanted forest waterfall at sunset, magical lighting';
        const imageType = tweetContent.imageType || 'AI artwork';
        
        if (hasPromptToDemo) {
          // Wenn ein spezifischer Prompt im Tweet erwähnt wird, verwende diesen direkt
          prompt = `Generate a stunning ${imageType} directly using this prompt: "${tweetPrompt}".
                  Create the exact image that would result from this prompt.
                  Focus on making a high-quality, impressive result that showcases what our AI can create.
                  Do not include any text annotations or labels in the image itself.`;
        } else {
          prompt = `Generate a stunning, detailed ${imageType} based exactly on this description: "${imagePrompt}".
                   Create an artistic, professional result that showcases the power of AI image generation.
                   Make the image vibrant and eye-catching, suitable for a social media showcase.`;
        }
        break;
      }
        
      case 'aiEditingShowcases': {
        const before = tweetContent.before || 'ordinary portrait';
        const after = tweetContent.after || 'fantasy character';
        const editPrompt = tweetContent.prompt || 'transform to fantasy style';
        
        if (hasPromptToDemo) {
          // Bei vorhandenem Prompt, zeige die tatsächliche Transformation mit diesem Prompt
          prompt = `Create a professional before-and-after comparison showing the transformation using the exact prompt: "${tweetPrompt}".
                   On the left side: Show a ${before} image labeled "BEFORE"
                   On the right side: Show the same image transformed into a ${after} using the prompt, labeled "AFTER"
                   Make the transformation dramatic and impressive to showcase the exact effects of the prompt.
                   Include the prompt text "${tweetPrompt}" subtly at the bottom of the image.`;
        } else {
          prompt = `Create a professional before-and-after comparison showing the transformation of a ${before} into a ${after}.
                   The transformation should match this editing prompt: "${editPrompt}".
                   Split the image with a clear divider, showing "BEFORE" on the left and "AFTER" on the right.
                   Make the transformation dramatic and impressive to showcase the power of AI editing.`;
        }
        break;
      }
        
      case 'industryContent': {
        const trend = tweetContent.trend || 'Cinematic Hyper-Realism';
        const year = tweetContent.year || new Date().getFullYear().toString();
        const fact = tweetContent.fact || null;
        
        prompt = `Create a professional, infographic-style image visualizing the "${trend}" trend in AI photo editing for ${year}.
                 ${fact ? `Include this fact: "${fact}"` : ''}
                 Use a modern, tech-inspired design with data points or visual elements that highlight the trend.
                 Make it look like a professional industry report or analysis visualization.`;
        break;
      }
        
      case 'communityEngagement': {
        const challenge = tweetContent.challenge || 'creative AI-edited photos';
        const prize = tweetContent.prize || 'premium subscription';
        
        prompt = `Create an engaging, colorful announcement image for a community challenge to create ${challenge}.
                 Include visual elements suggesting creativity, community, and participation.
                 ${prize ? `Subtly indicate a prize: ${prize}` : ''}
                 Make it exciting and motivational to encourage participation in the challenge.
                 Use bright colors and dynamic composition that would catch attention on social media.`;
        break;
      }
        
      default: {
        // Fallback-Prompt: Verwende den Tweet-Text direkt, wenn verfügbar
        const mainText = tweetContent.mainText || '';
        
        prompt = `Generate a professional marketing image for an AI Photo Editor app. 
                 ${mainText ? `The image should relate to: "${mainText.substring(0, 100)}"` : ''}
                 Show impressive photo editing capabilities with beautiful results.
                 Use modern design elements and make it suitable for social media marketing.`;
      }
    }
    
    console.log('Generierter Bild-Prompt:', prompt);
    return await this.generateImage(prompt);
  }
}

export default ImageGenerator; 