import { PageContainer } from '@ant-design/pro-components';
import { Access, useAccess } from '@umijs/max';
import { Button, Card } from 'antd';

const AccessPage: React.FC = () => {
  const access = useAccess();
  return (
    <PageContainer
      ghost
      header={{
        title: '权限示例1',
      }}
    >
      <Access accessible={access.login}>
		<Button>只有 Admin 可以看到这个按钮</Button>
		
      </Access>
    </PageContainer>
  );
};

export default AccessPage;
