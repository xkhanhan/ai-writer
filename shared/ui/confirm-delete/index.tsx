import { Modal } from "antd";

export function confirmDelete(name: string, onOk: () => void | Promise<void>) {
  let loading = false;

  const modal = Modal.confirm({
    title: "确认删除",
    content: (
      <span>
        确定要删除「<strong>{name}</strong>」吗？此操作不可撤销。
      </span>
    ),
    okText: "删除",
    okType: "danger",
    cancelText: "取消",
    async onOk() {
      if (loading) return false;
      loading = true;
      modal.update({ okButtonProps: { loading: true } });
      try {
        await onOk();
      } finally {
        loading = false;
        modal.update({ okButtonProps: { loading: false } });
      }
    },
  });
}
