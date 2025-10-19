import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Home from './pages/Home';
import Contestants from './pages/Contestants';
import Results from './pages/Results';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
// import { useVotingStore } from './store/votingStore';

// 投票締切時のリダイレクト処理
function VotingRedirect({ children }: { children: React.ReactNode }) {
  // ルーティングの前処理を行いたい場合はここに追加
  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <VotingRedirect>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/contestants" element={<Contestants />} />
            <Route path="/results" element={<Results />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route path="/admin/login" element={<AdminLogin />} />
          </Routes>
        </Layout>
      </VotingRedirect>
      <Toaster 
        position="top-right" 
        richColors 
        duration={2000}
        swipeDirections={["right"]}
        closeButton
        expand={false}
        visibleToasts={3}
        offset={8}
        toastOptions={{
          style: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            fontSize: '14px',
            padding: '12px 16px',
            maxWidth: '320px',
            minWidth: '280px'
          },
          className: 'toast-custom'
        }}
      />
    </Router>
  );
}

export default App;
