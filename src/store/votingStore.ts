import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { subscribeToVotingSettingsUpdates, getVotingSettings, notifyVotingSettingsChange } from '../lib/supabase';

interface VotingState {
  isVotingActive: boolean;
  isResultsFinalized: boolean;
  finalizedAt?: string;
  setVotingActive: (active: boolean) => void;
  finalizeResults: () => void;
  unfinalizeResults: () => void;
  resetVoting: () => void;
  syncWithDatabase: () => Promise<void>;
  initializeRealtimeSync: () => void;
  cleanup: () => void;
}

let realtimeSubscription: { unsubscribe: () => void } | null = null;
let votingSettingsListener: ((event: CustomEvent) => void) | null = null;

export const useVotingStore = create<VotingState>()(
  persist(
    (set, get) => ({
      isVotingActive: true,
      isResultsFinalized: false,
      finalizedAt: undefined,
      
      setVotingActive: (active: boolean) => {
        set({ isVotingActive: active });
        // 状態変更を他のページに通知
        notifyVotingSettingsChange({ is_voting_active: active });
      },
      
      finalizeResults: () => 
        set({ 
          isVotingActive: false, 
          isResultsFinalized: true,
          finalizedAt: new Date().toISOString()
        }),
      
      unfinalizeResults: () =>
        set({
          isResultsFinalized: false,
          finalizedAt: undefined
        }),
      
      resetVoting: () => set({
          isVotingActive: true, 
          isResultsFinalized: false,
          finalizedAt: undefined
        }),
      
      // データベースから最新の投票設定を同期
      syncWithDatabase: async () => {
        try {
          const settings = await getVotingSettings();
          if (settings && typeof settings === 'object' && 'is_voting_active' in settings) {
            const currentState = get();
            const isVotingActive = Boolean(settings.is_voting_active);
            // 結果が確定済みの場合は、データベース同期でisVotingActiveを更新しない
            if (!currentState.isResultsFinalized && currentState.isVotingActive !== isVotingActive) {
              set({ isVotingActive });
            }
          }
        } catch (error) {
          console.error('Failed to sync with database:', error);
        }
      },
      
      // リアルタイム同期を初期化
      initializeRealtimeSync: () => {
        // 既存の購読があれば解除
        if (realtimeSubscription) {
          realtimeSubscription.unsubscribe();
        }
        
        // Supabaseのリアルタイム購読を開始
        realtimeSubscription = subscribeToVotingSettingsUpdates((payload) => {
        // ...
            if (payload.new && payload.new.is_voting_active !== undefined) {
              const currentState = get();
              // 結果が確定済みの場合は、リアルタイム同期でisVotingActiveを更新しない
              if (!currentState.isResultsFinalized) {
                set({ isVotingActive: payload.new.is_voting_active });
              }
            }
          });
        
        // カスタムイベントリスナーを追加
        votingSettingsListener = (event: CustomEvent) => {
          const settings = event.detail;
          if (settings && typeof settings === 'object' && 'is_voting_active' in settings) {
            const currentState = get();
            const isVotingActive = Boolean(settings.is_voting_active);
            // 結果が確定済みの場合は、カスタムイベントでisVotingActiveを更新しない
            if (!currentState.isResultsFinalized && currentState.isVotingActive !== isVotingActive) {
              set({ isVotingActive });
            }
          }
        };
        
        window.addEventListener('votingSettingsChanged', votingSettingsListener as unknown as EventListener);
        
        // 初期同期
        get().syncWithDatabase();
      },
      
      // クリーンアップ
      cleanup: () => {
        if (realtimeSubscription) {
          realtimeSubscription.unsubscribe();
          realtimeSubscription = null;
        }
        if (votingSettingsListener) {
          window.removeEventListener('votingSettingsChanged', votingSettingsListener as unknown as EventListener);
          votingSettingsListener = null;
        }
      }
    }),
    {
      name: 'voting-storage',
    }
  )
);
