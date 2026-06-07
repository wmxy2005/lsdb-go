import { DesktopOutlined, LockOutlined } from '@ant-design/icons';
import { useIntl, useNavigate } from '@umijs/max';
import { Button, Result } from 'antd';
import './index.css';

function UnauthorizedIllustration() {
  return (
    <div className="unauthorized-result__image" aria-hidden="true">
      <div className="unauthorized-result__halo" />
      <div className="unauthorized-result__card">
        <div className="unauthorized-result__screen-bar">
          <span />
          <span />
          <span />
        </div>
        <div className="unauthorized-result__screen-body">
          <span className="unauthorized-result__logo-wrap">
            <img src="/logo.svg" alt="" className="unauthorized-result__logo" />
          </span>
          <span className="unauthorized-result__screen-meta">
            <span className="unauthorized-result__line unauthorized-result__line-strong" />
            <span className="unauthorized-result__line" />
            <span className="unauthorized-result__line unauthorized-result__line-short" />
          </span>
          <span className="unauthorized-result__status-code">403</span>
        </div>
        <DesktopOutlined className="unauthorized-result__desktop-icon" />
        <span className="unauthorized-result__lock">
          <LockOutlined />
        </span>
      </div>
      <div className="unauthorized-result__stand" />
      <div className="unauthorized-result__base" />
      <div className="unauthorized-result__bar unauthorized-result__bar-primary" />
      <div className="unauthorized-result__bar unauthorized-result__bar-secondary" />
    </div>
  );
}

export default function UnauthorizedResult() {
  const intl = useIntl();
  const navigate = useNavigate();

  return (
    <Result
      className="unauthorized-result"
      data-status="403"
      icon={<UnauthorizedIllustration />}
      title={intl.formatMessage({
        id: 'alreadyLogout',
      })}
      subTitle={intl.formatMessage({
        id: 'pleaseLogin',
      })}
      extra={
        <Button
          type="primary"
          onClick={() => {
            navigate('/login', {
              replace: false,
              state: { fromUrl: location.href },
            });
          }}
        >
          {intl.formatMessage({
            id: 'login',
          })}
        </Button>
      }
    />
  );
}
