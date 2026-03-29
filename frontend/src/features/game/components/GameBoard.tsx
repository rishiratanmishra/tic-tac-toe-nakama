import React, { useMemo } from 'react';
import { Button, Typography, theme } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { updateBoardLocal } from '../../../store/slices/gameSlice';
import { useNakama } from '../../../context/NakamaContext';

const { Text } = Typography;

export const GameBoard: React.FC = () => {
  const { board, marks, turn, winner, matchId, activePlayers } = useSelector((state: RootState) => state.game);
  const myUserId = useSelector((state: RootState) => state.auth.userId) ?? '';
  
  const waitingForOpponent = useMemo(() => {
    return activePlayers.length < 2 || Object.keys(marks).length < 2;
  }, [activePlayers, marks]);

  const dispatch = useDispatch();
  const nakama = useNakama();
  const { token } = theme.useToken();

  const isMyTurn = useMemo(() => turn?.toLowerCase() === myUserId.toLowerCase(), [turn, myUserId]);
  const myMark = useMemo(() => Object.entries(marks).find(([id]) => id.toLowerCase() === myUserId.toLowerCase())?.[1] ?? null, [marks, myUserId]);

  const handleMove = (index: number) => {
    if (!matchId || winner || waitingForOpponent || !isMyTurn || board[index] !== null) return;
    if (myMark) {
      dispatch(updateBoardLocal({ index, mark: myMark }));
    }
    nakama.sendMove(matchId, index);
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(3, 1fr)', 
      gap: 16,
      padding: 12,
      background: 'rgba(230, 238, 250, 0.4)',
      borderRadius: 32,
      border: `1px solid ${token.colorBorderSecondary}`
    }}>
      {board.map((cell, idx) => {
        const isX = cell === 'X';
        
        return (
          <Button
            key={idx}
            className={`board-cell ${cell ? `cell-${cell.toLowerCase()}` : 'cell-empty'}`}
            onClick={() => handleMove(idx)}
            disabled={!!cell || !!winner || waitingForOpponent || !isMyTurn}
            style={{ 
              height: 'auto', 
              minHeight: 'clamp(80px, 15vw, 120px)', 
              borderRadius: 24, 
              fontSize: 'clamp(3rem, 10vw, 5rem)', 
              fontWeight: 900, 
              background: cell ? token.colorBgContainer : 'rgba(255, 255, 255, 0.8)',
              border: cell ? `2px solid ${isX ? token.colorWarning : token.colorInfo}` : `1px solid ${token.colorBorderSecondary}`,
              display: 'grid',
              placeItems: 'center',
              boxShadow: cell ? '0 8px 24px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
          >
            {cell ? (
              <span style={{ 
                color: isX ? token.colorWarning : token.colorInfo,
                textShadow: `0 2px 4px ${isX ? 'rgba(250, 173, 20, 0.15)' : 'rgba(22, 184, 255, 0.15)'}`
              }}>
                {cell}
              </span>
            ) : (
              <Text type="secondary" style={{ opacity: 0.1, fontSize: '0.9rem', fontWeight: 800 }}>{idx + 1}</Text>
            )}
          </Button>
        );
      })}
    </div>
  );
};
