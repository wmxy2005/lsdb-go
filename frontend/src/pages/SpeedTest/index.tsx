import { PageContainer } from '@ant-design/pro-components';
import { Access, useAccess, useIntl } from '@umijs/max';
import { Flex, Button, Card, message, Alert } from 'antd';
import { useState, useEffect } from 'react';
import { CONFIG } from '@/constants';

const SpeedTestPage: React.FC = () => {
  const access = useAccess();
  const intl = useIntl();
  const [ loading, setLoading ] = useState<string>('');
  const [messageApi, contextHolder] = message.useMessage();
 
  return (
    <PageContainer
      ghost
      header={{
        title: '',
        breadcrumbRender: ()=>{
          return <Alert description={intl.formatMessage({ id: 'menu.speedTest',})}></Alert>;
        }
      }}
    >
      {contextHolder}
      
      
      <iframe id="speedtest" src={ CONFIG.apiUrl + '/speedtest_frame'} style={{width : '100%', minHeight : '42em', border : 0, borderRadius: '8px'}}>
	    </iframe>
      
      
    </PageContainer>
  );
};

export default SpeedTestPage;
