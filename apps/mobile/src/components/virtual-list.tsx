import { useRef, memo, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box } from '@mui/material';

type VirtualListProps<T> = {
  items: T[];
  estimateSize: number;
  overscan?: number;
  maxHeight?: number | string;
  getItemKey: (item: T, index: number) => string | number;
  renderItem: (item: T, index: number) => ReactNode;
  sx?: Record<string, unknown>;
};

function VirtualListInner<T>({
  items,
  estimateSize,
  overscan = 8,
  maxHeight = '42vh',
  getItemKey,
  renderItem,
  sx,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: (index) => getItemKey(items[index]!, index),
  });

  return (
    <Box
      ref={parentRef}
      sx={{
        maxHeight,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        contain: 'strict',
        ...sx,
      }}
    >
      <Box
        sx={{
          height: virtualizer.getTotalSize(),
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
