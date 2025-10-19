import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, getClientIP, subscribeToVoteUpdates, subscribeToVotingSettingsUpdates } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { queryKeys } from '@/lib/queryKeys';
import { useEffect } from 'react';

type VoteCountsRow = Database['public']['Views']['vote_counts']['Row'];

export function useVoteCountsQuery() {
  return useQuery({
    queryKey: queryKeys.voteCounts(),
    queryFn: async (): Promise<VoteCountsRow[]> => {
      try {
        // まず vote_counts ビューから取得を試行
        const { data, error } = await supabase
          .from('vote_counts')
          .select('*');

        if (error) {
          console.warn('Failed to fetch from vote_counts view:', error.message);
          // ビューが存在しない場合やデータベースリセット中の場合は、直接集計
          if (error.message.includes('relation') || error.message.includes('permission') || error.code === 'PGRST116') {
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('votes')
              .select('contestant_id');
            
            if (fallbackError) {
              console.warn('Fallback query also failed:', fallbackError.message);
              // データベースリセット中の場合は空の配列を返す
              if (fallbackError.message.includes('relation') || fallbackError.message.includes('permission')) {
                return [];
              }
              throw fallbackError;
            }

            // 手動で集計
            const counts = (fallbackData || []).reduce((acc, vote) => {
              acc[vote.contestant_id] = (acc[vote.contestant_id] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            const ids = Object.keys(counts);
            if (ids.length === 0) return [];

            // 該当候補者の詳細を取得して、ビューと同じ形へ整形
            const { data: contestantsData, error: contestantsError } = await supabase
              .from('contestants')
              .select('id, name, description, instagram, image_url')
              .in('id', ids);

            if (contestantsError) {
              console.warn('Failed to fetch contestants for fallback:', contestantsError.message);
              // 詳細取得に失敗した場合でも、型を揃えた最小情報で返す
              return ids.map((id) => ({
                id,
                name: null,
                description: null,
                instagram: null,
                image_url: null,
                vote_count: counts[id] ?? 0,
              }));
            }

            const contestantMap = new Map((contestantsData || []).map((c) => [c.id, c]));
            return ids.map((id) => {
              const c = contestantMap.get(id);
              return {
                id,
                name: c?.name ?? null,
                description: c?.description ?? null,
                instagram: c?.instagram ?? null,
                image_url: c?.image_url ?? null,
                vote_count: counts[id] ?? 0,
              };
            });
          }
          throw error;
        }

        return (data as VoteCountsRow[]) || [];
      } catch (error: any) {
        console.warn('Error in useVoteCountsQuery:', error);
        // ネットワークエラーやデータベースリセット中の場合は空の配列を返す
        if (error.name === 'AbortError' || error.message?.includes('ERR_ABORTED') || error.message?.includes('fetch')) {
          return [];
        }
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      // ネットワークエラーやデータベースリセット中の場合は3回までリトライ
      if (failureCount < 3 && (
        error?.name === 'AbortError' || 
        error?.message?.includes('ERR_ABORTED') ||
        error?.message?.includes('fetch') ||
        error?.message?.includes('relation') ||
        error?.message?.includes('permission')
      )) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 指数バックオフ
    staleTime: 30000, // 30秒間はキャッシュを使用
  });
}

type ContestantRow = Database['public']['Tables']['contestants']['Row'];

export function useActiveContestantsQuery() {
  return useQuery({
    queryKey: queryKeys.activeContestants(),
    queryFn: async (): Promise<ContestantRow[]> => {
      const { data, error } = await supabase
        .from('contestants')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return (data as ContestantRow[]) || [];
    },
  });
}

export function useVotedByIpQuery() {
  // voting_settings の last_reset_at をキーに含めて、設定変更時に自動的に再評価されるようにする
  const { data: settings } = useVotingSettingsQuery();
  const lastResetAt = settings?.last_reset_at ?? null;

  return useQuery({
    queryKey: [...queryKeys.votedByIp(null), lastResetAt],
    queryFn: async () => {
      try {
        const voterIP = await getClientIP();
        let query = supabase
          .from('votes')
          .select('contestant_id')
          .eq('voter_ip', voterIP);
        if (lastResetAt) {
          query = query.gte('created_at', lastResetAt);
        }
        const { data, error } = await query;
        if (error) {
          console.warn('Failed to fetch voted data:', error.message);
          // データベースリセット中やネットワークエラーの場合は空のSetを返す
          if (error.message.includes('relation') || error.message.includes('permission') || error.code === 'PGRST116') {
            return new Set<string>();
          }
          throw error;
        }
        return new Set((data || []).map((v) => v.contestant_id));
      } catch (error: any) {
        console.warn('Error in useVotedByIpQuery:', error);
        // ネットワークエラーやデータベースリセット中の場合は空のSetを返す
        if (error.name === 'AbortError' || error.message?.includes('ERR_ABORTED') || error.message?.includes('fetch')) {
          return new Set<string>();
        }
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      // ネットワークエラーやデータベースリセット中の場合は3回までリトライ
      if (failureCount < 3 && (
        error?.name === 'AbortError' || 
        error?.message?.includes('ERR_ABORTED') ||
        error?.message?.includes('fetch') ||
        error?.message?.includes('relation') ||
        error?.message?.includes('permission')
      )) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 指数バックオフ
    staleTime: 30000, // 30秒間はキャッシュを使用
  });
}

// Realtimeでvote_countsを自動更新
export function useSubscribeVoteInvalidation() {
  const qc = useQueryClient();
  useEffect(() => {
    const sub = subscribeToVoteUpdates(() => {
      qc.invalidateQueries({ queryKey: queryKeys.voteCounts() });
      // 票の増減時はIPごとの状態も影響する可能性があるため、明示的にリセットしてロード状態へ
      qc.resetQueries({ queryKey: queryKeys.votedByIp(null) });
      qc.resetQueries({ queryKey: queryKeys.ipEligibility(null) });
    });
    return () => {
      sub.unsubscribe();
    };
  }, [qc]);
}

type VotingSettingsRow = Database['public']['Tables']['voting_settings']['Row'];

export function useVotingSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.votingSettings(),
    queryFn: async (): Promise<VotingSettingsRow | null> => {
      const { data, error } = await supabase
        .from('voting_settings')
        .select('*')
        .single();
      if (error) throw error;
      return (data as VotingSettingsRow) ?? null;
    },
  });
}

export function useSubscribeVotingSettingsInvalidation() {
  const qc = useQueryClient();
  useEffect(() => {
    const sub = subscribeToVotingSettingsUpdates(() => {
      qc.invalidateQueries({ queryKey: queryKeys.votingSettings() });
      // 投票設定の変更は集計結果にも影響する（リセットなど）ため票カウントも無効化
      qc.invalidateQueries({ queryKey: queryKeys.voteCounts() });
      // 直後は古い判定が残らないように完全にリセット
      qc.resetQueries({ queryKey: queryKeys.votedByIp(null) });
      qc.resetQueries({ queryKey: queryKeys.ipEligibility(null) });
    });

    // Windowイベント経由の通知にも対応（Admin画面からの手動通知など）
    const handler = () => {
      qc.invalidateQueries({ queryKey: queryKeys.votingSettings() });
      qc.invalidateQueries({ queryKey: queryKeys.voteCounts() });
      qc.resetQueries({ queryKey: queryKeys.votedByIp(null) });
      qc.resetQueries({ queryKey: queryKeys.ipEligibility(null) });
    };
    window.addEventListener('votingSettingsChanged', handler as EventListener);

    return () => {
      sub.unsubscribe();
      window.removeEventListener('votingSettingsChanged', handler as EventListener);
    };
  }, [qc]);
}

export type IpEligibility = {
  eligible: boolean;
  reason: string | null;
  voterIP: string;
  votedCount: number;
  remaining: number | null; // null when unlimited
  totalAllowed: number | null; // null when unlimited
};

export function useIpEligibilityQuery() {
  // last_reset_at をキーに含めることで、設定変更時に自動的に再計算
  const { data: settings } = useVotingSettingsQuery();
  const lastResetAt = settings?.last_reset_at ?? null;

  return useQuery({
    queryKey: [...queryKeys.ipEligibility(null), lastResetAt],
    queryFn: async (): Promise<IpEligibility> => {
      try {
        const voterIP = await getClientIP();

        // 1) 許可CIDRの確認（未設定なら全許可）
        const cidrs = (import.meta.env.VITE_ALLOWED_VOTER_CIDRS as string | undefined)?.split(',').map(s => s.trim()).filter(Boolean) || ['0.0.0.0/0'];
        const isAllowedRange = ipInAllowedCidrs(voterIP, cidrs);
        if (!isAllowedRange) {
          return {
            eligible: false,
            reason: 'このIPアドレスからは投票できません',
            voterIP,
            votedCount: 0,
            remaining: 0,
            totalAllowed: 0,
          };
        }

        // 2) 投票上限の確認（リセット後のみ集計）
        const countQuery = supabase
          .from('votes')
          .select('id', { count: 'exact', head: true })
          .eq('voter_ip', voterIP);
        if (lastResetAt) {
          (countQuery as any).gte('created_at', lastResetAt);
        }
        const { count, error } = await countQuery as unknown as { count: number | null, error: any };
        if (error) {
          console.warn('Failed to fetch vote count:', error.message);
          // データベースリセット中やネットワークエラーの場合はデフォルト値を返す
          if (error.message.includes('relation') || error.message.includes('permission') || error.code === 'PGRST116') {
            return { eligible: true, reason: null, voterIP, votedCount: 0, remaining: null, totalAllowed: null };
          }
          throw error;
        }
        const votedCount = count ?? 0;

        const unlimited = settings?.unlimited_voting === true;
        const limit = unlimited ? null : (settings?.max_votes_per_ip ?? 1);

        if (unlimited || votedCount < (limit ?? Infinity)) {
          const remaining = unlimited ? null : Math.max((limit as number) - votedCount, 0);
          return { eligible: true, reason: null, voterIP, votedCount, remaining, totalAllowed: limit };
        }

        return {
          eligible: false,
          reason: 'このIPからの投票上限に達しました',
          voterIP,
          votedCount,
          remaining: 0,
          totalAllowed: limit,
        };
      } catch (error: any) {
        console.warn('Error in useIpEligibilityQuery:', error);
        // ネットワークエラーやデータベースリセット中の場合はデフォルト値を返す
        if (error.name === 'AbortError' || error.message?.includes('ERR_ABORTED') || error.message?.includes('fetch')) {
          const voterIP = await getClientIP().catch(() => '0.0.0.0');
          return { eligible: true, reason: null, voterIP, votedCount: 0, remaining: null, totalAllowed: null };
        }
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      // ネットワークエラーやデータベースリセット中の場合は3回までリトライ
      if (failureCount < 3 && (
        error?.name === 'AbortError' || 
        error?.message?.includes('ERR_ABORTED') ||
        error?.message?.includes('fetch') ||
        error?.message?.includes('relation') ||
        error?.message?.includes('permission')
      )) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 指数バックオフ
    staleTime: 30000, // 30秒間はキャッシュを使用
  });
}

function ipToInt(ip: string): number | null {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => isNaN(n) || n < 0 || n > 255)) return null;
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function ipInAllowedCidrs(ip: string, cidrs: string[]): boolean {
  const ipInt = ipToInt(ip);
  if (ipInt === null) return false;
  return cidrs.some(cidr => {
    const [range, bitsStr] = cidr.split('/');
    const bits = parseInt(bitsStr || '32', 10);
    const rangeInt = ipToInt(range || '');
    if (rangeInt === null) return false;
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipInt & mask) === (rangeInt & mask);
  });
}
