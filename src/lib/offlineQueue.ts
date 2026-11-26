const QUEUE_KEY = 'slc_bp_offline_queue_v2';

export interface QueuedMutation {
  id: string;
  type: 'ball' | 'undo' | 'completion';
  practiceDate: string;
  payload: unknown;
  createdAt: string;
}

export function readOfflineQueue(): QueuedMutation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineMutation(item: QueuedMutation): void {
  const queue = readOfflineQueue();
  queue.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearOfflineQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}
