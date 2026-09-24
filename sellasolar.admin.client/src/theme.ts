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
  glow: 'rgba(240, 166, 31, 0.48)',
  softShadow: 'rgba(21, 18, 14, 0.16)',
  ctaGradient: 'linear-gradient(135deg, #F6C85A 0%, #F0A61F 48%, #E07B3A 100%)',
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
      main: brandColors.primaryDark,
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
    // Landing uses rounded-full CTAs and rounded-3xl cards (~24px);
    // 12px keeps admin tables/forms readable while staying soft.
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
    `0 0 36px ${brandColors.glow}`,
    `0 0 36px ${brandColors.glow}`,
    `0 0 36px ${brandColors.glow}`,
    `0 0 36px ${brandColors.glow}`,
    `0 0 36px ${brandColors.glow}`,
    `0 0 36px ${brandColors.glow}`,
    `0 0 36px ${brandColors.glow}`,
    `0 0 36px ${brandColors.glow}`,
    `0 0 36px ${brandColors.glow}`,
    `0 0 36px ${brandColors.glow}`,
    `0 0 36px ${brandColors.glow}`,
    `0 0 36px ${brandColors.glow}`,
    `0 0 36px ${brandColors.glow}`,
    `0 0 36px ${brandColors.glow}`,
    `0 0 36px ${brandColors.glow}`,
    `0 0 44px rgba(240, 166, 31, 0.62)`,
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
    MuiButton: {
      defaultProps: { variant: 'contained', disableElevation: false },
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
          letterSpacing: '0.01em',
          transition:
            'background-color 200ms ease-in-out, border-color 200ms ease-in-out, box-shadow 200ms ease-in-out, transform 150ms ease-in-out, filter 200ms ease-in-out, color 200ms ease-in-out',
          '&:active': {
            transform: 'scale(0.98)',
          },
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
          background: brandColors.ctaGradient,
          color: brandColors.slateInk,
          boxShadow: `0 8px 24px rgba(240, 166, 31, 0.38)`,
          '&:hover': {
            background: brandColors.ctaGradient,
            filter: 'brightness(1.06)',
            boxShadow: `0 10px 28px rgba(240, 166, 31, 0.48)`,
          },
        },
        containedSuccess: {
          backgroundColor: '#3D6B4F',
          color: '#FFFFFF',
          boxShadow: '0 6px 18px rgba(61, 107, 79, 0.28)',
          '&:hover': {
            backgroundColor: '#335A43',
            boxShadow: '0 8px 22px rgba(61, 107, 79, 0.36)',
          },
        },
        containedError: {
          backgroundColor: '#B42318',
          color: '#FFFFFF',
          boxShadow: '0 6px 18px rgba(180, 35, 24, 0.28)',
          '&:hover': {
            backgroundColor: '#912018',
            boxShadow: '0 8px 22px rgba(180, 35, 24, 0.36)',
          },
        },
        containedWarning: {
          backgroundColor: brandColors.secondary,
          color: '#FFFFFF',
          boxShadow: `0 6px 18px ${alpha(brandColors.secondary, 0.32)}`,
          '&:hover': {
            backgroundColor: brandColors.secondaryDark,
            boxShadow: `0 8px 22px ${alpha(brandColors.secondary, 0.4)}`,
          },
        },
        // Soft filled outlines — readable on cream surfaces (avoids pale yellow-on-beige)
        outlined: {
          borderWidth: 1.5,
          backgroundColor: brandColors.morningBg,
          boxShadow: `0 1px 2px ${alpha(brandColors.slateInk, 0.04)}`,
          '&:hover': {
            borderWidth: 1.5,
            backgroundColor: '#FFFFFF',
            boxShadow: `0 4px 12px ${alpha(brandColors.slateInk, 0.1)}`,
          },
        },
        outlinedPrimary: {
          borderColor: brandColors.primaryDark,
          color: brandColors.slateInk,
          '&:hover': {
            borderColor: brandColors.slateInk,
            backgroundColor: alpha(brandColors.primary, 0.12),
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
          transition:
            'box-shadow 200ms ease-in-out, transform 200ms ease-in-out, border-color 200ms ease-in-out',
          '&:hover': {
            boxShadow: `0 14px 44px -18px ${brandColors.softShadow}`,
            borderColor: brandColors.borderStrong,
          },
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
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: brandColors.cream,
        },
      },
    },
  },
})

export default theme
