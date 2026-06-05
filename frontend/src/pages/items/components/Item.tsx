import { CONFIG } from '@/constants';
import lsdbServices from '@/services/lsdb';
import {
  resolveBaseColor,
  resolveTagColor,
  resolveTagUrl,
  resolveUrl,
} from '@/utils/resource';
import {
  CalendarOutlined,
  DotChartOutlined,
  HeartOutlined,
  HeartTwoTone,
  LoadingOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { history, useModel, useNavigate } from '@umijs/max';
import {
  Avatar,
  Col,
  Flex,
  Row,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import React, { PropsWithChildren, useState } from 'react';
import ItemImage from './ItemImage';

const { queryItemList, faviItem } = lsdbServices.LsdbController;

const imgStyle: React.CSSProperties = {
  display: 'block',
  maxWidth: '100%',
  height: 'auto',
  position: 'relative',
};

const titleStyle: React.CSSProperties = {
  padding: '0 5px',
  marginBottom: 0,
};

interface ItemProps {
  loading?: boolean;
  pageInfo?: LSDB.PageInfo_ITEMInfo_;
  itemUpdate?: any;
}

const Item: React.FC<PropsWithChildren<ItemProps>> = (props: ItemProps) => {
  const { searchInfo } = useModel('search');
  const { token } = theme.useToken();
  const { loading, pageInfo, itemUpdate } = props;
  // const { loading, setLoading, time, pageInfo, setPageInfo } = useModel('search');
  const [favi, setFavi] = useState(0);
  const [hoverItemId, setHoverItemId] = useState(0);
  const [hoverVideoProgress, setHoverVideoProgress] = useState('0%');
  const [hoverVideoPercent, setHoverVideoPercent] = useState(0);
  const [hoverVideoTimer, setHoverVideoTimer] = useState<any>(null);
  let navigate = useNavigate();

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

  const queryTagItems = async (tagType: string, tag: string) => {
    let queryString = resolveTagUrl(tagType, tag, searchInfo);
    // const cbhistory = createBrowserHistory({})
    // cbhistory.push(queryString);
    navigate('../' + queryString, {
      replace: false,
      state: { shouldRefresh: true },
    });
    // setLoading(true);
    // let params : any = {};
    // if (tagType === 'base') {
    //     params.base = tag;
    // } else if (tagType === 'category') {
    //     params.category = tag;
    // } else if (tagType === 'tag') {
    //     params.tag = tag;
    // }
    // const { data, success } = await queryItemList({
    //   ...params,
    // });
    // if(data) {
    //   setPageInfo(data);
    //   if(data?.title) {
    //     document.title = data?.title;
    //   }
    // }
    // setLoading(false);
  };

  const listItems = pageInfo?.list.map((item: any) => {
    const faviClick = async () => {
      setFavi(item.id);
      let expired = item?.isFavi ? 1 : 0;
      const { success } = await faviItem(item.id, expired);
      if (success) {
        item.isFavi = expired == 0;
        if (itemUpdate) {
          itemUpdate();
        }
      }
      const timer = setTimeout(() => {
        setFavi(0);
      }, 200);
    };
    let tagCount = 0;
    const newTags = item?.tagList.filter((tag: any) => {
      if (tag.type == 'base' || tag.type == 'tag2' || tag.type == 'tag3') {
        return false;
      }
      if (tagCount >= 3) {
        return false;
      }
      tagCount = tagCount + 1;
      return true;
    });
    const tags = newTags.map((tag: any) => {
      // const tagUrl = resolveTagUrl(tag.type, tag.value);
      let isLongTag = false;
      let tagValue = tag.value;
      const tagLength = new Blob([tag.value]).size;
      if (tagLength > 15) {
        const sliceLength = 15 / (tagLength / tag.value.length);
        tagValue = tag.value.slice(0, sliceLength) + '...';
        isLongTag = true;
      }
      // console.log(tag.value+'-'+tagLength);
      const tagClick = () => {
        queryTagItems(tag.type, tag.value);
      };
      return isLongTag ? (
        <Tooltip
          title={tag.value}
          color={token.colorPrimary}
          key={tag.type + '-' + tag?.tagIndex}
        >
          <Tag
            color={resolveTagColor(tag.type, tag?.tagIndex)}
            variant="outlined"
            onClick={tagClick}
          >
            {tagValue}
          </Tag>
        </Tooltip>
      ) : (
        <Tag
          key={tag.type + '-' + tag?.tagIndex}
          color={resolveTagColor(tag.type, tag?.tagIndex)}
          onClick={tagClick}
          variant="outlined"
        >
          {tagValue}
        </Tag>
      );
    });
    const viewItem = () => {
      history.push('./items/' + item.id);
    };

    const hoverVideo = (id: any, video: HTMLVideoElement) => {
      setHoverItemId(id);
      var total = video.duration;
      var current = video.currentTime;
      var ps = ((current / total) * 100).toFixed(0);
      setHoverVideoPercent(Number(ps));
      setHoverVideoProgress(ps + '%');
      //console.log(ps);
      clearInterval(hoverVideoTimer);
      if (id > 0) {
        video.play();
        const hoverVideoProgress = setInterval(() => {
          var total = video.duration;
          var current = video.currentTime;
          var ps = ((current / total) * 100).toFixed(0);
          setHoverVideoPercent(Number(ps));
          setHoverVideoProgress(ps + '%');
          // console.log(ps);
        }, 500);
        setHoverVideoTimer(hoverVideoProgress);
      } else {
        video.pause();
      }
    };
    const baseLabel = getBaseLabel(item.base);

    return (
      <ProCard
        key={`item-${item.id}`}
        colSpan={{
          xs: 24,
          sm: 12,
          md: 8,
          lg: 6,
        }}
        layout="center"
        hoverable
        boxShadow
        variant={'borderless'}
        ghost
        actions={
          !loading
            ? [
                <Row>
                  <Col flex="40px">
                    <Flex justify="flex-start" style={{ padding: '0 1em' }}>
                      {favi == item.id ? (
                        <LoadingOutlined key="loading" />
                      ) : item.isFavi ? (
                        <HeartTwoTone
                          twoToneColor="#ff0000"
                          onClick={faviClick}
                        />
                      ) : (
                        <HeartOutlined key="favi" onClick={faviClick} />
                      )}
                    </Flex>
                  </Col>
                  <Col flex="auto">
                    <Flex
                      gap={'small'}
                      justify="flex-end"
                      style={{ padding: '0 1em 0 0', display: 'flex' }}
                    >
                      <Typography.Text>
                        <CalendarOutlined /> {item.date}
                      </Typography.Text>
                    </Flex>
                  </Col>
                </Row>,
              ]
            : [
                <Flex justify="space-between" style={{ padding: '0 1em' }}>
                  {' '}
                  <Skeleton.Button active={false}> </Skeleton.Button>
                </Flex>,
                <Flex
                  gap={'small'}
                  justify={'flex-end'}
                  style={{ padding: '0 1em 0 0' }}
                >
                  {' '}
                  <Skeleton.Button active> </Skeleton.Button>{' '}
                </Flex>,
              ]
        }
        style={{
          height: '100%',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
        }}
        key={item.id}
        id={item.id}
      >
        <Flex vertical style={{ width: '100%', height: '100%' }}>
          {!loading ? (
            <div
              className={
                hoverItemId === item?.id
                  ? 'thumbnail__link thumbnail__video-hovered'
                  : 'thumbnail__link'
              }
              onClick={viewItem}
            >
              {/* <Image
              alt="avatar"
              preview={false}
              src={resolveUrl(item.base, item.category, item.subcategory, item.name, item.thumbnail)}
              style={imgStyle}
              loading='lazy'
              placeholder={placeholdImg}
            /> */}
              {/* {
            item?.roll?.trim()?.length > 0 ?
            <div className='thumbnail__video'>
            <div className='video__progress' style={{ width: hoverVideoProgress, backgroundColor: token.colorPrimary, position: 'absolute', zIndex: 2000, }}></div>
            <video autoPlay={false} loop muted playsInline onMouseEnter={(e)=>{ hoverVideo(item?.id, (e.target as HTMLVideoElement)); }} onMouseLeave={(e)=>{ hoverVideo(0, (e.target as HTMLVideoElement));}} src={resolveUrl(item?.base, item?.category, item?.subcategory, item?.name, item?.roll)}></video>
            </div>
            : <></>
            } */}
              <ItemImage
                src={resolveUrl(
                  item.base,
                  item.category,
                  item.subcategory,
                  item.name,
                  item.thumbnail,
                )}
                srcW={item?.thumbnailW}
                srcH={item?.thumbnailH}
                rollSrc={
                  item?.roll?.trim()?.length > 0
                    ? resolveUrl(
                        item?.base,
                        item?.category,
                        item?.subcategory,
                        item?.name,
                        item?.roll,
                      )
                    : undefined
                }
              ></ItemImage>
            </div>
          ) : (
            <Skeleton.Node
              active={true}
              style={{
                width: '100%',
                height: '100%',
                maxWidth: '100%',
                maxHeight: '100%',
                minHeight: '12em',
              }}
            >
              <DotChartOutlined style={{ fontSize: 40, color: '#bfbfbf' }} />
            </Skeleton.Node>
          )}
          {!loading ? (
            <Space style={{ marginLeft: 5, minHeight: 60 }}>
              <Tooltip title={baseLabel} color={token.colorPrimary}>
                {item.avatarSrc ? (
                  <Avatar
                    src={CONFIG.apiUrl + item.avatarSrc}
                    style={{ backgroundColor: 'rgb(0,0,0,0.88)' }}
                    size="large"
                    gap={4}
                    onClick={() => {
                      queryTagItems('base', item.base);
                    }}
                  >
                    {item.avatar}
                  </Avatar>
                ) : (
                  <Avatar
                    aria-label={item.base}
                    style={{
                      backgroundColor: resolveBaseColor(item.base),
                      verticalAlign: 'middle',
                    }}
                    size="large"
                    gap={4}
                    onClick={() => {
                      queryTagItems('base', item.base);
                    }}
                  >
                    {item.avatar}
                  </Avatar>
                )}
              </Tooltip>
              <Typography.Paragraph
                onClick={viewItem}
                strong
                ellipsis={{
                  rows: 2,
                  expanded: false,
                }}
                className={'itemTitle'}
                style={titleStyle}
              >
                {item.title}
              </Typography.Paragraph>
            </Space>
          ) : (
            <Skeleton.Input
              active={true}
              block={false}
              style={{ width: '90%', margin: '1em' }}
            />
          )}
          {!loading ? (
            <Flex gap="4px" wrap style={{ padding: 5 }}>
              {tags}
            </Flex>
          ) : (
            <Skeleton.Input
              active={true}
              block={false}
              style={{ width: '90%', margin: '1em' }}
            />
          )}
        </Flex>
      </ProCard>
    );
  });
  return (
    <ProCard
      ghost
      variant={'borderless'}
      wrap
      gutter={[
        {
          xs: 0,
          sm: 8,
          md: 8,
          lg: 8,
        },
        {
          xs: 8,
          sm: 8,
          md: 8,
          lg: 8,
        },
      ]}
    >
      {listItems}
    </ProCard>
  );
};

export default Item;
function storeData() {
  throw new Error('Function not implemented.');
}
