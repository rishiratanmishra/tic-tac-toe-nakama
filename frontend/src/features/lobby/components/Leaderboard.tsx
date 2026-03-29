import React from 'react';
import { useSelector } from 'react-redux';
import { Typography, Space, Divider, Empty, Statistic, theme, Flex, Card } from 'antd';
import { TrophyOutlined, RiseOutlined } from '@ant-design/icons';
import type { RootState } from '../../../store';

const { Title, Text } = Typography;

export const Leaderboard: React.FC = () => {
  const { leaderboard, currentPlayerStats, leaderboardLoading } = useSelector((state: RootState) => state.lobby);
  const { token } = theme.useToken();

  return (
    <Card 
      bordered={false} 
      style={{ 
        height: '100%', 
        border: `1px solid ${token.colorBorderSecondary}`, 
        background: token.colorBgContainer,
        borderRadius: 24,
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
      }}
      styles={{ body: { padding: '24px' } }}
    >
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <div>
          <Flex align="center" gap={8} style={{ marginBottom: 4 }}>
            <TrophyOutlined style={{ color: token.colorWarning }} />
            <Text strong style={{ fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: token.colorTextDescription }}>
              Global Leaderboard
            </Text>
          </Flex>
          <Title level={4} style={{ margin: 0, fontSize: '1.25rem' }}>Top Competitors</Title>
        </div>

        {/* 👤 User Stats Snapshot */}
        <div style={{ 
          padding: '16px 20px', 
          borderRadius: 20, 
          background: `linear-gradient(135deg, ${token.colorFillTertiary}, ${token.colorBgContainer})`,
          border: `1px solid ${token.colorBorderSecondary}`
        }}>
          <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
             <Text strong style={{ fontSize: '0.85rem' }}>Your Progress</Text>
             <RiseOutlined style={{ color: token.colorPrimary }} />
          </Flex>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <Statistic
              title={<span style={{ fontSize: '0.75rem' }}>Rank</span>}
              value={currentPlayerStats?.rank ? `#${currentPlayerStats.rank}` : '—'}
              valueStyle={{ fontSize: '1.1rem', fontWeight: 700 }}
            />
            <Statistic 
              title={<span style={{ fontSize: '0.75rem' }}>Wins</span>} 
              value={currentPlayerStats?.wins ?? 0} 
              valueStyle={{ fontSize: '1.1rem', fontWeight: 700 }} 
            />
            <Statistic 
              title={<span style={{ fontSize: '0.75rem' }}>Streak</span>} 
              value={currentPlayerStats?.currentWinStreak ?? 0} 
              valueStyle={{ fontSize: '1.1rem', fontWeight: 700 }} 
            />
          </div>
          <Divider style={{ margin: '12px 0', opacity: 0.5 }} />
          <Flex justify="space-between" style={{ fontSize: '0.8rem' }}>
             <Text type="secondary">Best Streak</Text>
             <Text strong>{currentPlayerStats?.bestWinStreak ?? 0}</Text>
          </Flex>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* 🏆 Rank List */}
        {leaderboardLoading ? (
          <Flex vertical gap={12}>
            {[1, 2, 3].map(i => (
               <div key={i} style={{ height: 64, borderRadius: 16, background: token.colorFillQuaternary, opacity: 0.5 }} />
            ))}
          </Flex>
        ) : leaderboard.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No ranked players yet"
            style={{ margin: '20px 0' }}
          />
        ) : (
          <Flex vertical gap={12}>
            {leaderboard.slice(0, 5).map((entry) => (
              <div key={entry.userId} style={{ 
                display: 'grid', 
                gridTemplateColumns: '48px 1fr 40px', 
                gap: 12, 
                alignItems: 'center',
                padding: '12px',
                borderRadius: 18,
                background: token.colorFillAlter,
                border: `1px solid ${token.colorBorderSecondary}`,
                transition: 'all 0.2s ease'
              }}>
                <div style={{ 
                  display: 'grid', 
                  placeItems: 'center', 
                  width: 40, 
                  height: 40, 
                  borderRadius: 12, 
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  color: entry.rank === 1 ? '#fff' : token.colorPrimary,
                  background: entry.rank === 1 ? token.colorWarning : token.colorPrimaryBg,
                  boxShadow: entry.rank === 1 ? '0 4px 12px rgba(250, 173, 20, 0.3)' : 'none'
                }}>
                  {entry.rank}
                </div>
                <div style={{ minWidth: 0 }}>
                  <Text strong ellipsis style={{ display: 'block', fontSize: '0.9rem' }}>{entry.username}</Text>
                  <Text type="secondary" style={{ fontSize: '0.75rem' }}>{entry.wins} wins • {entry.currentWinStreak} streak</Text>
                </div>
                <div style={{ textAlign: 'right' }}>
                   {entry.rank === 1 && <TrophyOutlined style={{ color: token.colorWarning }} />}
                </div>
              </div>
            ))}
          </Flex>
        )}
      </Space>
    </Card>
  );
};
