// Woofadaar UI Style Guide Colors
// Based on the official design system document

export const Colors = {
  // Primary Colors
  primary: {
    mintTeal: '#3bbca8',
    mintTealDark: '#33A693',
    mutedPurple: '#76519f',
    burntOrange: '#e05a37',
    warmYellow: '#ffa602',
  },

  // Neutral Colors
  neutral: {
    milkWhite: '#fef8e8',
    lightGrey: '#afaeac',
    darkGrey: '#8B8A88',
    fafafa: '#FAFAFA',
    eeeeee: '#EEEEEE',
    d6d5d4: '#D6D5D4',
    bebdbb: '#BEBDBB',
    '4a4948': '#4A4948',
    black: '#000000',
  },

  // Secondary Colors with Opacity Variations
  secondary: {
    mintTeal: {
      100: '#3bbca8',
      80: 'rgba(59, 188, 168, 0.8)',
      60: 'rgba(59, 188, 168, 0.6)',
      40: 'rgba(59, 188, 168, 0.4)',
      20: 'rgba(59, 188, 168, 0.2)',
    },
    mutedPurple: {
      100: '#76519f',
      80: 'rgba(118, 81, 159, 0.8)',
      60: 'rgba(118, 81, 159, 0.6)',
      40: 'rgba(118, 81, 159, 0.4)',
      20: 'rgba(118, 81, 159, 0.2)',
    },
    burntOrange: {
      100: '#e05a37',
      80: 'rgba(224, 90, 55, 0.8)',
      60: 'rgba(224, 90, 55, 0.6)',
      40: 'rgba(224, 90, 55, 0.4)',
      20: 'rgba(224, 90, 55, 0.2)',
    },
    warmYellow: {
      100: '#ffa602',
      80: 'rgba(255, 166, 2, 0.8)',
      60: 'rgba(255, 166, 2, 0.6)',
      40: 'rgba(255, 166, 2, 0.4)',
      20: 'rgba(255, 166, 2, 0.2)',
    },
  },

  // Functional Colors
  functional: {
    success: '#099441',
    warning: '#FFC107',
    error: '#B71C1C',
    info: '#1976D2',
  },

  // Common UI Colors for Mobile
  ui: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    border: '#EEEEEE',
    divider: '#D6D5D4',
    textPrimary: '#000000',
    textSecondary: '#4A4948',
    textTertiary: '#8B8A88',
    textDisabled: '#BEBDBB',
    iconActive: '#3bbca8',
    iconInactive: '#8B8A88',
  },

  // Tab Bar Specific
  tabBar: {
    background: '#FFFFFF',
    activeTint: '#3bbca8',
    inactiveTint: '#8B8A88',
    border: '#EEEEEE',
  },
};

// Typography Configuration
export const Typography = {
  fontFamily: 'PublicSans', // Will need to load Public Sans font
  fontSizes: {
    h1: 84,
    h2: 60,
    h3: 48,
    h4: 34,
    h5: 24,
    h6: 20,
    body1: 16,
    body2: 14,
    caption: 12,
    small: 10,
  },
  fontWeights: {
    black: '900',
    bold: '700',
    semiBold: '600',
    medium: '500',
    regular: '400',
    light: '300',
  },
};

// Spacing based on grid system
export const Spacing = {
  mobile: {
    margin: 24,
    gutter: 16,
    columnWidth: 44,
  },
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border Radius
export const BorderRadius = {
  card: 32,
  button: 16,
  buttonSmall: 12,
  input: 12,
  small: 8,
  tiny: 4,
};

// Shadows
export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
};