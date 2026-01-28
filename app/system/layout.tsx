import { Suspense, ReactNode } from "react";
import "react-toastify/dist/ReactToastify.css";
import SettingService from "@/modules/setting/setting.service";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await SettingService.getByKeys([
    "siteName",
    "siteDescription",
  ]);

  return {
    title: {
      template: `%s - ${settings.siteName || "My App"}`,
      default: settings.siteName || "My App",
    },
    description: settings.siteDescription || "Welcome to my app",
  };
}


const Layout = async ({ children }: { children: ReactNode }) => {
  return (
    <Suspense>
      {children}
    </Suspense>
  );
};

export default Layout;
