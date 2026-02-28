import { Button, Form, Input, Modal } from "antd";
import type { FormInstance } from "antd/es/form";

type Props = {
  open: boolean;
  form: FormInstance;
  onCancel: () => void;
  onSubmit: (values: { name: string }) => void;
};

export const BranchCreateModal = ({ open, form, onCancel, onSubmit }: Props) => {
  return (
    <Modal open={open} title="Новый филиал" footer={null} onCancel={onCancel}>
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="name"
          label="Название филиала"
          rules={[{ required: true, message: "Введите название" }]}
        >
          <Input />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          Сохранить
        </Button>
      </Form>
    </Modal>
  );
};

