export type RecorderType = 'ready' | 'ready.countdown' | 'recording';
export interface RecordingOptions {
    mimeType?: string;
    frameRate?: number;
    audioBitsPerSecond?: number;
    videoBitsPerSecond?: number;
    audio?: boolean;
}
export interface RecordingResult {
    duration: number;
    chunks: Blob[];
}
export interface I_RecorderProps {
    options?: Partial<RecordingOptions>;
    onRecordingStart?: () => void;
    onRecordingStop?: (result: RecordingResult) => void;
    onRecordingError?: (error: Error) => void;
}
