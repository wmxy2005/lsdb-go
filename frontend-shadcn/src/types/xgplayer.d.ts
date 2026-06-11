declare module 'xgplayer' {
  interface PlayerOptions {
    el: HTMLElement;
    url?: string;
    poster?: string;
    fluid?: boolean;
    volume?: number;
    fullscreen?: {
      useCssFullscreen?: boolean;
      target?: HTMLElement | null;
    };
    cssFullscreen?: {
      target?: HTMLElement | null;
      disable?: boolean;
    };
    [key: string]: unknown;
  }

  export default class Player {
    constructor(options: PlayerOptions);
    on(event: string, handler: (...args: unknown[]) => void): void;
    off(event: string, handler: (...args: unknown[]) => void): void;
    pause(): void;
    destroy(): void;
  }
}

declare module 'xgplayer/dist/index.min.css';
