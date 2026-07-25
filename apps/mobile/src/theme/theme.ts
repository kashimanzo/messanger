import { createTheme } from '@mui/material/styles';

/**
 * Simple Google / Material-style theme: blue primary, light grey surfaces,
 * soft elevation, Roboto typography.
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a73e8',
      light: '#e8f0fe',
      dark: '#174ea6',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#5f6368',
      light: '#f1f3f4',
      dark: '#3c4043',
    },
    success: {
      main: '#188038',
      light: '#e6f4ea',
    },
    warning: {
      main: '#f9ab00',
      light: '#fef7e0',
    },
    error: {
      main: '#d93025',
      light: '#fce8e6',
    },
    info: {
      main: '#1a73e8',
      light: '#e8f0fe',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#202124',
      secondary: '#5f6368',
      disabled: '#9aa0a6',
    },
    divider: '#e8eaed',
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica Neue", Arial, sans-serif',
    h4: {
      fontWeight: 400,
      letterSpacing: 0,
    },
    h5: {
      fontWeight: 400,
    },
    h6: {
      fontWeight: 500,
      fontSize: '1.05rem',
    },
    subtitle1: {
      fontWeight: 500,
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.9rem',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.4,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.35,
      color: '#9aa0a6',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f8f9fa',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 20,
          paddingInline: 18,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: '1px solid #e8eaed',
          boxShadow: '0 1px 2px rgba(60, 64, 67, 0.08)',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow:
            '0 1px 3px 0 rgba(60,64,67,.3), 0 4px 8px 3px rgba(60,64,67,.15)',
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
        color: 'transparent',
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
        sizeSmall: {
          height: 22,
          fontSize: '0.7rem',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
    MuiFormControl: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          paddingTop: 6,
          paddingBottom: 6,
        },
      },
    },
  },
});
