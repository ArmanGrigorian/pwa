export async function detectSWUpdate() {
	const registration = await navigator.serviceWorker.ready;

	registration.addEventListener('updatefound', () => {
		const newSW = registration.installing;

		if (newSW) {
			newSW.addEventListener('statechange', () => {
				if (newSW.state === 'installed') {
          if (confirm('New update available. Reload to update?')) {
            newSW.postMessage({ action: 'SKIP_WAITING' });
						window.location.reload();
					}
				}
			});
		}
	});
}
