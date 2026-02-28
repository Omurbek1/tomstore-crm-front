import { Button, Form, Input, Modal } from "antd";

type Props = {
  open: boolean;
  initialValues?: { name?: string; password?: string };
  onCancel: () => void;
  onSubmit: (values: { name?: string; password?: string }) => void;
};

export const ProfileModal = ({
  open,
  initialValues,
  onCancel,
  onSubmit,
}: Props) => {
  return (
    <Modal open={open} title="Профиль" footer={null} onCancel={onCancel}>
      <Form layout="vertical" initialValues={initialValues} onFinish={onSubmit}>
        <Form.Item name="name" label="Имя">
          <Input />
        </Form.Item>
        <Form.Item name="password" label="Новый пароль">
          <Input.Password />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          Обновить
        </Button>
      </Form>
    </Modal>
  );
};

