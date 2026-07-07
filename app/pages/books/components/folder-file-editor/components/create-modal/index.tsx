"use client";

import { useState } from "react";
import { Form, Input, Typography } from "antd";
import { FolderOutlined } from "@ant-design/icons";
import BaseModal from "@/shared/ui/base-modal";
import type { Folder } from "@/app/types";

interface CreateFolderModalProps {
  onClose: () => void;
  onSubmit: (name: string) => Promise<boolean>;
}

export function CreateFolderModal({ onClose, onSubmit }: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      return;
    }

    setLoading(true);
    const success = await onSubmit(name);
    setLoading(false);

    if (success) {
      onClose();
    }
  };

  return (
    <BaseModal
      title="新建文件夹"
      open={true}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="创建"
      confirmLoading={loading}
      okButtonProps={{ disabled: !name.trim() }}
      width={480}
    >
      <Form layout="vertical">
        <Form.Item label="文件夹名称" required>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：境界体系"
            autoFocus
            onPressEnter={handleSubmit}
            maxLength={60}
            showCount
            prefix={<FolderOutlined style={{ color: "var(--text-light)" }} />}
          />
        </Form.Item>
      </Form>
    </BaseModal>
  );
}

interface CreateFileModalProps {
  folder: Folder;
  onClose: () => void;
  onSubmit: (folderId: string, name: string) => Promise<boolean>;
}

export function CreateFileModal({ folder, onClose, onSubmit }: CreateFileModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      return;
    }

    setLoading(true);
    const success = await onSubmit(folder.id, name);
    setLoading(false);

    if (success) {
      onClose();
    }
  };

  return (
    <BaseModal
      title="新建文件"
      open={true}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="创建"
      confirmLoading={loading}
      okButtonProps={{ disabled: !name.trim() }}
      width={480}
    >
      <Form layout="vertical">
        <div style={{ marginBottom: 20, padding: "10px 14px", background: "var(--bg-muted)", borderRadius: 6 }}>
          <Typography.Text type="secondary">
            <FolderOutlined style={{ marginRight: 6 }} />
            {folder.name}
          </Typography.Text>
        </div>
        <Form.Item label="文件名称" required>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：修真境界体系"
            autoFocus
            onPressEnter={handleSubmit}
            maxLength={60}
            showCount
          />
        </Form.Item>
      </Form>
    </BaseModal>
  );
}
