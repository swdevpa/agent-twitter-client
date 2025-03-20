import { PlatformExtensions } from '../platform-interface.js';
import { randomizeCiphers } from './randomize-ciphers.js';

class NodePlatform implements PlatformExtensions {
  randomizeCiphers(): Promise<void> {
    randomizeCiphers();
    return Promise.resolve();
  }
}

export const platform = new NodePlatform();
