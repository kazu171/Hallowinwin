import React from 'react';
import { AlertTriangle, Play, Settings } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  type: 'danger' | 'success' | 'info';
  isLoading?: boolean;
  loadingText?: string;
}

/**
 * 汎用確認モーダルコンポーネント
 * 投票管理の各種確認ダイアログで使用
 */
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = 'キャンセル',
  type,
  isLoading = false,
  loadingText = '処理中...',
}) => {
  if (!isOpen) return null;

  // タイプ別のスタイル設定
  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />,
          buttonClass: isLoading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-red-600 hover:bg-red-700',
          messageClass: 'text-red-600',
        };
      case 'success':
        return {
          icon: <Play className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />,
          buttonClass: 'bg-green-600 hover:bg-green-700',
          messageClass: 'text-green-600',
        };
      case 'info':
        return {
          icon: <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />,
          buttonClass: 'bg-blue-600 hover:bg-blue-700',
          messageClass: 'text-blue-600',
        };
      default:
        return {
          icon: <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />,
          buttonClass: 'bg-gray-600 hover:bg-gray-700',
          messageClass: 'text-gray-600',
        };
    }
  };

  const { icon, buttonClass, messageClass } = getTypeStyles();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-3 md:p-4 z-50">
      <div className="bg-white rounded-lg max-w-xs sm:max-w-sm md:max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-3 sm:p-4 md:p-6">
          {/* ヘッダー */}
          <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
            <div className="flex-shrink-0">{icon}</div>
            <div>
              <h3 className="text-sm sm:text-base md:text-lg font-medium text-gray-900">{title}</h3>
            </div>
          </div>

          {/* メッセージ */}
          <div className="mb-4 sm:mb-5 md:mb-6">
            <p className={`text-xs sm:text-sm leading-relaxed ${messageClass || 'text-gray-600'}`}>{message}</p>
          </div>

          {/* アクションボタン */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-0 sm:space-x-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-md text-xs sm:text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto min-h-[44px]"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 border border-transparent rounded-md text-xs sm:text-sm text-white transition-colors w-full sm:w-auto min-h-[44px] ${buttonClass}`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent mr-2 inline-block" />
                  {loadingText}
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
