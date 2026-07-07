"use client";

import { Button } from "antd";
import { SaveOutlined } from "@ant-design/icons";

interface SaveButtonProps {
  onClick?: () => void;
  loading?: boolean;
}

export function SaveButton({ onClick, loading }: SaveButtonProps) {
  return (
    <Button
      size="small"
      icon={<SaveOutlined />}
      loading={loading}
      onClick={onClick}
      disabled={loading}
    >
      {loading ? "保存中…" : "保存"}
    </Button>
  );
}
