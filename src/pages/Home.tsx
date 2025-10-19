import { Link } from 'react-router-dom';
import { Users, Trophy, Calendar, Clock } from 'lucide-react';
import { useMemo } from 'react';
import { useVoteCountsQuery, useSubscribeVoteInvalidation } from '@/hooks/queries';
import ContestantCard from '../components/ContestantCard';
import WinWinLogo from '../components/WinWinLogo';

export default function Home() {
  const { data, isLoading } = useVoteCountsQuery();
  useSubscribeVoteInvalidation();

  const contestantCount = data?.length ?? 0;
  const featuredContestants = useMemo(() => (data || []).slice(0, 3), [data]);

  return (
    <div className="min-h-screen">
      {/* ヒーローセクション */}
      <section className="relative bg-gradient-to-r from-orange-600 via-purple-600 to-orange-600 text-white py-6 sm:py-8 md:py-12">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-3 sm:mb-4 bg-transparent">
            <WinWinLogo size="lg" className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 animate-bounce drop-shadow-lg" />
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 md:mb-4">
            🎃 ハロウィン仮装大会 2025 🎃
          </h1>
          <p className="text-sm sm:text-base md:text-lg mb-3 sm:mb-4 md:mb-6 max-w-3xl mx-auto px-2">
            最高の仮装を決めよう！みんなで投票しよう！
          </p>
          
          {/* イベント情報 */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6 md:mb-8 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 sm:p-3 md:p-4">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-yellow-300 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold mb-1 text-xs sm:text-sm md:text-base">開催日</h3>
              <p className="text-xs sm:text-sm md:text-base">10/31</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 sm:p-3 md:p-4">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-yellow-300 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold mb-1 text-xs sm:text-sm md:text-base">投票時間</h3>
              <p className="text-xs sm:text-sm md:text-base">18-22時</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 sm:p-3 md:p-4">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-yellow-300 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold mb-1 text-xs sm:text-sm md:text-base">候補者数</h3>
              <p className="text-xs sm:text-sm md:text-base">{contestantCount}名</p>
            </div>
          </div>

          <div className="flex flex-row items-center justify-center gap-2 sm:gap-3">
            <Link
              to="/contestants"
              className="inline-flex items-center bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-3 sm:py-3 sm:px-6 rounded-lg transition-colors shadow-lg flex-1 sm:flex-none justify-center min-h-[44px] sm:min-h-[48px] text-sm sm:text-base"
            >
              <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              候補者一覧
            </Link>
            <Link
              to="/results"
              className="inline-flex items-center bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-3 sm:py-3 sm:px-6 rounded-lg transition-colors backdrop-blur-sm flex-1 sm:flex-none justify-center min-h-[44px] sm:min-h-[48px] text-sm sm:text-base"
            >
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              ランキング
            </Link>
          </div>
        </div>
      </section>

      {/* 投票案内セクション */}
      <section className="py-6 sm:py-8 md:py-12 bg-white">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2">かぼちゃハートを灯していいねを送ろう</h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-1 sm:px-2">気に入った仮装を見つけていいねを送ろう。かぼちゃランプが灯り、みんなの応援が届きます。</p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-6 md:gap-8">
            <div className="text-center px-1 sm:px-0">
              <div className="bg-orange-100 rounded-full w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-1 sm:mb-3">
                <span className="text-sm sm:text-lg md:text-xl lg:text-2xl" role="img" aria-label="pumpkin">🎃</span>
              </div>
              <h3 className="text-xs sm:text-base md:text-lg font-semibold mb-0 sm:mb-2">見つける</h3>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">小さな工夫や世界観に、心がふわっと。</p>
            </div>
            <div className="text-center px-1 sm:px-0">
              <div className="bg-purple-100 rounded-full w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-1 sm:mb-3">
                <span className="text-sm sm:text-lg md:text-xl lg:text-2xl" role="img" aria-label="heart">🧡</span>
              </div>
              <h3 className="text-xs sm:text-base md:text-lg font-semibold mb-0 sm:mb-2">灯して応援</h3>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">ハート=かぼちゃランプ。あなたのひと灯りが力になります。</p>
            </div>
            <div className="text-center px-1 sm:px-0">
              <div className="bg-yellow-100 rounded-full w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-1 sm:mb-3">
                <span className="text-sm sm:text-lg md:text-xl lg:text-2xl" role="img" aria-label="camera">📸</span>
              </div>
              <h3 className="text-xs sm:text-base md:text-lg font-semibold mb-0 sm:mb-2">会場でつながる</h3>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">「写真撮ってもらえますか？」のひと声で、笑顔の一枚を。</p>
            </div>
          </div>
        </div>
      </section>

      {/* 注目候補者プレビュー */}
      <section className="py-6 sm:py-8 md:py-12 bg-gradient-to-br from-orange-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2">注目の候補者</h2>
            <p className="text-sm sm:text-base text-gray-600">
              現在上位の候補者をチェック！
            </p>
          </div>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">候補者データを読み込み中...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {featuredContestants.map((contestant, index) => (
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
                  rank={index + 1}
                  size="small"
                  showVoteButton={false}
                  hasVoted={false}
                />
              ))}
            </div>
          )}
          
          <div className="text-center mt-4 sm:mt-6 md:mt-8">
            <Link
              to="/contestants"
              className="inline-flex items-center bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 sm:px-8 rounded-lg transition-colors w-full sm:w-auto justify-center min-h-[48px]"
            >
              <Users className="h-5 w-5 mr-2" />
              全候補者
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
