// 示例方法，没有实际意义
export function trim(str: string) {
  return str.trim();
}

export function formatTimestamp(ts?: string){
  if (ts) return ts;
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}