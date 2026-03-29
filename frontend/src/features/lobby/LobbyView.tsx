import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  ThunderboltOutlined, RocketOutlined, CheckCircleOutlined, LogoutOutlined,
  PlusCircleOutlined, ApartmentOutlined, GlobalOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { Space, Tag, Typography, Button, Row, Col, Flex, Card, Segmented, theme, Input } from 'antd';
import type { RootState } from '../../store';
import { 
  setLeaderboard, setCurrentPlayerStats, setLeaderboardLoading, setSelectedMode, setJoinRoomNumberInput 
} from '../../store/slices/lobbySlice';
import { setPendingAction, setErrorMessage } from '../../store/slices/uiSlice';
import { resetGame } from '../../store/slices/gameSlice';
import { logout as authLogout } from '../../store/slices/authSlice';
import { useNakama } from '../../context/NakamaContext';
import { Leaderboard } from './components/Leaderboard';
import type { MatchMode } from '../../services/nakama';

const { Title, Paragraph, Text } = Typography;

const sanitizeRoomNumber = (value: string) => value.replace(/\D/g, '').slice(0, 8);

export const LobbyView: React.FC = () => {
  const dispatch = useDispatch();
  const { username } = useSelector((state: RootState) => state.auth);
  const { selectedMode, joinRoomNumberInput } = useSelector((state: RootState) => state.lobby);
  const { pendingAction } = useSelector((state: RootState) => state.ui);
  const nakama = useNakama();
  const navigate = useNavigate();
  const { token } = theme.useToken();

  const isBusy = pendingAction !== null;
  const selectedModeLabel = selectedMode === 'timed' ? 'Timed 30s' : 'Classic';

  const loadLeaderboard = useCallback(async () => {
    dispatch(setLeaderboardLoading(true));
    try {
      const snapshot = await nakama.getLeaderboard();
      dispatch(setLeaderboard(snapshot.leaderboard));
      dispatch(setCurrentPlayerStats(snapshot.currentPlayer));
    } catch (error) {
      console.error('Leaderboard fetch failed:', error);
    } finally {
      dispatch(setLeaderboardLoading(false));
    }
  }, [dispatch, nakama]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const handleLogout = async () => {
    dispatch(setPendingAction('logout'));
    try {
      await nakama.logout();
      dispatch(authLogout());
      dispatch(resetGame());
      navigate('/login');
    } catch (error) {
      dispatch(setErrorMessage('Logout failed. Please try again.'));
    } finally {
      dispatch(setPendingAction(null));
    }
  };

  const enterGame = (matchId: string) => {
    navigate(`/game/${matchId}`);
  };

  const handleQuickMatch = async () => {
    dispatch(resetGame());
    dispatch(setPendingAction('quick-match'));
    try {
      const matchId = await nakama.findMatch(selectedMode);
      enterGame(matchId);
    } catch (error) {
      dispatch(setErrorMessage('Unable to find a match right now.'));
    } finally {
      dispatch(setPendingAction(null));
    }
  };

  const handleCreateRoom = async () => {
    dispatch(resetGame());
    dispatch(setPendingAction('create-room'));
    try {
      const matchId = await nakama.createRoom(selectedMode);
      enterGame(matchId);
    } catch (error) {
      dispatch(setErrorMessage('Unable to create a room.'));
    } finally {
      dispatch(setPendingAction(null));
    }
  };

  const handleJoinRoomByNumber = async () => {
    const sanitized = sanitizeRoomNumber(joinRoomNumberInput);
    if (!sanitized) {
      dispatch(setErrorMessage('Enter a room number to join a private room.'));
      return;
    }
    dispatch(resetGame());
    dispatch(setPendingAction('join-room-number'));
    try {
      const matchId = await nakama.joinRoomByNumber(sanitized);
      enterGame(matchId);
    } catch (error) {
      dispatch(setErrorMessage('Unable to find that room number.'));
    } finally {
      dispatch(setPendingAction(null));
    }
  };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      {/* 🚀 Header & Quick Stats */}
      <Card bordered={false} style={{ 
        background: `linear-gradient(135deg, ${token.colorPrimaryBg}, transparent 45%), linear-gradient(180deg, ${token.colorBgContainer}, ${token.colorFillQuaternary})`,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 24,
        overflow: 'hidden'
      }}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} xl={16}>
            <Flex vertical gap={12}>
              <Space wrap size={[8, 8]}>
                <Tag color="blue" icon={<CheckCircleOutlined />} bordered={false}>Live Server</Tag>
                <Tag color="cyan" icon={<GlobalOutlined />} bordered={false}>Global Pool</Tag>
                <Tag color={selectedMode === 'timed' ? 'magenta' : 'green'} bordered={false}>{selectedModeLabel}</Tag>
              </Space>
              <div>
                <Title level={2} style={{ margin: 0, fontSize: '2rem', letterSpacing: '-0.02em' }}>
                  Hello, {username}!
                </Title>
                <Paragraph type="secondary" style={{ margin: 0, fontSize: '1.05rem' }}>
                  Launch a quick match or create a private arena for your friends.
                </Paragraph>
              </div>
            </Flex>
          </Col>
          <Col xs={24} xl={8}>
            <Flex gap={16} align="center" justify="flex-end">
              <div style={{ textAlign: 'right', display: 'none' }}>
                  {/* Stats hidden for now in this xl column */}
              </div>
              <Button icon={<LogoutOutlined />} onClick={handleLogout} loading={pendingAction === 'logout'} disabled={isBusy} style={{ borderRadius: 12 }}>
                Logout
              </Button>
            </Flex>
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]} align="stretch">
        {/* 🎮 Central Action Area */}
        <Col xs={24} lg={17}>
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {/* Mode Settings Strip */}
            <Flex align="center" justify="space-between" style={{ 
              padding: '16px 20px', 
              border: `1px solid ${token.colorBorderSecondary}`, 
              borderRadius: 20, 
              background: token.colorBgContainer,
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <div>
                <Text strong style={{ fontSize: '1rem', display: 'block' }}>Match Configuration</Text>
                <Text type="secondary">Queue into your preferred game mode</Text>
              </div>
              <Segmented 
                value={selectedMode} 
                onChange={(val) => dispatch(setSelectedMode(val as MatchMode))} 
                options={[
                  { label: <Space><ThunderboltOutlined /> Classic</Space>, value: 'classic' }, 
                  { label: <Space><ClockCircleOutlined /> Timed 30s</Space>, value: 'timed' }
                ]} 
                style={{ background: token.colorFillTertiary, padding: 4 }}
              />
            </Flex>

            {/* Core Action Tiles */}
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Flex vertical gap={16} style={{ 
                  padding: 20, borderRadius: 24, border: `1px solid ${token.colorBorderSecondary}`, 
                  background: token.colorBgContainer, height: '100%',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, display: 'inline-grid', placeItems: 'center', background: token.colorErrorBg, color: token.colorError }}>
                    <RocketOutlined />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Title level={4} style={{ margin: 0, marginBottom: 4 }}>Quick Play</Title>
                    <Text type="secondary">Jump into a global queue for {selectedMode} mode.</Text>
                  </div>
                  <Button type="primary" size="large" onClick={handleQuickMatch} disabled={isBusy} loading={pendingAction === 'quick-match'} block style={{ borderRadius: 12 }}>
                    Find Match
                  </Button>
                </Flex>
              </Col>

              <Col xs={24} md={8}>
                <Flex vertical gap={16} style={{ 
                  padding: 20, borderRadius: 24, border: `1px solid ${token.colorBorderSecondary}`, 
                  background: token.colorBgContainer, height: '100%',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, display: 'inline-grid', placeItems: 'center', background: token.colorInfoBg, color: token.colorInfo }}>
                    <PlusCircleOutlined />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Title level={4} style={{ margin: 0, marginBottom: 4 }}>Private Arena</Title>
                    <Text type="secondary">Create a room and share the entry code.</Text>
                  </div>
                  <Button size="large" icon={<PlusCircleOutlined />} onClick={handleCreateRoom} disabled={isBusy} loading={pendingAction === 'create-room'} block style={{ borderRadius: 12 }}>
                    Create Room
                  </Button>
                </Flex>
              </Col>

              <Col xs={24} md={8}>
                <Flex vertical gap={16} style={{ 
                  padding: 20, borderRadius: 24, border: `1px solid ${token.colorBorderSecondary}`, 
                  background: token.colorBgContainer, height: '100%',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, display: 'inline-grid', placeItems: 'center', background: token.colorSuccessBg, color: token.colorSuccess }}>
                    <ApartmentOutlined />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Title level={4} style={{ margin: 0, marginBottom: 4 }}>Join Room</Title>
                    <Input 
                      placeholder="4-digit code" 
                      value={joinRoomNumberInput} 
                      onChange={(e) => dispatch(setJoinRoomNumberInput(sanitizeRoomNumber(e.target.value)))} 
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinRoomByNumber()}
                      size="large"
                      style={{ borderRadius: 10, margin: '8px 0' }}
                    />
                  </div>
                  <Button icon={<ApartmentOutlined />} onClick={handleJoinRoomByNumber} disabled={isBusy || !joinRoomNumberInput} loading={pendingAction === 'join-room-number'} block style={{ borderRadius: 12 }}>
                    Join Match
                  </Button>
                </Flex>
              </Col>
            </Row>
          </Space>
        </Col>

        {/* 🏆 Leaderboard Sidebar */}
        <Col xs={24} lg={7}>
          <Leaderboard />
        </Col>
      </Row>
    </Space>
  );
};
