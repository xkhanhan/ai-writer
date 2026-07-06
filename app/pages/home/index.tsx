"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  EditOutlined,
  CalendarOutlined,
  MoreOutlined,
  BookOutlined,
  SearchOutlined,
  UnorderedListOutlined,
  PlusSquareOutlined,
  DeleteOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { Button, Form, Input, Modal, Select, Tag, Progress, Dropdown, message } from "antd";
import { useBooks, useBookOptions } from "@/app/pages/home/hooks/use-books";
import { client } from "@/app/api-client";
import { formatDate } from "@/app/utils/format-date";
import type { Book, BookOptions } from "@/app/types";
import styles from "./index.module.css";

type LayoutMode = "card" | "row";

interface HomePageProps {
  initialBooks: Book[];
  initialBookOptions: BookOptions;
  onSelectBook: (book: Book) => void;
}

export default function HomePage({
  initialBooks,
  initialBookOptions,
  onSelectBook
}: HomePageProps) {
  const { books, loading, addBook, removeBook, refreshBooks } = useBooks(initialBooks);
  const { options } = useBookOptions(initialBookOptions);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createGenre, setCreateGenre] = useState(initialBookOptions.genres[0] ?? "");
  const [createPlatform, setCreatePlatform] = useState(
    initialBookOptions.platforms[0] ?? ""
  );
  const [createLoading, setCreateLoading] = useState(false);

  // 搜索（带防抖）
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedValue(value);
    }, 400);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // 布局切换
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("card");

  // 编辑
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editGenre, setEditGenre] = useState("");
  const [editPlatform, setEditPlatform] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const openEditModal = (book: Book) => {
    setEditingBook(book);
    setEditTitle(book.title);
    setEditDescription(book.description);
    setEditGenre(book.genre);
    setEditPlatform(book.platform);
  };

  const handleEditBook = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingBook) return;
    setEditLoading(true);
    try {
      await client.patch(`/api/books/${editingBook.id}`, {
        title: editTitle,
        description: editDescription,
        genre: editGenre,
        platform: editPlatform,
      });
      message.success("书籍已更新");
      setEditingBook(null);
      await refreshBooks();
    } catch {
      message.error("更新失败");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteBook = async (book: Book) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除「${book.title || "未命名"}」吗？此操作不可恢复。`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        await removeBook(book.id);
      },
    });
  };

  const handleCreateBook = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateLoading(true);

    try {
      await addBook({
        title: createTitle,
        description: createDescription,
        genre: createGenre,
        platform: createPlatform
      });
      setCreateTitle("");
      setCreateDescription("");
      setShowCreateModal(false);
    } finally {
      setCreateLoading(false);
    }
  };

  // 搜索过滤（使用防抖后的值）
  const filteredBooks = debouncedValue.trim()
    ? books.filter((b) => (b.title || "").toLowerCase().includes(debouncedValue.toLowerCase()))
    : books;

  return (
    <main className={styles.container}>
      {/* 页面标题区 */}
      <header className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <BookOutlined className={styles.pageIcon} />
          <h2 className={styles.pageTitle}>我的书房</h2>
        </div>
        <div className={styles.pageActions}>
          {/* 展开式搜索 */}
          <div className={`${styles.searchWrap} ${searchOpen ? styles.searchOpen : ""}`}>
            <Button
              shape="circle"
              icon={<SearchOutlined />}
              aria-label="搜索"
              onClick={() => {
                if (searchOpen) {
                  setSearchOpen(false);
                  setSearchValue("");
                  setDebouncedValue("");
                } else {
                  setSearchOpen(true);
                }
              }}
              className={styles.searchTrigger}
            />
            {searchOpen && (
              <Input
                className={styles.searchInput}
                placeholder="搜索书籍名称..."
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                autoFocus
                allowClear
                onPressEnter={() => {}}
              />
            )}
          </div>
          <Button
            shape="circle"
            icon={layoutMode === "card" ? <UnorderedListOutlined /> : <AppstoreOutlined />}
            aria-label="切换布局"
            onClick={() => setLayoutMode((prev) => (prev === "card" ? "row" : "card"))}
          />
        </div>
      </header>

      {/* 书籍列表滚动区 */}
      <div className={styles.bookScroll}>
        {layoutMode === "card" ? (
          <div className={styles.bookGrid}>
            {/* 新建书籍 */}
            <button className={styles.createCard} onClick={() => setShowCreateModal(true)}>
              <div className={styles.createIconWrapper}>
                <PlusSquareOutlined style={{ fontSize: 28 }} />
              </div>
              <div className={styles.createText}>
                <p className={styles.createTitle}>新建书籍</p>
                <p className={styles.createDesc}>开启新的创作之旅</p>
              </div>
            </button>

            {loading ? (
              <div className={styles.emptyState}>加载中...</div>
            ) : filteredBooks.length === 0 ? (
              <div className={styles.emptyState}>
                {debouncedValue ? "没有找到匹配的书籍" : "暂无书籍"}
              </div>
            ) : (
              filteredBooks.map((book) => (
                <div
                  key={book.id}
                  className={styles.bookCard}
                  onClick={() => onSelectBook(book)}
                >
                  <div className={styles.bookCover}>
                    <div className={styles.bookCoverPlaceholder}>
                      {book.title ? book.title[0] : "书"}
                    </div>
                  </div>
                  <div className={styles.bookContent}>
                    <div className={styles.bookTop}>
                      <div className={styles.bookHeader}>
                        <Tag color="green">{book.genre || "未分类"}</Tag>
                        <Dropdown
                          menu={{
                            items: [
                              { key: "edit", icon: <EditOutlined />, label: "编辑" },
                              { key: "delete", icon: <DeleteOutlined />, label: "删除", danger: true },
                            ],
                            onClick: ({ key: actionKey, domEvent }) => {
                              domEvent.stopPropagation();
                              if (actionKey === "edit") openEditModal(book);
                              else if (actionKey === "delete") handleDeleteBook(book);
                            },
                          }}
                          trigger={["click"]}
                        >
                          <Button type="text" size="small" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
                        </Dropdown>
                      </div>
                      <h3 className={styles.bookTitle}>{book.title || "未命名"}</h3>
                      <p className={styles.bookDesc}>{book.description || "暂无简介"}</p>
                    </div>
                    <div className={styles.bookBottom}>
                      <div className={styles.progressRow}>
                        <Progress percent={0} size="small" strokeColor="#d9d9d9" />
                      </div>
                      <div className={styles.metaRow}>
                        <div className={styles.metaDate}>
                          <CalendarOutlined />
                          <span>创建时间 {formatDate(book.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className={styles.bookRowList}>
            {/* 新建书籍行 */}
            <div className={styles.rowCreateCard} onClick={() => setShowCreateModal(true)}>
              <PlusSquareOutlined style={{ fontSize: 20 }} />
              <span>新建书籍</span>
            </div>

            {loading ? (
              <div className={styles.emptyState}>加载中...</div>
            ) : filteredBooks.length === 0 ? (
              <div className={styles.emptyState}>
                {debouncedValue ? "没有找到匹配的书籍" : "暂无书籍"}
              </div>
            ) : (
              filteredBooks.map((book) => (
                <div
                  key={book.id}
                  className={styles.rowCard}
                  onClick={() => onSelectBook(book)}
                >
                  <div className={styles.rowCover}>
                    {book.title ? book.title[0] : "书"}
                  </div>
                  <div className={styles.rowInfo}>
                    <span className={styles.rowTitle}>{book.title || "未命名"}</span>
                    <Tag color="green" style={{ marginLeft: 8 }}>{book.genre || "未分类"}</Tag>
                  </div>
                  <span className={styles.rowDate}>
                    <CalendarOutlined /> {formatDate(book.createdAt)}
                  </span>
                  <Dropdown
                    menu={{
                      items: [
                        { key: "edit", icon: <EditOutlined />, label: "编辑" },
                        { key: "delete", icon: <DeleteOutlined />, label: "删除", danger: true },
                      ],
                      onClick: ({ key: actionKey, domEvent }) => {
                        domEvent.stopPropagation();
                        if (actionKey === "edit") openEditModal(book);
                        else if (actionKey === "delete") handleDeleteBook(book);
                      },
                    }}
                    trigger={["click"]}
                  >
                    <Button type="text" size="small" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
                  </Dropdown>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 创建弹窗 */}
      <Modal
        title="创建新书"
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        footer={null}
        width={600}
      >
        <form onSubmit={handleCreateBook}>
          <Form.Item label="书名" extra={'可以留空，保存时会自动生成"未命名"。'}>
            <Input
              value={createTitle}
              onChange={(event) => setCreateTitle(event.target.value)}
              maxLength={60}
              showCount
              placeholder="可留空"
            />
          </Form.Item>
          <Form.Item label="题材" required>
            <Select
              value={createGenre || undefined}
              onChange={(value) => setCreateGenre(value)}
              placeholder="请选择题材"
              options={options.genres.map((genre) => ({ label: genre, value: genre }))}
            />
          </Form.Item>
          <Form.Item label="平台" required>
            <Select
              value={createPlatform || undefined}
              onChange={(value) => setCreatePlatform(value)}
              placeholder="请选择平台"
              options={options.platforms.map((platform) => ({
                label: platform,
                value: platform
              }))}
            />
          </Form.Item>
          <Form.Item label="简介">
            <Input.TextArea
              value={createDescription}
              onChange={(event) => setCreateDescription(event.target.value)}
              maxLength={300}
              showCount
              rows={4}
            />
          </Form.Item>
          <div className={styles.modalFooter}>
            <Button onClick={() => setShowCreateModal(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={createLoading}>
              确认创建
            </Button>
          </div>
        </form>
      </Modal>

      {/* 编辑弹窗 */}
      <Modal
        title="编辑书籍"
        open={!!editingBook}
        onCancel={() => setEditingBook(null)}
        footer={null}
        width={600}
      >
        <form onSubmit={handleEditBook}>
          <Form.Item label="书名">
            <Input
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              maxLength={60}
              showCount
            />
          </Form.Item>
          <Form.Item label="题材" required>
            <Select
              value={editGenre || undefined}
              onChange={(value) => setEditGenre(value)}
              options={options.genres.map((g) => ({ label: g, value: g }))}
            />
          </Form.Item>
          <Form.Item label="平台" required>
            <Select
              value={editPlatform || undefined}
              onChange={(value) => setEditPlatform(value)}
              options={options.platforms.map((p) => ({ label: p, value: p }))}
            />
          </Form.Item>
          <Form.Item label="简介">
            <Input.TextArea
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              maxLength={300}
              showCount
              rows={4}
            />
          </Form.Item>
          <div className={styles.modalFooter}>
            <Button onClick={() => setEditingBook(null)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={editLoading}>
              保存修改
            </Button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
