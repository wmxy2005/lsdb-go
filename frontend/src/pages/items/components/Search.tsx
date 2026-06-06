import { CONFIG } from '@/constants';
import lsdbServices from '@/services/lsdb';
import { SearchOutlined } from '@ant-design/icons';
import { createSearchParams, useModel, useNavigate } from '@umijs/max';
import type { GetProps } from 'antd';
import { Button, Input, theme } from 'antd';

const { queryItemList } = lsdbServices.LsdbController;

const SearchInput = () => {
  const { token } = theme.useToken();
  type SearchProps = GetProps<typeof Input.Search>;
  let navigate = useNavigate();
  const { loading, setLoading, setTime, setPageInfo } = useModel('search');
  const onSearch: SearchProps['onSearch'] = (value, _e, info) => {
    if ('input' === info?.source) {
      let params = createSearchParams({ keyword: value }).toString();
      navigate(CONFIG.searchUrl + ('' == value ? '' : '?' + params), {
        replace: false,
        state: { shouldRefresh: true },
      });

      // setLoading(true);
      // setTime(new Date().toLocaleTimeString());

      // const queryItems = async (params : {}) => {
      //   const { data, success } = await queryItemList({
      //     ...params,
      //   });
      //   if(data) {
      //     setPageInfo(data);
      //     if(data?.title) {
      //       document.title = data?.title;
      //     }
      //   }
      //   setLoading(false);
      // }
      // queryItems({ keyword: value});
    }
  };
  return (
    <div
      key="SearchOutlined"
      aria-hidden
      style={{
        display: 'flex',
        alignItems: 'center',
        marginInlineStart: 5,
        marginInlineEnd: 5,
      }}
      onMouseDown={(e) => {
        //e.stopPropagation();
        //e.preventDefault();
      }}
    >
      <Input.Search
        placeholder="搜索"
        allowClear
        enterButton={<Button type="primary" icon={<SearchOutlined />} />}
        style={{
          borderRadius: 4,
          marginInlineEnd: 0,
          backgroundColor: token.colorBgTextHover,
        }}
        variant="borderless"
        onSearch={onSearch}
      />
    </div>
  );
};

export default SearchInput;
