import {
HeartOutlined,
HeartTwoTone,
CalendarOutlined,
LoadingOutlined,
DotChartOutlined,
SmallDashOutlined,
} from '@ant-design/icons';
import type { ProSettings } from '@ant-design/pro-components';
import {
PageContainer,
ProCard,
ProConfigProvider,
ProLayout,
SettingDrawer,
} from '@ant-design/pro-components';
import {
Button,
ConfigProvider,
Divider,
Dropdown,
Input,
Popover,
Flex,
Avatar,
Tag,
Typography,
theme,
DatePicker,
Skeleton,
Space,
Progress,
Row,
Col,
Image as AntImage,
} from 'antd';
import React, { PropsWithChildren, useState, useEffect, useRef} from 'react';
import dayjs from 'dayjs';
import { createSearchParams, generatePath , useNavigate, history, createBrowserHistory, useModel, useIntl } from '@umijs/max';
import { resolveUrl, resolveTagUrl, resolveTagColor } from '@/utils/resource';
import lsdbServices from '@/services/lsdb';
import { CONFIG } from '@/constants';
import { error } from 'console';

const imgStyle: React.CSSProperties = {
    display: 'block',
    maxWidth: '100%',
    height: 'auto',
    position: 'relative',
};

interface ItemImageProps {
    src: string,
    srcW?: number,
    srcH?: number,
    rollSrc?: string,
}

const ItemImage: React.FC<PropsWithChildren<ItemImageProps>> = (props : ItemImageProps) => {
    const { token } = theme.useToken();
    const { src, srcW, srcH, rollSrc } = props;
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [hoverItemId, setHoverItemId] = useState(0);
    const [hoverVideoProgress, setHoverVideoProgress] = useState('0%');
    const [hoverVideoPercent, setHoverVideoPercent] = useState(0);
    // keep timer id in ref so cleanup is simpler (interval returns number on browsers)
    const hoverTimerRef = useRef<number | null>(null);
    const [hoverVideoTimer, setHoverVideoTimer] = useState<any>(null);
    const [videoSrc, setVideoSrc] = useState('');
    const [videoReady, setVideoReady] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
      const image = new Image();
      image.src = src;
  
      image.onload = () => {
        setIsLoading(false);
      };
  
      image.onerror = () => {
        setIsLoading(false);
        setIsError(true);
      };
      return () => {
        image.onload = null;
        image.onerror = null;
      };
    }, [src]);

    useEffect(() => {
      if(rollSrc && rollSrc?.trim()?.length > 0){
        setVideoSrc(rollSrc);
      }
      // cleanup when component unmounts or rollSrc changes
      return () => {
        // stop any playing video and drop the src for GC
        if (videoRef.current) {
          videoRef.current.pause();
          // clear source to free resource
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        }
      };
    }, [rollSrc]);

    useEffect(() => {
      return () => {
        if (hoverVideoTimer) {
          clearInterval(hoverVideoTimer);
        }
      };
    }, [hoverVideoTimer]);

    const hoverVideo = (id : any, video: HTMLVideoElement) => {
      setHoverItemId(id);
      const total = video.duration;
      const current = video.currentTime;
      const ps = (current / total * 100).toFixed(0);
      setHoverVideoPercent(Number(ps));
      setHoverVideoProgress(ps + '%');

      // clear any existing interval using ref
      if (hoverTimerRef.current) {
        clearInterval(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }

      if (id > 0) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // ignore play errors
          });
        }
        const hoverVideoProgress = window.setInterval(() => {
          const total2 = video.duration;
          const current2 = video.currentTime;
          const ps2 = (current2 / total2 * 100).toFixed(0);
          setHoverVideoPercent(Number(ps2));
          setHoverVideoProgress(ps2 + '%');
        }, 500);
        hoverTimerRef.current = hoverVideoProgress;
        setHoverVideoTimer(hoverVideoProgress); // keep state if needed for render
      } else {
        video.pause();
      }
    }

    return (
        <>
        <picture>
          {isLoading ? (
            <Skeleton.Node active={true} style={{ width: '100%', height: '100%'}}>
            <div style={{ display: 'inline-block' }}>
            <img className='ant-image-img' width={srcW} height={srcH} style={{
                opacity: 0,
                ...imgStyle}}>
            </img>
            </div>
            </Skeleton.Node>
            
          ) : isError ? (
            <div>Error loading image</div>
          ) : (
            <div className={hoverItemId > 0 ? 'thumbnail__image-hovered' : ''} style={{ display: 'flex', justifyContent: 'center', }}>
                <img src={src} style={ imgStyle }/>
            </div>
          )}
        </picture>
        {
        !isLoading && videoSrc ?
        <div className={hoverItemId > 0 ? 'thumbnail__video thumbnail__video-hovered' : 'thumbnail__video'}>
        <div className='video__progress' style={{ width: hoverVideoProgress, backgroundColor: token.colorPrimary, position: 'absolute', zIndex: 2000, }}></div>
        {/* <Progress percent={hoverVideoPercent} strokeColor='rgba(214,93,58,0.5)' trailColor='rgba(0, 0, 0, 0.06)' showInfo={false} style={{ position: 'absolute', zIndex: 2000, }}/> */}
        <video ref={videoRef} autoPlay={false} loop muted playsInline onMouseEnter={(e)=>{ hoverVideo(1, (e.target as HTMLVideoElement)); }} onMouseLeave={(e)=>{ hoverVideo(0, (e.target as HTMLVideoElement));}} src={videoSrc}></video>
        </div>
        : <></>
        }
        </>
      );
};

export default ItemImage;