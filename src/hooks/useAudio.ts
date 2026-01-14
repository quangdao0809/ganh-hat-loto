// Audio hook for React components

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getAudioManager, type LoadingProgress, type PlayMode } from '@/lib/audio-manager';

interface UseAudioReturn {
    isInitialized: boolean;
    isLoading: boolean;
    progress: LoadingProgress;
    isBgmPlaying: boolean;
    bgmVolume: number;
    effectsVolume: number;
    isMuted: boolean;
    // Actions
    initialize: () => Promise<void>;
    playSpinSequence: (number: number, mode?: PlayMode) => Promise<void>;
    replayNumber: (number: number) => void;
    toggleBGM: () => void;
    startBGM: () => void;
    stopBGM: () => void;
    setBGMVolume: (volume: number) => void;
    setEffectsVolume: (volume: number) => void;
    toggleMute: () => void;
    setMetadata: (metadata: any) => void;
}

export function useAudio(): UseAudioReturn {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState<LoadingProgress>({
        essential: 0,
        variants: 0,
        intros: 0,
        total: 0,
    });
    const [isBgmPlaying, setIsBgmPlaying] = useState(false);
    const [bgmVolume, setBgmVolumeState] = useState(0.3);
    const [effectsVolume, setEffectsVolumeState] = useState(1.0);
    const [isMuted, setIsMuted] = useState(false);

    const managerRef = useRef<ReturnType<typeof getAudioManager> | null>(null);

    // Initialize audio manager
    const initialize = useCallback(async () => {
        if (isInitialized || isLoading) return;

        setIsLoading(true);

        try {
            const manager = getAudioManager();
            managerRef.current = manager;

            manager.onProgress((p) => {
                setProgress(p);
            });

            await manager.initialize();
            setIsInitialized(true);
        } catch (error) {
            console.error('Failed to initialize audio:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isInitialized, isLoading]);

    // Auto-initialize when component mounts (after user interaction)
    useEffect(() => {
        const handleInteraction = () => {
            if (!isInitialized && !isLoading) {
                initialize();
            }
            // Remove listeners after first interaction
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('touchstart', handleInteraction);
        };

        document.addEventListener('click', handleInteraction);
        document.addEventListener('touchstart', handleInteraction);

        return () => {
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('touchstart', handleInteraction);
        };
    }, [initialize, isInitialized, isLoading]);

    // Play spin sequence
    const playSpinSequence = useCallback(async (number: number, mode: PlayMode = 'singing') => {
        if (!managerRef.current) return;
        await managerRef.current.playSpinSequence(number, mode);
    }, []);

    // Replay number
    const replayNumber = useCallback((number: number) => {
        managerRef.current?.replayLast(number);
    }, []);

    // Toggle BGM
    const toggleBGM = useCallback(() => {
        if (!managerRef.current) return;
        const playing = managerRef.current.toggleBGM();
        setIsBgmPlaying(playing);
    }, []);

    // Start BGM
    const startBGM = useCallback(() => {
        managerRef.current?.startBGM();
        setIsBgmPlaying(true);
    }, []);

    // Stop BGM
    const stopBGM = useCallback(() => {
        managerRef.current?.stopBGM();
        setIsBgmPlaying(false);
    }, []);

    // Set BGM volume
    const setBGMVolume = useCallback((volume: number) => {
        managerRef.current?.setBGMVolume(volume);
        setBgmVolumeState(volume);
    }, []);

    // Set effects volume
    const setEffectsVolume = useCallback((volume: number) => {
        managerRef.current?.setEffectsVolume(volume);
        setEffectsVolumeState(volume);
    }, []);

    // Toggle mute
    const toggleMute = useCallback(() => {
        if (!managerRef.current) return;
        const muted = managerRef.current.toggleMute();
        setIsMuted(muted);
    }, []);

    // Set Metadata
    const setMetadata = useCallback((metadata: any) => {
        managerRef.current?.setMetadata(metadata);
    }, []);

    return {
        isInitialized,
        isLoading,
        progress,
        isBgmPlaying,
        bgmVolume,
        effectsVolume,
        isMuted,
        initialize,
        playSpinSequence,
        replayNumber,
        toggleBGM,
        startBGM,
        stopBGM,
        setBGMVolume,
        setEffectsVolume,
        toggleMute,
        setMetadata,
    };
}

export default useAudio;
