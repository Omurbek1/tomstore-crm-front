import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Upload,
} from "antd";
import type { FormInstance } from "antd/es/form";
import { EnvironmentOutlined, PhoneOutlined, UploadOutlined } from "@ant-design/icons";

type Role =
  | "superadmin"
  | "admin"
  | "manager"
  | "storekeeper"
  | "cashier";

type Branch = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  isEditing: boolean;
  form: FormInstance;
  branches: Branch[];
  managerPhotoUrl?: string;
  isUploadingManagerPhoto: boolean;
  normalizeKgPhone: (value?: string) => string;
  isValidKgPhone: (value?: string) => boolean;
  onCancel: () => void;
  onSubmit: (values: {
    login: string;
    name: string;
    phone: string;
    address: string;
    branchId?: string;
    managedBranchIds?: string[];
    birthDate?: string;
    photoUrl?: string;
    password?: string;
    role?: Role;
    roles?: Role[];
    salaryType?: "commission" | "fixed";
    fixedMonthlySalary?: number;
    canManageProducts?: boolean;
  }) => void;
  canAssignAdmin?: boolean;
  canAssignSuperadmin?: boolean;
  onUploadManagerPhoto: (options: unknown) => Promise<void>;
};

const { Option } = Select;

export const ManagerModal = ({
  open,
  isEditing,
  form,
  branches,
  managerPhotoUrl,
  isUploadingManagerPhoto,
  normalizeKgPhone,
  isValidKgPhone,
  onCancel,
  onSubmit,
  canAssignAdmin,
  canAssignSuperadmin,
  onUploadManagerPhoto,
}: Props) => {
  const salaryType = Form.useWatch("salaryType", form);
  const mainRole = Form.useWatch("role", form) as Role | undefined;
  const selectedRoles = (Form.useWatch("roles", form) as Role[] | undefined) || [];
  const hasStorekeeperRole =
    mainRole === "storekeeper" || selectedRoles.includes("storekeeper");
  const hasSuperadminRole =
    mainRole === "superadmin" || selectedRoles.includes("superadmin");

  return (
    <Modal
      open={open}
      title={isEditing ? "Редактировать сотрудника" : "Новый сотрудник"}
      footer={null}
      onCancel={onCancel}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item name="login" label="Логин" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item name="name" label="Имя" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item
          name="phone"
          label="Телефон"
          normalize={(value) => normalizeKgPhone(value)}
          rules={[
            { required: true, message: "Введите телефон" },
            {
              validator: (_, value) =>
                isValidKgPhone(value)
                  ? Promise.resolve()
                  : Promise.reject(new Error("Укажите корректный международный номер")),
            },
          ]}
        >
          <Input prefix={<PhoneOutlined />} placeholder="+1 202 555 0147 / +996 700 123 456" />
        </Form.Item>

        <Form.Item name="address" label="Адрес" rules={[{ required: true }]}>
          <Input prefix={<EnvironmentOutlined />} />
        </Form.Item>

        <Form.Item
          name="branchId"
          label="Филиал"
          rules={
            hasSuperadminRole
              ? []
              : [{ required: true, message: "Выберите филиал" }]
          }
        >
          <Select placeholder="Выберите филиал">
            {branches.map((b) => (
              <Option key={b.id} value={b.id}>
                {b.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {hasSuperadminRole ? (
          <Form.Item
            name="managedBranchIds"
            label="Управляемые филиалы (для Superadmin)"
            rules={[
              { required: true, message: "Выберите хотя бы один филиал" },
            ]}
            tooltip="Superadmin сможет управлять выбранными филиалами"
          >
            <Select mode="multiple" placeholder="Выберите филиалы">
              {branches.map((b) => (
                <Option key={b.id} value={b.id}>
                  {b.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        ) : null}

        <Form.Item
          name="birthDate"
          label="Дата рождения"
          rules={[{ required: true, message: "Выберите дату рождения" }]}
        >
          <DatePicker format="DD.MM.YYYY" style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="Фото сотрудника">
          <Space direction="vertical" style={{ width: "100%" }}>
            <Upload
              accept="image/*"
              showUploadList={false}
              customRequest={onUploadManagerPhoto as never}
            >
              <Button icon={<UploadOutlined />} loading={isUploadingManagerPhoto}>
                Загрузить фото
              </Button>
            </Upload>
            {managerPhotoUrl ? (
              <img
                src={managerPhotoUrl}
                alt="manager-preview"
                className="w-24 h-24 object-cover rounded-full border"
              />
            ) : null}
          </Space>
        </Form.Item>

        <Form.Item name="photoUrl" hidden>
          <Input />
        </Form.Item>

        {!isEditing && (
          <Form.Item name="password" label="Пароль" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
        )}

        <Form.Item name="role" label="Основная роль" initialValue="manager">
          <Radio.Group>
            <Radio value="manager">MGR</Radio>
            <Radio value="storekeeper">STORE</Radio>
            <Radio value="cashier">CASHIER</Radio>
            {canAssignAdmin ? <Radio value="admin">ADM</Radio> : null}
            {canAssignSuperadmin ? (
              <Radio value="superadmin">SUPER</Radio>
            ) : null}
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="roles"
          label="Дополнительные роли"
          tooltip="Можно назначить несколько ролей одному сотруднику"
        >
          <Checkbox.Group
            options={[
              { label: "Менеджер", value: "manager" },
              { label: "Склад", value: "storekeeper" },
              { label: "Кассир", value: "cashier" },
              ...(canAssignAdmin ? [{ label: "Админ", value: "admin" }] : []),
              ...(canAssignSuperadmin
                ? [{ label: "Superadmin", value: "superadmin" }]
                : []),
            ]}
          />
        </Form.Item>

        {hasStorekeeperRole ? (
          <Form.Item
            name="canManageProducts"
            valuePropName="checked"
            label="Разрешение для склада"
            tooltip="Если включено, сотрудник со ролью Склад может добавлять/редактировать товары"
          >
            <Checkbox>Разрешить добавление и управление товарами</Checkbox>
          </Form.Item>
        ) : null}

        <Form.Item name="salaryType" label="Тип оплаты" initialValue="commission">
          <Radio.Group>
            <Radio value="commission">% / с продаж</Radio>
            <Radio value="fixed">Фикс. оклад</Radio>
          </Radio.Group>
        </Form.Item>

        {salaryType === "fixed" ? (
          <Form.Item
            name="fixedMonthlySalary"
            label="Оклад в месяц (сом)"
            rules={[{ required: true, message: "Укажите оклад" }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        ) : null}

        <Button type="primary" htmlType="submit" block>
          Сохранить
        </Button>
      </Form>
    </Modal>
  );
};
