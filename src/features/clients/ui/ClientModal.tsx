import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, Switch } from "antd";
import type { FormInstance } from "antd/es/form";
import dayjs from "dayjs";
import { normalizeIntlPhone } from "../../../shared/lib/phone";

type Props = {
  open: boolean;
  title: string;
  form: FormInstance;
  onCancel: () => void;
  onSubmit: (values: {
    fullName: string;
    phone?: string;
    birthDate?: string;
    discountPercent?: number;
    birthdayDiscountPercent?: number;
    level?: "silver" | "gold" | "vip";
    cashbackRatePercent?: number;
    cashbackBalance?: number;
    cashbackExpiryDays?: number;
    bonusesBlocked?: boolean;
    referralCode?: string;
    referredByClientId?: string;
    referredByCode?: string;
    note?: string;
    isActive?: boolean;
  }) => void;
};

export const ClientModal = ({ open, title, form, onCancel, onSubmit }: Props) => {
  return (
    <Modal open={open} title={title} footer={null} onCancel={onCancel}>
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) =>
          onSubmit({
            ...v,
            birthDate: v.birthDate ? dayjs(v.birthDate).format("YYYY-MM-DD") : undefined,
          })
        }
      >
        <Form.Item name="fullName" label="ФИО клиента" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="phone"
          label="Телефон"
          normalize={(value) => normalizeIntlPhone(value)}
        >
          <Input placeholder="+996 700 123 456 / +7 999 123 45 67" />
        </Form.Item>
        <Form.Item name="birthDate" label="Дата рождения">
          <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
        </Form.Item>
        <Form.Item name="discountPercent" label="Скидка клиента, %" initialValue={0}>
          <InputNumber min={0} max={100} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="birthdayDiscountPercent"
          label="Доп. скидка в день рождения, %"
          initialValue={0}
        >
          <InputNumber min={0} max={100} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="level" label="Уровень клиента" initialValue="silver">
          <Select
            options={[
              { value: "silver", label: "Silver" },
              { value: "gold", label: "Gold" },
              { value: "vip", label: "VIP" },
            ]}
          />
        </Form.Item>
        <Form.Item name="cashbackRatePercent" label="Кэшбек, %" initialValue={0}>
          <InputNumber min={0} max={100} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="cashbackBalance" label="Баланс кэшбека" initialValue={0}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="cashbackExpiryDays" label="Срок кэшбека, дней" initialValue={180}>
          <InputNumber min={1} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="referralCode" label="Реферальный код">
          <Input placeholder="Например CL-ABC123" />
        </Form.Item>
        <Form.Item name="referredByClientId" label="Кем приглашен (ID клиента)">
          <Input />
        </Form.Item>
        <Form.Item name="referredByCode" label="Реферальный код пригласившего">
          <Input placeholder="Например CL-ABC123" />
        </Form.Item>
        <Form.Item name="bonusesBlocked" label="Бонусы/кэшбек заблокированы" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="note" label="Комментарий">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item
          name="isActive"
          label="Активен"
          valuePropName="checked"
          initialValue
        >
          <Switch />
        </Form.Item>
        <Button htmlType="submit" type="primary" block>
          Сохранить
        </Button>
      </Form>
    </Modal>
  );
};
