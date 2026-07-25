import type { ReactNode } from 'react';
import { AppBar, IconButton, Toolbar, Typography } from '@mui/material';
import { FiArrowLeft } from 'react-icons/fi';

type MobileAppBarProps = {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  rightAction?: ReactNode;
};

export function MobileAppBar({
  title,
  onBack,
  backLabel = 'back',
  rightAction,
}: MobileAppBarProps) {
  return (
    <AppBar
      position="static"
      elevation={0}
      color="transparent"
      sx={{
        pt: 'env(safe-area-inset-top)',
        bgcolor: 'background.default',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56 } }}>
        {onBack ? (
          <IconButton edge="start" onClick={onBack} aria-label={backLabel} sx={{ mr: 0.5 }}>
            <FiArrowLeft size={22} />
          </IconButton>
        ) : null}
        <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }} noWrap>
          {title}
        </Typography>
        {rightAction}
      </Toolbar>
    </AppBar>
  );
}
