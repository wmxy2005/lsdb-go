import lsdbServices from '@/services/lsdb';
import { setToken } from '@/services/lsdb/client';
import { LockOutlined, MobileOutlined, UserOutlined } from '@ant-design/icons';
import {
  LoginForm,
  ProConfigProvider,
  ProFormCaptcha,
  ProFormText,
  setAlpha,
} from '@ant-design/pro-components';
import { useLocation, useModel, useNavigate } from '@umijs/max';
import { Card, Tabs, message, theme } from 'antd';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

const { authLogin } = lsdbServices.LsdbController;

type LoginType = 'phone' | 'account';

export default () => {
  const { token } = theme.useToken();
  const [loginType, setLoginType] = useState<LoginType>('account');
  const [messageApi, contextHolder] = message.useMessage();
  let navigate = useNavigate();
  const location = useLocation();
  const { initialState, loading, error, refresh, setInitialState } =
    useModel('@@initialState');
  // console.log(initialState);
  useEffect(() => {
    if (initialState?.userId && initialState.userId > 0) {
      navigate('/', { replace: true });
      return;
    }
  }, []);

  if (initialState?.userId && initialState.userId > 0) {
    return <></>;
  }

  const info = (msg: string) => {
    messageApi.error(msg);
  };

  const iconStyles: CSSProperties = {
    marginInlineStart: '16px',
    color: setAlpha(token.colorTextBase, 0.2),
    fontSize: '24px',
    verticalAlign: 'middle',
    cursor: 'pointer',
  };

  return (
    <ProConfigProvider hashed={false}>
      <Card style={{ backgroundColor: token.colorBgContainer, height: '80vh' }}>
        {contextHolder}
        <LoginForm
          logo="/favicon.ico"
          title="LSDB"
          subTitle="托管平台"
          onFinish={async (values: any) => {
            // console.log(values);
            try {
              const res = await authLogin({}, values);
              if (res.success === false) {
                info(res?.errorMessage || '登录失败');
                return;
              }
              setToken(res?.data?.token);
              // setInitialState({name : data.name, id : data.id});
              await refresh();
              let fromUrl = location?.state?.fromUrl;
              // navigate(fromUrl ? fromUrl : '/', { replace: true, state: { shouldRefresh: true }});
              window.location.href = fromUrl || '/';
              // window.location.reload()
            } catch (err) {
              console.error(err);
            }
          }}
        >
          <Tabs
            centered
            activeKey={loginType}
            onChange={(activeKey) => setLoginType(activeKey as LoginType)}
            items={[
              {
                key: 'account',
                label: '账号密码登录',
              },
            ]}
          ></Tabs>
          {loginType === 'account' && (
            <>
              <ProFormText
                name="username"
                fieldProps={{
                  size: 'large',
                  prefix: <UserOutlined className={'prefixIcon'} />,
                }}
                placeholder={'用户名'}
                rules={[
                  {
                    required: true,
                    message: '请输入用户名!',
                  },
                ]}
              />
              <ProFormText.Password
                name="password"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined className={'prefixIcon'} />,
                }}
                placeholder={'密码'}
                rules={[
                  {
                    required: true,
                    message: '请输入密码！',
                  },
                ]}
              />
            </>
          )}
          {loginType === 'phone' && (
            <>
              <ProFormText
                fieldProps={{
                  size: 'large',
                  prefix: <MobileOutlined className={'prefixIcon'} />,
                }}
                name="mobile"
                placeholder={'手机号'}
                rules={[
                  {
                    required: true,
                    message: '请输入手机号！',
                  },
                  {
                    pattern: /^1\d{10}$/,
                    message: '手机号格式错误！',
                  },
                ]}
              />
              <ProFormCaptcha
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined className={'prefixIcon'} />,
                }}
                captchaProps={{
                  size: 'large',
                }}
                placeholder={'请输入验证码'}
                captchaTextRender={(timing, count) => {
                  if (timing) {
                    return `${count} ${'获取验证码'}`;
                  }
                  return '获取验证码';
                }}
                name="captcha"
                rules={[
                  {
                    required: true,
                    message: '请输入验证码！',
                  },
                ]}
                onGetCaptcha={async () => {
                  message.success('获取验证码成功！验证码为：1234');
                }}
              />
            </>
          )}
        </LoginForm>
      </Card>
    </ProConfigProvider>
  );
};
