import { QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, theme } from "antd";
import { queryClient } from "./api/queryClient";
import { AppContent } from "./pages/AppContent";
import { useAppStore } from "./store/appStore";

const App = () => {
  const appTheme = useAppStore((s) => s.appTheme);
  const uiMode = useAppStore((s) => s.uiMode);
  const isDark = appTheme === "dark";
  const isComfort = uiMode === "comfort";

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: isDark
            ? isComfort
              ? "#8baeea"
              : "#7ea2e1"
            : isComfort
              ? "#3a78e0"
              : "#2f6feb",
          colorInfo: isDark
            ? isComfort
              ? "#8baeea"
              : "#7ea2e1"
            : isComfort
              ? "#3a78e0"
              : "#2f6feb",
          colorSuccess: isDark ? "#61c9a8" : "#2f9e7a",
          colorWarning: isDark ? "#f2be6a" : "#ca8a04",
          colorError: isDark ? "#f38b8b" : "#d94848",
          colorBgBase: isDark ? "#111826" : "#f4f7fb",
          colorBgContainer: isDark ? "#172235" : "#ffffff",
          colorBgElevated: isDark ? "#1d2b44" : "#ffffff",
          colorBorder: isDark ? "#344862" : "#d9e2ef",
          colorText: isDark ? "#e2eaf7" : "#0f172a",
          colorTextSecondary: isDark ? "#afbdd2" : "#4b5563",
          borderRadius: isComfort ? 14 : 12,
          fontSize: isComfort ? 15 : 14,
          wireframe: false,
        },
        components: {
          Layout: {
            headerBg: isDark ? "#152135" : "#ffffff",
            siderBg: isDark ? "#152235" : "#f8fafd",
            bodyBg: "transparent",
          },
          Menu: {
            itemBorderRadius: 10,
            itemMarginInline: 8,
            itemMarginBlock: isComfort ? 8 : 6,
            itemHeight: isComfort ? 46 : 42,
            darkItemBg: isDark ? "#152235" : undefined,
            darkItemSelectedBg: isDark ? "#243a5a" : undefined,
            darkItemSelectedColor: isDark ? "#edf2fb" : undefined,
            darkItemHoverBg: isDark ? "#1f3351" : undefined,
            darkSubMenuItemBg: isDark ? "#152235" : undefined,
          },
          Card: {
            borderRadiusLG: isComfort ? 16 : 14,
          },
          Table: {
            borderColor: isDark ? "#344862" : "#e1e8f2",
            headerBg: isDark ? "#213451" : "#f8fbff",
            rowHoverBg: isDark ? "#223754" : "#f3f8ff",
          },
          Modal: {
            borderRadiusLG: 14,
          },
          Input: {
            borderRadius: isComfort ? 12 : 10,
          },
          Select: {
            borderRadius: isComfort ? 12 : 10,
          },
          Button: {
            borderRadius: isComfort ? 12 : 10,
            controlHeight: isComfort ? 40 : 36,
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ConfigProvider>
  );
};

export default App;
