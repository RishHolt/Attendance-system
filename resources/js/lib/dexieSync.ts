import type { Table } from 'dexie';
import Dexie from 'dexie';

interface PendingScan {
    id?: number;
    qr_token: string;
    timestamp: number;
    synced: boolean;
}

class AttendanceDatabase extends Dexie {
    pendingScans!: Table<PendingScan>;

    constructor() {
        super('AttendanceDatabase');
        this.version(1).stores({
            pendingScans: '++id, qr_token, timestamp, synced',
        });
    }
}

const db = new AttendanceDatabase();

export const savePendingScan = async (qrToken: string): Promise<void> => {
    await db.pendingScans.add({
        qr_token: qrToken,
        timestamp: Date.now(),
        synced: false,
    });
};

export const getPendingScans = async (): Promise<PendingScan[]> => {
    return await db.pendingScans.where('synced').equals(false).toArray();
};

export const markScanAsSynced = async (id: number): Promise<void> => {
    await db.pendingScans.update(id, { synced: true });
};

export const syncPendingScans = async (): Promise<number> => {
    if (!navigator.onLine) {
        return 0;
    }

    const pendingScans = await getPendingScans();
    let syncedCount = 0;

    for (const scan of pendingScans) {
        try {
            const response = await fetch('/api/attendance/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ qr_token: scan.qr_token }),
            });

            if (response.ok) {
                await markScanAsSynced(scan.id!);
                syncedCount++;
            }
        } catch (error) {
            console.error('Failed to sync scan:', error);
        }
    }

    return syncedCount;
};

export const initOfflineSync = (): void => {
    window.addEventListener('online', async () => {
        const syncedCount = await syncPendingScans();
        if (syncedCount > 0) {
            // Import Swal dynamically to avoid loading it if not needed
            const Swal = (await import('sweetalert2')).default;
            await Swal.fire({
                icon: 'success',
                title: 'Offline scans synced successfully!',
                text: `${syncedCount} scan(s) have been synced.`,
                timer: 3000,
                showConfirmButton: false,
            });
        }
    });
};
