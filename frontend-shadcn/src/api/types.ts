export interface ApiResult<T = unknown> {
  success?: boolean;
  message?: string;
  errorCode?: number | string;
  data?: T;
}

export interface UserInfo {
  id?: number;
  username?: string;
  token?: string;
}

export interface ItemInfo {
  id?: number;
  base?: string;
  category?: string;
  subcategory?: string;
  name?: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
  date?: string;
  thumbnail?: string;
  thumbnailW?: number;
  thumbnailH?: number;
  roll?: string;
  trailer?: string;
  tagList?: TagInfo[];
  content?: string;
  imgList?: ImageInfo[];
  imgList1?: ImageInfo[];
  imgList2?: ImageInfo[];
  fileList?: FileListItem[];
  isFavi?: boolean;
  avatar?: string;
  avatarColor?: string;
  avatarSrc?: string;
  videoThumbnail?: string;
  type?: number;
}

export interface TagInfo {
  type?: string;
  name?: string;
  value?: string;
  index?: number;
  tagIndex?: number;
}

export interface ImageInfo {
  name?: string;
  value?: string;
  url?: string;
  imgIndex?: number;
  width?: number;
  height?: number;
  w?: number;
  h?: number;
}

export interface FileListItem {
  type?: string;
  value?: string;
  thumbUrl?: string;
}

export interface RoleImageInfo {
  nameIndex?: number;
  name?: string;
  image?: string;
  imageSrc?: string;
  url?: string;
}

export interface RoleInfo {
  id?: number;
  name?: string;
  title?: string;
  date?: string;
  remark?: string;
  nameList?: TagInfo[];
  imageList?: RoleImageInfo[];
  base?: string;
}

export interface RoleListItem {
  id?: number;
  title?: string;
  name?: string;
  imageSrc?: string;
  tagIndex?: number;
  avatarSrc?: string;
}

export interface PageInfo {
  base?: string;
  category?: string[];
  subcategory?: string;
  keyword?: string[];
  tag?: string[];
  dateFrom?: string;
  dateTo?: string;
  matchMode?: string;
  favi?: boolean;
  type?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
  pages?: number;
  current?: number;
  costTime?: number;
  total?: number;
  title?: string;
  list: ItemInfo[];
  roleList?: RoleListItem[];
}

export interface PCInfo {
  time?: string;
  cpu?: number;
  uploadSpeed?: number;
  downloadSpeed?: number;
}

export type ItemSearchParams = {
  keyword?: string;
  category?: string;
  tag?: string;
  dateFrom?: string;
  dateTo?: string;
  matchMode?: string;
  base?: string;
  type?: string;
  favi?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
};
