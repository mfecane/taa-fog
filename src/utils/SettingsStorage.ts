import { Settings, SettingsData } from './Settings'

const DB_NAME = 'TAAFogDB'
const DB_VERSION = 1
const STORE_NAME = 'settings'

export class SettingsStorage {
	private static instance: SettingsStorage | null = null
	private db: IDBDatabase | null = null

	private constructor() {}

	static async getInstance(): Promise<SettingsStorage> {
		if (!SettingsStorage.instance) {
			SettingsStorage.instance = new SettingsStorage()
			await SettingsStorage.instance.init()
		}
		return SettingsStorage.instance
	}

	private async init(): Promise<void> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION)

			request.onerror = () => {
				reject(new Error('Failed to open IndexedDB'))
			}

			request.onsuccess = () => {
				this.db = request.result
				resolve()
			}

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					db.createObjectStore(STORE_NAME)
				}
			}
		})
	}

	async load(): Promise<SettingsData | null> {
		if (!this.db) {
			await this.init()
		}

		return new Promise((resolve, reject) => {
			if (!this.db) {
				reject(new Error('Database not initialized'))
				return
			}

			const transaction = this.db.transaction([STORE_NAME], 'readonly')
			const store = transaction.objectStore(STORE_NAME)
			const request = store.get('settings')

			request.onerror = () => {
				reject(new Error('Failed to load settings'))
			}

			request.onsuccess = () => {
				resolve(request.result || null)
			}
		})
	}

	async save(settings: Settings): Promise<void> {
		if (!this.db) {
			await this.init()
		}

		return new Promise((resolve, reject) => {
			if (!this.db) {
				reject(new Error('Database not initialized'))
				return
			}

			const transaction = this.db.transaction([STORE_NAME], 'readwrite')
			const store = transaction.objectStore(STORE_NAME)
			const request = store.put(settings.getData(), 'settings')

			request.onerror = () => {
				reject(new Error('Failed to save settings'))
			}

			request.onsuccess = () => {
				resolve()
			}
		})
	}

	async saveCameraPosition(position: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }): Promise<void> {
		if (!this.db) {
			await this.init()
		}

		return new Promise((resolve, reject) => {
			if (!this.db) {
				reject(new Error('Database not initialized'))
				return
			}

			const cameraData = { position, target }
			const transaction = this.db.transaction([STORE_NAME], 'readwrite')
			const store = transaction.objectStore(STORE_NAME)
			const request = store.put(cameraData, 'camera')

			request.onerror = () => {
				reject(new Error('Failed to save camera position'))
			}

			request.onsuccess = () => {
				resolve()
			}
		})
	}

	async loadCameraPosition(): Promise<{ position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } } | null> {
		if (!this.db) {
			await this.init()
		}

		return new Promise((resolve, reject) => {
			if (!this.db) {
				reject(new Error('Database not initialized'))
				return
			}

			const transaction = this.db.transaction([STORE_NAME], 'readonly')
			const store = transaction.objectStore(STORE_NAME)
			const request = store.get('camera')

			request.onerror = () => {
				reject(new Error('Failed to load camera position'))
			}

			request.onsuccess = () => {
				resolve(request.result || null)
			}
		})
	}
}

