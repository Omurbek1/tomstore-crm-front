import { Button, Form, Input, Modal, Space, Upload } from "antd";
import type { FormInstance } from "antd/es/form";
import {
  EnvironmentOutlined,
  PhoneOutlined,
  DeleteOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { toSafeMediaUrl } from "../../../security/url";

type Props = {
  open: boolean;
  isEditing: boolean;
  form: FormInstance;
  onCancel: () => void;
  onSubmit: (values: {
    name: string;
    contacts?: string;
    address?: string;
    imageUrl?: string;
    imageUrls?: string[];
    videoUrl?: string;
  }) => void;
  onOpenMap: () => void;
  onUploadImage: (options: any) => void;
  isUploadingImage?: boolean;
};

export const SupplierModal = ({
  open,
  isEditing,
  form,
  onCancel,
  onSubmit,
  onOpenMap,
  onUploadImage,
  isUploadingImage,
}: Props) => {
  const imageUrls = (form.getFieldValue("imageUrls") as string[] | undefined) || [];
  return (
    <Modal
      open={open}
      title={isEditing ? "Редактировать поставщика" : "Новый поставщик"}
      footer={null}
      onCancel={onCancel}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          const cleanedImageUrls = ((values.imageUrls || []) as string[])
            .map((value) => String(value || "").trim())
            .filter(Boolean);
          onSubmit({
            ...values,
            imageUrls: cleanedImageUrls,
            imageUrl: cleanedImageUrls[0],
          });
        }}
      >
        <Form.Item name="name" label="Название" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item name="contacts" label="Контакты">
          <Input prefix={<PhoneOutlined />} />
        </Form.Item>

        <Form.Item name="address" label="Адрес">
          <Space.Compact style={{ width: "100%" }}>
            <Input prefix={<EnvironmentOutlined />} style={{ flex: 1 }} />
            <Button onClick={onOpenMap}>Карта</Button>
          </Space.Compact>
        </Form.Item>

        <Form.Item label="Фото поставщика (несколько)">
          <Space direction="vertical" style={{ width: "100%" }}>
            <Upload
              accept="image/*"
              showUploadList={false}
              customRequest={onUploadImage}
            >
              <Button icon={<UploadOutlined />} loading={isUploadingImage}>
                Загрузить фото
              </Button>
            </Upload>
            {imageUrls.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {imageUrls.map((url, idx) => (
                  <div key={`${url}-${idx}`} className="relative">
                    <img
                      src={toSafeMediaUrl(url)}
                      alt={`supplier-${idx}`}
                      className="w-24 h-24 object-cover rounded border"
                    />
                    <Button
                      size="small"
                      type="primary"
                      danger
                      className="!absolute -top-2 -right-2"
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        const next = imageUrls.filter((_, i) => i !== idx);
                        form.setFieldValue("imageUrls", next);
                        form.setFieldValue("imageUrl", next[0] || undefined);
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </Space>
        </Form.Item>

        <Form.Item
          name="videoUrl"
          label="Видео / тур / отель ссылка"
          tooltip="Например ссылка на YouTube, Instagram, сайт тура или отеля"
        >
          <Input placeholder="https://..." />
        </Form.Item>
        <Form.Item name="imageUrl" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="imageUrls" hidden>
          <Input />
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          Сохранить
        </Button>
      </Form>
    </Modal>
  );
};
