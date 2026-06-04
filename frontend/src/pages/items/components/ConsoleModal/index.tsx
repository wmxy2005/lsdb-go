import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CloseOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import { Modal, Button, Space } from 'antd';
import { formatTimestamp } from '@/utils/format';

export interface ConsoleLine {
  text: string;
  type?: 'info' | 'warn' | 'error' | 'success';
  timestamp?: string;
}

export interface ConsoleProcess {
  /** 直接读取当前进程日志 */
  readData: any;
  /** 可选：停止进程 */
  stop?: () => void;
}

export interface ConsoleModalProps {
  open: boolean;
  onCancel: () => void;
  title?: string;
  /** 可选，如果传入时直接使用 process 读取数据 */
  process?: any;
  /** 启动任务，返回 processId */
  startProcess?: () => Promise<string>;
  /** 根据 processId 获取日志数据 */
  fetchLogs?: (processId: string) => Promise<ConsoleLine[]>;
  interval?: number;
  maxLines?: number;
  width?: number;
}

const TYPE_COLOR: Record<NonNullable<ConsoleLine['type']>, string> = {
  info: '#d4d4d4',
  warn: '#dcb67a',
  error: '#f48771',
  success: '#6a9955',
};

const MAX_LINES = 500;

export default function ConsoleModal({
  open,
  onCancel,
  title = '控制台',
  process,
  startProcess,
  fetchLogs,
  interval = 1000,
  maxLines = MAX_LINES,
  width = 720,
}: ConsoleModalProps) {
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const processRef = useRef<any>(process);
  const startProcessRef = useRef<(() => Promise<string>) | undefined>(startProcess);
  const fetchLogsRef = useRef<((processId: string) => Promise<ConsoleLine[]>) | undefined>(fetchLogs);

  processRef.current = process;
  startProcessRef.current = startProcess;
  fetchLogsRef.current = fetchLogs;

  const appendLines = useCallback(
    (newLines: ConsoleLine[]) => {
      if (newLines.length === 0) return;
      setLines((prev) => {
        const merged = [...prev, ...newLines];
        return merged.length > maxLines ? merged.slice(merged.length - maxLines) : merged;
      });
    },
    [maxLines],
  );

  // 弹出时启动任务 → 轮询日志
  useEffect(() => {
    if (!open) {
      setLines([]);
      return;
    }

    let active = true;

    const pollFromProcess = async () => {
      if (!processRef.current) return;
      try {
        processRef.current((data: ConsoleLine[]) => {
          if (active)
            appendLines(data);
        }, () => {
          return !active;
        });
      } catch {
        // 静默处理，避免轮询中断
      }
    };

    const run = async () => {
      console.log('ConsoleModal: run', { process: processRef.current, startProcess: startProcessRef.current, fetchLogs: fetchLogsRef.current });
      if (processRef.current) {
        setLoading(false);
        // 直接从 process 读取数据，绕过 startProcess/fetchLogs
        pollFromProcess();
        return () => {
          processRef.current?.stop?.();
        };
      }

      if (!startProcessRef.current || !fetchLogsRef.current) {
        if (active) {
          setLoading(false);
          appendLines([{ text: '无法启动任务：缺少 startProcess 或 fetchLogs', type: 'error' }]);
        }
        return;
      }

      try {
        setLoading(true);
        const processId = await startProcessRef.current();
        setLoading(false);

        const poll = async () => {
          try {
            if (!active) return;
            const data = await fetchLogsRef.current!(processId);
            if (active) appendLines(data);
          } catch {
            // 静默处理，避免轮询中断
          }
        };

        // 首次立即获取
        poll();

        const timer = setInterval(poll, interval);
        return () => clearInterval(timer);
      } catch {
        if (active) {
          setLoading(false);
          appendLines([{ text: '启动任务失败', type: 'error' }]);
        }
      }
    };

    const cleanup = run();

    return () => {
      active = false;
      if (typeof cleanup === 'function') cleanup();
    };
  }, [open, interval, appendLines]);

  // 数据更新后滚到底部
  useEffect(() => {
    if (!open) {
      setFullscreen(false);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const consoleHeight = fullscreen ? 'calc(100vh - 110px)' : 400;

  return (
    <>
      <style>
        {`
          .console-modal__window-action {
            width: 32px !important;
            height: 32px !important;
            border-radius: 6px !important;
            color: rgba(0, 0, 0, 0.45) !important;
            transition: background-color 0.2s ease, color 0.2s ease !important;
          }

          .console-modal__window-action:hover {
            background-color: rgba(0, 0, 0, 0.06) !important;
            color: rgba(0, 0, 0, 0.88) !important;
          }
        `}
      </style>
      <Modal
        className="console-modal"
        destroyOnClose
        title={(
          <div style={styles.modalTitle}>
            <span>{title}</span>
            <Space size={4} style={styles.windowActions}>
              <Button
                type="text"
                aria-label={fullscreen ? '还原' : '最大化'}
                icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={() => setFullscreen((prev) => !prev)}
                style={styles.windowActionButton}
                className="console-modal__window-action"
              />
              <Button
                type="text"
                aria-label="关闭"
                icon={<CloseOutlined />}
                onClick={onCancel}
                style={styles.windowActionButton}
                className="console-modal__window-action"
              />
            </Space>
          </div>
        )}
        width={fullscreen ? '100vw' : width}
        open={open}
        onCancel={onCancel}
        closable={false}
        mask={{
          closable: false,
        }}
        footer={[
          <Button key="cancel" onClick={onCancel}>
            Cancel
          </Button>
        ]}
        style={fullscreen ? styles.fullscreenModal : undefined}
        styles={{
          mask: fullscreen ? styles.fullscreenMask : undefined,
          wrapper: fullscreen ? styles.fullscreenWrapper : undefined,
          body: {
            padding: 0,
          },
          header: fullscreen ? styles.fullscreenHeader : undefined,
          content: fullscreen ? styles.fullscreenContent : undefined,
        }}
      >
        <div ref={scrollRef} style={{ ...styles.console, height: consoleHeight }}>
          {lines.length === 0 && (
            <div style={styles.placeholder}>{loading ? '正在启动任务...' : '等待数据...'}</div>
          )}
          {lines.map((line, i) => (
            <div key={i} style={styles.lineRow}>
              <span style={styles.timestamp}>[{formatTimestamp(line.timestamp)}]</span>
              <span style={{ color: TYPE_COLOR[line.type || 'info'] }}>{line.text}</span>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  console: {
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
    fontFamily: "Consolas, 'Courier New', monospace",
    fontSize: 13,
    lineHeight: '20px',
    padding: '12px 16px',
    height: 500,
    overflowY: 'auto',
    overflowX: 'auto',
  },
  modalTitle: {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  windowActions: {
    display: 'flex',
    alignItems: 'center',
    marginRight: -8,
  },
  windowActionButton: {
    width: 32,
    height: 32,
  },
  fullscreenModal: {
    top: 0,
    maxWidth: '100vw',
    margin: 0,
    paddingBottom: 0,
  },
  fullscreenMask: {
    inset: 0,
  },
  fullscreenWrapper: {
    inset: 0,
    overflow: 'hidden',
  },
  fullscreenHeader: {
    marginBottom: 0,
  },
  fullscreenContent: {
    height: '100vh',
    borderRadius: 0,
  },
  placeholder: {
    color: '#666',
    textAlign: 'center',
    paddingTop: 180,
  },
  lineRow: {
    display: 'flex',
    gap: 8,
    padding: '1px 4px',
    borderRadius: 2,
    whiteSpace: 'nowrap' as const,
  },
  timestamp: {
    color: '#6a9955',
    flexShrink: 0,
    userSelect: 'none' as const,
  },
};
