import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, App as AntdApp } from 'antd';
import { Provider } from 'react-redux';
import { store } from './store/index.ts';
import { NakamaProvider } from './context/NakamaContext.tsx';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <NakamaProvider>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#2563eb',
              colorInfo: '#2563eb',
              colorSuccess: '#16a34a',
              colorWarning: '#d97706',
              colorError: '#dc2626',
              colorBgBase: '#f4f8ff',
              colorBgContainer: '#ffffff',
              colorBgElevated: '#ffffff',
              colorText: '#10233f',
              colorTextSecondary: '#5f7596',
              colorBorder: '#d9e2f2',
              borderRadius: 20,
              borderRadiusLG: 28,
              fontFamily: "'Trebuchet MS', 'Avenir Next', 'Segoe UI', sans-serif",
            },
            components: {
              Button: {
                fontWeight: 700,
                controlHeightLG: 50,
              },
              Card: {
                headerFontSize: 18,
                colorBgContainer: '#ffffff',
              },
              Input: {
                controlHeightLG: 50,
                colorBgContainer: '#f8fbff',
              },
              Tag: {
                fontWeightStrong: 700,
              },
            },
          }}
        >
          <AntdApp>
            <App />
          </AntdApp>
        </ConfigProvider>
      </NakamaProvider>
    </Provider>
  </StrictMode>,
);
