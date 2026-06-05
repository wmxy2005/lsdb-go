import { getPcStats, shutdown } from '@/services/lsdb/LsdbController';
import { PageContainer } from '@ant-design/pro-components';
import { useAccess, useIntl } from '@umijs/max';
import { Alert, Button, Card, Flex, message, Switch, Typography } from 'antd';
import { useState } from 'react';
import Monitor from './components/Monitor';

const ToolPage: React.FC = () => {
  const access = useAccess();
  const intl = useIntl();
  const [loading, setLoading] = useState<string>('');
  const [messageApi, contextHolder] = message.useMessage();
  const [showMonitor, setShowMonitor] = useState<boolean>(false);
  const shutdownClick = async (status: string) => {
    setLoading(status);
    const res = await shutdown(status === 'restart');
    if (res?.success) {
      messageApi.info('success');
    } else {
      messageApi.error(res?.message);
    }
    setTimeout(() => {
      setLoading('');
    }, 1000);
  };

  const updatePcData = async () => {
    try {
      const res = await getPcStats();
      if (res?.success) {
        return [true, res.data?.time, res.data?.cpu];
      }
    } catch (err) {
      console.error(err);
    }
    return [false, false, false];
  };

  return (
    <PageContainer
      ghost
      header={{
        title: '',
        breadcrumbRender: () => {
          return (
            <Alert
              description={intl.formatMessage({ id: 'menu.tool' })}
            ></Alert>
          );
        },
      }}
    >
      {contextHolder}
      <Card>
        <Flex gap="large" align="left" justify="space-between" vertical>
          <Button
            key="shutdown"
            loading={loading === 'shutdown'}
            disabled={loading !== ''}
            type="primary"
            ghost
            danger
            size="large"
            style={{ width: '10em' }}
            onClick={() => shutdownClick('shutdown')}
          >
            {intl.formatMessage({ id: 'shutdown' })}
          </Button>
          <Button
            key="restart"
            loading={loading === 'restart'}
            disabled={loading !== ''}
            type="primary"
            ghost
            danger
            size="large"
            style={{ width: '10em' }}
            onClick={() => shutdownClick('restart')}
          >
            {intl.formatMessage({ id: 'restart' })}
          </Button>
          <Flex gap="large" align="left">
            <Typography.Text strong>{'CPU占用'}</Typography.Text>
            <Switch
              checkedChildren={'显示'}
              unCheckedChildren={'隐藏'}
              checked={showMonitor}
              onChange={(checked: boolean) => setShowMonitor(checked)}
              style={{ width: '5em' }}
            />
          </Flex>
        </Flex>
      </Card>
      {showMonitor ? <Monitor onChange={updatePcData} /> : <></>}
    </PageContainer>
  );
};

export default ToolPage;
