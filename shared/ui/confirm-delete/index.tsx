import { Modal } from "antd";

export function confirmDelete(
  name: string,
  onOk: () => void | Promise<void>,
  warning?: string
) {
  let loading = false;

  const modal = Modal.confirm({
    title: "确认删除",
    content: (
      <div>
        <span>
          确定要删除「<strong>{name}</strong>」吗？此操作不可撤销。
        </span>
        {warning && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              background: "var(--color-warning-bg)",
              borderLeft: "3px solid var(--color-warning)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              color: "var(--color-warning)",
              lineHeight: 1.5,
            }}
          >
            {warning}
          </div>
        )}
      </div>
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
