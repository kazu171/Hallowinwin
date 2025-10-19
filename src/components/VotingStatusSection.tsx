import React from 'react';
import { Calculator, Play, Settings } from 'lucide-react';

interface VotingStatusSectionProps {
  isVotingActive: boolean;
  isFinalizingResults: boolean;
  onFinalizeVoting: () => void;
  onRestartVoting: () => void;
  onResetVoting: () => void;
}

/**
 * 投票状況表示セクション
 * 投票の現在状態、締切機能、管理機能を統合したコンポーネント
 */
const VotingStatusSection: React.FC<VotingStatusSectionProps> = ({
  isVotingActive,
  isFinalizingResults,
  onFinalizeVoting,
  onRestartVoting,
  onResetVoting,
}) => {
  // 投票状況のスタイル設定
  const statusStyles = isVotingActive
    ? 'bg-green-100 text-green-800'
    : 'bg-red-100 text-red-800';

  const statusText = isVotingActive ? '進行中' : '終了';
  const statusDescription = isVotingActive
    ? '投票は現在進行中です'
    : '投票は終了しています';

  // 締切ボタンのスタイル設定
  const finalizeButtonStyles = isFinalizingResults
    ? 'bg-gray-400 cursor-not-allowed'
    : 'bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500';

  // 管理機能の説明文（UI内では未使用）

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6">
      <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 md:mb-6">投票状況</h2>
      
      {/* 投票状況表示 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4 md:mb-6">
        <div className="order-2 sm:order-1">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">{statusText}</h3>
          <p className="text-xs sm:text-sm text-gray-600">{statusDescription}</p>
        </div>
        <div className={`order-1 sm:order-2 px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-full text-xs sm:text-sm font-semibold w-max` + ' ' + statusStyles}>
          {statusText}
        </div>
      </div>

      {/* 管理ボタン */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
        {/* 投票締切ボタン（投票中のみ表示） */}
        {isVotingActive && (
          <button
            type="button"
            onClick={onFinalizeVoting}
            disabled={isFinalizingResults}
            className={`inline-flex items-center px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md text-white transition-colors w-full sm:w-auto justify-center min-h-[44px] touch-manipulation ${finalizeButtonStyles}`}
          >
            {isFinalizingResults ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent mr-2" />
                集計中...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                投票締切・結果確定
              </>
            )}
          </button>
        )}

        {/* 投票再開ボタン（投票終了時のみ表示） */}
        {!isVotingActive && (
          <button
            type="button"
            onClick={onRestartVoting}
            className="inline-flex items-center px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-500 transition-colors w-full sm:w-auto justify-center min-h-[44px] touch-manipulation"
          >
            <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            投票を再開
          </button>
        )}

        {/* 投票リセットボタン（常に表示） */}
        <button
          type="button"
          onClick={onResetVoting}
          className="inline-flex items-center px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors w-full sm:w-auto justify-center min-h-[44px] touch-manipulation"
        >
          <Settings className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          投票状態をリセット
        </button>
      </div>


    </div>
  );
};

export default VotingStatusSection;
