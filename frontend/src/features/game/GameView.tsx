import React from 'react';
import { Space, Tag, Typography, Button, Row, Col, Alert, Flex, theme } from 'antd';
import { RedoOutlined, HomeOutlined, TrophyOutlined, CrownOutlined, ClockCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import { setPendingAction, setErrorMessage } from '../../store/slices/uiSlice';
import { setRematchVotes, resetGame, setRoomMetadata } from '../../store/slices/gameSlice';
import { useNakama } from '../../context/NakamaContext';
import { PlayerCard } from './components/PlayerCard';
import { GameBoard } from './components/GameBoard';

const { Title, Text } = Typography;

export const GameView: React.FC = () => {
  const { matchId: urlMatchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const nakama = useNakama();
  const { matchId, winner, endedReason, roomName, matchKind, matchMode, rematchVotes, turn, marks, activePlayers } = useSelector((state: RootState) => state.game);
  const myUserId = useSelector((state: RootState) => state.auth.userId) ?? '';
  const pendingAction = useSelector((state: RootState) => state.ui.pendingAction);
  const { token } = theme.useToken();

  const isBusy = pendingAction !== null;
  const waitingForOpponent = activePlayers.length < 2 || Object.keys(marks).length < 2;
  const isMyTurn = turn?.toLowerCase() === myUserId.toLowerCase();

  // 🔥 Persistent Re-join Logic
  React.useEffect(() => {
    if (!urlMatchId) return;

    // If we're already in this match in Redux, no need to re-join
    if (matchId === urlMatchId && activePlayers.length > 0) return;

    const rejoin = async () => {
      dispatch(setPendingAction('join-match'));
      try {
        const match = await nakama.joinMatch(urlMatchId);

        // Populate room metadata immediately from label
        const labelStr = match.label;
        if (labelStr) {
          try {
            const label = JSON.parse(labelStr);
            dispatch(setRoomMetadata({
              matchId: match.match_id,
              roomName: label.roomName ?? 'Active Room',
              mode: label.mode ?? 'classic',
              kind: label.kind ?? 'room'
            }));
          } catch (e) {
            console.warn('Failed to parse match label during rejoin:', e);
          }
        }
      } catch (err: any) {
        console.error('Failed to rejoin match:', err);
        const isMatchNotFound = err.code === 4 || err.message?.includes('not found');
        dispatch(setErrorMessage(isMatchNotFound ? 'This match has ended or no longer exists.' : 'Could not reconnect to the match.'));
        navigate('/lobby');
      } finally {
        dispatch(setPendingAction(null));
      }
    };

    rejoin();
  }, [urlMatchId, matchId, nakama, dispatch, navigate, activePlayers.length]);

  const hasRequestedRematch = rematchVotes.some((id) => id.toLowerCase() === myUserId.toLowerCase());
  const opponentRequestedRematch = rematchVotes.some((id) => id.toLowerCase() !== myUserId.toLowerCase());
  const canRequestRematch =
    Boolean(matchId) &&
    Boolean(winner) &&
    matchKind === 'room' &&
    endedReason !== 'opponent_left' &&
    activePlayers.length === 2;

  const handleReturnToLobby = async () => {
    dispatch(setPendingAction('leave-match'));
    try {
      await nakama.leaveMatch();
      dispatch(resetGame());
      navigate('/lobby');
    } catch (err) {
      console.warn('Failed to leave match cleanly:', err);
      dispatch(resetGame());
      navigate('/lobby');
    } finally {
      dispatch(setPendingAction(null));
    }
  };

  const handleRematch = async () => {
    if (!matchId || !canRequestRematch || hasRequestedRematch) return;
    try {
      dispatch(setRematchVotes([...rematchVotes, myUserId]));
      await nakama.requestRematch(matchId);
    } catch (error) {
      dispatch(setErrorMessage('Unable to request a rematch right now.'));
    }
  };

  const getStatusText = () => {
    if (winner) {
      const baseResult = (winner === 'draw' || endedReason === 'draw') ? "It's a draw." : (winner === myUserId ? 'Victory!' : 'Defeat.');
      if (endedReason === 'opponent_left' && winner === myUserId) return 'Opponent left.';
      if (endedReason === 'timeout') return winner === myUserId ? 'Win on timeout.' : 'Lost on timeout.';
      if (canRequestRematch) {
        if (hasRequestedRematch) return 'Waiting for rematch...';
        if (opponentRequestedRematch) return 'Rematch requested!';
        return 'Play again?';
      }
      return baseResult;
    }
    if (waitingForOpponent) return 'Waiting for opponent...';
    if (!turn) return 'Searching...';
    return isMyTurn ? "Your turn!" : "Thinking...";
  };

  const getStatusType = () => {
    if (winner) return winner === myUserId || winner === 'draw' ? 'success' : 'error';
    return isMyTurn ? 'info' : 'warning';
  };

  const getStatusIcon = () => {
    if (winner === 'draw') return <TrophyOutlined style={{ color: token.colorTextDescription }} />;
    if (winner === myUserId) return <CrownOutlined style={{ color: token.colorWarning }} />;
    if (winner) return <TrophyOutlined style={{ color: token.colorError }} />;
    return isMyTurn ? <LoadingOutlined spin={isMyTurn} style={{ color: token.colorPrimary }} /> : <ClockCircleOutlined />;
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%', margin: '0 auto' }}>
      {/* 🏟 Compact Header */}
      <Flex justify="space-between" align="center" style={{
        padding: '8px 16px',
        background: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 20,
        border: `1px solid ${token.colorBorderSecondary}`
      }}>
        <Space direction="vertical" size={0}>
          <Space wrap size={[4, 4]}>
            <Tag color="blue" bordered={false} style={{ fontSize: '0.7rem' }}>Matrix v1</Tag>
            <Tag color={matchMode === 'timed' ? 'magenta' : 'green'} bordered={false} style={{ fontSize: '0.7rem' }}>{matchMode === 'timed' ? 'Timed' : 'Classic'}</Tag>
          </Space>
          <Title level={4} style={{ margin: 0 }}>{roomName ?? 'Active Room'}</Title>
        </Space>
        <Button
          icon={<HomeOutlined />}
          onClick={handleReturnToLobby}
          disabled={isBusy}
          size="small"
          loading={pendingAction === 'leave-match'}
          style={{ borderRadius: 8 }}
        >
          Lobby
        </Button>
      </Flex>

      {/* ⚔️ Main Battle Split View */}
      <Row gutter={[24, 24]} align="stretch">
        {/* 👤 Info & Profile Sidebar on Left */}
        <Col xs={24} md={8} lg={7}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <PlayerCard mark="X" />
            <PlayerCard mark="O" />

            <Alert
              title={
                <Flex align="center" gap={8} justify="center">
                  {getStatusIcon()}
                  <Text strong style={{ fontSize: '0.9rem' }}>
                    {getStatusText()}
                  </Text>
                </Flex>
              }
              type={getStatusType()}
              style={{ borderRadius: 16, padding: '10px 12px', border: 'none', textAlign: 'center' }}
              action={canRequestRematch && !hasRequestedRematch && (
                <Button size="small" type="primary" icon={<RedoOutlined />} onClick={handleRematch} loading={pendingAction === 'rematch'} style={{ borderRadius: 8 }}>
                  Rematch
                </Button>
              )}
            />
          </Space>
        </Col>

        {/* 🎮 Focused Game Board on Right */}
        <Col xs={24} md={16} lg={17}>
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 32,
            padding: 20,
            border: `1px solid ${token.colorBorderSecondary}`,
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.02)'
          }}>
            <div style={{ maxWidth: 540, width: '100%' }}>
              <GameBoard />
            </div>
          </div>
        </Col>
      </Row>
    </Space>
  );
};
