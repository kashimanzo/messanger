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
      position="sticky"
      elevation={0}
      sx={{
        pt: 'env(safe-area-inset-top)',
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56 }, gap: 0.5 }}>
        {onBack ? (
          <IconButton
            edge="start"
            onClick={onBack}
            aria-label={backLabel}
            sx={{ color: 'text.secondary' }}
          >
            <FiArrowLeft size={22} />
          </IconButton>
        ) : null}
        <Typography
          variant="h6"
          sx={{
            flexGrow: 1,
            fontWeight: 500,
            color: 'text.primary',
            letterSpacing: 0.15,
          }}
          noWrap
        >
          {title}
        </Typography>
        {rightAction}
      </Toolbar>
    </AppBar>
  );
}
