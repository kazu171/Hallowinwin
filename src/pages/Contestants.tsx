import { useEffect, useMemo } from 'react';
import { Users } from 'lucide-react';
import { useVotingStore } from '../store/votingStore';
import ContestantCard from '../components/ContestantCard';
import Container from '../components/Container';
import LoadingSpinner from '../components/LoadingSpinner';
import { useVotedByIpQuery, useVoteCountsQuery, useSubscribeVoteInvalidation, useSubscribeVotingSettingsInvalidation, useActiveContestantsQuery } from '@/hooks/queries';

export default function Contestants() {
  const { isVotingActive } = useVotingStore();
  const { data: voteCounts, isLoading: isLoadingCounts } = useVoteCountsQuery();
  const { data: activeContestants, isLoading: isLoadingContestants } = useActiveContestantsQuery();
  const { data: votedSet } = useVotedByIpQuery();
  useSubscribeVoteInvalidation();
  // 投票設定変更（reset含む）の反映を即時化
  useSubscribeVotingSettingsInvalidation();
  
  // 投票可能かどうかの判定
  const canVote = isVotingActive;

  useEffect(() => {
    // Ensure store sync remains
    useVotingStore.getState().syncWithDatabase();
  }, []);

  const handleVoteSuccess = () => {
    // 楽観的更新により即座にUIが更新されるため、ここでは何もしない
  };

  // 票数マップ（id -> vote_count）
  const voteCountMap = useMemo(() => {
    const m = new Map<string, number>();
    (voteCounts || []).forEach((c) => {
      if (c.id) m.set(c.id, c.vote_count ?? 0);
    });
    return m;
  }, [voteCounts]);

  // 安定乱数シード: 候補者集合から決定的に生成（投票で変わらない）
  const computeSeedFromIds = (ids: string[]) => {
    // FNV-1a 32bit
    let hash = 0x811c9dc5;
    for (let i = 0; i < ids.length; i++) {
      const s = ids[i];
      for (let j = 0; j < s.length; j++) {
        hash ^= s.charCodeAt(j);
        hash = Math.imul(hash, 0x01000193) >>> 0;
      }
    }
    return hash >>> 0; // uint32
  };

  // 上位5名: 新規登録（created_at 降順）固定表示 + 残りは完全ランダム（ただしセッション内で安定）
  const orderedContestants = useMemo(() => {
    const list = (activeContestants || []).slice();
    if (list.length === 0) return [] as Array<{
      id: string;
      name: string;
      description: string | null;
      instagram: string | null;
      image_url: string | null;
      vote_count: number;
    }>;

    // created_at 降順で新規5名
    const byNewest = list
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const top5Ids = byNewest.slice(0, 5).map((c) => c.id);

    // 残りのID
    const restIds = list.filter((c) => !top5Ids.includes(c.id)).map((c) => c.id);

    // 乱数ジェネレータ（Mulberry32, 安定seed）
    const mulberry32 = (seedUint32: number) => {
      let t = seedUint32 >>> 0;
      return function () {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
      };
    };

    // Fisher-Yates シャッフル（セッション固定シード）
    const seed = computeSeedFromIds(restIds.slice().sort());
    const rng = mulberry32(seed);
    const shuffled = restIds.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const orderedIds = [...top5Ids, ...shuffled];

    // ID順で最終的なデータを構築（vote_count を合流）
    const byId = new Map(list.map((c) => [c.id, c]));
    return orderedIds.map((id) => {
      const base = byId.get(id)!;
      return {
        id: base.id,
        name: base.name,
        description: base.description,
        instagram: base.instagram,
        image_url: base.image_url,
        vote_count: voteCountMap.get(base.id) ?? 0,
      };
    });
  }, [activeContestants, voteCountMap]);

  const isLoading = isLoadingCounts || isLoadingContestants;

  return (
    <div className="min-h-screen py-3 sm:py-4">
      <Container>
        {/* シンプルなヘッダー */}
        <div className="text-center mb-4 sm:mb-6">
          <p className="text-sm sm:text-base text-gray-600">
            {canVote ? 'お気に入りの仮装にハートを送ろう！' : '投票結果'}
          </p>
        </div>



        {/* ローディング表示 */}
        {isLoading ? (
          <LoadingSpinner size="md" message="読み込み中..." />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
              {orderedContestants.map((contestant) => (
              <ContestantCard
                key={contestant.id}
                contestant={{
                  id: contestant.id,
                  name: contestant.name,
                  description: contestant.description,
                  instagram: contestant.instagram,
                  image_url: contestant.image_url,
                  vote_count: contestant.vote_count,
                }}
                onVoteSuccess={handleVoteSuccess}
                showVoteButton={canVote}
                hasVoted={Boolean(votedSet?.has(contestant.id))}
                size="small"
              />
            ))}
            </div>

            {/* 結果が空の場合 */}
            {(orderedContestants.length || 0) === 0 && (
              <div className="text-center py-8 sm:py-12">
                <div className="text-gray-400 mb-3 sm:mb-4">
                  <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-600 mb-2">
                  候補者が登録されていません
                </h3>
              </div>
            )}
          </>
        )}
      </Container>
    </div>
  );
}
