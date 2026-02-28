import { Alert, Button, Form, Input, InputNumber, Modal, Radio, Select, Typography } from "antd";
import { useMemo } from "react";

type ManagerLike = {
  id: string;
  name: string;
};

type Values = {
  type: "salary" | "advance";
  managerId: string;
  amount: number;
  reason?: string;
};

type ManagerPayoutMeta = {
  earned: number;
  bonuses: number;
  advances: number;
  available: number;
  maxPayable: number;
  debt: number;
};

type Props = {
  open: boolean;
  managers: ManagerLike[];
  managerPayoutMeta: Record<string, ManagerPayoutMeta>;
  onCancel: () => void;
  onSubmit: (values: Values) => void;
};

export const FinanceAccrualModal = ({
  open,
  managers,
  managerPayoutMeta,
  onCancel,
  onSubmit,
}: Props) => {
  const [form] = Form.useForm<Values>();
  const selectedManagerId = Form.useWatch("managerId", form);
  const selectedMeta = useMemo(
    () => (selectedManagerId ? managerPayoutMeta[selectedManagerId] : undefined),
    [selectedManagerId, managerPayoutMeta],
  );
  const maxAllowed = selectedMeta?.maxPayable ?? 0;

  return (
    <Modal
      open={open}
      title="Начисление"
      footer={null}
      onCancel={onCancel}
      afterOpenChange={(visible) => {
        if (!visible) form.resetFields();
      }}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item name="type" initialValue="salary">
          <Radio.Group>
            <Radio.Button value="salary">ЗП/Бонус</Radio.Button>
            <Radio.Button value="advance">Аванс</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item name="managerId" label="Сотрудник" rules={[{ required: true }]}>
          <Select>
            {managers.map((m) => (
              <Select.Option key={m.id} value={m.id}>
                {m.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {selectedMeta ? (
          <div className="mb-3">
            <Typography.Text type="secondary">
              Макс. к выплате сейчас: <b>{maxAllowed.toLocaleString()} c</b>
            </Typography.Text>
            {selectedMeta.debt < 0 ? (
              <Alert
                className="mt-2"
                type="warning"
                showIcon
                message={`Долг сотрудника: ${Math.abs(selectedMeta.debt).toLocaleString()} c`}
              />
            ) : null}
          </div>
        ) : null}

        <Form.Item
          name="amount"
          label="Сумма"
          rules={[
            { required: true, message: "Укажите сумму" },
            {
              validator: (_rule, value) => {
                const num = Number(value || 0);
                if (!selectedManagerId) return Promise.resolve();
                if (num <= maxAllowed) return Promise.resolve();
                return Promise.reject(
                  new Error(`Нельзя больше ${maxAllowed.toLocaleString()} c`),
                );
              },
            },
          ]}
        >
          <InputNumber min={0} max={maxAllowed} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="reason" label="Комментарий">
          <Input />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          Сохранить
        </Button>
      </Form>
    </Modal>
  );
};
