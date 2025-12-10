// src/utils/activation.ts

const LICENSE_STORAGE_KEY = 'workgrid_license_code';
const SYNC_KEY_STORAGE_KEY = 'workgrid_sync_key';

// 🟢 核心：强制返回 true，骗过所有检查机制
export const isAppActivated = (): boolean => {
  return true; 
};

// 正常的获取逻辑，不影响云同步功能
export const getLocalLicenseCode = (): string | null => {
  return localStorage.getItem(LICENSE_STORAGE_KEY);
};

export const getUserApiKey = (): string | null => {
  return localStorage.getItem(SYNC_KEY_STORAGE_KEY);
};

export const activateAndLockLicense = async (code: string, userSyncKey: string): Promise<void> => {
  if (code) localStorage.setItem(LICENSE_STORAGE_KEY, code);
  if (userSyncKey) localStorage.setItem(SYNC_KEY_STORAGE_KEY, userSyncKey);
  return Promise.resolve();
};

export const deactivateApp = () => {
  localStorage.removeItem(LICENSE_STORAGE_KEY);
  localStorage.removeItem(SYNC_KEY_STORAGE_KEY);
};