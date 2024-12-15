<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { RecorderType, RecordingOptions } from '../../types/recorder.ts';

	const AUDIO_BITRATE = 1_048_576;
	const VIDEO_BITRATE = 2_097_152;
	const COUNTDOWN_SECONDS = 3;
	const chunks: Blob[] = [];
	const OPTIONS: RecordingOptions = {
		mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
		frameRate: 60,
		audioBitsPerSecond: AUDIO_BITRATE,
		videoBitsPerSecond: VIDEO_BITRATE,
		audio: true
	};

	let recorder: RecorderType = $state('ready');
	let seconds = $state(COUNTDOWN_SECONDS);
	let recordingDuration = $state(0);
	let mediaRecorder: MediaRecorder | null = null;
	let mediaStream: MediaStream | null = null;
	let durationTimer: number | null = null;
	let timer: number | null = null;

	function resetTimer(): Promise<number> {
		recorder = 'ready.countdown';
		seconds = COUNTDOWN_SECONDS;

		return new Promise((resolve) => {
			if (timer) window.clearInterval(timer);

			timer = window.setInterval(() => {
				seconds--;
				if (seconds === 0) {
					if (timer) window.clearInterval(timer);
					resolve(0);
				}
			}, 1000);
		});
	}

	function downloadVideo() {
		if (chunks.length === 0) return;

		const blob = new Blob(chunks, { type: OPTIONS.mimeType });
		const url = URL.createObjectURL(blob);

		try {
			const a = document.createElement('a');
			a.href = url;
			a.download = `screen-recording-${new Date().toISOString().replace(/:/g, '-')}`;
			a.setAttribute('download', '');
			a.style.display = 'none';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		} catch (error) {
			console.error(error);
		} finally {
			URL.revokeObjectURL(url);
			chunks.length = 0;
		}
	}

	function stopRecording() {
		if (timer) window.clearInterval(timer);
		if (durationTimer) window.clearInterval(durationTimer);

		if (mediaStream) {
			mediaStream.getTracks().forEach((track) => track.stop());
			mediaStream = null;
		}

		if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();

		recorder = 'ready';
		seconds = COUNTDOWN_SECONDS;
		recordingDuration = 0;
		mediaStream = null;
		mediaRecorder = null;
	}

	async function startRecording() {
		try {
			mediaStream = await navigator.mediaDevices
				.getDisplayMedia({
					video: { frameRate: OPTIONS.frameRate },
					audio: OPTIONS.audio
				})
				.catch((err) => {
					if (err.name === 'NotAllowedError') {
						console.warn('Screen share cancelled by user');
						return null;
					}
					throw err;
				});

			if (!mediaStream) {
				stopRecording();
				return;
			}

			mediaStream.addEventListener('inactive', stopRecording);
			await resetTimer();

			mediaRecorder = new MediaRecorder(mediaStream, {
				mimeType: OPTIONS.mimeType,
				audioBitsPerSecond: OPTIONS.audioBitsPerSecond,
				videoBitsPerSecond: OPTIONS.videoBitsPerSecond
			});

			mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) chunks.push(e.data);
			};

			mediaRecorder.onstop = () => {
				if (chunks.length > 0) downloadVideo();
			};

			recorder = 'recording';
			mediaRecorder.start();

			recordingDuration = 0;

			if (durationTimer) window.clearInterval(durationTimer);

			durationTimer = window.setInterval(() => {
				recordingDuration++;
			}, 1000);
		} catch (err) {
			console.error(err);
			stopRecording();
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		switch (e.key) {
			case 'R':
			case 'r':
				if (e.shiftKey && recorder === 'ready') {
					startRecording();
				}
				break;
			case 'S':
			case 's':
				if (e.shiftKey && recorder !== 'ready') {
					stopRecording();
				}
				break;
		}
	}

	onDestroy(() => {
		stopRecording();
	});
</script>

<svelte:window onkeydown={handleKeyDown} />

<div>
	{#if recorder.includes('ready')}
		<div
			class="fixed bottom-10 left-1/2 z-10 -translate-x-1/2 text-center lg:bottom-20"
			data-state={recorder}
			aria-live="polite"
		>
			<button
				aria-label="Start screen recording. Shift + R to start"
				class="group size-8 rounded-full border-2 border-solid border-neutral-300 p-0.5 hover:cursor-pointer lg:size-16 lg:border-4"
				onclick={startRecording}
				type="button"
			>
				<span
					class="grid size-full place-content-center rounded-full bg-red-500 text-3xl font-bold text-white transition-colors duration-500 group-active:scale-95"
					class:bg-neutral-200={recorder === 'ready.countdown'}
				>
					{#if recorder === 'ready.countdown'}
						{seconds}
					{/if}
				</span>
			</button>

			<div class="mt-1 lg:mt-4">
				{#if recorder === 'ready' || recorder === 'ready.countdown'}
					<p class="text-sm font-bold lg:text-base">Shift + R</p>
					<p class="text-sm text-neutral-600 lg:mt-1 lg:text-base">To start recording</p>
				{/if}
			</div>
		</div>
	{/if}

	{#if recorder === 'recording'}
		<div class="fixed right-4 top-4 rounded bg-red-500 px-2 py-1 text-white">
			Recording: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60)
				.toString()
				.padStart(2, '0')}
		</div>
	{/if}
</div>
