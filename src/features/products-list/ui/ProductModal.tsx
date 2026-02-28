import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  Upload,
} from "antd";
import type { UploadProps } from "antd";
import type { FormInstance } from "antd/es/form";
import { toSafeMediaUrl } from "../../../security/url";

const { Text } = Typography;
const { Option } = Select;

type ProductLike = {
  id: string;
  name: string;
};

type SupplierLike = {
  id: string;
  name: string;
};

type BranchLike = {
  id: string;
  name: string;
};

export type ProductModalProps = {
  open: boolean;
  form: FormInstance;
  isEditing: boolean;
  editingProductId?: string;
  products: ProductLike[];
  suppliers: SupplierLike[];
  branches: BranchLike[];
  productCategoryOptions: string[];
  newProductCategory: string;
  setNewProductCategory: (v: string) => void;
  addCategoryLoading?: boolean;
  productIsCombo: boolean;
  comboAvailableFromSelection: number;
  productPhotoUrls?: string[];
  isUploadingPhoto?: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
  onAddCategory: () => void;
  onUploadProductPhoto: NonNullable<UploadProps["customRequest"]>;
};

export const ProductModal = ({
  open,
  form,
  isEditing,
  editingProductId,
  products,
  suppliers,
  branches,
  productCategoryOptions,
  newProductCategory,
  setNewProductCategory,
  addCategoryLoading,
  productIsCombo,
  comboAvailableFromSelection,
  productPhotoUrls,
  isUploadingPhoto,
  onCancel,
  onSubmit,
  onAddCategory,
  onUploadProductPhoto,
}: ProductModalProps) => {
  return (
    <Modal open={open} title={isEditing ? "Редактировать товар" : "Товар"} footer={null} onCancel={onCancel}>
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item name="name" label="Название" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="categories"
          label="Каталоги / Категории"
          rules={[{ required: true, message: "Добавьте хотя бы одну категорию" }]}
          tooltip="Можно выбрать из списка или ввести свою категорию вручную"
        >
          <Select mode="tags" tokenSeparators={[","]}>
            {productCategoryOptions.map((c) => (
              <Option key={c} value={c}>
                {c}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Row gutter={8}>
          <Col span={16}>
            <Input
              value={newProductCategory}
              onChange={(e) => setNewProductCategory(e.target.value)}
              placeholder="Новая категория (для всех товаров)"
            />
          </Col>
          <Col span={8}>
            <Button block onClick={onAddCategory} loading={addCategoryLoading}>
              Добавить
            </Button>
          </Col>
        </Row>
        <Form.Item
          name="branchName"
          label="Филиал товара"
          rules={[{ required: true, message: "Выберите филиал" }]}
        >
          <Select>
            {branches.map((b) => (
              <Option key={b.id} value={b.name}>
                {b.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          name="isCombo"
          label="Тип товара"
          valuePropName="checked"
          tooltip="Комбо списывает остатки по каждому товару из состава"
        >
          <Switch checkedChildren="Комбо" unCheckedChildren="Обычный" />
        </Form.Item>
        {productIsCombo && (
          <Form.List name="comboItems">
            {(fields, { add, remove }) => (
              <Card
                size="small"
                className="mb-4"
                title="Состав комбо"
                extra={
                  <Button type="dashed" size="small" onClick={() => add()}>
                    + Добавить товар
                  </Button>
                }
              >
                <div className="space-y-2">
                  {fields.map((field) => (
                    <Row key={field.key} gutter={8} align="middle">
                      <Col span={15}>
                        <Form.Item
                          {...field}
                          name={[field.name, "productId"]}
                          rules={[{ required: true, message: "Выберите товар" }]}
                        >
                          <Select showSearch optionFilterProp="children">
                            {products
                              .filter((p) => p.id !== editingProductId)
                              .map((p) => (
                                <Option key={p.id} value={p.id}>
                                  {p.name}
                                </Option>
                              ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={7}>
                        <Form.Item
                          {...field}
                          name={[field.name, "quantity"]}
                          rules={[{ required: true, message: "Кол-во" }]}
                        >
                          <InputNumber min={1} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col span={2}>
                        <Button
                          danger
                          type="text"
                          icon={<DeleteOutlined />}
                          onClick={() => remove(field.name)}
                        />
                      </Col>
                    </Row>
                  ))}
                  {fields.length === 0 && (
                    <Text type="secondary">Добавьте хотя бы один товар</Text>
                  )}
                </div>
              </Card>
            )}
          </Form.List>
        )}
        {productIsCombo && (
          <Card size="small" className="mb-4">
            <div className="flex items-center justify-between">
              <Text type="secondary">Доступно комплектов из выбранных товаров</Text>
              <Tag
                color={
                  comboAvailableFromSelection <= 0
                    ? "red"
                    : comboAvailableFromSelection <= 3
                      ? "gold"
                      : "green"
                }
              >
                {comboAvailableFromSelection} шт
              </Tag>
            </div>
          </Card>
        )}
        <Form.Item name="supplier" label="Поставщик">
          <Select showSearch={{ optionFilterProp: "children" }} allowClear>
            {suppliers.map((s) => (
              <Option key={s.id} value={s.name}>
                {s.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="Фото товара">
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Upload accept="image/*" showUploadList={false} customRequest={onUploadProductPhoto}>
              <Button icon={<UploadOutlined />} loading={isUploadingPhoto}>
                Добавить фото
              </Button>
            </Upload>
            {Array.isArray(productPhotoUrls) && productPhotoUrls.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {productPhotoUrls.map((url: string, idx: number) => (
                  <div key={`${url}-${idx}`} className="relative">
                    <img
                      src={toSafeMediaUrl(url)}
                      alt={`preview-${idx}`}
                      className="w-24 h-24 object-cover rounded border"
                    />
                    <Button
                      size="small"
                      danger
                      type="primary"
                      className="!absolute -top-2 -right-2"
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        const next = productPhotoUrls.filter((_, i) => i !== idx);
                        form.setFieldValue("photoUrls", next);
                        form.setFieldValue("photoUrl", next[0] || undefined);
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Text type="secondary">Фото пока нет</Text>
            )}
          </Space>
        </Form.Item>
        <Form.Item name="photoUrls" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="photoUrl" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="characteristics" label="Характеристики">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item
          name="costPrice"
          label={productIsCombo ? "Себестоимость (для комбо не нужна)" : "Себестоимость"}
          rules={productIsCombo ? [] : [{ required: true }]}
        >
          <InputNumber style={{ width: "100%" }} disabled={!!productIsCombo} />
        </Form.Item>
        <Form.Item name="sellingPrice" label="Цена продажи" rules={[{ required: true }]}>
          <InputNumber style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="managerEarnings" label="Услуга менеджера (сом)">
          <InputNumber style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="stockQty"
          label={productIsCombo ? "Остаток комбо (не используется)" : "Начальный остаток (шт)"}
          rules={productIsCombo ? [] : [{ required: true, message: "Укажите остаток" }]}
        >
          <InputNumber min={0} style={{ width: "100%" }} disabled={!!productIsCombo} />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          Сохранить
        </Button>
      </Form>
    </Modal>
  );
};
