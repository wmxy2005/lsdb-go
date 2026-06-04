/* eslint-disable */

declare namespace LSDB {
  interface Result_UserInfo {
    id?: number;
    username?: string;
    token?: string;
  }

  interface Result_Login {
    token?: string;
  }

  interface ITEMInfo {
    id?: Number;
    base?: string;
    category?: string;
    subcategory?: string;
    name?: string;
    title?: string;
    date?: Date;
    thumbnail?: string;
    tagList?: Array<any>;
    content?: string;
    imgList?: Array<any>;
    isFavi?: boolean;
    avatar?: string;
    avatarColor?: string;
    avatarSrc?: string;
  }

  interface ROLEInfo {
    id?: Number;
    name?: string;
    title?: string;
    date?: Date;
    remark?: string;
    nameList?: Array<any>;
  }

  interface PageInfo_ITEMInfo_ {
    key?: string;
    scrollTop?: number;
    base?: string;
    category?: Array<any>;
    subcategory?: string;
    keyword?: Array<any>;
    tag?: Array<any>;
    dateFrom?: string;
    dateTo?: string;
    matchMode?: string;
    favi?: boolean;
    type?: string;
    sort?: string;
    page?: number;
    pageSize?: number;
    pages?: number;
    costTime?: number;
    total?: number;
    title?: string;
    message?: string;
    list: Array<ItemInfo>;
    roleList?: Array<any>;
  }

  interface Result_UserInfo__ {
    success?: boolean;
    message?: string;
    errorCode?: string;
    data?: Result_UserInfo;
  }

  interface Result_Login__ {
    success?: boolean;
    message?: string;
    errorCode?: string;
    data?: Result_Login;
  }

  interface Result_PageInfo_ITEMInfo__ {
    success?: boolean;
    message?: string;
    errorCode?: string;
    data?: PageInfo_ITEMInfo_;
  }

  interface Result_ITEMInfo__ {
    success?: boolean;
    message?: string;
    errorCode?: string;
    data?: ITEMInfo;
  }

  interface Result_string_ {
    success?: boolean;
    message?: string;
    errorCode?: string;
    data?: string;
  }

  interface Result {
    success?: boolean;
    message?: string;
    errorCode?: string;
    data?: Record<string, any>;
  }

  interface Result_ROLEInfo__ {
    success?: boolean;
    message?: string;
    errorCode?: string;
    data?: ROLEInfo;
  }
}
