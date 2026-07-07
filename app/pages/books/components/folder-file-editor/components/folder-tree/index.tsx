"use client";

import { Button, Empty, Typography } from "antd";
import {
  FolderOpenOutlined,
  FolderOutlined,
  FileOutlined,
  DownOutlined,
  RightOutlined,
  PlusOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import type { BookFile, Folder } from "@/app/types";
import styles from "../../index.module.css";

interface FolderTreeProps {
  folders: Folder[];
  expandedFolders: Set<string>;
  selectedFile: BookFile | null;
  onToggleFolder: (folderId: string) => void;
  onSelectFile: (file: BookFile) => void;
  onDeleteFile: (fileId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onNewFile: (folderId: string) => void;
}

export function FolderTree({
  folders,
  expandedFolders,
  selectedFile,
  onToggleFolder,
  onSelectFile,
  onDeleteFile,
  onDeleteFolder,
  onNewFile
}: FolderTreeProps) {
  if (folders.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Empty
          image={<FolderOpenOutlined style={{ fontSize: 48, color: "var(--text-light)" }} />}
          description={
            <>
              <Typography.Text type="secondary" style={{ fontWeight: 500, fontSize: 15 }}>暂无文件夹</Typography.Text>
              <br />
              <Typography.Text type="secondary" style={{ fontSize: 13, color: "var(--text-light)" }}>{'点击上方"新建"创建文件夹'}</Typography.Text>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.treeContainer}>
      {folders.map((folder) => (
        <div key={folder.id}>
          <div className={styles.folderItem} onClick={() => onToggleFolder(folder.id)}>
            {expandedFolders.has(folder.id) ? (
              <DownOutlined style={{ fontSize: 10, color: "var(--text-secondary)" }} />
            ) : (
              <RightOutlined style={{ fontSize: 10, color: "var(--text-secondary)" }} />
            )}
            <FolderOutlined style={{ fontSize: 16, color: "var(--text-secondary)" }} className={styles.folderIcon} />
            <span className={styles.folderName}>{folder.name}</span>
            <div className={styles.folderActions}>
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={(event) => {
                  event.stopPropagation();
                  onNewFile(folder.id);
                }}
                title="新建文件"
              />
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteFolder(folder.id);
                }}
                title="删除文件夹"
              />
            </div>
          </div>

          {expandedFolders.has(folder.id)
            ? folder.files.map((file) => (
                <div
                  key={file.id}
                  className={`${styles.fileItem} ${
                    selectedFile?.id === file.id ? styles.fileItemActive : ""
                  }`}
                  onClick={() => onSelectFile(file)}
                >
                  <FileOutlined
                    style={{ fontSize: 14, color: "var(--text-secondary)" }}
                    className={styles.fileIcon}
                  />
                  <Typography.Text
                    className={`${styles.fileName} ${
                      selectedFile?.id === file.id ? styles.fileNameActive : ""
                    }`}
                  >
                    {file.name}
                  </Typography.Text>
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteFile(file.id);
                    }}
                    title="删除文件"
                  />
                </div>
              ))
            : null}
        </div>
      ))}
    </div>
  );
}
