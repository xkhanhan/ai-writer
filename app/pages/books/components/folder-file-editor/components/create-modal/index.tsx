"use client";

import { useState } from "react";
import { Modal, Form, Input, Button, Typography } from "antd";
import { FolderOutlined } from "@ant-design/icons";
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
    <Modal open={true} title="新建文件夹" onCancel={onClose} footer={null} width={480} closable={false} maskClosable={false} keyboard={false}>
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
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24, paddingTop: 16 }}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={loading} disabled={!name.trim()} onClick={handleSubmit}>
            创建
          </Button>
        </div>
      </Form>
    </Modal>
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
    <Modal open={true} title="新建文件" onCancel={onClose} footer={null} width={480} closable={false} maskClosable={false} keyboard={false}>
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
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24, paddingTop: 16 }}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={loading} disabled={!name.trim()} onClick={handleSubmit}>
            创建
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
