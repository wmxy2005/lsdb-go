export const CONFIG = {
  searchUrl: '/items',
  apiUrl: '',
  detailUrl: '/api/items/',
  roleUrl: '/api/role/',
  faviUrl: '/api/items/:id/favorite',
  cmdUrl: '/api/cmd/',
  withCredentials: true,
  tokenExpired: 7 * 24 * 60 * 60 * 1000,
  resBaseList: [
    { name: '', label: '全部', parent: '' },
    { name: 'wallpaperGroup', label: 'Wallpaper', parent: '' },
    { name: 'wallpaper', label: 'Wallpaper', parent: 'wallpaperGroup' },
    { name: 'wallpaper2', label: 'Wallpaper2-Long Long', parent: 'wallpaperGroup' },
  ],
  resTypeList: [
    { name: '', label: '全部' },
    { name: '0', label: '类型0' },
    { name: '1', label: '类型1' },
  ],
} as const;
