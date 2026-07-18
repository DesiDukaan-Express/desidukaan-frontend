import { Platform } from 'react-native';

const webShadow = (shadow) => Platform.OS === 'web' ? shadow : {};

export const shadows = {
  sm: {
    ...Platform.select({
      web: { boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
      }
    })
  },
  md: {
    ...Platform.select({
      web: { boxShadow: '0px 4px 10px rgba(26,86,118,0.08)' },
      default: {
        shadowColor: '#1A5676',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
      }
    })
  },
  lg: {
    ...Platform.select({
      web: { boxShadow: '0px 8px 20px rgba(26,86,118,0.12)' },
      default: {
        shadowColor: '#1A5676',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 6,
      }
    })
  },
  card: {
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(100,116,139,0.07)' },
      default: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 2,
      }
    })
  },
};