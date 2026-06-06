import { getPcStatsStreamUrl, shutdown } from '@/services/lsdb/LsdbController';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Alert, Button, Card, Flex, message, Switch, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import Monitor from './components/Monitor';

type MonitorSample = {
  time: string;
  value: number | Record<string, number>;
};

type PCStreamSample = {
  time?: string;
  cpu?: number;
  uploadSpeed?: number;
  downloadSpeed?: number;
};

const formatMonitorValue = (value: number, unit: string) =>
  `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;

const ToolPage: React.FC = () => {
  const intl = useIntl();
  const [loading, setLoading] = useState<string>('');
  const [messageApi, contextHolder] = message.useMessage();
  const [showMonitor, setShowMonitor] = useState<boolean>(false);
  const [cpuSample, setCpuSample] = useState<MonitorSample>();
  const [networkSample, setNetworkSample] = useState<MonitorSample>();
  const networkMetrics = useMemo(
    () => [
      {
        key: 'uploadSpeed',
        label: intl.formatMessage({ id: 'tool.monitor.network.uploadSpeed' }),
        color: 'rgb(54, 162, 235)',
        fillColor: 'rgba(54, 162, 235, 0.2)',
      },
      {
        key: 'downloadSpeed',
        label: intl.formatMessage({
          id: 'tool.monitor.network.downloadSpeed',
        }),
        color: 'rgb(255, 99, 132)',
        fillColor: 'rgba(255, 99, 132, 0.2)',
      },
    ],
    [intl],
  );

  const shutdownClick = async (status: string) => {
    setLoading(status);
    const res = await shutdown(status === 'restart');
    if (res?.success) {
      messageApi.info(intl.formatMessage({ id: 'success' }));
    } else {
      messageApi.error(res?.message);
    }
    setTimeout(() => {
      setLoading('');
    }, 1000);
  };

  useEffect(() => {
    if (!showMonitor) {
      return;
    }

    const streamUrl = getPcStatsStreamUrl();
    let active = true;
    const eventSource = new EventSource(streamUrl, {
      withCredentials: true,
    });

    const handleMessage = (event: MessageEvent<string>) => {
      let data: PCStreamSample;
      try {
        data = JSON.parse(event.data) as PCStreamSample;
      } catch (err) {
        console.error(err);
        return;
      }
      if (!active || !data.time) {
        return;
      }
      setCpuSample({
        time: data.time,
        value: data.cpu ?? 0,
      });
      setNetworkSample({
        time: data.time,
        value: {
          uploadSpeed: data.uploadSpeed ?? 0,
          downloadSpeed: data.downloadSpeed ?? 0,
        },
      });
    };

    eventSource.onmessage = handleMessage;
    eventSource.addEventListener('message', handleMessage);

    eventSource.onerror = () => {
      if (!active) {
        return;
      }
      active = false;
      eventSource.close();
      setShowMonitor(false);
      console.error('PC monitor SSE connection failed');
      messageApi.error(
        intl.formatMessage({ id: 'tool.monitor.connectionClosed' }),
      );
    };

    return () => {
      active = false;
      eventSource.removeEventListener('message', handleMessage);
      eventSource.close();
    };
  }, [intl, messageApi, showMonitor]);

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
            <Typography.Text strong>
              {intl.formatMessage({ id: 'tool.monitor.label' })}
            </Typography.Text>
            <Switch
              checkedChildren={intl.formatMessage({
                id: 'tool.monitor.show',
              })}
              unCheckedChildren={intl.formatMessage({
                id: 'tool.monitor.hide',
              })}
              checked={showMonitor}
              onChange={(checked: boolean) => setShowMonitor(checked)}
              style={{ width: '5em' }}
            />
          </Flex>
          {showMonitor ? (
            <div style={styles.monitorGrid}>
              <Monitor
                title={intl.formatMessage({ id: 'tool.monitor.cpu.title' })}
                datasetLabel={intl.formatMessage({
                  id: 'tool.monitor.cpu.dataset',
                })}
                yAxisTitle={intl.formatMessage({
                  id: 'tool.monitor.cpu.yAxis',
                })}
                xAxisTitle={intl.formatMessage({
                  id: 'tool.monitor.xAxis',
                })}
                emptyValueText={intl.formatMessage({
                  id: 'tool.monitor.emptyValue',
                })}
                min={0}
                max={100}
                sample={cpuSample}
                valueFormatter={(value) => formatMonitorValue(value, '%')}
              />
              <Monitor
                title={intl.formatMessage({
                  id: 'tool.monitor.network.title',
                })}
                yAxisTitle={intl.formatMessage({
                  id: 'tool.monitor.network.yAxis',
                })}
                xAxisTitle={intl.formatMessage({
                  id: 'tool.monitor.xAxis',
                })}
                emptyValueText={intl.formatMessage({
                  id: 'tool.monitor.emptyValue',
                })}
                min={0}
                autoScaleY
                metrics={networkMetrics}
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
