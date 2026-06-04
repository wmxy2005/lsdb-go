export default (initialState: any) => {
  // 在这里按照初始化数据定义项目中的权限，统一管理
  // 参考文档 https://umijs.org/docs/max/access
  const login = !!(
    initialState && initialState?.userId > 0
  );
  // console.log(login);
  const userId = initialState?.userId;
  return {
    login,
    userId,
  };
};
