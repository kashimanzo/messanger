import {
  useRef,
  memo,
  type PointerEventHandler,
  type ReactNode,
  type Ref,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box } from '@mui/material';

type VirtualListProps<T> = {
  items: T[];
  estimateSize: number;
  overscan?: number;
  /** Explicit scroll viewport height (required for absolute-positioned rows). */
  height?: number | string;
  maxHeight?: number | string;
  getItemKey: (item: T, index: number) => string | number;
  renderItem: (item: T, index: number) => ReactNode;
  sx?: Record<string, unknown>;
  scrollRef?: Ref<HTMLDivElement | null>;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
  onPointerMove?: PointerEventHandler<HTMLDivElement>;
  onPointerUp?: PointerEventHandler<HTMLDivElement>;
  onPointerCancel?: PointerEventHandler<HTMLDivElement>;
};

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  (ref as { current: T }).current = value;
}

function VirtualListInner<T>({
  items,
  estimateSize,
  overscan = 8,
  height,
  maxHeight = '42vh',
  getItemKey,
  renderItem,
  sx,
  scrollRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: (index) => getItemKey(items[index]!, index),
  });

  const contentHeight = Math.max(
    virtualizer.getTotalSize(),
    items.length * estimateSize,
  );

  const resolvedHeight = height ?? maxHeight;
  const fillParent =
    resolvedHeight === '100%' || resolvedHeight === '100dvh';

  return (
    <Box
      ref={(node: HTMLDivElement | null) => {
        parentRef.current = node;
        assignRef(scrollRef, node);
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      sx={{
        height: resolvedHeight,
        maxHeight: fillParent ? 'none' : maxHeight,
        minHeight: fillParent ? 0 : Math.min(contentHeight, 240),
        flex: fillParent ? 1 : undefined,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        // Do not use contain:strict — it sizes as empty and collapses height.
        ...sx,
      }}
    >
      <Box
        sx={{
          height: contentHeight,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index]!;
          return (
            <Box
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderItem(item, virtualRow.index)}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export const VirtualList = memo(VirtualListInner) as typeof VirtualListInner;
