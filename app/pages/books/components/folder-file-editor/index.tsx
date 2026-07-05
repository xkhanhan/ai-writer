"use client";

import { useState } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useFolderFileEditor } from "@/app/pages/books/hooks/use-folder-file-editor";
import { CreateFileModal, CreateFolderModal } from "./components/create-modal";
import { FolderTree } from "./components/folder-tree";
import { MarkdownEditor } from "./components/markdown-editor";
import styles from "./index.module.css";

interface FolderFileEditorProps {
  title: string;
  bookId: string;
  category: string;
}

export default function FolderFileEditor({
  title,
  bookId,
  category
}: FolderFileEditorProps) {
  const {
    folders,
    selectedFile,
    expandedFolders,
    isLoading,
    saveStatus,
    textareaRef,
    toggleFolder,
    addFolder,
    addFile,
    selectFile,
    updateContent,
    removeFile,
    removeFolder,
    handleCompositionStart,
    handleCompositionEnd
  } = useFolderFileEditor({ bookId, category });

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const handleNewFile = (folderId: string) => {
    setSelectedFolderId(folderId);
    setShowFileModal(true);
  };

  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>{title}</span>
          <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => setShowFolderModal(true)}>
            新建
          </Button>
        </div>

        <FolderTree
          folders={folders}
          expandedFolders={expandedFolders}
          selectedFile={selectedFile}
          onToggleFolder={toggleFolder}
          onSelectFile={selectFile}
          onDeleteFile={removeFile}
          onDeleteFolder={removeFolder}
          onNewFile={handleNewFile}
        />
      </div>

      <div className={styles.editorArea}>
        {selectedFile ? (
          <MarkdownEditor
            file={selectedFile}
            saveStatus={saveStatus}
            textareaRef={textareaRef}
            onChange={updateContent}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
          />
        ) : (
          <div className={styles.emptyEditor}>
            <p className={styles.emptyEditorText}>请从左侧选择文件，或先创建文件夹与文件。</p>
          </div>
        )}
      </div>

      {showFolderModal ? (
        <CreateFolderModal
          onClose={() => setShowFolderModal(false)}
          onSubmit={addFolder}
        />
      ) : null}

      {showFileModal && selectedFolder ? (
        <CreateFileModal
          folder={selectedFolder}
          onClose={() => setShowFileModal(false)}
          onSubmit={addFile}
        />
      ) : null}
    </div>
  );
}
