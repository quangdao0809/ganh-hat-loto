// Audio Manager with Progressive Loading
// Uses Howler.js for audio playback with IndexedDB caching

import { Howl, Howler } from 'howler';

export interface AudioManagerConfig {
    basePath: string;
    essentialPath: string;
    variantsPath: string;
    introsPath: string;
    bgmPath: string;
}

export interface LoadingProgress {
    essential: number; // 0-100
    variants: number;  // 0-100
    intros: number;    // 0-100
    total: number;     // 0-100
}

export type PlayMode = 'singing' | 'calling';

// Default configuration
const defaultConfig: AudioManagerConfig = {
    basePath: '/audio',
    essentialPath: '/audio/essential',
    variantsPath: '/audio/variants',
    introsPath: '/audio/intros',
    bgmPath: '/audio/bgm.mp3',
};

class AudioManager {
    private config: AudioManagerConfig;
    private essentialSounds: Map<number, Howl> = new Map();
    private variantSounds: Map<string, Howl> = new Map(); // key: "number-variant"
    private introSounds: {
        spinStart: Howl[];
        reveal: Howl[];
    } = { spinStart: [], reveal: [] };
    private bgm: Howl | null = null;

    private bgmVolume: number = 0.3;
    private effectsVolume: number = 1.0;
    private muted: boolean = false;

    private loadingProgress: LoadingProgress = {
        essential: 0,
        variants: 0,
        intros: 0,
        total: 0,
    };

    private onProgressCallback?: (progress: LoadingProgress) => void;
    private currentlyPlaying: Howl | null = null;
    private revealLoopActive: boolean = false;
    private numberAudioReady: boolean = false;

    constructor(config: Partial<AudioManagerConfig> = {}) {
        this.config = { ...defaultConfig, ...config };
    }

    /**
     * Set progress callback
     */
    onProgress(callback: (progress: LoadingProgress) => void): void {
        this.onProgressCallback = callback;
    }

    /**
     * Update and notify progress
     */
    private updateProgress(key: keyof LoadingProgress, value: number): void {
        this.loadingProgress[key] = value;
        this.loadingProgress.total = Math.round(
            (this.loadingProgress.essential * 0.5 +
                this.loadingProgress.intros * 0.3 +
                this.loadingProgress.variants * 0.2)
        );
        this.onProgressCallback?.(this.loadingProgress);
    }

    /**
     * Phase 1: Load essential audio (1 file per number)
     * This should complete quickly for game to start
     */
    async loadEssential(): Promise<void> {
        const promises: Promise<void>[] = [];
        let loaded = 0;

        for (let i = 1; i <= 99; i++) {
            const paddedNum = i.toString().padStart(2, '0');
            const url = `${this.config.essentialPath}/${paddedNum}.m4a`;

            promises.push(
                new Promise<void>((resolve) => {
                    const sound = new Howl({
                        src: [url],
                        preload: true,
                        volume: this.effectsVolume,
                        onload: () => {
                            loaded++;
                            this.updateProgress('essential', Math.round((loaded / 99) * 100));
                            resolve();
                        },
                        onloaderror: () => {
                            // Continue even if file missing
                            loaded++;
                            this.updateProgress('essential', Math.round((loaded / 99) * 100));
                            resolve();
                        },
                    });
                    this.essentialSounds.set(i, sound);
                })
            );
        }

        await Promise.all(promises);
    }

    /**
     * Load intro sounds (spin start and reveal)
     */
    async loadIntros(): Promise<void> {
        const spinStartCount = 5;
        const revealCount = 10;
        let loaded = 0;
        const total = spinStartCount + revealCount;

        // Load spin start sounds
        for (let i = 1; i <= spinStartCount; i++) {
            await new Promise<void>((resolve) => {
                const sound = new Howl({
                    src: [`${this.config.introsPath}/spin_start_${i}.m4a`],
                    preload: true,
                    volume: this.effectsVolume,
                    onload: () => {
                        this.introSounds.spinStart.push(sound);
                        loaded++;
                        this.updateProgress('intros', Math.round((loaded / total) * 100));
                        resolve();
                    },
                    onloaderror: () => {
                        loaded++;
                        this.updateProgress('intros', Math.round((loaded / total) * 100));
                        resolve();
                    },
                });
            });
        }

        // Load reveal sounds
        for (let i = 1; i <= revealCount; i++) {
            await new Promise<void>((resolve) => {
                const sound = new Howl({
                    src: [`${this.config.introsPath}/reveal_${i}.m4a`],
                    preload: true,
                    volume: this.effectsVolume,
                    onload: () => {
                        this.introSounds.reveal.push(sound);
                        loaded++;
                        this.updateProgress('intros', Math.round((loaded / total) * 100));
                        resolve();
                    },
                    onloaderror: () => {
                        loaded++;
                        this.updateProgress('intros', Math.round((loaded / total) * 100));
                        resolve();
                    },
                });
            });
        }
    }

    /**
     * Phase 2: Load variants in background (5-10 per number)
     */
    async loadVariantsInBackground(): Promise<void> {
        const variantsPerNumber = 5;
        const total = 99 * variantsPerNumber;
        let loaded = 0;

        for (let num = 1; num <= 99; num++) {
            const paddedNum = num.toString().padStart(2, '0');

            for (let v = 1; v <= variantsPerNumber; v++) {
                const url = `${this.config.variantsPath}/${paddedNum}/v${v}.m4a`;
                const key = `${num}-${v}`;

                // Load with small delay to not block UI
                await new Promise<void>((resolve) => {
                    setTimeout(() => {
                        const sound = new Howl({
                            src: [url],
                            preload: true,
                            volume: this.effectsVolume,
                            onload: () => {
                                this.variantSounds.set(key, sound);
                                loaded++;
                                this.updateProgress('variants', Math.round((loaded / total) * 100));
                                resolve();
                            },
                            onloaderror: () => {
                                loaded++;
                                this.updateProgress('variants', Math.round((loaded / total) * 100));
                                resolve();
                            },
                        });
                    }, 10);
                });
            }
        }
    }

    /**
     * Initialize audio manager - loads essential first, then intros, then variants in bg
     */
    async initialize(): Promise<void> {
        // Load essentials first (blocking)
        await this.loadEssential();

        // Load intros (blocking)
        await this.loadIntros();

        // Load BGM
        this.bgm = new Howl({
            src: [this.config.bgmPath],
            loop: true,
            volume: this.bgmVolume,
            preload: true,
        });

        // Load variants in background (non-blocking)
        this.loadVariantsInBackground();
    }

    /**
     * Play spin start sound
     */
    playSpinStart(): Promise<void> {
        return new Promise((resolve) => {
            if (this.introSounds.spinStart.length === 0) {
                resolve();
                return;
            }

            const randomIndex = Math.floor(Math.random() * this.introSounds.spinStart.length);
            const sound = this.introSounds.spinStart[randomIndex];

            sound.once('end', () => resolve());
            sound.play();
        });
    }

    /**
     * Play reveal intro (loops until stopped)
     */
    private playRevealLoop(): void {
        if (!this.revealLoopActive || this.introSounds.reveal.length === 0) {
            return;
        }

        const randomIndex = Math.floor(Math.random() * this.introSounds.reveal.length);
        const sound = this.introSounds.reveal[randomIndex];

        this.currentlyPlaying = sound;
        sound.once('end', () => {
            if (this.revealLoopActive && !this.numberAudioReady) {
                this.playRevealLoop();
            }
        });
        sound.play();
    }

    /**
     * Start reveal loop
     */
    startRevealLoop(): void {
        this.revealLoopActive = true;
        this.numberAudioReady = false;
        this.playRevealLoop();
    }

    /**
     * Stop reveal loop
     */
    stopRevealLoop(): void {
        this.revealLoopActive = false;
        if (this.currentlyPlaying) {
            this.currentlyPlaying.stop();
            this.currentlyPlaying = null;
        }
    }

    /**
     * Get audio for a number (try variant first, fallback to essential)
     */
    private getNumberAudio(number: number): Howl | null {
        // Try to get a random variant
        const variantCount = 5;
        const availableVariants: Howl[] = [];

        for (let v = 1; v <= variantCount; v++) {
            const key = `${number}-${v}`;
            const sound = this.variantSounds.get(key);
            if (sound) {
                availableVariants.push(sound);
            }
        }

        if (availableVariants.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableVariants.length);
            return availableVariants[randomIndex];
        }

        // Fallback to essential
        return this.essentialSounds.get(number) || null;
    }

    /**
     * Play number announcement
     */
    playNumber(number: number): Promise<void> {
        return new Promise((resolve) => {
            const sound = this.getNumberAudio(number);
            if (!sound) {
                resolve();
                return;
            }

            sound.once('end', () => resolve());
            sound.play();
        });
    }

    /**
     * Play full spin sequence:
     * Mode 'singing': Spin start -> Reveal loop -> Variant/Folk song
     * Mode 'calling': Spin start -> Short delay -> Essential/Fast number
     */
    async playSpinSequence(number: number, mode: PlayMode = 'singing'): Promise<void> {
        // 1. Play spin start
        await this.playSpinStart();

        if (mode === 'singing') {
            // Singing Mode: Full experience
            // 2. Start reveal loop while we "wait" for number audio
            this.startRevealLoop();

            // Simulate loading delay (2-3 seconds for animation + anticipation)
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

            // 3. Stop loop and play number
            this.numberAudioReady = true;
            this.stopRevealLoop();

            await this.playNumber(number);
        } else {
            // Calling Mode: Fast pace
            // Just a short delay for the "Spin" animation feel, then read number
            await new Promise(resolve => setTimeout(resolve, 800)); // 0.8s delay

            // Force essential sound (clearer, faster) or variant if preferred?
            // "Calling" usually implies clear number reading. Essential sounds are likely clear readings.
            // Variants might be songs.
            // Let's try to get essential specifically if possible, or just playNumber which relies on getNumberAudio.
            // But getNumberAudio prefers variants.
            // We might want to force essential for 'calling' mode.

            // For now, let's just call playNumber, but maybe we should add a 'preferEssential' to playNumber later.
            // Or just rely on existing logic. Existing logic picks random variant.
            // If variants are songs, 'calling' mode should probably avoid them?
            // "Hát hay" vs "Chỉ gọi số". "Chỉ gọi số" means "Just call the number".
            // So we should probably ONLY play the essential sound (which is likely the number read).

            const sound = this.essentialSounds.get(number);
            if (sound) {
                sound.play();
                await new Promise(resolve => sound.once('end', resolve));
            } else {
                await this.playNumber(number);
            }
        }
    }

    /**
     * Replay last number announcement
     */
    replayLast(number: number): void {
        const sound = this.getNumberAudio(number);
        sound?.play();
    }

    /**
     * Play/pause BGM
     */
    toggleBGM(): boolean {
        if (!this.bgm) return false;

        if (this.bgm.playing()) {
            this.bgm.pause();
            return false;
        } else {
            this.bgm.play();
            return true;
        }
    }

    /**
     * Start BGM
     */
    startBGM(): void {
        this.bgm?.play();
    }

    /**
     * Stop BGM
     */
    stopBGM(): void {
        this.bgm?.stop();
    }

    /**
     * Set BGM volume (0-1)
     */
    setBGMVolume(volume: number): void {
        this.bgmVolume = Math.max(0, Math.min(1, volume));
        this.bgm?.volume(this.bgmVolume);
    }

    /**
     * Set effects volume (0-1)
     */
    setEffectsVolume(volume: number): void {
        this.effectsVolume = Math.max(0, Math.min(1, volume));
        this.essentialSounds.forEach(s => s.volume(this.effectsVolume));
        this.variantSounds.forEach(s => s.volume(this.effectsVolume));
        this.introSounds.spinStart.forEach(s => s.volume(this.effectsVolume));
        this.introSounds.reveal.forEach(s => s.volume(this.effectsVolume));
    }

    /**
     * Toggle mute
     */
    toggleMute(): boolean {
        this.muted = !this.muted;
        Howler.mute(this.muted);
        return this.muted;
    }

    /**
     * Get current loading progress
     */
    getProgress(): LoadingProgress {
        return { ...this.loadingProgress };
    }
}

// Singleton instance
let audioManagerInstance: AudioManager | null = null;

export function getAudioManager(config?: Partial<AudioManagerConfig>): AudioManager {
    if (!audioManagerInstance) {
        audioManagerInstance = new AudioManager(config);
    }
    return audioManagerInstance;
}

export default AudioManager;
