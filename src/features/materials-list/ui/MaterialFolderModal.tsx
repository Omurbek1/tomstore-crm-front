import { Button, Form, Input, InputNumber, Modal } from "antd";
import type { FormInstance } from "antd/es/form";

type MaterialFolderFormValues = {
  name: string;
  description?: string;
  sortOrder?: number;
};

type Props = {
  open: boolean;
  form: FormInstance<MaterialFolderFormValues>;
  onCancel: () => void;
  onSubmit: (values: MaterialFolderFormValues) => void;
};

export const MaterialFolderModal = ({ open, form, onCancel, onSubmit }: Props) => {
  return (
    <Modal open={open} title="Новая папка материалов" footer={null} onCancel={onCancel}>
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="name"
          label="Название папки"
          rules={[{ required: true, message: "Введите название" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item name="description" label="Описание">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item name="sortOrder" label="Порядок">
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          Сохранить папку
        </Button>
      </Form>
    </Modal>
  );
};
