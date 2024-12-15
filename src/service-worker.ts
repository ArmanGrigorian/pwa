/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

import { build, files, version } from '$service-worker';

console.log('🚀 Service Worker');

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', (e) => {
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	e.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (e) => {
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
	}

	e.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (e) => {
	if (e.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(e.request.url);
		const cache = await caches.open(CACHE);

		if (ASSETS.includes(url.pathname)) {
			const cachedResponse = await cache.match(url.pathname);

			if (cachedResponse) return cachedResponse;
		}

		try {
			const response = await fetch(e.request);
			const isNotExtension = url.protocol === 'http:';
			const isSuccess = response.status === 200;

			if (!(response instanceof Response)) {
				throw new Error('invalid response from fetch');
			}

			if (isNotExtension && isSuccess) {
				cache.put(e.request, response.clone());
			}

			return response;
		} catch (err) {
			const cachedResponse = await cache.match(e.request);

			if (cachedResponse) return cachedResponse;

			throw err;
		}
	}

	e.respondWith(respond());
});

self.addEventListener('message', (e) => {
	if (e.data && e.data.action === 'SKIP_WAITING') self.skipWaiting();
});
