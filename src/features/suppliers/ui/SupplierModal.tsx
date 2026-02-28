import { Button, Form, Input, Modal } from "antd";
import type { FormInstance } from "antd/es/form";
import { EnvironmentOutlined, PhoneOutlined } from "@ant-design/icons";

type Props = {
  open: boolean;
  isEditing: boolean;
  form: FormInstance;
  onCancel: () => void;
  onSubmit: (values: { name: string; contacts?: string; address?: string }) => void;
  onOpenMap: () => void;
};

export const SupplierModal = ({
  open,
  isEditing,
  form,
  onCancel,
  onSubmit,
  onOpenMap,
}: Props) => {
  return (
    <Modal
      open={open}
      title={isEditing ? "Редактировать поставщика" : "Новый поставщик"}
      footer={null}
      onCancel={onCancel}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item name="name" label="Название" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item name="contacts" label="Контакты">
          <Input prefix={<PhoneOutlined />} />
        </Form.Item>

        <Form.Item name="address" label="Адрес">
          <Input
            prefix={<EnvironmentOutlined />}
            addonAfter={
              <Button type="link" size="small" onClick={onOpenMap}>
                Карта
              </Button>
            }
          />
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          Сохранить
        </Button>
      </Form>
    </Modal>
  );
};
