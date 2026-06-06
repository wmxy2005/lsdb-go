const config = {
  searchUrl: '/items',
  apiUrl: '',
  detailUrl: '/api/items/',
  roleUrl: '/api/role/',
  faviUrl: '/api/items/:id/favorite',
  cmdUrl: '/api/cmd/',
  withCredentials: true,
  tokenExpired: 7 * 24 * 60 * 60 * 1000,
  defaultLocale: 'zh-CN',
  locales: [
    {
      name: 'zh-CN',
      label: '中文',
    },
    {
      name: 'en-US',
      label: 'English',
    },
  ],
  resBaseList: [
    {
      name: '',
      label: '全部',
      parent: '',
    },
    {
      name: 'wallpaperGroup',
      label: 'Wallpaper',
      parent: '',
    },
    {
      name: 'wallpaper',
      label: 'Wallpaper',
      parent: 'wallpaperGroup',
    },
    {
      name: 'wallpaper2',
      label: 'Wallpaper2-Long Long',
      parent: 'wallpaperGroup',
    },
  ],
  resTypeList: [
    {
      name: '',
      label: '全部',
    },
    {
      name: '0',
      label: '类型0',
    },
    {
      name: '1',
      label: '类型1',
    },
  ],
};

export { config };
