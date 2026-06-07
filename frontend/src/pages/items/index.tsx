import { CONFIG } from '@/constants';
import UnauthorizedResult from '@/components/UnauthorizedResult';
import '@/search.css';
import lsdbServices from '@/services/lsdb';
import { resolveSearchPramUrl } from '@/utils/resource';
import {
  CalendarOutlined,
  CloseCircleOutlined,
  DownOutlined,
  OrderedListOutlined,
  SaveOutlined,
  SettingOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProCard,
  ProForm,
  ProFormDatePicker,
  ProFormGroup,
  ProFormInstance,
  ProFormRadio,
  ProFormSelect,
} from '@ant-design/pro-components';
import {
  createSearchParams,
  useAccess,
  useIntl,
  useLocation,
  useModel,
  useNavigate,
} from '@umijs/max';
import type { MenuProps } from 'antd';
import {
  Alert,
  Avatar,
  Button,
  Col,
  Collapse,
  Dropdown,
  Empty,
  Flex,
  FloatButton,
  Pagination,
  Radio,
  Row,
  Select,
  Skeleton,
  Space,
  Switch,
  Tag,
  Typography,
  message,
  theme,
} from 'antd';
import type { CheckboxGroupProps } from 'antd/es/checkbox';
import React, { useEffect, useRef, useState } from 'react';
import useAntdMediaQuery from 'use-media-antd-query';
import Item from './components/Item';

import EditItem from './components/EditItem';

const { queryItemList } = lsdbServices.LsdbController;

type MenuItem = Required<MenuProps>['items'][number];
const menuItems: MenuItem[] = [
  {
    label: 'Submenu',
    key: 'SubMenu',
    icon: <SettingOutlined />,
    children: [
      {
        type: 'group',
        label: 'Item 1',
        children: [
          { label: 'Option 1', key: 'setting:1' },
          { label: 'Option 2', key: 'setting:2' },
        ],
      },
      {
        type: 'group',
        label: 'Item 2',
        children: [
          { label: 'Option 3', key: 'setting:3' },
          { label: 'Option 4', key: 'setting:4' },
        ],
      },
    ],
  },
];

const ItemPage: React.FC = () => {
  const { token } = theme.useToken();
  const location = useLocation();
  const intl = useIntl();
  const faviMess = intl.formatMessage({ id: 'favi' });
  let navigate = useNavigate();
  const colSize = useAntdMediaQuery();
  const [messageApi, contextHolder] = message.useMessage();

  const access = useAccess();
  const { refresh } = useModel('@@initialState');
  const { searchInfo, setSearchInfo } = useModel('search');
  const [mySearchInfo, setMySearchInfo] = useState<any>(undefined);
  const [searchModified, setSearchModified] = useState<string>('');

  function getSearchJson() {
    var param: any = {};
    const searchParam = createSearchParams(location.search);
    searchParam.forEach((value, key) => {
      param[key] = value;
    });
    if (!(searchModified?.length > 0)) {
      if (!('sort' in param) && searchInfo && searchInfo?.sort) {
        param['sort'] = searchInfo?.sort;
      }
    }
    return param;
  }

  const [loading, setLoading] = useState<boolean>(true);
  const [loadSuccess, setLoadSuccess] = useState<boolean>(false);
  const [pageInfo, setPageInfo] = useState<LSDB.PageInfo_ITEMInfo_>();
  const [filterShow, setFilterShow] = useState<boolean>(true);
  const filterFormRef = useRef<ProFormInstance>();
  const [editItemData] = useState<any>({ id: 0 });
  const [newDrawerVisit, setNewDrawerVisit] = useState(false);

  function showMessage(args: any) {
    messageApi.open(args);
  }
  function refreshTitle() {
    if (pageInfo?.title) {
      var title = intl.formatMessage(
        { id: 'pageMsg' },
        {
          page: pageInfo?.current,
          pages: pageInfo?.pages,
          info:
            'all' === pageInfo?.title
              ? intl.formatMessage({ id: 'all' })
              : pageInfo?.title,
        },
      );
      document.title = title;
    }
  }
  function storeItemData() {
    localStorage.setItem(location.key, JSON.stringify(pageInfo));
  }
  async function queryItems(params: any) {
    const { data, success } = await queryItemList({
      ...params,
    });
    if (data && success) {
      data.key = location.key;
      setPageInfo(data);
      localStorage.setItem(location.key, JSON.stringify(data));
      setLoadSuccess(success);
    } else {
      setPageInfo(undefined);
      setLoadSuccess(false);
      await refresh();
    }
    setLoading(false);
  }
  useEffect(() => {
    setLoading(true);
    window.onbeforeunload = () => {
      localStorage.clear();
    };
    //console.log(location.key);
    let storedPage = localStorage.getItem(location.key);
    if (storedPage && storedPage != 'undefined') {
      let storedPageInfo = JSON.parse(storedPage);
      setPageInfo(storedPageInfo);

      setLoadSuccess(true);
      setLoading(false);
    } else {
      let param = getSearchJson();
      queryItems(param);
    }
    let scrollTop = 0;
    function handleScroll() {
      if (document.documentElement.scrollTop) {
        scrollTop = document.documentElement.scrollTop;
        //console.log('scrollTop ' + scrollTop);
      }
    }
    window.addEventListener('scroll', handleScroll);
    return () => {
      //console.log('save scrollTop ' + scrollTop);
      window.removeEventListener('scroll', handleScroll);
      localStorage.setItem(location.key + '-scrollTop', String(scrollTop));
    };
  }, [location]);

  useEffect(() => {
    setSearchModified('');
    if (pageInfo) {
      setSearchInfo({ ...pageInfo });
      refreshTitle();
      let storedScroll = localStorage.getItem(location.key + '-scrollTop');
      //console.log('read ' + Number(storedScroll));
      let storeScrollTop = Number(storedScroll);
      window.scrollTo(0, storeScrollTop);
    }
    filterFormRef?.current?.resetFields();
  }, [pageInfo]);

  useEffect(() => {
    if (searchModified?.length > 0) {
      let queryParam = getSearchJson();
      queryParam.sort = searchModified == 'createAt' ? '' : searchModified;
      queryParam.page = 1;
      let queryString = resolveSearchPramUrl(queryParam);
      navigate(
        '../' + CONFIG.searchUrl + ('' == queryString ? '' : '?' + queryString),
        { replace: false, state: { shouldRefresh: true } },
      );
    }
  }, [searchModified]);

  let baseMap: any = {};
  let baseItems: any = [];
  const baseMenuItemMap: Record<string, any> = {};
  const baseItemList: MenuProps['items'] = [];
  CONFIG.resBaseList.forEach((baseItem: any) => {
    baseMap[baseItem.name] = baseItem.label;
    baseItems.push({
      value: baseItem.name,
      label: baseItem.label,
    });
    baseMenuItemMap[baseItem.name] = {
      key: baseItem.name,
      label: baseItem.label,
    };
  });
  CONFIG.resBaseList.forEach((baseItem: any) => {
    const menuItem = baseMenuItemMap[baseItem.name];
    if (baseItem.parent && baseMenuItemMap[baseItem.parent]) {
      if (!baseMenuItemMap[baseItem.parent].children) {
        baseMenuItemMap[baseItem.parent].children = [];
      }
      baseMenuItemMap[baseItem.parent].children.push(menuItem);
      return;
    }
    baseItemList.push(menuItem);
  });
  const getBaseLabel = (baseName: string) => {
    let baseKey = baseName ? baseName : '';
    return baseKey in baseMap ? baseMap[baseKey] : undefined;
  };
  let typeMap: any = {};
  let typeItems: any = [];
  const typeItemList: CheckboxGroupProps<string>['options'] =
    CONFIG.resTypeList.map((typeItem: any) => {
      typeMap[typeItem.name] = typeItem.label;
      typeItems.push({
        value: typeItem.name,
        label: typeItem.label,
      });
      return {
        value: typeItem.name,
        label: typeItem.label,
      };
    });
  const getTypeLabel = (typeName: string) => {
    return intl.formatMessage({
      id: typeMap[typeName ? typeName : ''],
    });
  };
  const sortItems: MenuProps['items'] = [
    {
      key: 'date',
      label: intl.formatMessage({
        id: 'date',
      }),
      icon: <OrderedListOutlined />,
    },
    {
      key: '',
      label: intl.formatMessage({
        id: 'createAt',
      }),
      icon: <CalendarOutlined />,
    },
  ];
  const getSortLabel = (sort: string) => {
    let sortMess;
    for (var i in sortItems) {
      var sortitem = sortItems[i];
      if (sort == sortitem?.key) {
        sortMess = sortitem?.label;
      }
    }
    return sortMess;
  };
  const getSortIcon = (sort: string) => {
    let sortMess;
    for (var i in sortItems) {
      var sortitem = sortItems[i];
      if (sort == sortitem?.key) {
        sortMess = sortitem?.icon;
      }
    }
    return sortMess;
  };
  const onBaseClick: MenuProps['onClick'] = ({ key }) => {
    let queryParam = getSearchJson();
    queryParam.base = key;
    queryParam.page = 1;
    let queryString = resolveSearchPramUrl(queryParam);
    navigate(
      '../' + CONFIG.searchUrl + ('' == queryString ? '' : '?' + queryString),
      { replace: false, state: { shouldRefresh: true } },
    );
  };
  const onTypeClick = (e: any) => {
    let queryParam = getSearchJson();
    queryParam.type = e.target.value;
    queryParam.page = 1;
    let queryString = resolveSearchPramUrl(queryParam);
    navigate(
      '../' + CONFIG.searchUrl + ('' == queryString ? '' : '?' + queryString),
      { replace: false, state: { shouldRefresh: true } },
    );
  };
  const onSortClick: MenuProps['onClick'] = ({ key }) => {
    setSearchModified(key == '' ? 'createAt' : key);
  };

  const selectMenu = (item: any) => {
    console.log(item);
  };

  const selectPage = (page: number, pageSize: number) => {
    let params = getSearchJson();
    params.page = page;
    params.pageSize = pageSize;
    let queryString = resolveSearchPramUrl(params);
    navigate(
      '../' + CONFIG.searchUrl + ('' == queryString ? '' : '?' + queryString),
      { replace: false, state: { shouldRefresh: true } },
    );
    // history.push(CONFIG.searchUrl + ('' == queryString ? '' : '?' + queryString));
  };
  const selectFavi = (checked: boolean) => {
    let params = getSearchJson();
    params.favi = checked;
    params.page = 1;
    let queryString = resolveSearchPramUrl(params);
    navigate(
      '../' + CONFIG.searchUrl + ('' == queryString ? '' : '?' + queryString),
      { replace: false, state: { shouldRefresh: true } },
    );
  };
  const applySearch = () => {
    const values = filterFormRef.current?.getFieldsFormatValue?.();
    // console.log(values);
    let params = getSearchJson();
    let keyword = '';
    for (var index in values?.keyword) {
      let keywordValue = values.keyword[index];
      if (keywordValue?.length > 0)
        keyword = keyword + (keyword.length > 0 ? ';' : '') + keywordValue;
    }
    params.keyword = keyword;
    let categories = '';
    for (var index in values?.category) {
      let category = values.category[index];
      if (category?.length > 0)
        categories = categories + (categories.length > 0 ? ';' : '') + category;
    }
    params.category = categories;
    let tags = '';
    for (var index in values?.tag) {
      let tag = values.tag[index];
      if (tag?.length > 0) tags = tags + (tags.length > 0 ? ';' : '') + tag;
    }
    params.tag = tags;
    let dateFrom = '';
    if (values?.dateFrom?.length > 0) {
      dateFrom = values?.dateFrom;
    }
    params.dateFrom = dateFrom;
    let dateTo = '';
    if (values?.dateTo?.length > 0) {
      dateTo = values?.dateTo;
    }
    params.dateTo = dateTo;
    params.matchMode = values?.matchMode;
    params.page = 1;
    let queryString = resolveSearchPramUrl(params);
    //console.log(queryString);
    navigate(
      '../' + CONFIG.searchUrl + ('' == queryString ? '' : '?' + queryString),
      { replace: false, state: { shouldRefresh: true } },
    );
  };

  const BaseTypeList = () => {
    return (
      <Row justify="space-around" align="middle" gutter={[0, 5]}>
        <Col xs={24} sm={24} md={12} lg={12} xl={12}>
          <Flex justify="flex-start" align="center" gap="large" wrap>
            <Radio.Group
              className="base-type-radio-group"
              disabled={loading}
              options={typeItemList}
              defaultValue={pageInfo?.type ? pageInfo?.type : ''}
              optionType="button"
              buttonStyle="solid"
              size="middle"
              onChange={onTypeClick}
            ></Radio.Group>
          </Flex>
        </Col>
        {colSize == 'xs' || colSize == 'sm' ? (
          <>
            <Col xs={24} sm={colSize == 'sm' ? 4 : 24} md={12} lg={12} xl={12}>
              <Flex justify="flex-start" align="center" wrap gap="large">
                <Switch
                  loading={loading}
                  checkedChildren={faviMess}
                  unCheckedChildren={faviMess}
                  checked={pageInfo?.favi}
                  onChange={selectFavi}
                />
              </Flex>
            </Col>
            <Col xs={24} sm={colSize == 'sm' ? 20 : 24} md={12} lg={12} xl={12}>
              <Flex
                justify={colSize == 'sm' ? 'flex-end' : 'flex-start'}
                align="center"
                wrap
                gap="large"
              >
                <Dropdown
                  disabled={loading}
                  menu={{
                    items: baseItemList,
                    selectable: true,
                    defaultSelectedKeys: [],
                    selectedKeys: [pageInfo?.base],
                    onClick: onBaseClick,
                  }}
                >
                  <a onClick={(e) => e.preventDefault()}>
                    <Space>
                      <UnorderedListOutlined />
                      <Typography.Text>
                        {getBaseLabel(pageInfo?.base)?.slice(0, 20)}
                      </Typography.Text>
                      <DownOutlined />
                    </Space>
                  </a>
                </Dropdown>
                <Dropdown
                  disabled={loading}
                  menu={{
                    items: sortItems,
                    selectable: true,
                    defaultSelectedKeys: [],
                    selectedKeys: [pageInfo?.sort],
                    onClick: onSortClick,
                  }}
                >
                  <a onClick={(e) => e.preventDefault()}>
                    <Space>
                      {getSortIcon(pageInfo?.sort)}
                      <Typography.Text>
                        {getSortLabel(pageInfo?.sort)}
                      </Typography.Text>
                      <DownOutlined />
                    </Space>
                  </a>
                </Dropdown>
              </Flex>
            </Col>
          </>
        ) : (
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <Flex justify={'flex-end'} align="center" wrap gap="large">
              <Switch
                loading={loading}
                checkedChildren={faviMess}
                unCheckedChildren={faviMess}
                checked={pageInfo?.favi}
                onChange={selectFavi}
              />
              <Dropdown
                disabled={loading}
                menu={{
                  items: baseItemList,
                  selectable: true,
                  defaultSelectedKeys: [],
                  selectedKeys: [pageInfo?.base],
                  onClick: onBaseClick,
                }}
              >
                <a onClick={(e) => e.preventDefault()}>
                  <Space>
                    <UnorderedListOutlined />
                    <Typography.Text>
                      {getBaseLabel(pageInfo?.base)?.slice(0, 20)}
                    </Typography.Text>
                    <DownOutlined />
                  </Space>
                </a>
              </Dropdown>
              <Dropdown
                disabled={loading}
                menu={{
                  items: sortItems,
                  selectable: true,
                  defaultSelectedKeys: [],
                  selectedKeys: [pageInfo?.sort],
                  onClick: onSortClick,
                }}
              >
                <a onClick={(e) => e.preventDefault()}>
                  <Space>
                    {getSortIcon(pageInfo?.sort)}
                    <Typography.Text>
                      {getSortLabel(pageInfo?.sort)}
                    </Typography.Text>
                    <DownOutlined />
                  </Space>
                </a>
              </Dropdown>
            </Flex>
          </Col>
        )}
      </Row>
    );
  };

  const headerForm = (
    <Select defaultValue="" style={{ minWidth: '15em' }} options={baseItems} />
  );

  return loadSuccess ? (
    <PageContainer
      ghost
      header={{
        title: '',
        className: 'pageHeader',
        breadcrumbRender: () => {
          return (
            <Collapse
              collapsible="icon"
              bordered={true}
              items={[
                {
                  key: 'def',
                  label: <BaseTypeList />,
                  children: (
                    <ProCard ghost variant={'borderless'}>
                      <ProForm
                        disabled={loading}
                        layout="horizontal"
                        formRef={filterFormRef}
                        grid
                        submitter={{
                          render: (_, dom) => (
                            <Space>
                              <Button
                                type="primary"
                                danger
                                ghost
                                icon={<CloseCircleOutlined />}
                                onClick={() => {
                                  filterFormRef?.current?.resetFields();
                                }}
                              >
                                {intl.formatMessage({ id: 'reset' })}
                              </Button>
                              <Button
                                type="primary"
                                danger
                                ghost
                                icon={<SaveOutlined />}
                                onClick={() => {
                                  applySearch();
                                }}
                              >
                                {intl.formatMessage({ id: 'apply' })}
                              </Button>
                            </Space>
                          ),
                        }}
                        onFinish={async (values) => console.log(values)}
                      >
                        <ProFormSelect
                          name="keyword"
                          label={intl.formatMessage({ id: 'keyword' })}
                          fieldProps={{
                            mode: 'tags',
                          }}
                          initialValue={
                            pageInfo?.keyword?.length > 0
                              ? pageInfo?.keyword
                              : undefined
                          }
                        />
                        <ProFormSelect
                          name="category"
                          label={intl.formatMessage({ id: 'category' })}
                          fieldProps={{
                            mode: 'tags',
                          }}
                          initialValue={
                            pageInfo?.category?.length > 0
                              ? pageInfo?.category
                              : undefined
                          }
                        />
                        <ProFormSelect
                          name="tag"
                          label={intl.formatMessage({ id: 'tag' })}
                          fieldProps={{
                            mode: 'tags',
                          }}
                          initialValue={
                            pageInfo?.tag?.length > 0
                              ? pageInfo?.tag
                              : undefined
                          }
                        />
                        <ProFormGroup>
                          <ProFormDatePicker
                            name="dateFrom"
                            label={intl.formatMessage({ id: 'dateFrom' })}
                            fieldProps={{}}
                            colProps={{ span: 12 }}
                            initialValue={
                              pageInfo?.dateFrom?.length > 0
                                ? pageInfo?.dateFrom
                                : undefined
                            }
                          />
                          <ProFormDatePicker
                            name="dateTo"
                            label={intl.formatMessage({ id: 'dateTo' })}
                            fieldProps={{}}
                            colProps={{ span: 12 }}
                            initialValue={
                              pageInfo?.dateTo?.length > 0
                                ? pageInfo?.dateTo
                                : undefined
                            }
                          />
                        </ProFormGroup>
                        <ProFormRadio.Group
                          name="matchMode"
                          label={intl.formatMessage({ id: 'matchMode' })}
                          fieldProps={{
                            options: [
                              {
                                value: '',
                                label: intl.formatMessage({ id: 'matchAnd' }),
                              },
                              {
                                value: 'or',
                                label: intl.formatMessage({ id: 'matchOr' }),
                              },
                            ],
                            defaultValue: '',
                            optionType: 'button',
                            size: 'middle',
                          }}
                          initialValue={
                            pageInfo?.matchMode?.length > 0
                              ? pageInfo?.matchMode
                              : ''
                          }
                        ></ProFormRadio.Group>
                      </ProForm>
                    </ProCard>
                  ),
                },
              ]}
            />
          );
        },
      }}
      loading={loading}
    >
      {contextHolder}
      <Alert
        title={
          <Space wrap>
            <Flex gap="4px" wrap>
              {pageInfo?.keyword?.map((keyword: any) => {
                return (
                  <Tag key={'keyword-' + keyword} variant="outlined">
                    {keyword}
                  </Tag>
                );
              })}
              {pageInfo?.category?.map((category: any) => {
                return (
                  <Tag
                    key={'category-' + category}
                    color={'red'}
                    variant="outlined"
                  >
                    {category}
                  </Tag>
                );
              })}
              {pageInfo?.tag?.map((tag: any) => {
                return (
                  <Tag
                    key={tag.type + '-' + tag}
                    color={'green'}
                    variant="outlined"
                  >
                    {tag}
                  </Tag>
                );
              })}
            </Flex>
            {intl.formatMessage(
              { id: 'totalMsg' },
              {
                total: pageInfo?.total,
                pages: pageInfo?.pages,
                costTime: pageInfo?.costTime,
              },
            )}
          </Space>
        }
        description={
          pageInfo?.roleList?.length > 0 ? (
            <Flex style={{ padding: '0 0' }} wrap gap="4px 4px">
              {pageInfo?.roleList?.map((nameItem: any) => {
                const roleClick = () => {
                  navigate('./role?id=' + nameItem.id);
                };
                return (
                  <Button
                    key={nameItem?.tagIndex}
                    onClick={roleClick}
                    shape="round"
                    icon={
                      <Avatar src={CONFIG.apiUrl + nameItem?.imageSrc}></Avatar>
                    }
                    size="large"
                    danger
                    style={{
                      paddingInline: '0.5em',
                      fontWeight: 'bold',
                      color: token.colorPrimary,
                    }}
                  >
                    {nameItem.name}
                  </Button>
                );
              })}
            </Flex>
          ) : (
            <></>
          )
        }
        type="info"
        showIcon={false}
        style={{ margin: '0 0 5px 0' }}
      />
      {pageInfo?.pages && pageInfo.pages > 0 ? (
        <>
          <Item
            loading={loading}
            pageInfo={pageInfo}
            itemUpdate={storeItemData}
          ></Item>
          <Pagination
            style={{ padding: '2rem 0' }}
            onChange={selectPage}
            current={pageInfo?.page}
            defaultCurrent={pageInfo?.page}
            pageSize={pageInfo?.pageSize}
            defaultPageSize={pageInfo?.pageSize}
            total={pageInfo?.total}
            responsive
          />
          <FloatButton.Group
            shape="circle"
            type="primary"
            style={{ insetInlineEnd: 24 }}
          >
            <FloatButton.BackTop visibilityHeight={500} />
          </FloatButton.Group>
        </>
      ) : (
        <Empty></Empty>
      )}
      <EditItem
        fromItemData={editItemData}
        drawerVisit={newDrawerVisit}
        setDrawerVisit={setNewDrawerVisit}
        showMessage={showMessage}
      ></EditItem>
    </PageContainer>
  ) : (
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
      <Skeleton loading={loading}>
        <UnauthorizedResult />
      </Skeleton>
    </PageContainer>
  );
};

export default ItemPage;
