import { Button, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Switch, Upload } from "antd";
import type { FormInstance } from "antd/es/form";
import { FileTextOutlined, LinkOutlined, SolutionOutlined, UploadOutlined, VideoCameraOutlined } from "@ant-design/icons";
import { toSafeMediaUrl } from "../../../security/url";
import type { TrainingMaterialFolder } from "../../../entities/material/model/types";

type MaterialFormValues = {
  title: string;
  type?: "video" | "document" | "link" | "image" | "other";
  description?: string;
  folderId?: string;
  lessonOrder?: number;
  url: string;
  thumbnailUrl?: string;
  isPublished?: boolean;
};

type Props = {
  open: boolean;
  isEditing: boolean;
  form: FormInstance<MaterialFormValues>;
  folders: TrainingMaterialFolder[];
  isUploadingMaterialFile: boolean;
  onCancel: () => void;
  onSubmit: (values: MaterialFormValues) => void;
  onUploadMaterialFile: (options: unknown) => Promise<void>;
  onUploadMaterialThumbnail: (options: unknown) => Promise<void>;
};

const { Option } = Select;

export const MaterialModal = ({
  open,
  isEditing,
  form,
  folders,
  isUploadingMaterialFile,
  onCancel,
  onSubmit,
  onUploadMaterialFile,
  onUploadMaterialThumbnail,
}: Props) => {
  const thumbnailUrl = Form.useWatch("thumbnailUrl", form);

  return (
    <Modal
      open={open}
      title={isEditing ? "Редактировать материал" : "Новый материал"}
      footer={null}
      onCancel={onCancel}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item name="title" label="Название" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item name="type" label="Тип" initialValue="document">
          <Select>
            <Option value="video">
              <VideoCameraOutlined /> Видео
            </Option>
            <Option value="document">
              <FileTextOutlined /> Документ
            </Option>
            <Option value="link">
              <LinkOutlined /> Ссылка
            </Option>
            <Option value="image">
              <SolutionOutlined /> Изображение
            </Option>
            <Option value="other">Другое</Option>
          </Select>
        </Form.Item>

        <Form.Item name="description" label="Описание">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Row gutter={12}>
          <Col span={16}>
            <Form.Item name="folderId" label="Папка">
              <Select allowClear placeholder="Без папки">
                {folders.map((f) => (
                  <Option key={f.id} value={f.id}>
                    {f.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="lessonOrder" label="Урок №">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="url"
          label="URL материала"
          rules={[{ required: true, message: "Укажите ссылку или загрузите файл" }]}
        >
          <Input placeholder="https://... или ссылка на загруженный файл" />
        </Form.Item>

        <Space className="mb-3">
          <Upload
            accept="video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
            showUploadList={false}
            customRequest={onUploadMaterialFile as never}
          >
            <Button icon={<UploadOutlined />} loading={isUploadingMaterialFile}>
              Загрузить файл
            </Button>
          </Upload>
          <Upload accept="image/*" showUploadList={false} customRequest={onUploadMaterialThumbnail as never}>
            <Button icon={<UploadOutlined />}>Загрузить превью</Button>
          </Upload>
        </Space>

        {thumbnailUrl ? (
          <img
            src={toSafeMediaUrl(thumbnailUrl)}
            alt="material-thumbnail"
            className="w-32 h-20 object-cover rounded border mb-3"
          />
        ) : null}

        <Form.Item name="thumbnailUrl" hidden>
          <Input />
        </Form.Item>

        <Form.Item name="isPublished" valuePropName="checked" initialValue={true}>
          <Switch checkedChildren="Опубликовано" unCheckedChildren="Черновик" />
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          Сохранить
        </Button>
      </Form>
    </Modal>
  );
};
