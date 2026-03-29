import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import type { RootState } from './store';
import { setAuth } from './store/slices/authSlice';
import { updateGameState, handlePresenceUpdate } from './store/slices/gameSlice';
import { useNakama } from './context/NakamaContext';
import { LoginView } from './features/auth/LoginView';
import { LobbyView } from './features/lobby/LobbyView';
import { GameView } from './features/game/GameView';
import { AppShell } from './components/layout/AppShell';
import { Result, Button, Spin, Flex } from 'antd';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { userId } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  if (!userId) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  const dispatch = useDispatch();
  const nakama = useNakama();
  const [initializing, setInitializing] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const restore = async () => {
      try {
        const session = await nakama.restoreSession();
        if (session) {
          const account = await nakama.getAccount();
          const user = account.user!;
          dispatch(setAuth({ 
            username: user.username!, 
            userId: user.id!,
            email: account.email
          }));
          
          // If we are on /login, move to /lobby
          if (location.pathname === '/login' || location.pathname === '/') {
            navigate('/lobby', { replace: true });
          }
        } else {
          setInitializing(false);
          if (location.pathname !== '/login') {
            navigate('/login', { replace: true });
          }
        }
      } catch (err) {
        console.warn('Session restoration skipped:', err);
        setInitializing(false);
        if (location.pathname !== '/login') {
          navigate('/login', { replace: true });
        }
      } finally {
        setInitializing(false);
      }
    };
    restore();
  }, [dispatch, nakama]);

  // 🔥 Global Match Listeners
  useEffect(() => {
    nakama.setMatchStateListener((data) => {
      dispatch(updateGameState(data));
    });

    nakama.setMatchPresenceListener((presence) => {
      const joins = presence.joins?.map((p) => p.user_id) || [];
      const leaves = presence.leaves?.map((p) => p.user_id) || [];
      
      if (joins.length > 0 || leaves.length > 0) {
        dispatch(handlePresenceUpdate({ joins, leaves }));
      }
    });

    return () => {
      nakama.setMatchStateListener(undefined);
      nakama.setMatchPresenceListener(undefined);
    };
  }, [dispatch, nakama]);

  if (initializing) {
    return (
      <Flex align="center" justify="center" style={{ height: '100vh', width: '100vw' }}>
        <Spin size="large" tip="Restoring Session..." />
      </Flex>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<AppShell><LoginView /></AppShell>} />
      
      <Route path="/lobby" element={
        <ProtectedRoute>
          <AppShell><LobbyView /></AppShell>
        </ProtectedRoute>
      } />

      <Route path="/game/:matchId" element={
        <ProtectedRoute>
          <AppShell><GameView /></AppShell>
        </ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to="/lobby" replace />} />

      <Route path="*" element={
        <AppShell>
          <Result
            status="404"
            title="404"
            subTitle="Sorry, the page you visited does not exist."
            extra={<Button type="primary" onClick={() => navigate('/lobby')}>Back to Lobby</Button>}
          />
        </AppShell>
      } />
    </Routes>
  );
};

export const App = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
