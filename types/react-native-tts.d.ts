declare module 'react-native-tts' {
  export interface EmitterSubscription {
    remove(): void;
  }

  export default class Tts {
    static setDefaultLanguage(language: string): void;
    static setDefaultRate(rate: number): void;
    static setDefaultPitch(pitch: number): void;
    static speak(text: string): Promise<void>;
    static stop(): void;
    static pause(): void;
    static resume(): void;
    static getInitStatus(): Promise<string>;
    static addEventListener(
      event: string,
      callback: () => void,
    ): EmitterSubscription;
    static removeEventListener(event: string, callback: () => void): void;
    static removeAllListeners(event: string): void;
  }
}
