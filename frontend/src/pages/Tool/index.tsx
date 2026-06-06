import { getPcStats, shutdown } from '@/services/lsdb/LsdbController';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Alert, Button, Card, Flex, message, Switch, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import Monitor from './components/Monitor';

type MonitorSample = {
  time: string;
  value: number | Record<string, number>;
};

const NETWORK_METRICS = [
  {
    key: 'uploadSpeed',
    label: '上传速度',
    color: 'rgb(54, 162, 235)',
    fillColor: 'rgba(54, 162, 235, 0.2)',
  },
  {
    key: 'downloadSpeed',
    label: '下载速度',
    color: 'rgb(255, 99, 132)',
    fillColor: 'rgba(255, 99, 132, 0.2)',
  },
];

const formatMonitorValue = (value: number, unit: string) =>
  `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;

const ToolPage: React.FC = () => {
  const intl = useIntl();
  const [loading, setLoading] = useState<string>('');
  const [messageApi, contextHolder] = message.useMessage();
  const [showMonitor, setShowMonitor] = useState<boolean>(false);
  const [cpuSample, setCpuSample] = useState<MonitorSample>();
  const [networkSample, setNetworkSample] = useState<MonitorSample>();

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

  const updatePcData = useCallback(async () => {
    try {
      const res = await getPcStats();
      if (res?.success && res.data?.time) {
        setCpuSample({
          time: res.data.time,
          value: res.data.cpu ?? 0,
        });
        setNetworkSample({
          time: res.data.time,
          value: {
            uploadSpeed: res.data.uploadSpeed ?? 0,
            downloadSpeed: res.data.downloadSpeed ?? 0,
          },
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (!showMonitor) {
      return;
    }

    updatePcData();
    const intervalId = setInterval(updatePcData, 1000);

    return () => clearInterval(intervalId);
  }, [showMonitor, updatePcData]);

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
            <Typography.Text strong>{'监控'}</Typography.Text>
            <Switch
              checkedChildren={'显示'}
              unCheckedChildren={'隐藏'}
              checked={showMonitor}
              onChange={(checked: boolean) => setShowMonitor(checked)}
              style={{ width: '5em' }}
            />
          </Flex>
          {showMonitor ? (
            <div style={styles.monitorGrid}>
              <Monitor
                title="实时 CPU 占用率 (%)"
                datasetLabel="CPU 占用率"
                yAxisTitle="占用率 (%)"
                min={0}
                max={100}
                sample={cpuSample}
                valueFormatter={(value) => formatMonitorValue(value, '%')}
              />
              <Monitor
                title="实时网络速度"
                yAxisTitle="速度 (MB/s)"
                min={0}
                autoScaleY
                metrics={NETWORK_METRICS}
                sample={networkSample}
                valueFormatter={(value) => formatMonitorValue(value, 'MB/s')}
              />
            </div>
          ) : (
            <></>
          )}
        </Flex>
      </Card>
    </PageContainer>
  );
};

const styles = {
  monitorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))',
    gap: '16px',
    width: '100%',
  },
};

export default ToolPage;
