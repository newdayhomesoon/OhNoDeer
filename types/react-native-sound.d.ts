declare module 'react-native-sound' {
  export interface SoundOptions {
    numberOfLoops?: number;
  }

  export default class Sound {
    static MAIN_BUNDLE: string;
    static DOCUMENT: string;
    static LIBRARY: string;
    static CACHES: string;

    constructor(
      filename: string,
      basePath?: string,
      callback?: (error: any) => void,
    );

    play(callback?: (success: boolean) => void): void;
    pause(): void;
    stop(): void;
    release(): void;
    getDuration(): number;
    getCurrentTime(
      callback: (seconds: number, isPlaying: boolean) => void,
    ): void;
    setCurrentTime(seconds: number): void;
    setVolume(volume: number): void;
    setPan(pan: number): void;
    setNumberOfLoops(loops: number): void;
    setSpeed(speed: number): void;
    isLoaded(): boolean;
  }
}
