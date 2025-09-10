import {Platform, EmitterSubscription} from 'react-native';
import Tts from 'react-native-tts';
import {VoiceCommandResult, AnimalType, Location} from '../CoreLogic/types';
import {WildlifeReportsService} from './wildlifeReportsService';

class VoiceCommandService {
  private isInitialized = false;
  private ttsStartSubscription: { remove: () => void } | null = null;
  private ttsFinishSubscription: { remove: () => void } | null = null;
  private ttsCancelSubscription: { remove: () => void } | null = null;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      // Initialize TTS for voice feedback
      await this.initializeTTS();

      // Platform-specific initialization
      if (Platform.OS === 'ios') {
        await this.initializeSiriIntegration();
      } else {
        await this.initializeGoogleAssistantIntegration();
      }

      this.isInitialized = true;
      console.log('Voice command service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize voice command service:', error);
      return false;
    }
  }

  private async initializeTTS() {
    Tts.setDefaultLanguage('en-US');
    Tts.setDefaultRate(0.5);
    Tts.setDefaultPitch(1.0);

    // Set up TTS event listeners
    this.ttsStartSubscription = Tts.addEventListener('tts-start', () =>
      console.log('TTS started'),
    );
    this.ttsFinishSubscription = Tts.addEventListener('tts-finish', () =>
      console.log('TTS finished'),
    );
    this.ttsCancelSubscription = Tts.addEventListener('tts-cancel', () =>
      console.log('TTS cancelled'),
    );
  }

  private async initializeSiriIntegration() {
    // iOS Siri integration is handled through App Intents
    // The actual Siri shortcut configuration is done in native iOS code
    console.log('Siri integration initialized');
  }

  private async initializeGoogleAssistantIntegration() {
    // Android Google Assistant integration
    // App Actions are configured in the Android manifest and shortcuts.xml
    console.log('Google Assistant integration initialized');
  }

  async processVoiceCommand(
    command: string,
    location?: Location,
  ): Promise<VoiceCommandResult | null> {
    try {
      console.log('Processing voice command:', command);

      // Parse the voice command
      const result = this.parseVoiceCommand(command);

      if (!result) {
        await this.speakResponse(
          "Sorry, I didn't understand that command. Please try again.",
        );
        return null;
      }

      // Confirm with user before submitting
      const confirmationMessage = `Reporting ${result.quantity} ${
        result.animalType
      }${result.quantity > 1 ? 's' : ''}. Is that correct?`;
      await this.speakResponse(confirmationMessage);

      // Submit the report
      const reportId = await this.submitVoiceReport(result, location);

      if (reportId) {
        await this.speakResponse(
          'Report submitted successfully. Thank you for helping keep our roads safe.',
        );
        return result;
      } else {
        await this.speakResponse(
          'Sorry, there was an error submitting your report. Please try again.',
        );
        return null;
      }
    } catch (error) {
      console.error('Voice command processing failed:', error);
      await this.speakResponse(
        'Sorry, there was an error processing your request.',
      );
      return null;
    }
  }

  private parseVoiceCommand(command: string): VoiceCommandResult | null {
    const lowerCommand = command.toLowerCase();

    // Extract animal type
    let animalType: AnimalType = 'deer'; // default
    if (lowerCommand.includes('bear')) {
      animalType = 'bear';
    } else if (lowerCommand.includes('moose') || lowerCommand.includes('elk')) {
      animalType = 'moose_elk';
    } else if (lowerCommand.includes('raccoon')) {
      animalType = 'raccoon';
    } else if (lowerCommand.includes('squirrel')) {
      animalType = 'squirrel';
    } else if (lowerCommand.includes('rabbit')) {
      animalType = 'rabbit';
    }

    // Extract quantity
    let quantity = 1; // default
    const numberWords: {[key: string]: number} = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
    };

    for (const [word, num] of Object.entries(numberWords)) {
      if (lowerCommand.includes(word)) {
        quantity = num;
        break;
      }
    }

    // Check for number patterns (1-10)
    const numberMatch = lowerCommand.match(/\b(\d+)\b/);
    if (numberMatch) {
      const num = parseInt(numberMatch[1], 10);
      if (num >= 1 && num <= 10) {
        quantity = num;
      }
    }

    return {
      action: 'report_sighting',
      animalType,
      quantity,
    };
  }

  private async submitVoiceReport(
    result: VoiceCommandResult,
    location?: Location,
  ): Promise<string | null> {
    try {
      if (!location) {
        // Try to get current location
        const currentLocation = await this.getCurrentLocation();
        if (!currentLocation) {
          throw new Error('Unable to get location');
        }
        location = currentLocation;
      }

      const reportId = await WildlifeReportsService.submitReport(
        result.animalType,
        location,
        result.quantity,
      );

      return reportId;
    } catch (error) {
      console.error('Failed to submit voice report:', error);
      return null;
    }
  }

  private async getCurrentLocation(): Promise<Location | null> {
    // This would use the geolocation service
    // For now, return a mock location or integrate with existing location service
    return null; // TODO: Implement proper location fetching
  }

  private async speakResponse(message: string) {
    try {
      await Tts.speak(message);
    } catch (error) {
      console.error('TTS failed:', error);
    }
  }

  // Public method to handle Siri shortcut invocation
  async handleSiriShortcut(command: string, location?: Location) {
    return await this.processVoiceCommand(command, location);
  }

  // Public method to handle Google Assistant App Action
  async handleGoogleAssistantAction(command: string, location?: Location) {
    return await this.processVoiceCommand(command, location);
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      platform: Platform.OS,
    };
  }

  async cleanup() {
    if (this.ttsStartSubscription) {
      this.ttsStartSubscription.remove();
    }
    if (this.ttsFinishSubscription) {
      this.ttsFinishSubscription.remove();
    }
    if (this.ttsCancelSubscription) {
      this.ttsCancelSubscription.remove();
    }
    this.isInitialized = false;
  }
}

export const voiceCommandService = new VoiceCommandService();
