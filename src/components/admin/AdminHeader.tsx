import React from 'react';
import { LogOut } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  badge?: string;
  onLogout: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ title, badge, onLogout }) => {
  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {badge && (
              <span className="bg-orange-100 text-orange-800 text-sm px-2 py-1 rounded-full">
                {badge}
              </span>
            )}
          </div>
          <button
            onClick={onLogout}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>ログアウト</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminHeader;

