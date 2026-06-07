import { CONFIG } from '@/constants';
import UnauthorizedResult from '@/components/UnauthorizedResult';
import '@/role.css';
import lsdbServices from '@/services/lsdb';
import { openFolder } from '@/services/lsdb/LsdbController';
import { resolvePath, resolveTagColor, resolveTagUrl } from '@/utils/resource';
import { CalendarOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  createSearchParams,
  useIntl,
  useLocation,
  useModel,
  useNavigate,
} from '@umijs/max';
import {
  Button,
  Col,
  Empty,
  Flex,
  FloatButton,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
  theme,
} from 'antd';
import { useEffect, useState } from 'react';

const { Title, Paragraph, Text, Link } = Typography;
const { queryRole } = lsdbServices.LsdbController;

export default function RolePage() {
  const { searchInfo } = useModel('search');
  const { token } = theme.useToken();
  const [messageApi, contextHolder] = message.useMessage();
  const location = useLocation();
  const intl = useIntl();
  const searchParam = createSearchParams(location.search);
  const roleId = Number(searchParam.get('id'));

  const [roleData, setRoleData] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [loadSuccess, setLoadSuccess] = useState<boolean>(true);
  const [folderOpen, setFolderOpen] = useState<boolean>(false);

  let navigate = useNavigate();
  const { refresh } = useModel('@@initialState');

  async function refreshRole() {
    try {
      const { data, success } = await queryRole(roleId, {});
      setLoading(false);
      if (success) {
        setLoadSuccess(success);
        if (data) {
          if (data?.title) {
            document.title = data?.title;
          }
          setRoleData(data);
        } else {
          setRoleData(undefined);
        }
      } else {
        setLoadSuccess(false);
        setRoleData(undefined);
        await refresh();
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    refreshRole();
  }, []);

  const queryTagItems = async (tagType: string, tag: string) => {
    let queryString = resolveTagUrl(tagType, tag, searchInfo);
    navigate('..' + queryString, { replace: false });
  };

  const openFolderClick = async () => {
    setFolderOpen(true);
    try {
      const folderPath = resolvePath(
        undefined,
        roleData?.base,
        '',
        '',
        'e' + roleData?.id,
        '',
      );
      const res = await openFolder(folderPath);
      if (res?.success) {
        messageApi.info('success');
      } else {
        messageApi.error(res?.message || 'Failed to open folder');
      }
    } catch (err) {
      console.error(err);
    }
    const timer = setTimeout(() => {
      setFolderOpen(false);
    }, 1000);
  };

  return loadSuccess ? (
    roleData || loading ? (
      <PageContainer
        ghost
        header={{
          title: '',
          className: 'pageHeader',
          breadcrumbRender: () => {
            return <></>;
          },
        }}
      >
        {contextHolder}
        <Skeleton loading={loading}>
          <Typography>
            <Title>{roleData?.title}</Title>
          </Typography>
          <Flex wrap justify="start" align="flex-start">
            {roleData?.imageList?.map((nameItem: any) => {
              return (
                <img
                  key={'img-' + nameItem?.nameIndex}
                  style={{ maxWidth: 150, height: 'auto' }}
                  src={CONFIG.apiUrl + nameItem?.imageSrc}
                />
              );
            })}
          </Flex>
          <Flex style={{ padding: '1em 0' }} wrap gap="4px">
            {roleData?.nameList?.map((nameItem: any) => {
              // const tagUrl = resolveTagUrl(tag.type, tag.value);
              const tagClick = () => {
                queryTagItems('tag', nameItem.name);
              };
              return (
                <a key={'tag-' + nameItem?.nameIndex}>
                  <Tag
                    color={resolveTagColor('tag', nameItem?.nameIndex)}
                    onClick={tagClick}
                    variant="outlined"
                  >
                    {nameItem.name}
                  </Tag>
                </a>
              );
            })}
          </Flex>

          <Typography>
            <Row align="middle" justify="space-between">
              <Col span={12}>
                <Space align="center">
                  <CalendarOutlined />
                  <Typography.Text strong>{roleData?.date}</Typography.Text>
                </Space>
              </Col>
              <Col span={12}>
                <Flex gap={'small'} justify={'flex-end'}>
                  <Button
                    type="primary"
                    size="small"
                    loading={folderOpen}
                    danger
                    ghost
                    icon={<FolderOpenOutlined />}
                    onClick={() => {
                      openFolderClick();
                    }}
                  >
                    {intl.formatMessage({
                      id: 'open',
                    })}
                  </Button>
                  {/* <Button type="primary" size="small" disabled danger ghost icon={<EditOutlined />} onClick={()=> {}}>
            {intl.formatMessage({
              id: 'edit',
            })}
            </Button> */}
                </Flex>
              </Col>
            </Row>
            {/* <Paragraph>{roleData?.remark}</Paragraph> */}
          </Typography>
          <Flex>
            <div
              dangerouslySetInnerHTML={{ __html: roleData?.remark }}
              className="innerhtml"
            />
          </Flex>
          <FloatButton.Group
            shape="circle"
            type="primary"
            style={{ insetInlineEnd: 24 }}
          >
            <FloatButton.BackTop visibilityHeight={500} />
          </FloatButton.Group>
        </Skeleton>
      </PageContainer>
    ) : (
      <Empty></Empty>
    )
  ) : (
    <UnauthorizedResult />
  );
}
