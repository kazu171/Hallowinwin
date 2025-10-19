import React from 'react';
import { Users, BarChart3, Trophy, Eye } from 'lucide-react';
import type { Database } from '../../types/database';

type ContestantWithVotes = Database['public']['Views']['vote_counts']['Row'];

interface AdminStatsProps {
  contestants: ContestantWithVotes[];
  isVotingActive: boolean;
}

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; iconClass: string }>
  = ({ icon, label, value, iconClass }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={iconClass}>{icon}</div>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

const AdminStats: React.FC<AdminStatsProps> = ({ contestants, isVotingActive }) => {
  const totalVotes = contestants.reduce((sum, c) => sum + (c.vote_count || 0), 0);
  const topName = contestants.length > 0 ? contestants[0]?.name || '-' : '-';

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <StatCard icon={<Users className="h-8 w-8" />} label="総候補者数" value={contestants.length} iconClass="text-blue-600" />
      <StatCard icon={<BarChart3 className="h-8 w-8" />} label="総投票数" value={totalVotes} iconClass="text-green-600" />
      <StatCard icon={<Trophy className="h-8 w-8" />} label="トップ候補者" value={topName} iconClass="text-purple-600" />
      <StatCard icon={<Eye className="h-8 w-8" />} label="投票状況" value={isVotingActive ? '進行中' : '終了'} iconClass="text-orange-600" />
    </div>
  );
};

export default AdminStats;

