import { CONFIG } from '@/constants';
import lsdbServices from '@/services/lsdb';
import { openFolder } from '@/services/lsdb/LsdbController';
import { formatTimestamp } from '@/utils/format';
import {
  resolveBaseColor,
  resolvePath,
  resolveTagColor,
  resolveTagUrl,
  resolveUrl,
} from '@/utils/resource';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  HeartOutlined,
  HeartTwoTone,
  LoadingOutlined,
  SaveOutlined,
  SmileOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  FooterToolbar,
  PageContainer,
  ProForm,
  ProFormDatePicker,
  ProFormFieldSet,
  ProFormInstance,
  ProFormList,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { useIntl, useModel, useNavigate, useParams } from '@umijs/max';
import type { UploadFile } from 'antd';
import {
  Avatar,
  Breadcrumb,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  FloatButton,
  Image,
  Result,
  Row,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
  Masonry,
  message,
  theme,
} from 'antd';
import dayjs from 'dayjs';
import 'photoswipe/dist/photoswipe.css';
import { useEffect, useRef, useState } from 'react';
import { Gallery, Item } from 'react-photoswipe-gallery';
import Player from 'xgplayer';
import 'xgplayer/dist/index.min.css';
import ConsoleModal, { ConsoleLine } from './components/ConsoleModal';
import EditItem from './components/EditItem';
import EditTag from './components/EditTag';

const { Title, Paragraph, Text, Link } = Typography;
const { queryItem, updateItem, faviItem } = lsdbServices.LsdbController;

export default function ItemPage() {
  const { searchInfo } = useModel('search');
  const { token } = theme.useToken();
  const params = useParams();
  const [messageApi, contextHolder] = message.useMessage();
  const intl = useIntl();
  const [itemData, setItemData] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [loadSuccess, setLoadSuccess] = useState<boolean>(true);
  const [favi, setFavi] = useState(0);

  const [folderOpen, setFolderOpen] = useState<boolean>(false);
  const [folderSync, setFolderSync] = useState<boolean>(false);
  const [consoleOpen, setConsoleOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const formRef = useRef<ProFormInstance>();
  const [drawerVisit, setDrawerVisit] = useState(false);
  const [title, setTitle] = useState<string>('');
  const [date, setDate] = useState<dayjs.Dayjs>();
  const [content, setContent] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tags2, setTags2] = useState<string[]>([]);
  const [tags3, setTags3] = useState<string[]>([]);
  const [upload, setUpload] = useState<UploadFile[]>([]);

  let navigate = useNavigate();
  const { refresh } = useModel('@@initialState');

  const resetValues = function () {
    setTitle(itemData?.title);
    setDate(dayjs(itemData?.date));
    setContent(itemData?.content);
    const newTags: string[] = [];
    const newTags2: string[] = [];
    const newTags3: string[] = [];
    itemData?.tagList?.forEach((value: any, index) => {
      if (value.type === 'tag') {
        newTags.push(value.value);
      } else if (value.type === 'tag2') {
        newTags2.push(value.value);
      } else if (value.type === 'tag3') {
        newTags3.push(value.value);
      }
    });
    setTags(newTags);
    setTags2(newTags2);
    setTags3(newTags3);
  };

  const getUploadValues = function (data: any) {
    let upload: any = [];
    data?.fileList?.forEach((value: any, index: number) => {
      if (value?.type === 'file') {
        let uploadItem: any = {};
        // uploadItem.uid = index;
        uploadItem.name = value?.value;
        uploadItem.status = 'done';
        if (value?.thumbUrl) {
          uploadItem.thumbUrl = value?.thumbUrl;
        }
        uploadItem.url = resolveUrl(
          data?.base,
          data?.category,
          data?.subcategory,
          data?.name,
          value?.value,
        );
        upload.push(uploadItem);
      }
    });
    return upload;
  };

  const getUploadImages = function (data: any) {
    let upload: any = [];
    data?.imgList?.forEach((value: any, index: number) => {
      if (value?.type !== 'file') {
        let uploadItem: any = {};
        // uploadItem.uid = index;
        uploadItem.index = index;
        uploadItem.name = value?.value;
        uploadItem.status = 'done';
        uploadItem.url = resolveUrl(
          data?.base,
          data?.category,
          data?.subcategory,
          data?.name,
          value?.value,
        );
        uploadItem.src = uploadItem.url;
        uploadItem.width = value?.width;
        uploadItem.height = value?.height;
        upload.push(uploadItem);
      }
    });
    return upload;
  };

  let baseMap: any = {};
  CONFIG.resBaseList.map((baseItem: any) => {
    baseMap[baseItem.name] = baseItem.label;
  });
  const getBaseLabel = (baseName: string) => {
    if (baseMap) {
      return baseMap[baseName ? baseName : ''];
    }
    return baseName;
  };
  const baseLabel = getBaseLabel(itemData?.base);

  async function refreshItem() {
    try {
      const { data, success } = await queryItem(params.itemId, {});
      setLoading(false);
      if (success) {
        setLoadSuccess(success);
        if (data) {
          if (data?.title) {
            document.title = data?.title;
          }
          // setUpload(getUploadValues(data));
          data.upload = getUploadValues(data);
          data.uploadImage = getUploadImages(data);
          setItemData(data);
        } else {
          setItemData(undefined);
        }
      } else {
        setLoadSuccess(false);
        setItemData(undefined);
        await refresh();
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    refreshItem();
  }, []);

  useEffect(() => {
    resetValues();
    // formRef.current?.resetFields();
    let player: any;
    itemData?.trailer &&
      (player = new Player({
        id: 'xplayer',
        fluid: true,
        volume: 0.2,
        poster: resolveUrl(
          itemData?.base,
          itemData?.category,
          itemData?.subcategory,
          itemData?.name,
          itemData?.videoThumbnail,
        ),
        url: resolveUrl(
          itemData?.base,
          itemData?.category,
          itemData?.subcategory,
          itemData?.name,
          itemData?.trailer,
        ),
      }));
    return () => {
      player?.pause();
      player?.destroy();
    };
  }, [itemData]);

  async function saveItem() {
    setUpdating(true);
    const values = formRef.current?.getFieldsFormatValue?.();
    const data = { ...values };
    data.tags = tags;
    data.tags2 = tags2;
    data.tags3 = tags3;
    messageApi.open({
      key: 'itemUpdate',
      type: 'loading',
      content: 'Update in progress..',
      duration: 0,
    });
    try {
      const { success, errorMessage } = await updateItem(itemData?.id, data);
      if (success) {
        messageApi.open({
          key: 'itemUpdate',
          type: 'success',
          content: 'Updated!',
          duration: 2,
        });
        setUpdating(false);
        setDrawerVisit(false);
        refreshItem();
      } else {
        messageApi.open({
          key: 'itemUpdate',
          type: 'error',
          content: errorMessage,
          duration: 2,
        });
        setUpdating(false);
      }
    } catch (error) {
      messageApi.open({
        key: 'itemUpdate',
        type: 'error',
        content: 'Failed',
        duration: 2,
      });
      setUpdating(false);
    }
  }
  async function resetItem() {
    setUpdating(true);
    messageApi.open({
      key: 'itemUpdate',
      type: 'loading',
      content: 'Refresh in progress..',
      duration: 0,
    });
    try {
      await refreshItem();
      formRef.current?.resetFields();
      messageApi.open({
        key: 'itemUpdate',
        type: 'success',
        content: 'Refreshed!',
        duration: 2,
      });
      setUpdating(false);
    } catch (error) {
      messageApi.open({
        key: 'itemUpdate',
        type: 'error',
        content: 'Failed',
        duration: 2,
      });
      setUpdating(false);
    }
  }

  function showMessage(args: any) {
    messageApi.open(args);
  }

  // console.log(itemData);
  const faviClick = async () => {
    setFavi(itemData.id);
    let expired = itemData?.isFavi ? 1 : 0;
    const { success } = await faviItem(itemData.id, expired);
    if (success) {
      itemData.isFavi = expired == 0;
    }
    const timer = setTimeout(() => {
      setFavi(0);
    }, 200);
  };
  const openFolderClick = async () => {
    setFolderOpen(true);
    try {
      const res = await openFolder(
        resolvePath(
          undefined,
          itemData?.base,
          itemData?.category,
          itemData?.subcategory,
          itemData?.name,
          '',
        ),
      );
      if (res?.success) {
        messageApi.info('success');
      } else {
        messageApi.error(res?.message);
      }
    } catch (err) {
      console.error(err);
    }
    const timer = setTimeout(() => {
      setFolderOpen(false);
    }, 1000);
  };
  const syncFolderClick = async () => {
    setConsoleOpen(true);
  };
  const syncProcess = async (
    update: (lines: ConsoleLine[]) => void,
    stop: () => boolean,
  ) => {
    try {
      const formData = new FormData();
      formData.append('cmd', 'cd D:\\Repos\\xgzo_ce02\\procm\\procm & dir'); // 添加 cmd 参数

      const res = await fetch(CONFIG.apiUrl + '/api/process', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        update([
          { text: `HTTP ${res.status}: ${res.statusText}`, type: 'error' },
        ]);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        update([{ text: '无法获取响应流', type: 'error' }]);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        if (stop()) {
          reader.cancel();
          break;
        }

        try {
          const { done, value } = await reader.read();

          if (done) {
            // 处理剩余缓冲区数据
            if (buffer.trim()) {
              const { lines } = parseBufferToLines(buffer);
              if (lines.length > 0) {
                update(lines);
              }
            }
            break;
          }

          // 即时解码新数据块
          buffer += decoder.decode(value, { stream: true });

          // 处理完整的行
          const { lines, remainingBuffer } = parseBufferToLines(buffer);
          buffer = remainingBuffer; // 更新缓冲区
          if (lines.length > 0) {
            update(lines);
          }
        } catch (err) {
          update([{ text: `读取流数据错误: ${String(err)}`, type: 'error' }]);
          break;
        }
      }
    } catch (err) {
      update([{ text: `网络请求失败: ${String(err)}`, type: 'error' }]);
    }
  };

  // 辅助函数：解析缓冲区为行，返回解析的行和剩余缓冲区
  const parseBufferToLines = (
    buffer: string,
  ): { lines: ConsoleLine[]; remainingBuffer: string } => {
    const lines: ConsoleLine[] = [];
    const parts = buffer.split('\n');

    // 保留最后一行（可能不完整）
    const remainingBuffer = parts[parts.length - 1];

    for (let i = 0; i < parts.length - 1; i++) {
      const line = parts[i].trim();
      if (line) {
        try {
          // 尝试解析 JSON 格式的日志
          const parsed = JSON.parse(line);
          lines.push({
            text: parsed.text || line,
            type: parsed.type || 'info',
            timestamp: parsed.timestamp,
          });
        } catch {
          // 普通文本行
          lines.push({
            text: line,
            type: 'info',
            timestamp: formatTimestamp(),
          });
        }
      }
    }

    return { lines, remainingBuffer };
  };
  const startSyncProcess = async () => {
    const res = await fetch(
      CONFIG.apiUrl +
        '/api/cmd/sync?path=' +
        resolvePath(
          undefined,
          itemData?.base,
          itemData?.category,
          itemData?.subcategory,
          itemData?.name,
          '',
        ),
      {
        method: 'POST',
      },
    );
    const json = await res.json();
    if (json.success) {
      return json.data;
    }
    throw new Error(json.errorMessage || '启动同步失败');
  };
  const fetchSyncLogs = async (processId: string) => {
    const res = await fetch(
      CONFIG.apiUrl + '/api/cmd/sync/logs?processId=' + processId,
    );
    const json = await res.json();
    if (json.success) {
      return json.data || [];
    }
    throw new Error(json.errorMessage || '获取日志失败');
  };
  const baseClick = () => {
    queryTagItems('base', itemData.base);
  };
  const queryTagItems = async (tagType: string, tag: string) => {
    let queryString = resolveTagUrl(tagType, tag, searchInfo);
    navigate('..' + queryString, { replace: false });
  };
  const tagList = itemData?.tagList;
  const showCate = tagList
    ?.filter(
      (tag: any) =>
        tag.type === 'base' ||
        tag.type === 'category' ||
        tag.type === 'subcategory',
    )
    .map((tag: any) => {
      // const tagUrl = resolveTagUrl(tag.type, tag.value);
      const tagClick = () => {
        queryTagItems(tag.type, tag.value);
      };
      return (
        <a key={tag.type + '-' + tag?.tagIndex}>
          <Tag
            color={resolveTagColor(tag.type, tag?.tagIndex)}
            onClick={tagClick}
          >
            {tag.value}
          </Tag>
        </a>
      );
    });
  const showTags = tagList
    ?.filter((tag: any) => tag.type !== '' && tag.type !== 'base')
    .map((tag: any) => {
      // const tagUrl = resolveTagUrl(tag.type, tag.value);
      const tagClick = () => {
        queryTagItems(tag.type, tag.value);
      };
      return (
        <a key={tag.type + '-' + tag?.tagIndex}>
          <Tag
            color={resolveTagColor(tag.type, tag?.tagIndex)}
            icon={
              tag.type === 'category' || tag.type === 'subcategory' ? (
                <FolderOutlined />
              ) : (
                <></>
              )
            }
            onClick={tagClick}
            variant="outlined"
          >
            {tag.value}
          </Tag>
        </a>
      );
    });
  const imgList = itemData?.imgList;
  const imgList1 = itemData?.imgList1;
  const imgList2 = itemData?.imgList2;
  const imgs = imgList?.map((imgItem: any) => {
    return (
      <Image
        preview={true}
        key={'img-' + imgItem.imgIndex}
        src={resolveUrl(
          itemData?.base,
          itemData?.category,
          itemData?.subcategory,
          itemData?.name,
          imgItem.value,
        )}
      />
    );
  });
  let breadItem: any = [];
  breadItem.push({ title: <a onClick={baseClick}>{itemData?.base}</a> });
  if (itemData?.category) {
    breadItem.push({ title: itemData?.category });
  }
  if (itemData?.subcategory) {
    breadItem.push({ title: itemData?.subcategory });
  }
  breadItem.push({ title: itemData?.name });
  return loadSuccess ? (
    itemData || loading ? (
      <PageContainer
        ghost
        header={{
          title: '',
          className: 'pageHeader',
          breadcrumbRender: () => {
            return !loading ? <Breadcrumb items={breadItem} /> : <></>;
          },
        }}
      >
        {contextHolder}
        <Skeleton loading={loading}>
          {viewMode ? (
            <>
              <Typography>
                <Title>
                  {favi == itemData?.id ? (
                    <LoadingOutlined key="loading" />
                  ) : itemData?.isFavi ? (
                    <HeartTwoTone twoToneColor="#ff0000" onClick={faviClick} />
                  ) : itemData?.id ? (
                    <HeartOutlined onClick={faviClick} />
                  ) : (
                    <></>
                  )}{' '}
                  {itemData?.title}
                </Title>
                <Row align="middle" justify="space-between">
                  <Col span={16}>
                    <Space align="center">
                      <CalendarOutlined />
                      <Typography.Text strong>{itemData?.date}</Typography.Text>
                      {itemData?.extra ? (
                        <Tag icon={<ClockCircleOutlined />}>
                          {itemData?.extra}
                        </Tag>
                      ) : (
                        <></>
                      )}
                    </Space>
                  </Col>
                  <Col span={8}>
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
                      <Button
                        type="primary"
                        size="small"
                        danger
                        ghost
                        icon={<SyncOutlined />}
                        onClick={() => {
                          syncFolderClick();
                        }}
                      >
                        {intl.formatMessage({
                          id: 'syncFolder',
                        })}
                      </Button>
                      <Button
                        type="primary"
                        size="small"
                        danger
                        ghost
                        icon={<EditOutlined />}
                        onClick={() => {
                          resetValues();
                          setDrawerVisit(true);
                        }}
                      >
                        {intl.formatMessage({
                          id: 'edit',
                        })}
                      </Button>
                    </Flex>
                  </Col>
                </Row>
                <blockquote>
                  <Paragraph>{itemData?.content}</Paragraph>
                </blockquote>
              </Typography>
              <Flex vertical>
                <Space>
                  <Tooltip title={baseLabel} color={token.colorPrimary}>
                    {itemData?.avatarSrc ? (
                      <Avatar
                        src={CONFIG.apiUrl + itemData?.avatarSrc}
                        style={{ backgroundColor: 'rgb(0,0,0,0.88)' }}
                        size="large"
                        gap={4}
                        onClick={() => {
                          baseClick();
                        }}
                      >
                        {itemData?.avatar}
                      </Avatar>
                    ) : (
                      <Avatar
                        aria-label={itemData?.base}
                        style={{
                          backgroundColor: resolveBaseColor(itemData?.base),
                          verticalAlign: 'middle',
                        }}
                        size="large"
                        gap={4}
                        onClick={() => {
                          baseClick();
                        }}
                      >
                        {itemData?.avatar}
                      </Avatar>
                    )}
                  </Tooltip>
                  <Flex style={{ padding: '1em 0' }} wrap gap="small">
                    {showTags}
                  </Flex>
                </Space>
                {/* <Flex style={{ padding: '0em 0 1em 0' }} wrap gap="4px 0">{showTags}</Flex> */}
              </Flex>

              <Flex style={{ justifyContent: 'center' }}>
                <div id="xplayer"></div>
              </Flex>
              <Flex wrap justify="center" align="flex-start">
                <Gallery
                  id="gallery"
                  options={{
                    bgOpacity: 1,
                    secondaryZoomLevel: 1,
                    maxZoomLevel: 2,
                  }}
                >
                  {imgList1?.map((imgItem: any) => {
                    let imgUrl = resolveUrl(
                      itemData?.base,
                      itemData?.category,
                      itemData?.subcategory,
                      itemData?.name,
                      imgItem.value,
                    );
                    return (
                      <Item
                        key={'img-' + imgItem.imgIndex}
                        id={'img-' + imgItem.imgIndex}
                        original={imgUrl}
                        thumbnail={imgUrl}
                        width={imgItem.width}
                        height={imgItem.height}
                      >
                        {({ ref, open }) => (
                          <img
                            style={{ maxWidth: '100%', height: 'auto' }}
                            ref={ref}
                            onClick={open}
                            src={imgUrl}
                          />
                        )}
                      </Item>
                    );
                  })}
                </Gallery>
              </Flex>
              <div>
              <Masonry
                columns={{ xs: 3, sm: 4, md: 6, lg: 12, xl: 12}}
                gutter={4}
                items={imgList2?.map((imgItem : any) => ({
                  key: `img2-${imgItem?.imgIndex}`,
                  data: imgItem,
                }))}
                itemRender={(imgItem : any ) => (
                  <img src={`${resolveUrl(itemData?.base, itemData?.category, itemData?.subcategory, itemData?.name, imgItem?.data.value)}`} alt="sample" style={{ width: '100%' }} />
                )}
              />
              </div>

              <FloatButton.Group
                shape="circle"
                type="primary"
                style={{ insetInlineEnd: 24 }}
              >
                <FloatButton.BackTop visibilityHeight={500} />
              </FloatButton.Group>
            </>
          ) : (
            // <>
            // <Typography>
            //   <Title editable={{
            //       onChange: setTitle,
            //       text: title,
            //     }}
            //   >{title}</Title>
            //   <Row align="middle" justify="space-between">
            //     <Col span={12}>
            //     <DatePicker defaultValue={date} onChange={(date, dateString)=> { setDate(date);}}></DatePicker>
            //     </Col>
            //     <Col span={12}>
            //     <Flex gap={'small'}  justify={'flex-end'}>
            //     <Button type="primary" size="small" danger ghost icon={<SaveOutlined />}  onClick={()=> {updateItem();}}>
            //     {intl.formatMessage({
            //       id: 'save',
            //     })}
            //     </Button>
            //     <Button type="primary" size="small" danger ghost icon={<CloseCircleOutlined />}  onClick={()=> {setViewMode(true);}}>
            //     {intl.formatMessage({
            //       id: 'cancel',
            //     })}
            //     </Button>
            //     </Flex>
            //     </Col>
            //   </Row>
            //   <Paragraph  editable={{
            //       onChange: setContent,
            //       text: content,
            //     }}
            //   >{content}</Paragraph>
            // </Typography>
            // <Flex style={{ padding: '1em 0' }}><EditTag tagList={itemData?.tagList}></EditTag></Flex>
            // </>
            <Card>
              <ProForm
                layout="horizontal"
                // formRef={formRef}
                grid
                submitter={{
                  render: (_, dom) => (
                    <FooterToolbar>
                      <Button
                        type="primary"
                        danger
                        ghost
                        icon={<CloseCircleOutlined />}
                        onClick={() => {
                          setViewMode(true);
                        }}
                      >
                        {intl.formatMessage({ id: 'cancel' })}
                      </Button>
                      <Button
                        type="primary"
                        danger
                        ghost
                        icon={<SaveOutlined />}
                        onClick={() => {
                          saveItem();
                        }}
                      >
                        {intl.formatMessage({ id: 'save' })}
                      </Button>
                    </FooterToolbar>
                  ),
                }}
                onFinish={async (values) => console.log(values)}
              >
                <Skeleton loading={updating}>
                  <ProFormText
                    name="title"
                    label={intl.formatMessage({ id: 'title' })}
                    initialValue={itemData?.title}
                  />
                  <ProForm.Group>
                    <ProFormDatePicker
                      name="date"
                      label={intl.formatMessage({ id: 'date' })}
                      initialValue={dayjs(itemData?.date)}
                    />
                  </ProForm.Group>
                  <ProFormTextArea
                    name="content"
                    label={intl.formatMessage({ id: 'content' })}
                    initialValue={itemData?.content}
                    fieldProps={{ autoSize: { minRows: 5, maxRows: 10 } }}
                  />
                  <ProFormFieldSet label={intl.formatMessage({ id: 'tag' })}>
                    <EditTag
                      tagList={itemData?.tagList}
                      onChange={(e: any) => {
                        setTags(e);
                      }}
                    ></EditTag>
                  </ProFormFieldSet>
                  <ProFormText
                    name="thumbnail"
                    label={intl.formatMessage({ id: 'thumbnail' })}
                    initialValue={itemData?.thumbnail}
                  />
                  <ProFormText
                    name="roll"
                    label={intl.formatMessage({ id: 'roll' })}
                    initialValue={itemData?.roll}
                  />
                  <ProFormText
                    name="trailer"
                    label={intl.formatMessage({ id: 'trailer' })}
                    initialValue={itemData?.trailer}
                  />
                  <ProFormList
                    name="images"
                    label={intl.formatMessage({ id: 'images' })}
                    initialValue={imgList}
                    copyIconProps={{
                      Icon: SmileOutlined,
                      tooltipText: '复制此项到末尾',
                    }}
                    deleteIconProps={{
                      Icon: CloseCircleOutlined,
                      tooltipText: '不需要这行了',
                    }}
                  >
                    <ProFormText name="value" width="md" />
                  </ProFormList>
                </Skeleton>
              </ProForm>
            </Card>
          )}
        </Skeleton>
        <EditItem
          fromItemData={itemData}
          drawerVisit={drawerVisit}
          setDrawerVisit={setDrawerVisit}
          refreshItemClick={refreshItem}
          showMessage={showMessage}
        ></EditItem>
        <ConsoleModal
          open={consoleOpen}
          onCancel={() => setConsoleOpen(false)}
          title="同步文件夹"
          process={syncProcess}
          startProcess={startSyncProcess}
          fetchLogs={fetchSyncLogs}
        />
      </PageContainer>
    ) : (
      <Empty></Empty>
    )
  ) : (
    <Result
      status="403"
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
            navigate('/login', { replace: false });
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
