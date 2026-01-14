import type { MetadataMap } from './audio-manager';

/**
 * Audio Metadata configuration
 * 
 * revealOffset: seconds before the END of the audio file to show the number.
 * duration: manual override of audio duration (if file loading is slow or metadata missing).
 * 
 * Format: { [number]: { [variant]: { revealOffset, duration } } }
 * Or: { [number]: { revealOffset, duration } } (applies to all variants of that number)
 */
export const AUDIO_METADATA: MetadataMap = {
    // Example: For number 01, variant 1, reveal 2 seconds before the end
    1: {
        1: { revealOffset: 2.5 },
        2: { revealOffset: 1.8 }
    },
    // Example: For number 02, reveal 3 seconds before the end for ALL variants
    2: { revealOffset: 3.0 },

    // Add more as needed...
};
