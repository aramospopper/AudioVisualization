// fireToast: removed legacy "data.json"-based alerting used by the template.
// AudioVisor is now live-BLE only. keep a no-op export so existing imports don't break.

const fireToast = () => {
  // legacy feature removed — use browser console or implement BLE-triggered notifications.
  return null;
};

export default fireToast;
  