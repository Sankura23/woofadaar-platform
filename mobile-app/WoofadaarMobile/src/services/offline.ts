import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface QueuedAction {
  id: string;
  action: string;
  data: any;
  timestamp: number;
  retries: number;
}

class OfflineManager {
  private isOnline = true;
  private syncQueue: QueuedAction[] = [];
  private userId: string | null = null;
  private syncInProgress = false;

  async initialize() {
    // Load queued actions from storage
    const stored = await AsyncStorage.getItem('offline_queue');
    if (stored) {
      this.syncQueue = JSON.parse(stored);
    }

    // Monitor network connectivity
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (wasOffline && this.isOnline) {
        this.processSyncQueue();
      }
    });
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  clearUserData() {
    this.userId = null;
    this.syncQueue = [];
    AsyncStorage.removeItem('offline_queue');
  }

  async queueAction(action: string, data: any) {
    const queuedAction: QueuedAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    this.syncQueue.push(queuedAction);
    await this.persistQueue();

    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  private async persistQueue() {
    await AsyncStorage.setItem('offline_queue', JSON.stringify(this.syncQueue));
  }

  private async processSyncQueue() {
    if (this.syncInProgress || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;

    for (let i = this.syncQueue.length - 1; i >= 0; i--) {
      const action = this.syncQueue[i];
      
      try {
        await this.executeAction(action);
        this.syncQueue.splice(i, 1);
      } catch (error) {
        action.retries++;
        if (action.retries >= 3) {
          this.syncQueue.splice(i, 1);
        }
      }
    }

    await this.persistQueue();
    this.syncInProgress = false;
  }

  private async executeAction(action: QueuedAction) {
    // Implementation would depend on the specific action
    console.log('Executing queued action:', action);
  }

  getQueueStatus() {
    return {
      isOnline: this.isOnline,
      queueLength: this.syncQueue.length,
      syncInProgress: this.syncInProgress,
    };
  }
}

export const offlineManager = new OfflineManager();