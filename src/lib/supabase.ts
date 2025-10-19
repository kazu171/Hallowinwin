import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// 環境変数からSupabaseの設定を取得
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const __IS_TEST__ = import.meta.env.MODE === 'test';
const __IS_DEV__ = import.meta.env.DEV === true;
// 画像バケット名（環境変数で上書き可）
const CONTESTANT_IMAGES_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET_CONTESTANT_IMAGES || 'contestant-images';

if (!supabaseUrl || !supabaseAnonKey) {
  // テスト環境では冗長な警告ログを抑制
  if (!__IS_TEST__) {
    console.warn('Supabase env vars are missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  }
}

// Supabaseクライアントを作成
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// IPアドレスを取得する関数
export const getClientIP = async (): Promise<string> => {
  // 1) 短期キャッシュ（24h）
  try {
    const cached = localStorage.getItem('client_ip_cache');
    if (cached) {
      const { ip, ts } = JSON.parse(cached) as { ip: string; ts: number };
      if (ip && ts && Date.now() - ts < 24 * 60 * 60 * 1000) {
        return ip;
      }
    }
  } catch {
    // ignore cache errors
  }

  // 2) IP取得の実装（複数エンドポイント + タイムアウト）
  const tryEndpoints = async (): Promise<string | null> => {
    const attempts: Array<() => Promise<string>> = [
      async () => {
        const res = await fetch('https://api.ipify.org?format=json', { signal: abortAfter(2500) });
        if (!res.ok) throw new Error('ipify failed');
        const data = await res.json();
        return data.ip as string;
      },
      async () => {
        const res = await fetch('https://ipv4.icanhazip.com', { signal: abortAfter(2500) });
        if (!res.ok) throw new Error('icanhazip failed');
        const text = (await res.text()).trim();
        return text;
      },
      async () => {
        const res = await fetch('https://www.cloudflare.com/cdn-cgi/trace', { signal: abortAfter(2500) });
        if (!res.ok) throw new Error('cloudflare trace failed');
        const text = await res.text();
        const match = text.match(/^ip=(.*)$/m);
        if (!match) throw new Error('ip not found in trace');
        return match[1].trim();
      }
    ];

    for (const fn of attempts) {
      try {
        const ip = await fn();
        if (ip && isIPv4(ip)) return ip;
      } catch {
        // try next
      }
    }
    return null;
  };

  try {
    const ip = await tryEndpoints();
    if (ip) {
      try {
        localStorage.setItem('client_ip_cache', JSON.stringify({ ip, ts: Date.now() }));
      } catch {/* ignore */}
      return ip;
    }
  } catch (error) {
    // テスト環境ではログを抑制（ネットワーク未モック時にノイズになるため）
    if (!__IS_TEST__) {
      console.error('Failed to get IP address:', error);
    }
  }
  // 3) ネットワーク不通時のフォールバック: デバイスごとに安定な擬似IP
  const pseudo = getOrCreatePseudoIPv4();
  try {
    localStorage.setItem('client_ip_cache', JSON.stringify({ ip: pseudo, ts: Date.now() }));
  } catch {/* ignore */}
  return pseudo;
};

function abortAfter(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function isIPv4(ip: string): boolean {
  return /^(25[0-5]|2[0-4]\d|[01]?\d\d?)(\.(25[0-5]|2[0-4]\d|[01]?\d\d?)){3}$/.test(ip);
}

function getOrCreatePseudoIPv4(): string {
  try {
    const existing = localStorage.getItem('pseudo_ip_v4');
    if (existing && isIPv4(existing)) return existing;
  } catch {/* ignore */}

  // 10.x.x.x のプライベートアドレス空間で擬似IPを生成（デバイスごとに固定）
  const b = new Uint8Array(3);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(b);
  } else {
    for (let i = 0; i < 3; i++) b[i] = Math.floor(Math.random() * 256);
  }
  const pseudo = `10.${b[0]}.${b[1]}.${b[2]}`;
  try {
    localStorage.setItem('pseudo_ip_v4', pseudo);
  } catch {/* ignore */}
  return pseudo;
}

// 画像をSupabase Storageにアップロードする関数
export const uploadImage = async (file: File, path: string): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(CONTESTANT_IMAGES_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: (file as any).type || undefined,
      });

    if (uploadError) {
      // 静かにフォールバック（バケット未作成や権限不足でもUIを汚さない）
      if (__IS_DEV__ && !__IS_TEST__) {
        const msg = typeof uploadError?.message === 'string' ? uploadError.message : String(uploadError);
        console.debug('[uploadImage] storage upload skipped:', msg);
      }
      return null;
    }
    // 公開URL（公開バケット前提）。非公開の場合はパスを返し、表示側で解決。
    const { data } = supabase.storage
      .from(CONTESTANT_IMAGES_BUCKET)
      .getPublicUrl(filePath);
    return data?.publicUrl || `${CONTESTANT_IMAGES_BUCKET}/${filePath}`;
  } catch (error) {
    console.error('Failed to upload image:', error);
    return null;
  }
};

// 画像URL/パスを公開URLに解決（パスが来た場合に公開URLを生成）
export const getPublicImageUrl = (urlOrPath?: string | null): string | null => {
  if (!urlOrPath) return null;
  // 既にhttp(s)から始まる場合はそのまま（外部URLや既存の公開URL）
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  // 形式: "bucket/path/to/file" の場合は先頭セグメントをバケットとして扱う
  const m = urlOrPath.match(/^([^/]+)\/(.+)$/);
  if (m) {
    const [, bucket, rest] = m;
    const { data } = supabase.storage.from(bucket).getPublicUrl(rest);
    return data.publicUrl || null;
  }
  // バケット不明時は既定バケットで解決
  const { data } = supabase.storage.from(CONTESTANT_IMAGES_BUCKET).getPublicUrl(urlOrPath);
  return data.publicUrl || null;
};

// リアルタイム投票数を購読する関数
export const subscribeToVoteUpdates = (callback: () => void) => {
  return supabase
    .channel('vote_updates')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'votes'
      },
      () => callback()
    )
    .subscribe();
};

// 投票設定の変更をリアルタイムで購読する関数
export const subscribeToVotingSettingsUpdates = (
  callback: (payload: { new?: { is_voting_active?: boolean; last_reset_at?: string | null; current_round?: number } }) => void
) => {
  return supabase
    .channel('voting_settings_updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'voting_settings'
      },
      callback
    )
    .subscribe();
};

// 投票設定の変更を通知する関数
type VotingSettingsChange = Partial<{
  is_voting_active: boolean;
  voting_start_time: string | null;
  voting_end_time: string | null;
  max_votes_per_ip: number;
  unlimited_voting: boolean;
  last_reset_at: string | null;
  current_round: number;
}>;

export const notifyVotingSettingsChange = async (settings: VotingSettingsChange) => {
  try {
    // カスタムイベントを発火して全ページに通知
    window.dispatchEvent(new CustomEvent('votingSettingsChanged', {
      detail: settings
    }));
  } catch (error) {
    console.error('Failed to notify voting settings change:', error);
  }
};

// 投票設定を取得する関数
export const getVotingSettings = async (): Promise<Database['public']['Tables']['voting_settings']['Row'] | null> => {
  const { data, error } = await supabase
    .from('voting_settings')
    .select('*')
    .single();

  if (error) {
    console.error('Failed to get voting settings:', error);
    return null;
  }

  return data as Database['public']['Tables']['voting_settings']['Row'];
};

// 投票設定を更新する関数
export const updateVotingSettings = async (updates: {
  is_voting_active?: boolean;
  voting_start_time?: string | null;
  voting_end_time?: string | null;
  max_votes_per_ip?: number;
  unlimited_voting?: boolean;
  last_reset_at?: string | null;
  current_round?: number;
}) => {
  // 既存レコードが無い環境に配慮し、無ければINSERT、有ればUPDATE
  const { data: existingData, error: selectError } = await supabase
    .from('voting_settings')
    .select('id')
    .limit(1)
    .single();

  if (selectError || !existingData) {
    const { data: inserted, error: insertError } = await supabase
      .from('voting_settings')
      .insert({
        is_voting_active: updates.is_voting_active ?? false,
        voting_start_time: updates.voting_start_time ?? null,
        voting_end_time: updates.voting_end_time ?? null,
        max_votes_per_ip: updates.max_votes_per_ip ?? 1,
        unlimited_voting: updates.unlimited_voting ?? false,
        // last_reset_at はINSERT時には明示的に渡す（null可）
        last_reset_at: updates.last_reset_at ?? null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (insertError) {
      console.error('Failed to insert voting settings:', insertError);
      throw insertError;
    }
    return inserted;
  }

  const { data, error } = await supabase
    .from('voting_settings')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existingData.id)
    .select()
    .single();
  if (error) {
    console.error('Failed to update voting settings:', error);
    throw error;
  }
  return data;
};

// 投票が有効かチェックする関数
export const isVotingActive = async (): Promise<boolean> => {
  const settings = await getVotingSettings();
  if (!settings) return false;

  const now = new Date();
  const startTime = settings.voting_start_time ? new Date(settings.voting_start_time) : null;
  const endTime = settings.voting_end_time ? new Date(settings.voting_end_time) : null;

  if (!settings.is_voting_active) return false;
  if (startTime && now < startTime) return false;
  if (endTime && now > endTime) return false;

  return true;
};

// 投票の一元化: IPごとの重複はDB制約で排他し、重複時も明確に返す
export async function voteForContestant(contestantId: string) {
  try {
    const voter_ip = await getClientIP();
    const { data, error } = await supabase
      .from('votes')
      .insert({ contestant_id: contestantId, voter_ip })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error: any) {
    // NOTE: After migration 012, uniqueness is (voter_ip, contestant_id, reset_marker)
    // so duplicates are only for the same period window.
    if (
      error?.code === '23505' ||
      (typeof error?.message === 'string' && /duplicate|unique/i.test(error.message))
    ) {
      // Settings may have changed; ensure client caches can update promptly
      try { await getVotingSettings(); } catch {}
      throw new Error('duplicate_vote');
    }
    throw error;
  }
}

// 投票レコードを削除する関数（IPアドレス投票権のリセット用）
export const deleteAllVotes = async (): Promise<void> => {
  const { error } = await supabase
    .from('votes')
    .delete()
    .gt('created_at', '1970-01-01'); // すべてのレコードを削除（created_at > '1970-01-01' で全件対象）

  if (error) {
    console.error('Failed to delete votes:', error);
    throw error;
  }

  console.log('✅ すべての投票レコードを削除しました（IPアドレス投票権リセット）');
};
