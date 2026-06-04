// 运行时配置
import { CONFIG } from '@/constants';
import lsdbServices from '@/services/lsdb';
import {
  AntDesignOutlined,
  GlobalOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import type { ProSettings } from '@ant-design/pro-components';
import {
  RunTimeLayoutConfig,
  getLocale,
  setLocale,
  useIntl,
  useNavigate,
} from '@umijs/max';
import { Button, Dropdown, Flex, Result, Space } from 'antd';
import { useState } from 'react';
import SearchInput from './pages/items/components/Search';
import { setToken } from './services/lsdb/client';

const { authCurrent, authLogout } = lsdbServices.LsdbController;

// 全局初始化数据配置，用于 Layout 用户信息和权限初始化
// 更多信息见文档：https://umijs.org/docs/api/runtime-config#getinitialstate
export async function getInitialState(): Promise<{
  name: string;
  userId: number;
}> {
  const r = await authCurrent({}, { auth: true });
  if (r.success && r.data) {
    if (r?.data?.token) {
      setToken(r.data.token);
    }
  }
  return { name: r?.data?.username || 'ldsb', userId: r?.data?.id || 0 };
}

export const layout: RunTimeLayoutConfig = (initialState) => {
  let navigate = useNavigate();
  const intl = useIntl();
  const currentLocale = getLocale() || CONFIG.defaultLocale;
  const localeOptions = CONFIG.locales;
  const currentLocaleLabel =
    localeOptions.find((locale) => locale.name === currentLocale)?.label ||
    CONFIG.defaultLocale;
  const [settings, setSetting] = useState<Partial<ProSettings> | undefined>({
    layout: 'top',
    splitMenus: false,
    contentWidth: 'Fixed',
    colorPrimary: '#FA541C',
    fixedHeader: true,
  });
  return {
    title: '',
    logo: <img src="/logo.svg"></img>,
    menu: {
      locale: true,
    },
    layout: 'top',
    splitMenus: false,
    contentWidth: 'Fixed',
    colorPrimary: 'rgba(214,93,58,1)',
    fixedHeader: true,
    token: {
      header: {
        colorBgMenuItemSelected: 'rgba(0,0,0,0)',
        colorBgMenuItemHover: 'rgba(0,0,0,0)',
      },
    },
    rightContentRender: false,
    style: {
      minHeight: '100vh',
    },
    footerRender: (props) => {
      return (
        <Flex
          style={{ margin: '0.5em 0' }}
          gap="small"
          justify="center"
          align="center"
        >
          <a href="https://github.com/wmxy2005/lsdb" target="_blank">
            <img
              style={{ maxHeight: '25px' }}
              src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4PSIwcHgiIHk9IjBweCIgd2lkdGg9IjQwcHgiIGhlaWdodD0iNDBweCIgdmlld0JveD0iMTIgMTIgNDAgNDAiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMTIgMTIgNDAgNDAiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxwYXRoIGZpbGw9IiMzMzMzMzMiIGQ9Ik0zMiAxMy40Yy0xMC41IDAtMTkgOC41LTE5IDE5YzAgOC40IDUuNSAxNS41IDEzIDE4YzEgMC4yIDEuMy0wLjQgMS4zLTAuOWMwLTAuNSAwLTEuNyAwLTMuMiBjLTUuMyAxLjEtNi40LTIuNi02LjQtMi42QzIwIDQxLjYgMTguOCA0MSAxOC44IDQxYy0xLjctMS4yIDAuMS0xLjEgMC4xLTEuMWMxLjkgMC4xIDIuOSAyIDIuOSAyYzEuNyAyLjkgNC41IDIuMSA1LjUgMS42IGMwLjItMS4yIDAuNy0yLjEgMS4yLTIuNmMtNC4yLTAuNS04LjctMi4xLTguNy05LjRjMC0yLjEgMC43LTMuNyAyLTUuMWMtMC4yLTAuNS0wLjgtMi40IDAuMi01YzAgMCAxLjYtMC41IDUuMiAyIGMxLjUtMC40IDMuMS0wLjcgNC44LTAuN2MxLjYgMCAzLjMgMC4yIDQuNyAwLjdjMy42LTIuNCA1LjItMiA1LjItMmMxIDIuNiAwLjQgNC42IDAuMiA1YzEuMiAxLjMgMiAzIDIgNS4xYzAgNy4zLTQuNSA4LjktOC43IDkuNCBjMC43IDAuNiAxLjMgMS43IDEuMyAzLjVjMCAyLjYgMCA0LjYgMCA1LjJjMCAwLjUgMC40IDEuMSAxLjMgMC45YzcuNS0yLjYgMTMtOS43IDEzLTE4LjFDNTEgMjEuOSA0Mi41IDEzLjQgMzIgMTMuNHoiLz48L3N2Zz4="
            />
          </a>
          <label>Copyright © 2025 By wmxy2005.</label>
        </Flex>
      );
    },
    menuHeaderRender: () => {
      return (
        <span className="ant-pro-global-header-logo">
          <a
            onClick={() => {
              navigate('/', { replace: false });
            }}
          >
            <img src="/logo.svg" style={{ maxHeight: 32 }}></img>
          </a>
        </span>
      );
    },
    headerRender: true,
    //menuRender: true,
    menuExtraRender: (props) => {
      if (props.isMobile && initialState?.initialState?.userId > 0) {
        return [
          <Space key="search" style={{ padding: '10px 0' }}>
            <SearchInput />
          </Space>,
        ];
      }
    },
    // menuHeaderRender: true,
    hideInBreadcrumb: true,
    actionsRender: (props) => {
      const localeSwitcher = (
        <Dropdown
          key="locale-switcher"
          menu={{
            items: localeOptions.map((locale) => ({
              key: `locale-${locale.name}`,
              label: locale.label,
              disabled: currentLocale === locale.name,
              onClick: () => setLocale(locale.name, false),
            })),
          }}
        >
          <Button type="text" icon={<GlobalOutlined />}>
            {currentLocaleLabel}
          </Button>
        </Dropdown>
      );
      if (props.isMobile) {
        return [localeSwitcher];
      }
      if (typeof window === 'undefined') return [];
      return [
        props.layout !== 'side' && initialState?.initialState?.userId > 0 ? (
          <SearchInput />
        ) : undefined,
        localeSwitcher,
      ];
    },
    avatarProps: {
      icon: <AntDesignOutlined />,
      size: 'small',
      title: initialState.initialState?.name,
      render: (props, dom) => {
        if (initialState?.initialState?.userId > 0) {
          const onLogoutClick = async () => {
            const res = await authLogout()
            if (res?.success) {
              setToken(null)
              await initialState.refresh();
              // console.log(initialState.initialState);
              navigate('../login', { replace: true });
            }
          };
          return (
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: intl.formatMessage({
                      id: 'logout',
                    }),
                    onClick: onLogoutClick,
                  },
                ],
              }}
            >
              {dom}
            </Dropdown>
          );
        } else {
          return <></>;
        }
      },
    },
    menuFooterRender: (props) => {
      if (props?.collapsed) return undefined;
      return (
        <div
          style={{
            textAlign: 'center',
            paddingBlockStart: 12,
          }}
        >
          <Flex
            style={{ margin: '0.5em 0' }}
            gap="small"
            justify="center"
            align="center"
          >
            <a href="https://github.com/wmxy2005/lsdb" target="_blank">
              <img
                style={{ maxHeight: '25px' }}
                src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4PSIwcHgiIHk9IjBweCIgd2lkdGg9IjQwcHgiIGhlaWdodD0iNDBweCIgdmlld0JveD0iMTIgMTIgNDAgNDAiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMTIgMTIgNDAgNDAiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxwYXRoIGZpbGw9IiMzMzMzMzMiIGQ9Ik0zMiAxMy40Yy0xMC41IDAtMTkgOC41LTE5IDE5YzAgOC40IDUuNSAxNS41IDEzIDE4YzEgMC4yIDEuMy0wLjQgMS4zLTAuOWMwLTAuNSAwLTEuNyAwLTMuMiBjLTUuMyAxLjEtNi40LTIuNi02LjQtMi42QzIwIDQxLjYgMTguOCA0MSAxOC44IDQxYy0xLjctMS4yIDAuMS0xLjEgMC4xLTEuMWMxLjkgMC4xIDIuOSAyIDIuOSAyYzEuNyAyLjkgNC41IDIuMSA1LjUgMS42IGMwLjItMS4yIDAuNy0yLjEgMS4yLTIuNmMtNC4yLTAuNS04LjctMi4xLTguNy05LjRjMC0yLjEgMC43LTMuNyAyLTUuMWMtMC4yLTAuNS0wLjgtMi40IDAuMi01YzAgMCAxLjYtMC41IDUuMiAyIGMxLjUtMC40IDMuMS0wLjcgNC44LTAuN2MxLjYgMCAzLjMgMC4yIDQuNyAwLjdjMy42LTIuNCA1LjItMiA1LjItMmMxIDIuNiAwLjQgNC42IDAuMiA1YzEuMiAxLjMgMiAzIDIgNS4xYzAgNy4zLTQuNSA4LjktOC43IDkuNCBjMC43IDAuNiAxLjMgMS43IDEuMyAzLjVjMCAyLjYgMCA0LjYgMCA1LjJjMCAwLjUgMC40IDEuMSAxLjMgMC45YzcuNS0yLjYgMTMtOS43IDEzLTE4LjFDNTEgMjEuOSA0Mi41IDEzLjQgMzIgMTMuNHoiLz48L3N2Zz4="
              />
            </a>
            <label>Copyright © 2025 By wmxy2005.</label>
          </Flex>
          ;
        </div>
      );
    },
    unAccessible: (
      <Result
        status="403"
        title={intl.formatMessage({
          id: 'noRight',
        })}
        subTitle={intl.formatMessage({
          id: 'pleaseLogin',
        })}
        extra={
          <Button
            type="primary"
            onClick={() => {
              navigate('./login', {
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
    ),
    rightRender: (initialState: any) => {
      return <a>Right</a>;
    },
    logout: (initialState: any) => {
      console.log(initialState);
    },
  };
};
