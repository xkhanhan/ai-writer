"use client";

import { Dropdown } from "antd";
import { BgColorsOutlined } from "@ant-design/icons";
import { useTheme } from "./theme-provider";
import styles from "./theme-switcher.module.css";

export default function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();

  const items = themes.map((t) => ({
    key: t.id,
    label: (
      <div className={styles.themeItem}>
        <div className={styles.themeName}>
          {t.label}
          {t.id === theme.id && <span className={styles.check}>✓</span>}
        </div>
        <div className={styles.themeDesc}>{t.description}</div>
        <div className={styles.swatches}>
          <span
            className={styles.swatch}
            style={{ background: t.colors.bgPage }}
          />
          <span
            className={styles.swatch}
            style={{ background: t.colors.bgElevated }}
          />
          <span
            className={styles.swatch}
            style={{ background: t.colors.primary }}
          />
        </div>
      </div>
    ),
    onClick: () => setTheme(t.id),
  }));

  return (
    <Dropdown
      menu={{ items }}
      trigger={["click"]}
      placement="bottomRight"
      arrow
    >
      <button className={styles.trigger}>
        <BgColorsOutlined />
      </button>
    </Dropdown>
  );
}
