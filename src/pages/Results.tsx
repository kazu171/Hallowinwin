import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useVotingStore } from '../store/votingStore';
import ContestantCard from '../components/ContestantCard';
import Container from '../components/Container';
import LoadingSpinner from '../components/LoadingSpinner';
import { useVotedByIpQuery, useVoteCountsQuery, useSubscribeVoteInvalidation, useSubscribeVotingSettingsInvalidation } from '@/hooks/queries';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';

interface ContestantResult {
  id: string;
  name: string;
  description?: string;
  instagram?: string;
  image_url?: string;
  vote_count: number;
  rank: number;
}

export default function Results() {
  const { data, isLoading } = useVoteCountsQuery();
  const { data: votedSet } = useVotedByIpQuery();
  useSubscribeVoteInvalidation();
  // 投票設定変更（reset含む）の反映を即時化
  useSubscribeVotingSettingsInvalidation();
  const { isVotingActive } = useVotingStore();
  // 投票可能条件を緩和 - 投票が有効であれば表示
  const canVote = isVotingActive;

  // 投票済み候補者: 共通フックを使用

  const results: ContestantResult[] = useMemo(() => {
    return (data || []).map((c, index) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? undefined,
      instagram: c.instagram ?? undefined,
      image_url: c.image_url ?? undefined,
      vote_count: c.vote_count,
      rank: index + 1,
    }));
  }, [data]);

  // 投票処理はContestantCard側に実装

  // 初回データ取得と投票ストア初期化
  useEffect(() => {
    // 投票ストアのリアルタイム同期を初期化
    const { initializeRealtimeSync, syncWithDatabase } = useVotingStore.getState();
    initializeRealtimeSync();
    syncWithDatabase();

    // クリーンアップ
    return () => {
      const { cleanup } = useVotingStore.getState();
      cleanup();
    };
  }, []);

  // ランキングアイコンを取得
  // ランキングアイコン関数は未使用のため削除

  // 候補者をランダムにシャッフル（トップ5以外）
  const shuffleArray = (array: ContestantResult[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const topFive = results.slice(0, 5);
  const others = shuffleArray(results.slice(5));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="読み込み中..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-3 sm:py-4 md:py-6">
      <Container>
        {/* シンプルなヘッダー */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
            🏆 リアルタイムランキング
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-2">
            投票結果をリアルタイムで更新中！
          </p>
        </div>

        {/* トップ5の縦長表示 */}
        <div className="mb-6 sm:mb-8 md:mb-12">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6 text-center">🥇 現在の順位 TOP5</h2>
          
          {/* シンプルなグリッドレイアウト */}
          <div className="max-w-6xl mx-auto">
            {/* 上段: 2位、1位、3位 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 items-end">
              {/* 2位 */}
              <div className="order-2 md:order-1">
                {topFive[1] && (
                  <ContestantCard
                    contestant={{
                      id: topFive[1].id,
                      name: topFive[1].name,
                      description: topFive[1].description,
                      instagram: topFive[1].instagram,
                      image_url: topFive[1].image_url,
                      vote_count: topFive[1].vote_count
                    }}
                    rank={2}
                    size="small"
                    showVoteButton={canVote}
                    hasVoted={Boolean(votedSet?.has(topFive[1].id))}
                    onVoteSuccess={() => {}}
                  />
                )}
              </div>

              {/* 1位 - 中央で大きく */}
              <div className="order-1 md:order-2">
                {topFive[0] && (
                  <div className="transform md:scale-105">
                    <ContestantCard
                      contestant={{
                        id: topFive[0].id,
                        name: topFive[0].name,
                        description: topFive[0].description,
                        instagram: topFive[0].instagram,
                        image_url: topFive[0].image_url,
                        vote_count: topFive[0].vote_count
                      }}
                      rank={1}
                      size="medium"
                      showVoteButton={canVote}
                      hasVoted={Boolean(votedSet?.has(topFive[0].id))}
                      onVoteSuccess={() => {}}
                    />
                   </div>
                 )}
               </div>

               {/* 3位 */}
              <div className="order-3">
                {topFive[2] && (
                  <ContestantCard
                    contestant={{
                      id: topFive[2].id,
                      name: topFive[2].name,
                      description: topFive[2].description,
                      instagram: topFive[2].instagram,
                      image_url: topFive[2].image_url,
                      vote_count: topFive[2].vote_count
                    }}
                    rank={3}
                    size="medium"
                    showVoteButton={canVote}
                    hasVoted={Boolean(votedSet?.has(topFive[2].id))}
                    onVoteSuccess={() => {}}
                  />
                )}
              </div>
            </div>

            {/* 下段: 4位、5位 */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
              {/* 4位 */}
              <div>
                {topFive[3] && (
                  <ContestantCard
                    contestant={{
                      id: topFive[3].id,
                      name: topFive[3].name,
                      description: topFive[3].description,
                      instagram: topFive[3].instagram,
                      image_url: topFive[3].image_url,
                      vote_count: topFive[3].vote_count
                    }}
                    rank={4}
                    size="small"
                    showVoteButton={canVote}
                    hasVoted={Boolean(votedSet?.has(topFive[3].id))}
                    onVoteSuccess={() => {}}
                  />
                )}
              </div>

              {/* 5位 */}
              <div>
                {topFive[4] && (
                  <ContestantCard
                    contestant={{
                      id: topFive[4].id,
                      name: topFive[4].name,
                      description: topFive[4].description,
                      instagram: topFive[4].instagram,
                      image_url: topFive[4].image_url,
                      vote_count: topFive[4].vote_count
                    }}
                    rank={5}
                    size="small"
                    showVoteButton={canVote}
                    hasVoted={Boolean(votedSet?.has(topFive[4].id))}
                    onVoteSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: queryKeys.voteCounts() });
                      queryClient.invalidateQueries({ queryKey: queryKeys.votedByIp(null) });
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* その他の候補者 - グリッド表示 */}
        {others.length > 0 && (
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6 text-center">
              📊 全候補者ランキング
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
              {others.map((contestant) => (
                <ContestantCard
                  key={contestant.id}
                  contestant={{
                    id: contestant.id,
                    name: contestant.name,
                    description: contestant.description,
                    instagram: contestant.instagram,
                    image_url: contestant.image_url,
                    vote_count: contestant.vote_count
                  }}
                  rank={contestant.rank}
                  size="small"
                  showVoteButton={canVote}
                  hasVoted={Boolean(votedSet?.has(contestant.id))}
                  onVoteSuccess={() => {}}
                />
              ))}
            </div>
          </div>
        )}

        {/* 投票状況 */}
        {canVote && (
          <div className="mt-8 sm:mt-12 md:mt-16 text-center">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                🔥 リアルタイム投票中！
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                投票するとランキングがリアルタイムで更新されます！
              </p>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
