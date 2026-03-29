import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Space, Tag, Typography, Input, Button, Flex, theme, Tabs, Form } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, LoginOutlined, UserAddOutlined } from '@ant-design/icons';
import type { RootState } from '../../store';
import { setPendingAction, setErrorMessage } from '../../store/slices/uiSlice';
import { useNakama } from '../../context/NakamaContext';
import { setAuth } from '../../store/slices/authSlice';

const { Title, Paragraph, Text } = Typography;

export const LoginView: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const pendingAction = useSelector((state: RootState) => state.ui.pendingAction);
  const nakama = useNakama();
  const { token } = theme.useToken();

  const handleAuth = async (values: any, isSignup: boolean) => {
    dispatch(setPendingAction(isSignup ? 'signup' : 'login'));
    dispatch(setErrorMessage(null));

    try {
      await nakama.authenticateEmail(
        values.email,
        values.password,
        isSignup,
        isSignup ? values.nickname : undefined
      );
      
      const account = await nakama.getAccount();
      const user = account.user!;
      
      dispatch(setAuth({ 
        username: user.username!, 
        userId: user.id!,
        email: account.email 
      }));
      navigate('/lobby');
    } catch (error: any) {
      console.error(`${isSignup ? 'Signup' : 'Login'} failed:`, error);
      dispatch(setErrorMessage(error.message || `${isSignup ? 'Signup' : 'Login'} failed. Please check your credentials.`));
    } finally {
      dispatch(setPendingAction(null));
    }
  };

  const isBusy = pendingAction !== null;

  const loginTab = (
    <Form
      layout="vertical"
      requiredMark={false}
      onFinish={(values) => handleAuth(values, false)}
      style={{ marginTop: 12 }}
    >
      <Form.Item
        name="email"
        label="Email"
        rules={[{ required: true, message: 'Please enter your email' }, { type: 'email', message: 'Please enter a valid email' }]}
      >
        <Input prefix={<MailOutlined style={{ color: token.colorTextDescription }} />} placeholder="your@email.com" size="large" />
      </Form.Item>
      <Form.Item
        name="password"
        label="Password"
        rules={[{ required: true, message: 'Please enter your password' }]}
      >
        <Input.Password prefix={<LockOutlined style={{ color: token.colorTextDescription }} />} placeholder="••••••••" size="large" />
      </Form.Item>
      <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
        <Button 
          type="primary" 
          htmlType="submit" 
          size="large" 
          block 
          icon={<LoginOutlined />}
          loading={pendingAction === 'login'}
          disabled={isBusy}
        >
          Sign In
        </Button>
      </Form.Item>
    </Form>
  );

  const signupTab = (
    <Form
      layout="vertical"
      requiredMark={false}
      onFinish={(values) => handleAuth(values, true)}
      style={{ marginTop: 12 }}
    >
      <Form.Item
        name="email"
        label="Email"
        rules={[{ required: true, message: 'Please enter your email' }, { type: 'email', message: 'Please enter a valid email' }]}
      >
        <Input prefix={<MailOutlined style={{ color: token.colorTextDescription }} />} placeholder="your@email.com" size="large" />
      </Form.Item>
      <Form.Item
        name="password"
        label="Password"
        rules={[{ required: true, message: 'Please enter a password' }, { min: 8, message: 'Password must be at least 8 characters' }]}
      >
        <Input.Password prefix={<LockOutlined style={{ color: token.colorTextDescription }} />} placeholder="Min. 8 characters" size="large" />
      </Form.Item>
      <Form.Item
        name="nickname"
        label="Public Nickname"
        rules={[{ required: true, message: 'Please choose a nickname' }]}
      >
        <Input prefix={<UserOutlined style={{ color: token.colorTextDescription }} />} placeholder="BestPlayer123" size="large" />
      </Form.Item>
      <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
        <Button 
          type="primary" 
          htmlType="submit" 
          size="large" 
          block 
          icon={<UserAddOutlined />}
          loading={pendingAction === 'signup'}
          disabled={isBusy}
        >
          Create Account
        </Button>
      </Form.Item>
    </Form>
  );

  return (
    <Space direction="vertical" size={20} style={{ width: '100%', margin: '0 auto' }}>
      <Flex vertical align="center" gap={12} style={{ textAlign: 'center' }}>
        <div style={{ width: '100%' }}>
          <Flex wrap gap={8} justify="center" style={{ marginBottom: 16 }}>
            <Tag color="cyan">Multiplayer Tic-Tac-Toe</Tag>
          </Flex>
          <Title level={1} style={{ margin: 0, fontSize: '2rem', letterSpacing: '-0.02em' }}>Battle Ground</Title>
          <Paragraph type="secondary" style={{ fontSize: '0.9rem', marginTop: 2, marginBottom: 0 }}>
            Compete in real-time matches and climb the global leaderboard.
          </Paragraph>
        </div>
      </Flex>

      <div style={{ 
        maxWidth: 400, 
        margin: '0 auto', 
        width: '100%',
        padding: '0 2px'
      }}>
        <Tabs
          centered
          defaultActiveKey="1"
          style={{ marginBottom: 4 }}
          items={[
            {
              key: '1',
              label: (
                <Space>
                  <LoginOutlined />
                  Login
                </Space>
              ),
              children: loginTab,
            },
            {
              key: '2',
              label: (
                <Space>
                  <UserAddOutlined />
                  Sign Up
                </Space>
              ),
              children: signupTab,
            },
          ]}
        />
      </div>

      <Text type="secondary" style={{ textAlign: 'center', display: 'block', opacity: 0.7, fontSize: '0.85rem' }}>
        {pendingAction === 'restore-session' 
          ? 'Attempting to restore your previous session...' 
          : 'Connecting to Nakama Global Server...'}
      </Text>
    </Space>
  );
};
