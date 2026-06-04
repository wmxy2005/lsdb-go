// 全局共享数据示例
import { DEFAULT_NAME } from '@/constants';
import { useState } from 'react';

const useUser = () => {
  const [name, setName] = useState<string>(DEFAULT_NAME);
  const [time] = useState<string>(new Date().toLocaleTimeString());
  return {
    name,
    setName,
    time,
  };
};

export default useUser;
