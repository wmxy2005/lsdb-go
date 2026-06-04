import { defineConfig } from '@umijs/max';
import { config as CONFIG } from './src/constants/config';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
  layout: {
    title: '@umijs/max',
  },
  locale: {
    antd: true,
    baseNavigator: true,
    default: CONFIG.defaultLocale,
    baseSeparator: '-',
    title: false,
    useLocalStorage: true,
  },
  apiRoute: {
    platform: 'vercel',
  },
  routes: [
    {
      path: '/',
      redirect: '/items',
    },
    {
      name: 'items',
      path: '/items',
      component: './items',
      hideInMenu: false,
      access: 'login',
    },
    {
      name: 'tool',
      path: '/tool',
      component: './Tool',
    },
    {
      name: 'speedTest',
      path: '/speedTest',
      component: './SpeedTest',
    },
    {
      name: 'submenu',
      path: '/sub',
      routes: [
        {
          path: '/sub/home',
          name: 'submenu1',
          component: './Home',
        },
        {
          path: '/sub/access',
          name: 'submenu2',
          component: './Access',
        },
      ]
    },
    {
      name: 'home',
      path: '/home',
      component: './Home',
    },
    {
      name: 'access',
      path: '/access',
      component: './Access',
    },
    {
      name: 'table',
      path: '/table',
      component: './Table',
    },
    {
      name: 'login',
      path: '/login',
      component: './login',
      hideInMenu: true,
      // layout: false,
    },
    {
      name: 'role',
      path: '/items/role', 
      component: './items/role',
      hideInMenu: true,
      access: 'login'
    },
    {
      name: 'itemId',
      path: '/items/:itemId', 
      component: './items/[itemId]',
      hideInMenu: true,
      access: 'login'
    },
  ],
  npmClient: 'pnpm',
  esbuildMinifyIIFE: true,
});

