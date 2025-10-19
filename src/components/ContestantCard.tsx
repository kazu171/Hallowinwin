import { memo, useMemo, useState } from 'react';
import { voteForContestant } from '../lib/supabase';
import { useVotingStore } from '../store/votingStore';
import ImageWithFallback from './ImageWithFallback';
import { useImageUrl } from '@/hooks/useImageUrl';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { useIpEligibilityQuery } from '@/hooks/queries';

interface ContestantCardProps {
  contestant: {
    id: string;
    name: string;
    description?: string | null;
    instagram?: string | null;
    image_url?: string | null;
    vote_count: number;
  };
  rank?: number;
  size?: 'small' | 'medium' | 'large';
  onVoteSuccess?: (contestantId?: string) => void;
  showVoteButton?: boolean;
  hasVoted?: boolean;
}

function ContestantCard({
  contestant,
  rank,
  size = 'medium',
  onVoteSuccess,
  showVoteButton = true,
  hasVoted = false
}: ContestantCardProps) {
  const [isVoting, setIsVoting] = useState(false);
  const { isVotingActive } = useVotingStore();
  const { data: ipElig, isLoading: ipEligLoading, isFetching: ipEligFetching } = useIpEligibilityQuery();
  const ipChecking = ipEligLoading || ipEligFetching;

  const notAllowed = useMemo(() => {
    // ボタンを非活性にする条件: 既にこの候補へ投票済み or IPが非許可/上限到達
    if (ipChecking) return true; // フェッチ中は一時的に押下不可にして誤タップ回避
    if (hasVoted) return true;
    if (ipElig && !ipElig.eligible) return true;
    return false;
  }, [hasVoted, ipElig, ipChecking]);

  const tooltip = useMemo(() => {
    if (ipChecking) return '判定中...';
    if (hasVoted) return 'この候補者には既に投票済みです';
    if (ipElig && !ipElig.eligible) return ipElig.reason || 'このIPからは投票できません';
    return undefined;
  }, [hasVoted, ipElig, ipChecking]);

  const buttonText = useMemo(() => {
    if (isVoting) return '投票中...';
    if (ipChecking) return '判定中...';
    if (hasVoted) return '投票済み';
    if (ipElig && !ipElig.eligible) return '投票不可';
    return 'いいね';
  }, [isVoting, ipChecking, hasVoted, ipElig]);

  // 有効/不可で使用するボタン画像（public 配下の PNG を想定）
  const voteIconSrc = notAllowed ? '/pumpkin-disabled.png' : '/pumpkin-vote.png';

  const handleVote = async () => {
    if (!isVotingActive || isVoting || notAllowed) return;

    setIsVoting(true);
    // 楽観的更新: 即座にUIを更新
    onVoteSuccess?.(contestant.id);

    try {
      await voteForContestant(contestant.id);
      toast.success('✓ 投票完了');
      // 成功時のみバックグラウンドでデータを同期
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.voteCounts() });
        queryClient.invalidateQueries({ queryKey: queryKeys.votedByIp(null) });
        queryClient.invalidateQueries({ queryKey: queryKeys.ipEligibility(null) });
      }, 100);
    } catch (error: any) {
      // DBの一意制約により同一期間内の重複はduplicate_voteで通知
      if (error?.message === 'duplicate_vote') {
        toast.info('この候補者には既に投票済みです');
      } else {
        console.error('投票処理エラー:', error);
        toast.error('投票に失敗しました');
      }
      // 失敗時は楽観的更新を取り消すため、データを再取得
      queryClient.invalidateQueries({ queryKey: queryKeys.voteCounts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.votedByIp(null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ipEligibility(null) });
    } finally {
      setIsVoting(false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'w-full max-w-sm',
          image: 'h-64 sm:h-72',
          text: 'text-sm',
          button: 'text-sm px-4 py-3',
          badge: 'w-8 h-8 text-xs',
          voteCount: 'text-xs px-2 py-1'
        };
      case 'large':
        return {
          container: 'w-full max-w-lg',
          image: 'h-80 md:h-96',
          text: 'text-lg',
          button: 'text-base px-5 py-3',
          badge: 'w-10 h-10 text-base',
          voteCount: 'text-sm px-3 py-1.5'
        };
      default: // medium
        return {
          container: 'w-full max-w-sm',
          image: 'h-72 sm:h-80',
          text: 'text-base',
          button: 'text-sm px-4 py-3',
          badge: 'w-9 h-9 text-sm',
          voteCount: 'text-xs px-2 py-1'
        };
    }
  };

  const classes = getSizeClasses();
  const resolvedImage = useImageUrl(contestant.image_url);

  return (
    <div className={`${classes.container} mx-auto`}>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 relative">
        {/* 画像 */}
        <div className={`relative ${classes.image} overflow-hidden bg-gray-100`}>
          <ImageWithFallback
            src={resolvedImage || '/placeholder-image.svg'}
            alt={contestant.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          
          {/* Instagramボタン（左上） */}
          {contestant.instagram && (
            <a
              href={`https://instagram.com/${contestant.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`absolute top-2 left-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full ${classes.badge} flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200 z-10`}
            >
              <svg className="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
          )}
          
          {/* ランキングバッジ */}
          {rank && (
            <div className={`absolute ${contestant.instagram ? 'top-14 sm:top-12' : 'top-2'} left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full ${classes.badge} flex items-center justify-center font-bold ${classes.text} shadow-lg z-10`}>
              {rank}
            </div>
          )}
          
          {/* 投票数表示（右上） */}
          <div className={`absolute top-2 right-2 bg-black/60 text-white ${classes.voteCount} rounded-full font-semibold flex items-center gap-1 shadow-lg backdrop-blur-sm z-10`} title="投票数">
          <ImageWithFallback
          src="/pumpkin-disabled.png"
          fallbackSrc="/placeholder-image.svg"
          alt="投票数アイコン"
          className="w-4 h-4 sm:w-5 sm:h-5 object-contain"
          loading="eager"
          decoding="async"
          />
          {contestant.vote_count}
          </div>
          
          {/* 投票ボタン（右下） */}
          {showVoteButton && isVotingActive && (
            <button
              type="button"
              onClick={handleVote}
              disabled={isVoting || notAllowed}
              title={tooltip}
              aria-label="投票"
              aria-busy={isVoting || ipChecking}
              className={`absolute sm:bottom-2 bottom-1 sm:right-2 right-1 rounded-full p-0 shadow-lg z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 transition-transform duration-200 ${notAllowed ? 'opacity-85 cursor-not-allowed' : 'hover:scale-105 active:scale-95'} ${isVoting ? 'animate-pulse' : ''}`}
              style={{ touchAction: 'manipulation' }}
            >
              <ImageWithFallback
                src={voteIconSrc}
                fallbackSrc="/placeholder-image.svg"
                alt="投票"
                className="w-16 h-16 sm:w-20 sm:h-20 aspect-square object-contain pointer-events-none select-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]"
                loading="eager"
                decoding="async"
              />
              <span className="sr-only">{buttonText}</span>
            </button>
          )}
        </div>

        {/* テキストコンテンツ */}
        <div className="p-2 sm:p-3">
          <h3 className={`font-bold text-gray-800 mb-1 ${classes.text} leading-tight`}>
            {contestant.name}
          </h3>
          {contestant.description && (
            <p className="text-gray-600 text-xs sm:text-sm line-clamp-2 leading-tight">
              {contestant.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
export default memo(ContestantCard);
