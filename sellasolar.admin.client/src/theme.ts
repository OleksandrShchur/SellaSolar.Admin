import { createTheme, alpha } from '@mui/material/styles'

/**
 * Palette aligned with https://oleksandrshchur.github.io/SellaSolar/
 * Source: SellaSolar/tailwind.config.js + src/index.css
 */
export const brandColors = {
  primary: '#F0A61F',
  primaryLight: '#F6C85A',
  primaryDark: '#D4890A',
  secondary: '#E07B3A',
  secondaryDark: '#C4652A',
  slateInk: '#15120E',
  surface: '#F3EBDC',
  cream: '#F8F2E6',
  morningBg: '#FAF6EE',
  nightBg: '#0C0A08',
  darkPanel: '#1C1814',
  darkPanelDeep: '#12100C',
  textSecondary: '#44403C', // Tailwind stone-700 (body text on landing)
  textMuted: '#78716C', // Tailwind stone-500
  border: 'rgba(21, 18, 14, 0.12)',
  borderStrong: 'rgba(21, 18, 14, 0.22)',
  selection: 'rgba(240, 166, 31, 0.28)',
  softShadow: 'rgba(21, 18, 14, 0.16)',
} as const

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: brandColors.primary,
      light: brandColors.primaryLight,
      dark: brandColors.primaryDark,
      contrastText: brandColors.slateInk,
    },
    secondary: {
      main: brandColors.secondary,
      dark: brandColors.secondaryDark,
      contrastText: '#FFFFFF',
    },
    background: {
      default: brandColors.surface,
      paper: brandColors.cream,
    },
    text: {
      primary: brandColors.slateInk,
      secondary: brandColors.textSecondary,
      disabled: brandColors.textMuted,
    },
    divider: brandColors.border,
    action: {
      hover: alpha(brandColors.primary, 0.08),
      selected: alpha(brandColors.primary, 0.14),
      focus: alpha(brandColors.primary, 0.18),
    },
    warning: {
      main: brandColors.secondary,
    },
    success: {
      main: '#3D6B4F',
    },
    error: {
      main: '#B42318',
    },
    info: {
      main: '#2F6FED',
      dark: '#1D4ED8',
      light: '#60A5FA',
      contrastText: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Inter", system-ui, sans-serif',
    // Keep body readable on mobile — never shrink below ~14–16px
    fontSize: 15,
    htmlFontSize: 16,
    body1: { fontSize: '1rem', lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    h1: { fontFamily: '"Sora", system-ui, sans-serif', fontWeight: 800 },
    h2: { fontFamily: '"Sora", system-ui, sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Sora", system-ui, sans-serif', fontWeight: 700 },
    h4: { fontFamily: '"Sora", system-ui, sans-serif', fontWeight: 700 },
    h5: { fontFamily: '"Sora", system-ui, sans-serif', fontWeight: 700 },
    h6: { fontFamily: '"Sora", system-ui, sans-serif', fontWeight: 600 },
    button: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    `0 2px 8px -2px ${brandColors.softShadow}`,
    `0 6px 20px -10px ${brandColors.softShadow}`,
    `0 10px 28px -12px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
    `0 14px 44px -18px ${brandColors.softShadow}`,
  ],
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: brandColors.surface,
          color: brandColors.textSecondary,
        },
        '::selection': {
          backgroundColor: brandColors.selection,
          color: brandColors.slateInk,
        },
      },
    },
    // Menus/dialogs don't need body scroll lock; locking adds padding-right and
    // shifts fixed layout (AppBar, drawer, bottom nav) a few pixels.
    MuiModal: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    MuiDialog: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${brandColors.border}`,
          padding: '16px 24px',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          // Match title/actions horizontal inset; keep top padding even after
          // DialogTitle (MUI would otherwise set padding-top: 0).
          paddingLeft: 24,
          paddingRight: 24,
          paddingBottom: 20,
          '&&': {
            paddingTop: 20,
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          borderTop: `1px solid ${brandColors.border}`,
          padding: '12px 24px',
        },
      },
    },
    MuiMenu: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    MuiPopover: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    MuiButton: {
      defaultProps: { variant: 'contained', disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          letterSpacing: '0.01em',
          transition:
            'background-color 200ms ease-in-out, border-color 200ms ease-in-out, box-shadow 200ms ease-in-out, color 200ms ease-in-out',
        },
        sizeMedium: {
          minHeight: 40,
          paddingInline: 18,
        },
        sizeLarge: {
          minHeight: 48,
          paddingInline: 22,
        },
        containedPrimary: {
          backgroundColor: brandColors.primary,
          color: brandColors.slateInk,
          '&:hover': {
            backgroundColor: brandColors.primaryDark,
          },
        },
        containedSuccess: {
          backgroundColor: '#3D6B4F',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#335A43',
          },
        },
        containedError: {
          backgroundColor: '#B42318',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#912018',
          },
        },
        containedWarning: {
          backgroundColor: brandColors.secondary,
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: brandColors.secondaryDark,
          },
        },
        // Soft filled outlines — readable on cream surfaces (avoids pale yellow-on-beige)
        outlined: {
          borderWidth: 1.5,
          backgroundColor: brandColors.morningBg,
          '&:hover': {
            borderWidth: 1.5,
            backgroundColor: brandColors.morningBg,
          },
        },
        outlinedPrimary: {
          borderColor: brandColors.primaryDark,
          color: brandColors.slateInk,
          '&:hover': {
            borderColor: brandColors.slateInk,
            backgroundColor: alpha(brandColors.primary, 0.14),
            color: brandColors.slateInk,
          },
        },
        outlinedSecondary: {
          borderColor: brandColors.secondaryDark,
          color: brandColors.secondaryDark,
          '&:hover': {
            borderColor: brandColors.secondaryDark,
            backgroundColor: alpha(brandColors.secondary, 0.12),
          },
        },
        outlinedError: {
          borderColor: '#B42318',
          color: '#912018',
          backgroundColor: alpha('#B42318', 0.06),
          '&:hover': {
            borderColor: '#912018',
            backgroundColor: alpha('#B42318', 0.12),
            color: '#912018',
          },
        },
        outlinedWarning: {
          borderColor: brandColors.secondaryDark,
          color: brandColors.secondaryDark,
          backgroundColor: alpha(brandColors.secondary, 0.08),
          '&:hover': {
            borderColor: brandColors.secondaryDark,
            backgroundColor: alpha(brandColors.secondary, 0.16),
          },
        },
        outlinedSuccess: {
          borderColor: '#3D6B4F',
          color: '#335A43',
          backgroundColor: alpha('#3D6B4F', 0.08),
          '&:hover': {
            borderColor: '#335A43',
            backgroundColor: alpha('#3D6B4F', 0.14),
          },
        },
        text: {
          color: brandColors.textSecondary,
          '&:hover': {
            backgroundColor: alpha(brandColors.slateInk, 0.06),
            color: brandColors.slateInk,
          },
        },
        textPrimary: {
          color: brandColors.primaryDark,
          '&:hover': {
            backgroundColor: alpha(brandColors.primary, 0.12),
            color: brandColors.slateInk,
          },
        },
        textError: {
          color: '#B42318',
          '&:hover': {
            backgroundColor: alpha('#B42318', 0.1),
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: 16,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${brandColors.border}`,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 150ms ease-in-out',
          '&.MuiTableRow-hover:hover': {
            backgroundColor: alpha(brandColors.primary, 0.08),
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: brandColors.cream,
          color: brandColors.slateInk,
          borderBottom: `1px solid ${brandColors.border}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: brandColors.cream,
          borderRight: `1px solid ${brandColors.border}`,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          color: brandColors.textSecondary,
          // Comfortable thumb targets on touch devices
          [t.breakpoints.down('md')]: {
            minWidth: 44,
            minHeight: 44,
          },
          '&:hover': {
            backgroundColor: alpha(brandColors.slateInk, 0.06),
            color: brandColors.slateInk,
          },
        }),
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderColor: brandColors.borderStrong,
          color: brandColors.textSecondary,
          '&.Mui-selected': {
            backgroundColor: alpha(brandColors.primary, 0.18),
            color: brandColors.slateInk,
            borderColor: brandColors.primaryDark,
            '&:hover': {
              backgroundColor: alpha(brandColors.primary, 0.26),
            },
          },
          '&:hover': {
            backgroundColor: alpha(brandColors.slateInk, 0.04),
          },
        },
      },
    },
    MuiTabs: {
      defaultProps: {
        textColor: 'inherit',
      },
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
          backgroundColor: brandColors.primaryDark,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          color: brandColors.textSecondary,
          '&.Mui-selected': {
            color: `${brandColors.slateInk} !important`,
            fontWeight: 700,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          // Soft tint badges — readable color, no neon fills
          '&.MuiChip-colorDefault.MuiChip-filled': {
            backgroundColor: alpha(brandColors.slateInk, 0.1),
            color: brandColors.textSecondary,
            border: `1px solid ${brandColors.borderStrong}`,
          },
          '&.MuiChip-colorDefault.MuiChip-outlined': {
            borderWidth: 1.5,
            borderColor: brandColors.borderStrong,
            color: brandColors.textMuted,
            backgroundColor: alpha(brandColors.slateInk, 0.04),
          },
          // Active / finished — soft green
          '&.MuiChip-colorSuccess.MuiChip-filled': {
            backgroundColor: alpha('#3D6B4F', 0.14),
            color: '#2A4A37',
            border: `1px solid ${alpha('#3D6B4F', 0.35)}`,
            '& .MuiChip-label': { color: '#2A4A37' },
          },
          '&.MuiChip-colorSuccess.MuiChip-outlined': {
            borderWidth: 1.5,
            borderColor: alpha('#3D6B4F', 0.45),
            color: '#2A4A37',
            backgroundColor: alpha('#3D6B4F', 0.08),
          },
          // Blocked / danger — soft red
          '&.MuiChip-colorError.MuiChip-filled': {
            backgroundColor: alpha('#B42318', 0.12),
            color: '#912018',
            border: `1px solid ${alpha('#B42318', 0.35)}`,
            '& .MuiChip-label': { color: '#912018' },
          },
          '&.MuiChip-colorError.MuiChip-outlined': {
            borderWidth: 1.5,
            borderColor: alpha('#B42318', 0.4),
            color: '#912018',
            backgroundColor: alpha('#B42318', 0.06),
          },
          // In progress — soft blue
          '&.MuiChip-colorInfo.MuiChip-filled': {
            backgroundColor: alpha('#2F6FED', 0.12),
            color: '#1D4ED8',
            border: `1px solid ${alpha('#2F6FED', 0.35)}`,
            '& .MuiChip-label': { color: '#1D4ED8' },
          },
          '&.MuiChip-colorInfo.MuiChip-outlined': {
            borderWidth: 1.5,
            borderColor: alpha('#1D4ED8', 0.4),
            color: '#1D4ED8',
            backgroundColor: alpha('#2F6FED', 0.08),
          },
          // Awaiting / attention — soft amber
          '&.MuiChip-colorWarning.MuiChip-filled': {
            backgroundColor: alpha(brandColors.secondary, 0.14),
            color: brandColors.secondaryDark,
            border: `1px solid ${alpha(brandColors.secondary, 0.4)}`,
            '& .MuiChip-label': { color: brandColors.secondaryDark },
          },
          '&.MuiChip-colorWarning.MuiChip-outlined': {
            borderWidth: 1.5,
            borderColor: alpha(brandColors.secondaryDark, 0.45),
            color: brandColors.secondaryDark,
            backgroundColor: alpha(brandColors.secondary, 0.08),
          },
          // Role / brand chips
          '&.MuiChip-colorPrimary.MuiChip-filled': {
            backgroundColor: alpha(brandColors.primary, 0.16),
            color: brandColors.slateInk,
            border: `1px solid ${alpha(brandColors.primaryDark, 0.35)}`,
          },
          '&.MuiChip-colorPrimary.MuiChip-outlined': {
            borderWidth: 1.5,
            borderColor: alpha(brandColors.primaryDark, 0.45),
            color: brandColors.slateInk,
            backgroundColor: alpha(brandColors.primary, 0.1),
          },
          '&.MuiChip-colorSecondary.MuiChip-filled': {
            backgroundColor: alpha(brandColors.secondary, 0.14),
            color: brandColors.secondaryDark,
            border: `1px solid ${alpha(brandColors.secondary, 0.35)}`,
          },
          '&.MuiChip-colorSecondary.MuiChip-outlined': {
            borderWidth: 1.5,
            borderColor: alpha(brandColors.secondaryDark, 0.45),
            color: brandColors.secondaryDark,
            backgroundColor: alpha(brandColors.secondary, 0.08),
          },
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: brandColors.cream,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        primary: {
          backgroundColor: brandColors.primary,
          color: brandColors.slateInk,
          boxShadow: `0 2px 8px -2px ${brandColors.softShadow}`,
          '&:hover': {
            backgroundColor: brandColors.primaryDark,
            boxShadow: `0 6px 20px -10px ${brandColors.softShadow}`,
          },
        },
      },
    },
  },
})

export default theme
