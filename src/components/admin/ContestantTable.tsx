import React from 'react';
import type { Database } from '../../types/database';
import { Edit, Plus, Trash2 } from 'lucide-react';
import ImageWithFallback from '../ImageWithFallback';
import { useImageUrl } from '@/hooks/useImageUrl';

type ContestantWithVotes = Database['public']['Views']['vote_counts']['Row'];

interface ContestantTableProps {
  contestants: ContestantWithVotes[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (c: ContestantWithVotes) => void;
  onDelete: (id: string, name: string) => void;
}

const Avatar: React.FC<{ url?: string | null; alt: string }> = ({ url, alt }) => {
  const img = useImageUrl(url);
  return (
    <ImageWithFallback
      className="h-10 w-10 rounded-full object-cover"
      src={img || '/placeholder-image.svg'}
      alt={alt}
      fallbackSrc={'/placeholder-image.svg'}
    />
  );
};

const ContestantTable: React.FC<ContestantTableProps> = ({ contestants, loading, onAdd, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">候補者一覧</h2>
        <button
          onClick={onAdd}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          新規追加
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">候補者データを読み込み中...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">候補者</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">投票数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contestants.map((contestant) => (
                <tr key={contestant.id || ''} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <Avatar url={contestant.image_url} alt={contestant.name || '候補者'} />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{contestant.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{contestant.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{contestant.vote_count || 0}</span>
                      <span className="text-sm text-gray-500 ml-1">票</span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => contestant.id && onEdit(contestant)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        <Edit className="h-4 w-4 mr-1" />編集
                      </button>
                      {contestant.id && (
                        <button
                          onClick={() => onDelete(contestant.id as string, contestant.name || '')}
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />削除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ContestantTable;
