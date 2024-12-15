<script lang="ts">
	import type { I_RecorderProps, RecorderType } from '../../types/recorder.js';

	const props: I_RecorderProps = $props();

	const COUNTDOWN_SECONDS = 3;
	const AUDIO_BITRATE = 1_048_576;
	const VIDEO_BITRATE = 2_097_152;
	let recorder: RecorderType = $state('ready');
	let mediaRecorder: MediaRecorder | null = null;
	let mediaStream: MediaStream | null = null;
	const chunks: Blob[] = [];
	let seconds = $state(COUNTDOWN_SECONDS);
	let timer: number | null = null;

	const OPTIONS = {
		mimeType: 'video/webm',
		frameRate: 60,
		audioBitsPerSecond: AUDIO_BITRATE,
		videoBitsPerSecond: VIDEO_BITRATE,
		audio: true,
		...props.options
	};

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
			a.download = `screen-recording-${new Date().toISOString().replace(/:/g, '-')}.mp4`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		} catch (error) {
			console.error('Error downloading video:', error);
		} finally {
			URL.revokeObjectURL(url);
			chunks.length = 0;
		}
	}

	async function startRecording() {
		try {
			mediaStream = await navigator.mediaDevices.getDisplayMedia({
				video: { frameRate: OPTIONS.frameRate },
				audio: OPTIONS.audio
			});

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
		} catch (err) {
			console.error('Recording error:', err);
			stopRecording();
		}
	}

	function stopRecording() {
		if (timer) window.clearInterval(timer);

		if (mediaStream) {
			mediaStream.getTracks().forEach((track) => track.stop());
			mediaStream = null;
		}

		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			mediaRecorder.stop();
		}

		recorder = 'ready';
		seconds = COUNTDOWN_SECONDS;
		mediaStream = null;
		mediaRecorder = null;
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
</script>

<svelte:window onkeydown={handleKeyDown} />

<div>
	{#if recorder.includes('ready')}
		<div
			class="fixed bottom-10 left-1/2 z-10 -translate-x-1/2 text-center lg:bottom-20"
			data-state={recorder}
		>
			<button
				aria-label="Start screen recording. Shift + R to start"
				class="group size-8 rounded-full border-2 border-solid border-neutral-300 p-0.5 hover:cursor-pointer lg:size-16 lg:border-4"
				onclick={startRecording}
				type="button"
			>
				<span
					class="grid size-full place-content-center rounded-full bg-red-500 text-3xl font-bold text-neutral-500 transition-colors duration-500 group-active:scale-95"
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
					<p class="text-sm text-neutral-500 lg:mt-1 lg:text-base">To start recording</p>
				{/if}
			</div>
		</div>
	{/if}
</div>
