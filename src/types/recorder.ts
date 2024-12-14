export interface I_RecorderProps {
	options?: {
		frameRate?: number;
		audioBitsPerSecond?: number;
		videoBitsPerSecond?: number;
		audio?: boolean;
	};
}

export type RecorderType = 'ready' | 'ready.countdown' | 'recording';
