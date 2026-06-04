import { useState } from 'react';

const useLoading = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [time, setTime] = useState<string>(new Date().toLocaleTimeString());
  const [searchInfo, setSearchInfo] = useState<any>();
  return {
    loading,
    setLoading,
    time,
    setTime,
    searchInfo,
    setSearchInfo
  };
};

export default useLoading;
