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
    let prompt = '';
    
    // Erstelle einen passenden Prompt je nach Content-Typ
    switch (contentType) {
      case 'productUpdates':
        prompt = `Generate an image of a professional photo editing app interface showing the "${tweetContent.feature}" feature. Make it modern and clean with a focus on the user interface.`;
        break;
      case 'tutorialContent':
        prompt = `Generate a tutorial image showing how to ${tweetContent.accomplish} in photo editing. Create a before and after comparison with arrows or steps indicated.`;
        break;
      case 'aiGenerationShowcases':
        // Verwende direkt den Prompt aus dem Tweet
        prompt = `Generate a beautiful image based on this prompt: ${tweetContent.prompt || 'magical scenery with fantasy elements and vibrant colors'}`;
        break;
      case 'aiEditingShowcases':
        prompt = `Generate a before-and-after comparison showing ${tweetContent.before} transformed into ${tweetContent.after} through AI photo editing.`;
        break;
      case 'industryContent':
        prompt = `Create a visual representation of the ${tweetContent.trend} trend in AI photo editing for ${tweetContent.year}. Make it look like an industry infographic or showcase.`;
        break;
      case 'communityEngagement':
        prompt = `Generate an engaging image for a community challenge to create ${tweetContent.challenge} with AI photo editing. Make it eye-catching and inspiring.`;
        break;
      default:
        prompt = 'Generate an image of a modern AI photo editor interface with beautiful results on the screen.';
    }
    
    return await this.generateImage(prompt);
  }
}

export default ImageGenerator; 