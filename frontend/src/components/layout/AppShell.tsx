import React from 'react';
import type { ReactNode } from 'react';
import { Layout, Card, theme } from 'antd';
import { useLocation } from 'react-router-dom';

const { Content } = Layout;

interface AppShellProps {
  children: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { token } = theme.useToken();
  const location = useLocation();
  
  // Determine view from URL
  const isLogin = location.pathname === '/login';
  const isGame = location.pathname.startsWith('/game');
  const viewClass = isLogin ? 'login' : (isGame ? 'game' : 'lobby');

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', background: 'transparent' }}>
      <div className="ambient ambient-top" />
      <div className="ambient ambient-bottom" />
      
      <Content style={{ 
        padding: isLogin ? '12px 16px' : 'clamp(14px, 4vw, 24px)', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: (isGame || !isLogin) ? 'flex-start' : 'center',
        overflow: 'auto',
        background: 'transparent'
      }}>
        <Card 
          bordered={false} 
          className={`shell-card shell-card-${viewClass}`}
          style={{ 
            width: '100%', 
            maxWidth: isLogin ? 520 : 1280,
            borderRadius: 32,
            overflow: 'hidden',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(246, 250, 255, 0.94))',
            border: `1px solid ${token.colorBorderSecondary}`,
            boxShadow: '0 28px 70px rgba(107, 139, 191, 0.18)'
          }}
          styles={{ body: { padding: 'clamp(20px, 3vw, 34px)' } }}
        >
          {children}
        </Card>
      </Content>
    </Layout>
  );
};
