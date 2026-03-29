import React from 'react';
import { Card, Flex, Tag, Typography, theme, Space } from 'antd';
import { useSelector } from 'react-redux';
import { ClockCircleOutlined } from '@ant-design/icons';
import type { RootState } from '../../../store';

const { Text } = Typography;

interface PlayerCardProps {
  mark: string;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ mark }) => {
  const g = useSelector((state: RootState) => state.game);
  const myUserId = useSelector((state: RootState) => state.auth.userId) ?? '';
  
  const { marks, players, activePlayers, turn, winner, matchMode, turnDeadlineAt } = g;
  const waitingForOpponent = activePlayers.length < 2 || Object.keys(marks).length < 2;
  const { token } = theme.useToken();
  const [clockNow, setClockNow] = React.useState(Date.now());

  React.useEffect(() => {
    if (matchMode !== 'timed' || !turnDeadlineAt || winner || waitingForOpponent) return;
    const interval = setInterval(() => setClockNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [matchMode, turnDeadlineAt, winner, waitingForOpponent]);

  const playerEntry = Object.entries(marks).find(([, assignedMark]) => assignedMark === mark);
  const playerId = playerEntry ? playerEntry[0] : null;
  const name = playerId ? (players[playerId] ?? `Player ${mark}`) : 'Waiting...';
  const connected = playerId ? activePlayers.includes(playerId) : false;
  const isMe = playerId?.toLowerCase() === myUserId.toLowerCase();
  
  // 🔥 Visual state for whose turn it is
  const isCurrentTurn = turn && playerId && turn.toLowerCase() === playerId.toLowerCase() && !winner;

  const getTimerText = () => {
    if (matchMode !== 'timed') return 'Classic mode';
    if (!connected || waitingForOpponent || !turn || !turnDeadlineAt || winner) return 'Clock idle';
    if (!isCurrentTurn) return 'Waiting for move';
    const remaining = Math.max(0, Math.ceil((turnDeadlineAt - clockNow) / 1000));
    return `${remaining}s to move`;
  };

  return (
    <Card 
      bordered={false} 
      className={isCurrentTurn ? 'player-card-active' : ''}
      style={{ 
        flex: 1, 
        border: isCurrentTurn ? `2px solid ${token.colorPrimary}` : `1px solid ${token.colorBorderSecondary}`,
        boxShadow: isCurrentTurn ? `0 8px 16px rgba(${token.colorPrimaryBg.slice(5, -1)}, 0.4)` : 'none',
        background: isCurrentTurn ? token.colorBgContainer : 'rgba(255, 255, 255, 0.4)',
        borderRadius: 20,
        transition: 'all 0.3s ease',
        transform: isCurrentTurn ? 'scale(1.02)' : 'scale(1)'
      }}
      styles={{ body: { padding: '8px 12px' } }}
    >
      <Flex justify="space-between" align="center" gap={12}>
        <Flex vertical gap={0} style={{ overflow: 'hidden' }}>
          <Space size={6}>
            <Text strong style={{ 
              display: 'block', 
              fontSize: '0.9rem',
              color: isCurrentTurn ? token.colorText : token.colorTextSecondary 
            }}>
              {name}
            </Text>
            {isMe && <Tag color="blue" bordered={false} style={{ margin: 0, fontSize: '0.75rem' }}>You</Tag>}
          </Space>
          <Flex align="center" gap={6}>
            <ClockCircleOutlined style={{ fontSize: '0.7rem', color: isCurrentTurn ? token.colorPrimary : token.colorTextDescription }} />
            <Text type="secondary" style={{ fontSize: '0.75rem', fontWeight: isCurrentTurn ? 600 : 400 }}>
              {getTimerText()}
            </Text>
          </Flex>
        </Flex>
        <div style={{ 
          width: 36, 
          height: 36, 
          borderRadius: 10, 
          display: 'grid', 
          placeItems: 'center', 
          fontWeight: 900,
          fontSize: '1rem',
          background: mark === 'X' ? token.colorWarningBg : token.colorInfoBg,
          color: mark === 'X' ? token.colorWarning : token.colorInfo,
          boxShadow: isCurrentTurn ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
          border: `1px solid ${mark === 'X' ? 'rgba(250, 173, 20, 0.2)' : 'rgba(22, 184, 255, 0.2)'}`,
          transition: 'all 0.3s ease'
        }}>
          {mark}
        </div>
      </Flex>
    </Card>
  );
};
