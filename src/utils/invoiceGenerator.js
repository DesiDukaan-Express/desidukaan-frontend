import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import useAuthStore from '../store/authStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

export const downloadInvoice = async (orderId, orderNumber) => {
  const { token } = useAuthStore.getState();
  const url = `${BASE_URL}/orders/${orderId}/invoice`;

  try {
    if (Platform.OS === 'web') {
      // Web Implementation: Fetch and download as blob
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to download invoice');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `invoice-${orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } else {
      // Native Implementation: Use expo-file-system (legacy for SDK 54)
      const FileSystem = require('expo-file-system/legacy');
      const fileUri = `${FileSystem.documentDirectory}invoice-${orderNumber}.pdf`;

      const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (downloadRes.status !== 200) {
        throw new Error('Failed to download invoice');
      }

      await Sharing.shareAsync(downloadRes.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Invoice ${orderNumber}`,
        UTI: 'com.adobe.pdf',
      });
    }
  } catch (error) {
    console.error("Invoice Download Error:", error);
    throw error;
  }
};
