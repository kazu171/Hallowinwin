import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  Users, 
  Settings, 
  Save, 
  X,
  Eye,
  Calculator,
  AlertTriangle,
  Trophy,
  Play
} from 'lucide-react';
import { BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, updateVotingSettings, notifyVotingSettingsChange, uploadImage, deleteAllVotes } from '../lib/supabase';
import ImageWithFallback from '../components/ImageWithFallback';
import { useImageUrl } from '@/hooks/useImageUrl';
import type { Database } from '../types/database';
import { useVotingStore } from '../store/votingStore';
import { logoutAdmin } from '@/lib/adminAuth';
import VotingStatusSection from '../components/VotingStatusSection';
import ConfirmationModal from '../components/ConfirmationModal';
import { useVoteCountsQuery, useSubscribeVoteInvalidation, useVotingSettingsQuery, useSubscribeVotingSettingsInvalidation } from '@/hooks/queries';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';

type ContestantWithVotes = Database['public']['Views']['vote_counts']['Row'];



interface ContestantFormData {
  name: string;
  comment: string;
  instagram_id?: string;
  image?: File;
}

// 内部表示用のアバター（プレビュー/一覧用）
const AdminAvatar: React.FC<{ url?: string | null; alt: string; className?: string }> = ({ url, alt, className }) => {
  const img = useImageUrl(url);
  return (
    <ImageWithFallback
      className={className ?? 'h-12 w-12 rounded-full object-cover'}
      src={img || '/placeholder-image.svg'}
      alt={alt}
      fallbackSrc={'/placeholder-image.svg'}
    />
  );
};

export default function Admin() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: contestants, isLoading: dataLoading } = useVoteCountsQuery();
  useSubscribeVoteInvalidation();
  const { data: settingsData } = useVotingSettingsQuery();
  useSubscribeVotingSettingsInvalidation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContestant, setEditingContestant] = useState<ContestantWithVotes | null>(null);
  const [formData, setFormData] = useState<ContestantFormData>({
    name: '',
    comment: '',
    instagram_id: ''
  });
  const { isVotingActive, isResultsFinalized, finalizeResults, resetVoting, setVotingActive } = useVotingStore();
  const [isFinalizingResults, setIsFinalizingResults] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'contestants' | 'settings'>('contestants');
  // dataLoading は React Query の isLoading を使用
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    contestantId: string;
    contestantName: string;
  }>({ isOpen: false, contestantId: '', contestantName: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  // 投票締切確認モーダル
  const [finalizeConfirmModal, setFinalizeConfirmModal] = useState(false);
  
  // 投票再開確認モーダル
  const [restartConfirmModal, setRestartConfirmModal] = useState(false);
  
  // 投票リセット確認モーダル
  const [resetConfirmModal, setResetConfirmModal] = useState(false);

  // 投票設定の状態管理
  const [votingSettings, setVotingSettings] = useState({
    startTime: '2025-10-30T18:30',
    endTime: '2025-10-30T21:45',
    maxVotesPerIP: 1,
    unlimitedVoting: true, // デフォルトで無制限投票
    lastUpdated: null as string | null
  });

  // タイムゾーン情報の状態管理
  const [timezoneInfo, setTimezoneInfo] = useState({
    timezone: '',
    offset: '',
    currentTime: '',
    isLoading: true,
    error: null as string | null
  });

  // 失敗時フォールバック: 画像ファイルをdata URLに変換してDBへ保存
  const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });


  // 設定保存ハンドラ
  const handleSaveSettings = async () => {
    try {
      // 入力値の検証
      if (!votingSettings.startTime || !votingSettings.endTime) {
        toast.error('開始時刻と終了時刻を設定してください');
        return;
      }
      
      const startDate = new Date(votingSettings.startTime);
      const endDate = new Date(votingSettings.endTime);
      
      if (startDate >= endDate) {
        toast.error('終了時刻は開始時刻より後に設定してください');
        return;
      }
      
      // データベースに設定を保存（正しいカラム名）
      await updateVotingSettings({
        voting_start_time: votingSettings.startTime,
        voting_end_time: votingSettings.endTime,
        max_votes_per_ip: votingSettings.maxVotesPerIP,
        unlimited_voting: votingSettings.unlimitedVoting,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.votingSettings() });
      notifyVotingSettingsChange({
        is_voting_active: isVotingActive,
        voting_start_time: votingSettings.startTime,
        voting_end_time: votingSettings.endTime,
        max_votes_per_ip: votingSettings.maxVotesPerIP,
        unlimited_voting: votingSettings.unlimitedVoting,
      });
      
      // タイムゾーン情報を含めて設定を保存
      const settingsToSave = {
        ...votingSettings,
        timezone: timezoneInfo.timezone,
        timezoneOffset: timezoneInfo.offset,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem('votingSettings', JSON.stringify(settingsToSave));
      setVotingSettings(settingsToSave);
      
      // 保存した設定をコンソールに出力（確認用）
      console.log('保存された投票設定:', settingsToSave);
      
      // タイムゾーン情報を含めた成功メッセージ
      const startTimeFormatted = startDate.toLocaleString('ja-JP', {
        timeZone: timezoneInfo.timezone || undefined,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const endTimeFormatted = endDate.toLocaleString('ja-JP', {
        timeZone: timezoneInfo.timezone || undefined,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      toast.success(
        `設定が保存されました\n` +
        `開始: ${startTimeFormatted}\n` +
        `終了: ${endTimeFormatted}\n` +
        `最大投票数: ${votingSettings.unlimitedVoting ? '無制限' : votingSettings.maxVotesPerIP}\n` +
        `無制限投票: ${votingSettings.unlimitedVoting ? '有効' : '無効'}\n` +
        `タイムゾーン: ${timezoneInfo.timezone || 'ローカル'} (${timezoneInfo.offset || 'N/A'})`
      );
    } catch (error) {
      console.error('設定保存エラー:', error);
      toast.error('設定の保存に失敗しました');
    }
  };

  // IPアドレスからタイムゾーン情報を取得
  const fetchTimezoneInfo = async () => {
    try {
      setTimezoneInfo(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) {
        throw new Error('タイムゾーン情報の取得に失敗しました');
      }
      
      const data = await response.json();
      const timezone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // 現在時刻を取得
      const now = new Date();
      const currentTime = now.toLocaleString('ja-JP', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      // UTCオフセットを計算
      const offsetMinutes = -now.getTimezoneOffset();
      const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
      const offsetMins = Math.abs(offsetMinutes) % 60;
      const offsetSign = offsetMinutes >= 0 ? '+' : '-';
      const offset = `UTC${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMins.toString().padStart(2, '0')}`;
      
      setTimezoneInfo({
        timezone,
        offset,
        currentTime,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('タイムゾーン取得エラー:', error);
      // フォールバック: ブラウザのタイムゾーンを使用
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const now = new Date();
      const currentTime = now.toLocaleString('ja-JP');
      const offsetMinutes = -now.getTimezoneOffset();
      const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
      const offsetMins = Math.abs(offsetMinutes) % 60;
      const offsetSign = offsetMinutes >= 0 ? '+' : '-';
      const offset = `UTC${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMins.toString().padStart(2, '0')}`;
      
      setTimezoneInfo({
        timezone: browserTimezone,
        offset,
        currentTime,
        isLoading: false,
        error: 'IPアドレスからの取得に失敗したため、ブラウザのタイムゾーンを使用しています'
      });
    }
  };

  const handleTimezoneChange = (selectedTimezone: string) => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('ja-JP', {
        timeZone: selectedTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      const offset = now.toLocaleString('en', {timeZone: selectedTimezone, timeZoneName: 'longOffset'}).split(' ').pop();
      
      setTimezoneInfo({
        timezone: selectedTimezone,
        offset: offset || 'UTC+0:00',
        currentTime: formatter.format(now),
        isLoading: false,
        error: null
      });
      
      toast.success(`タイムゾーンを ${selectedTimezone} に変更しました`);
    } catch {
      toast.error('タイムゾーンの変更に失敗しました');
    }
  };

  // 設定を読み込み
  useEffect(() => {
    const savedSettings = localStorage.getItem('votingSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setVotingSettings(parsed);
      } catch (error) {
        console.error('設定読み込みエラー:', error);
      }
    }
    
    // タイムゾーン情報を取得
    fetchTimezoneInfo();
  }, []);

  // settingsData をローカルフォームへ反映
  useEffect(() => {
    if (!settingsData) return;
    const startISO = settingsData.voting_start_time
      ? new Date(settingsData.voting_start_time).toISOString().slice(0, 16)
      : '';
    const endISO = settingsData.voting_end_time
      ? new Date(settingsData.voting_end_time).toISOString().slice(0, 16)
      : '';
    setVotingSettings(prev => ({
      ...prev,
      startTime: startISO || prev.startTime,
      endTime: endISO || prev.endTime,
      maxVotesPerIP: settingsData.max_votes_per_ip ?? prev.maxVotesPerIP,
      unlimitedVoting: settingsData.unlimited_voting ?? prev.unlimitedVoting,
      lastUpdated: settingsData.updated_at ?? prev.lastUpdated,
    }));
    setVotingActive(Boolean(settingsData.is_voting_active));
  }, [settingsData, setVotingActive]);

  useEffect(() => {
    // リアルタイム同期を初期化
    const { initializeRealtimeSync, cleanup } = useVotingStore.getState();
    initializeRealtimeSync();
    return () => {
      cleanup();
    };
  }, []);

  // 認証チェック（実際の実装では、useEffectでSupabaseの認証状態をチェック）
  const handleLogout = () => {
    logoutAdmin();
    toast.success('ログアウトしました');
    navigate('/admin/login');
  };

  // フォームリセット
  const resetForm = () => {
    setFormData({
      name: '',
      comment: '',
      instagram_id: ''
    });
    setPreviewImage(null);
    setEditingContestant(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // モーダルを開く
  const openModal = (contestant?: ContestantWithVotes) => {
    if (contestant) {
      setEditingContestant(contestant);
      setFormData({
        name: contestant.name || '',
        comment: contestant.description || '',
        instagram_id: contestant.instagram || ''
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  // モーダルを閉じる
  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // 画像選択処理
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      
      // プレビュー画像を作成
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 候補者保存
  const handleSaveContestant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingContestant) {
        // 更新: プロフィール情報（Instagram含む）
        const { error: updateError } = await supabase
          .from('contestants')
          .update({
            name: formData.name,
            description: formData.comment,
            instagram: formData.instagram_id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingContestant.id);

        if (updateError) throw updateError;

        // 画像が選択されていればアップロードして代表画像/本体画像URLを更新
        if (formData.image && editingContestant.id) {
          const imageUrl = await uploadImage(formData.image, `contestants/${editingContestant.id}`);
          if (imageUrl) {
            console.log('✅ Image saved (storage):', imageUrl);
            toast.success('画像を保存しました');
            // 互換: contestant_images を更新
            await supabase
              .from('contestant_images')
              .update({ is_primary: false })
              .eq('contestant_id', editingContestant.id);
            const { error: insertImgErrorCompat } = await supabase
              .from('contestant_images')
              .insert({
                contestant_id: editingContestant.id,
                image_url: imageUrl,
                is_primary: true
              });
            if (insertImgErrorCompat) {
              console.error('画像レコード更新エラー', insertImgErrorCompat);
              throw insertImgErrorCompat;
            }
            // contestants 本体にも保存（名前などと同様に同テーブルで管理）
            await supabase
              .from('contestants')
              .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
              .eq('id', editingContestant.id);
            // 楽観的にVoteCountsのキャッシュも更新
            queryClient.setQueryData(queryKeys.voteCounts(), (old: any) => {
              if (!Array.isArray(old)) return old;
              return old.map((c) => c.id === editingContestant.id ? { ...c, image_url: imageUrl } : c);
            });
          } else {
            // Storageにアップできない場合はdata URLで保存（即時表示優先）
            try {
              const dataUrl = await fileToDataUrl(formData.image);
              // contestants 本体にも保存
              await supabase
                .from('contestants')
                .update({ image_url: dataUrl, updated_at: new Date().toISOString() })
                .eq('id', editingContestant.id);
              // 互換: contestant_images も更新
              await supabase
                .from('contestant_images')
                .update({ is_primary: false })
                .eq('contestant_id', editingContestant.id);
              await supabase
                .from('contestant_images')
                .insert({
                  contestant_id: editingContestant.id,
                  image_url: dataUrl,
                  is_primary: true
                });
              // キャッシュ更新
              queryClient.setQueryData(queryKeys.voteCounts(), (old: any) => {
                if (!Array.isArray(old)) return old;
                return old.map((c) => c.id === editingContestant.id ? { ...c, image_url: dataUrl } : c);
              });
              toast.success('画像を保存しました');
            } catch (e) {
              console.error('画像フォールバック保存エラー', e);
              toast.error('画像の保存に失敗しました');
            }
          }
        }

        toast.success('候補者情報を更新しました');
      } else {
        // 新規作成: 候補者を作成し、画像があればアップロード＆関連付け
        const { data: inserted, error: insertError } = await supabase
          .from('contestants')
          .insert({
            name: formData.name,
            description: formData.comment,
            instagram: formData.instagram_id || null,
            is_active: true
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        // 画像処理
        if (formData.image && inserted?.id) {
          const imageUrl = await uploadImage(formData.image, `contestants/${inserted.id}`);
          if (imageUrl) {
            console.log('✅ Image saved (storage):', imageUrl);
            toast.success('画像を保存しました');
            // 互換: contestant_images にも保存
            const { error: imgCompatErr } = await supabase
              .from('contestant_images')
              .insert({
                contestant_id: inserted.id,
                image_url: imageUrl,
                is_primary: true
              });
            if (imgCompatErr) {
              console.error('画像レコード作成エラー', imgCompatErr);
              throw imgCompatErr;
            }
            // contestants 本体にも保存
            await supabase
              .from('contestants')
              .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
              .eq('id', inserted.id);
            // 新規のため、キャッシュへも追加（最小情報）
            queryClient.setQueryData(queryKeys.voteCounts(), (old: any) => {
              if (!Array.isArray(old)) return old;
              const newItem = {
                id: inserted.id,
                name: formData.name,
                description: formData.comment,
                instagram: formData.instagram_id || null,
                image_url: imageUrl,
                vote_count: 0,
              };
              return [newItem, ...old];
            });
          } else {
            // フォールバック: data URLで直接保存
            try {
              const dataUrl = await fileToDataUrl(formData.image);
              await supabase
                .from('contestants')
                .update({ image_url: dataUrl, updated_at: new Date().toISOString() })
                .eq('id', inserted.id);
              // 互換: contestant_images にも保存
              await supabase
                .from('contestant_images')
                .insert({
                  contestant_id: inserted.id,
                  image_url: dataUrl,
                  is_primary: true
                });
              queryClient.setQueryData(queryKeys.voteCounts(), (old: any) => {
                if (!Array.isArray(old)) return old;
              const newItem = {
                id: inserted.id,
                name: formData.name,
                description: formData.comment,
                instagram: formData.instagram_id || null,
                image_url: dataUrl,
                vote_count: 0,
              };
                return [newItem, ...old];
              });
              toast.success('画像を保存しました');
            } catch (e) {
              console.error('画像フォールバック保存エラー', e);
              toast.error('画像の保存に失敗しました');
            }
          }
        }

        toast.success('新しい候補者を追加しました');
      }

      // データを再取得してモーダルを閉じる
      queryClient.invalidateQueries({ queryKey: queryKeys.voteCounts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeContestants() });
      closeModal();
    } catch (error) {
      console.error('保存エラー:', error);
      toast.error('保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 削除確認モーダルを開く
  const openDeleteConfirmModal = (id: string, name: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      contestantId: id,
      contestantName: name
    });
  };

  // 削除確認モーダルを閉じる
  const closeDeleteConfirmModal = () => {
    setDeleteConfirmModal({
      isOpen: false,
      contestantId: '',
      contestantName: ''
    });
  };

  // 候補者削除処理
  const handleDeleteContestant = async () => {
    if (!deleteConfirmModal.contestantId) return;
    
    setIsDeleting(true);
    try {
      // Supabaseから削除
      const { error } = await supabase
        .from('contestants')
        .delete()
        .eq('id', deleteConfirmModal.contestantId);

      if (error) {
        throw error;
      }
      
      // 成功時はデータを再取得して最新状態を確保
      queryClient.invalidateQueries({ queryKey: queryKeys.voteCounts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeContestants() });
      toast.success('候補者を削除しました');
      closeDeleteConfirmModal();
    } catch (error) {
      console.error('削除エラー:', error);
      toast.error('削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  // 候補者の有効/無効切り替え（UI未提供のため一旦未使用）

  // 投票締切確認モーダルを開く
  const openFinalizeConfirmModal = () => {
    setFinalizeConfirmModal(true);
  };

  // 投票締切確認モーダルを閉じる
  const closeFinalizeConfirmModal = () => {
    setFinalizeConfirmModal(false);
  };

  // 投票締切・結果確定
  const handleFinalizeResults = async () => {
    setIsFinalizingResults(true);
    try {
      // DBの投票状態を終了へ更新し、全ページへ反映
      await updateVotingSettings({ is_voting_active: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.votingSettings() });
      notifyVotingSettingsChange({ is_voting_active: false });
      // 集計も更新されるため票カウントの再取得も促す
      queryClient.invalidateQueries({ queryKey: queryKeys.voteCounts() });

      // ローカルストアの状態を更新（投票停止＋結果確定フラグ）
      setVotingActive(false);
      finalizeResults();

      toast.success('投票を締め切りました。結果が確定されました。');
      closeFinalizeConfirmModal();
      
      // 結果発表ページにリダイレクト
      setTimeout(() => {
        navigate('/results');
      }, 1500);
    } catch (error) {
      console.error('結果確定エラー:', error);
      toast.error('結果確定に失敗しました');
    } finally {
      setIsFinalizingResults(false);
    }
  };

  // 投票再開確認モーダルを開く
  const openRestartConfirmModal = () => {
    console.log('🔘 投票再開ボタンがクリックされました');
    console.log('現在の投票状態:', { isVotingActive, isResultsFinalized });
    setRestartConfirmModal(true);
    console.log('✅ 投票再開確認モーダルを開きました');
  };

  // 投票再開確認モーダルを閉じる
  const closeRestartConfirmModal = () => {
    setRestartConfirmModal(false);
  };

  // 投票リセット確認モーダルを開く
  const openResetConfirmModal = () => {
    setResetConfirmModal(true);
  };

  // 投票リセット確認モーダルを閉じる
  const closeResetConfirmModal = () => {
    setResetConfirmModal(false);
  };

  const handleRestartVoting = async () => {
    console.log('🔄 投票再開処理を開始します...');
    
    try {
      // Supabaseの接続状態を確認
      console.log('📡 Supabaseの接続状態を確認中...');
      const { error: healthError } = await supabase
        .from('voting_settings')
        .select('id')
        .limit(1);
      
      if (healthError) {
        console.error('❌ Supabase接続エラー:', healthError);
        throw new Error(`データベース接続エラー: ${healthError.message}`);
      }
      
      console.log('✅ Supabase接続確認完了');
      
      // データベースの投票設定を更新
      console.log('💾 データベースの投票設定を更新中...');
      const updateResult = await updateVotingSettings({ is_voting_active: true });
      console.log('✅ データベース更新完了:', updateResult);
      
      // ローカルストアを更新（投票を再開）
      console.log('🔄 ローカルストアを更新中...');
      setVotingActive(true);
      console.log('✅ ローカルストア更新完了');
      
      // 投票設定を再取得して画面を更新
      console.log('🔄 投票設定を再取得中...');
      queryClient.invalidateQueries({ queryKey: queryKeys.votingSettings() });
      console.log('✅ 投票設定再取得完了');
      
      // 全ページに投票状態変更を通知
      console.log('📢 全ページに投票状態変更を通知中...');
      await notifyVotingSettingsChange({ is_voting_active: true });
      console.log('✅ 通知完了');
      
      toast.success('投票を再開しました');
      closeRestartConfirmModal();
      
      console.log('🎉 投票再開処理が正常に完了しました');
    } catch (error) {
      console.error('❌ 投票再開処理でエラーが発生:', error);
      
      // エラーの詳細を分析
      if (error instanceof Error) {
        console.error('エラーメッセージ:', error.message);
        console.error('エラースタック:', error.stack);
        
        // 具体的なエラーメッセージを表示
        if (error.message.includes('permission denied')) {
          toast.error('データベースへのアクセス権限がありません');
        } else if (error.message.includes('connection')) {
          toast.error('データベースに接続できません');
        } else {
          toast.error(`投票の再開に失敗しました: ${error.message}`);
        }
      } else {
        console.error('不明なエラー:', error);
        toast.error('投票の再開に失敗しました（不明なエラー）');
      }
    }
  };

  const handleResetVoting = async () => {
    try {
      console.log('🔄 票数リセット（ラウンド進行）を開始します...');

      // 1) 接続確認
      const { error: healthError } = await supabase.from('voting_settings').select('id').limit(1);
      if (healthError) throw new Error(`データベース接続エラー: ${healthError.message}`);

      // 2) ラウンドをインクリメントし、last_reset_at を更新（投票ON/OFFは維持）
      const newRound = ((settingsData as any)?.current_round ?? 0) + 1;
      const nowIso = new Date().toISOString();
      const updateResult = await updateVotingSettings({
        current_round: newRound,
        last_reset_at: nowIso,
      });
      console.log('✅ 設定更新完了:', updateResult);
      queryClient.resetQueries({ queryKey: queryKeys.votingSettings() });

      // 3) フロントの判定系をリセット → 判定中… に遷移
      queryClient.resetQueries({ queryKey: queryKeys.votedByIp(null) });
      queryClient.resetQueries({ queryKey: queryKeys.ipEligibility(null) });
      queryClient.resetQueries({ queryKey: queryKeys.voteCounts() });

      // 4) ローカルストアの結果確定フラグのみ解除（投票可否は維持）
      useVotingStore.getState().unfinalizeResults();

      // 5) 全ページに状態変更を通知（current_round / last_reset_at を伝播）
      notifyVotingSettingsChange({ current_round: newRound, last_reset_at: nowIso });

      toast.success('票数をリセットしました');
      closeResetConfirmModal();
    } catch (error: any) {
      console.error('❌ リセット処理でエラー:', error);
      toast.error('投票のリセットに失敗しました', {
        description: error?.message ?? 'ページをリロードしてから再度お試しください。'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 sm:py-4 lg:py-6 space-y-3 sm:space-y-0">
            <div className="flex items-center">
              <h1 className="text-lg sm:text-xl lg:text-3xl font-bold text-gray-900 truncate">管理者ダッシュボード</h1>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 lg:space-x-4 w-full sm:w-auto">
              <div className="order-2 sm:order-1">
                <VotingStatusSection 
                   isVotingActive={isVotingActive}
                   isFinalizingResults={isFinalizingResults}
                   onFinalizeVoting={openFinalizeConfirmModal}
                   onRestartVoting={openRestartConfirmModal}
                   onResetVoting={openResetConfirmModal}
                 />
              </div>

            </div>
          </div>
          
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('contestants')}
                className={`flex-1 py-3 px-2 border-b-2 font-medium text-xs sm:text-sm transition-colors min-h-[44px] flex items-center justify-center space-x-1 sm:space-x-2 ${
                  activeTab === 'contestants'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">候補者管理</span>
                <span className="sm:hidden">候補者</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 py-3 px-2 border-b-2 font-medium text-xs sm:text-sm transition-colors min-h-[44px] flex items-center justify-center space-x-1 sm:space-x-2 ${
                  activeTab === 'settings'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">投票設定</span>
                <span className="sm:hidden">設定</span>
              </button>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-3 sm:py-4 lg:py-6 px-3 sm:px-4 lg:px-8">

        {/* 候補者管理タブ */}
        {activeTab === 'contestants' && (
          <div>
            {/* 統計情報 - モバイル最適化 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
              <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-blue-600" />
                  </div>
                  <div className="ml-2 sm:ml-3 lg:ml-4 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">総候補者数</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">{contestants?.length ?? 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-green-600" />
                  </div>
                  <div className="ml-2 sm:ml-3 lg:ml-4 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">総投票数</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">
                      {(contestants ?? []).reduce((sum, c) => sum + (c.vote_count || 0), 0)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6 col-span-2 lg:col-span-1">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Trophy className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-purple-600" />
                  </div>
                  <div className="ml-2 sm:ml-3 lg:ml-4 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">トップ候補者</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 truncate">
                      {(contestants?.length ?? 0) > 0 ? contestants?.[0]?.name || '-' : '-'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6 col-span-2 lg:col-span-1">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Eye className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-orange-600" />
                  </div>
                  <div className="ml-2 sm:ml-3 lg:ml-4 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">投票状況</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">{isVotingActive ? '進行中' : '終了'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* APIごとの票数集計結果 */}


            {/* 候補者一覧 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h2 className="text-base sm:text-lg font-medium text-gray-900">候補者一覧</h2>
                <button
                  onClick={() => openModal()}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors min-h-[44px]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新規追加
                </button>
              </div>
              
              {dataLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600">候補者データを読み込み中...</p>
                </div>
              ) : (
                <>
                  {/* Mobile card list - タッチ操作最適化 */}
                  <div className="grid grid-cols-1 gap-4 md:hidden">
                    {(contestants || []).map((contestant) => (
                      <div key={contestant.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex items-start gap-4">
                          <AdminAvatar url={contestant.image_url} alt={contestant.name || '候補者'} className="h-16 w-16 rounded-full object-cover flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-semibold text-gray-900 truncate">{contestant.name}</h3>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{contestant.description}</p>
                            <div className="mt-2 flex items-center gap-3">

                              <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-700">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                                {contestant.vote_count || 0}票
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-end gap-3">
                          <button
                            onClick={() => openModal(contestant)}
                            className="flex items-center justify-center px-3 py-2 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors min-h-[40px] min-w-[40px] touch-manipulation"
                            aria-label={`${contestant.name}を編集`}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="ml-2 text-xs font-medium">編集</span>
                          </button>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDeleteConfirmModal(contestant.id || '', contestant.name || ''); }}
                            className="flex items-center justify-center px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors min-h-[40px] min-w-[40px] touch-manipulation"
                            type="button"
                            aria-label={`${contestant.name}を削除`}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="ml-2 text-xs font-medium">削除</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table - タッチ操作対応 */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            候補者
                          </th>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            投票数
                          </th>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(contestants || []).map((contestant) => (
                          <tr key={contestant.id} className="hover:bg-gray-50">
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-12 w-12">
                                  <AdminAvatar url={contestant.image_url} alt={contestant.name || '候補者'} />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{contestant.name}</div>
                                  <div className="text-sm text-gray-500 truncate max-w-xs">{contestant.description}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Trophy className="h-4 w-4 text-yellow-500 mr-2" />
                                <span className="text-sm font-medium text-gray-900">{contestant.vote_count || 0}</span>
                                <span className="text-sm text-gray-500 ml-1">票</span>
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-3">
                                <button 
                                  onClick={() => openModal(contestant)} 
                                  className="inline-flex items-center px-3 py-2 rounded-md border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors min-h-[44px] min-w-[44px] touch-manipulation"
                                  aria-label={`${contestant.name}を編集`}
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDeleteConfirmModal(contestant.id || '', contestant.name || ''); }} 
                                  className="inline-flex items-center px-3 py-2 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors min-h-[44px] min-w-[44px] touch-manipulation" 
                                  type="button"
                                  aria-label={`${contestant.name}を削除`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

      {/* 確認モーダル群 */}
      <ConfirmationModal
        isOpen={finalizeConfirmModal}
        onClose={closeFinalizeConfirmModal}
        onConfirm={handleFinalizeResults}
        title="投票を締め切る"
        message="投票を締め切り、結果を確定しますか？管理者画面からいつでも投票を再開できます。"
        confirmText="投票を締め切る"
        type="danger"
        isLoading={isFinalizingResults}
        loadingText="締切中..."
      />

      <ConfirmationModal
        isOpen={restartConfirmModal}
        onClose={closeRestartConfirmModal}
        onConfirm={handleRestartVoting}
        title="投票を再開"
        message="投票を再開しますか？これにより投票ページにアクセスできるようになります。"
        confirmText="投票を再開"
        type="success"
      />

      <ConfirmationModal
        isOpen={resetConfirmModal}
        onClose={closeResetConfirmModal}
        onConfirm={handleResetVoting}
        title="票数をリセット"
        message="現在の票数を0にリセットします。投票の有効/無効状態は変更されません。よろしいですか？"
        confirmText="票数をリセット"
        type="info"
      />
      <ConfirmationModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={closeDeleteConfirmModal}
        onConfirm={handleDeleteContestant}
        title="候補者を削除"
        message={`「${deleteConfirmModal.contestantName}」を削除しますか？この操作は取り消せません。`}
        confirmText="削除"
        type="danger"
        isLoading={isDeleting}
        loadingText="削除中..."
      />
            </div>
          </div>
        )}

        {/* 投票設定タブ - モバイル最適化 */}
        {activeTab === 'settings' && (
          <div className="space-y-4 sm:space-y-6">
            
            {/* 投票設定 */}
            <div className="bg-white rounded-lg shadow p-1.5 sm:p-4 lg:p-6">
              <h2 className="text-xs sm:text-lg font-medium text-gray-900 mb-2 sm:mb-6">投票設定</h2>
              
              {/* タイムゾーン設定 - コンパクト版 */}
              <div className="mb-2 sm:mb-4">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-gray-600">TZ:</span>
                  <select
                    value={timezoneInfo?.timezone || 'Asia/Tokyo'}
                    onChange={(e) => handleTimezoneChange(e.target.value)}
                    className="text-xs border border-gray-200 rounded px-2 py-1 bg-gray-50 min-h-[28px] max-w-[100px]"
                  >
                    <option value="Asia/Tokyo">Tokyo</option>
                    <option value="America/New_York">New York</option>
                    <option value="America/Los_Angeles">Los Angeles</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Australia/Sydney">Sydney</option>
                    <option value="Australia/Melbourne">Melbourne</option>
                    <option value="Asia/Shanghai">Shanghai</option>
                    <option value="Asia/Seoul">Seoul</option>
                  </select>
                  <span className="text-gray-500">
                    {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={fetchTimezoneInfo}
                    className="text-blue-600 hover:text-blue-800 min-h-[28px] min-w-[28px] flex items-center justify-center touch-manipulation text-xs"
                    title="更新"
                  >
                    🔄
                  </button>
                  {timezoneInfo?.error && <span className="text-yellow-600 text-xs">※ブラウザ設定</span>}
                </div>
              </div>
              
              <div className="space-y-2 sm:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      投票開始時刻
                    </label>
                    <input
                      type="datetime-local"
                      className="block w-full border border-gray-300 rounded-md px-3 py-1.5 sm:py-3 text-base focus:ring-orange-500 focus:border-orange-500 min-h-[40px] sm:min-h-[48px]"
                      value={votingSettings.startTime}
                      onChange={(e) => setVotingSettings(prev => ({ ...prev, startTime: e.target.value }))}
                      disabled={!isVotingActive}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      投票終了時刻
                    </label>
                    <input
                      type="datetime-local"
                      className="block w-full border border-gray-300 rounded-md px-3 py-1.5 sm:py-3 text-base focus:ring-orange-500 focus:border-orange-500 min-h-[40px] sm:min-h-[48px]"
                      value={votingSettings.endTime}
                      onChange={(e) => setVotingSettings(prev => ({ ...prev, endTime: e.target.value }))}
                      disabled={!isVotingActive}
                    />
                  </div>
                </div>
                

                
                {/* 投票設定 - 並列レイアウト */}
                <div className="border border-gray-200 rounded-lg p-1.5 sm:p-2 bg-gray-50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
                    {/* 無制限投票モード */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700">無制限投票</label>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer touch-manipulation ml-2">
                        <input
                          type="checkbox"
                          checked={votingSettings.unlimitedVoting}
                          onChange={(e) => setVotingSettings(prev => ({ ...prev, unlimitedVoting: e.target.checked }))}
                          className="sr-only peer"
                          disabled={!isVotingActive}
                        />
                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                      </label>
                    </div>

                    {/* 最大投票数設定 */}
                    <div className={`flex items-center justify-between ${votingSettings.unlimitedVoting ? 'opacity-50' : ''}`}>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700">
                          最大投票数/IP
                          {votingSettings.unlimitedVoting && (
                            <span className="text-xs text-gray-400 ml-1">(無効)</span>
                          )}
                        </label>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={votingSettings.maxVotesPerIP}
                        onChange={(e) => setVotingSettings(prev => ({ ...prev, maxVotesPerIP: parseInt(e.target.value) || 1 }))}
                        className="w-16 border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-orange-500 focus:border-orange-500 min-h-[32px] ml-2"
                        disabled={!isVotingActive || votingSettings.unlimitedVoting}
                      />
                    </div>
                  </div>
                </div>
                
                <button 
                  className={`w-full sm:w-auto px-3 py-1.5 sm:px-6 sm:py-3 rounded-md transition-colors min-h-[40px] sm:min-h-[48px] font-medium ${
                    isVotingActive 
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={!isVotingActive}
                  onClick={handleSaveSettings}
                >設定を保存</button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 候補者追加/編集モーダル - モバイル最適化 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-lg sm:rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">
                {editingContestant ? '候補者編集' : '新規候補者追加'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                aria-label="モーダルを閉じる"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveContestant} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  候補者名 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="block w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-orange-500 focus:border-orange-500 min-h-[48px]"
                  placeholder="候補者の名前を入力"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instagram ID（任意）
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-base">@</span>
                  </div>
                  <input
                    type="text"
                    value={formData.instagram_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, instagram_id: e.target.value }))}
                    className="block w-full pl-8 border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-orange-500 focus:border-orange-500 min-h-[48px]"
                    placeholder="username"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  一言
                </label>
                <textarea
                  rows={3}
                  value={formData.comment}
                  onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                  className="block w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-orange-500 focus:border-orange-500 resize-none"
                  placeholder="仮装についての一言を入力"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">最大100文字</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  写真
                </label>
                <div className="mt-1 flex justify-center px-4 sm:px-6 pt-6 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-orange-400 transition-colors touch-manipulation">
                  <div className="space-y-2 text-center w-full">
                    {previewImage ? (
                      <div className="mb-4">
                        <img src={previewImage} alt="プレビュー" className="mx-auto h-40 w-40 sm:h-32 sm:w-32 object-cover rounded-lg" />
                      </div>
                    ) : (
                      <Upload className="mx-auto h-16 w-16 sm:h-12 sm:w-12 text-gray-400" />
                    )}
                    <div className="flex justify-center">
                      <label className="relative cursor-pointer bg-orange-600 hover:bg-orange-700 text-white rounded-md font-medium px-4 py-3 transition-colors min-h-[48px] flex items-center justify-center touch-manipulation">
                        <span className="text-base">{previewImage ? '画像を変更' : '画像をアップロード'}</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="sr-only"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF (最大10MB)</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors min-h-[48px] font-medium touch-manipulation"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full sm:w-auto px-6 py-3 border border-transparent rounded-md text-white transition-colors min-h-[48px] font-medium touch-manipulation ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2 inline-block"></div>
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2 inline" />
                      {editingContestant ? '更新' : '追加'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
    </div>
  );
}
