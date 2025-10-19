import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, Trophy, Settings } from 'lucide-react';
import WinWinLogo from './WinWinLogo';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = [
    { name: '候補者一覧', href: '/contestants', icon: Users },
    { name: 'ランキング', href: '/results', icon: Trophy },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // ルートが変わったらモバイルメニューを自動で閉じる
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-purple-50 to-orange-100 overflow-x-hidden">
      {/* ナビゲーションバー */}
      <nav className="bg-gradient-to-r from-orange-600 via-purple-600 to-orange-600 shadow-lg sticky top-0 z-50 backdrop-blur-sm/">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between h-12 sm:h-14">
            {/* ロゴ */}
            <div className="flex items-center bg-transparent">
              <Link to="/" className="flex items-center space-x-1 sm:space-x-2 text-white hover:text-yellow-300 transition-colors">
                <WinWinLogo size="sm" className="sm:h-7 sm:w-7 drop-shadow-md" />
                <span className="text-base sm:text-lg font-bold truncate">ハロウィン仮装大会</span>
              </Link>
            </div>

            {/* ナビゲーションメニュー */}
            <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
                      isActive(item.href)
                        ? 'bg-white/20 text-yellow-300'
                        : 'text-white hover:text-yellow-300 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              
              {/* 管理者リンク */}
              <Link
                to="/admin"
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-white/20 text-yellow-300'
                    : 'text-white hover:text-yellow-300 hover:bg-white/10'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>管理者</span>
              </Link>
            </div>

            {/* モバイルメニューボタン */}
            <div className="md:hidden flex items-center">
              <button
                aria-label="メニュー"
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
                onClick={() => setMobileOpen((v) => !v)}
                className="text-white hover:text-yellow-300 p-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-300 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* モバイルメニュー */}
        <div
          id="mobile-nav"
          className={`md:hidden bg-black/30 backdrop-blur-sm transition-[max-height] duration-300 overflow-hidden ${
            mobileOpen ? 'max-h-80' : 'max-h-0'
          }`}
        >
          <div className="px-2 pt-1 pb-2 space-y-0.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
                    isActive(item.href)
                      ? 'bg-white/20 text-yellow-300'
                      : 'text-white hover:text-yellow-300 hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <Link
              to="/admin"
              className={`flex items-center space-x-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
                location.pathname.startsWith('/admin')
                  ? 'bg-white/20 text-yellow-300'
                  : 'text-white hover:text-yellow-300 hover:bg-white/10'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>管理者</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main className="flex-1">
        {children}
      </main>

      {/* フッター */}
      <footer className="bg-gray-900 text-white py-8 mt-10 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4 bg-transparent">
              <WinWinLogo size="sm" className="h-6 w-6 drop-shadow-sm" />
              <span className="text-lg font-semibold">ハロウィン仮装大会 2024</span>
            </div>
            <p className="text-gray-400 text-sm">
              300人規模のハロウィンイベント - 最高の仮装を決めよう！
            </p>
            <div className="mt-4 flex flex-col sm:flex-row justify-center gap-1 sm:space-x-6 text-sm text-gray-400">
              <span>🎃 投票期間: 10月31日 18:00 - 22:00</span>
              <span>👻 結果発表: 10月31日 22:30</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
