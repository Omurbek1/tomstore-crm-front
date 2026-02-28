import { Button, DatePicker, Form, Input, InputNumber, Modal, Radio, Select } from "antd";
import type { Dayjs } from "dayjs";

type Manager = {
  id: string;
  name: string;
};

type TargetFormValues = {
  type: "global" | "personal";
  managerId?: string;
  amount: number;
  rewardType: "money" | "material";
  reward?: number;
  rewardText?: string;
  startDate?: Dayjs;
  deadline?: string;
  period?: [Dayjs, Dayjs];
};

type Props = {
  open: boolean;
  managers: Manager[];
  onCancel: () => void;
  onSubmit: (values: TargetFormValues) => void;
};

const { Option } = Select;

export const TargetModal = ({ open, managers, onCancel, onSubmit }: Props) => {
  const [form] = Form.useForm<TargetFormValues>();

  return (
    <Modal
      open={open}
      title="Цель"
      footer={null}
      onCancel={onCancel}
      afterOpenChange={(visible) => {
        if (!visible) form.resetFields();
      }}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item name="type" initialValue="global">
          <Radio.Group>
            <Radio value="global">Общая</Radio>
            <Radio value="personal">Личная</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(p, c) => p.type !== c.type}>
          {({ getFieldValue }) =>
            getFieldValue("type") === "personal" ? (
              <Form.Item name="managerId" label="Сотрудник">
                <Select>
                  {managers.map((m) => (
                    <Option key={m.id} value={m.id}>
                      {m.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            ) : null
          }
        </Form.Item>

        <Form.Item name="amount" label="Сумма" rules={[{ required: true }]}>
          <InputNumber style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item name="rewardType" label="Тип награды" initialValue="money">
          <Radio.Group>
            <Radio value="money">Деньги</Radio>
            <Radio value="material">Материальная</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(p, c) => p.rewardType !== c.rewardType}>
          {({ getFieldValue }) =>
            getFieldValue("rewardType") === "money" ? (
              <Form.Item
                name="reward"
                label="Сумма бонуса"
                rules={[{ required: true, message: "Укажите сумму бонуса" }]}
              >
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
            ) : (
              <Form.Item
                name="rewardText"
                label="Материальная награда"
                rules={[{ required: true, message: "Укажите текст награды" }]}
              >
                <Input placeholder="Например: ноутбук, туризм, смартфон" />
              </Form.Item>
            )
          }
        </Form.Item>

        <Form.Item
          name="period"
          label="Период плана (с / до)"
          rules={[{ required: true, message: "Укажите период плана" }]}
        >
          <DatePicker.RangePicker style={{ width: "100%" }} />
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          Сохранить
        </Button>
      </Form>
    </Modal>
  );
};
