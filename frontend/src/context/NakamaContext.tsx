import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { nakamaService } from '../services/nakama';

interface NakamaContextProps {
  service: typeof nakamaService;
}

const NakamaContext = createContext<NakamaContextProps | undefined>(undefined);

export const NakamaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <NakamaContext.Provider value={{ service: nakamaService }}>
      {children}
    </NakamaContext.Provider>
  );
};

export const useNakama = () => {
  const context = useContext(NakamaContext);
  if (!context) {
    throw new Error('useNakama must be used within a NakamaProvider');
  }
  return context.service;
};
