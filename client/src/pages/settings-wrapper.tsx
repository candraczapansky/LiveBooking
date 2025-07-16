import { useEffect, useState } from "react";
import Settings from "./settings";
import SettingsMobile from "./settings-mobile";

const SettingsWrapper = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile ? <SettingsMobile /> : <Settings />;
};

export default SettingsWrapper; 