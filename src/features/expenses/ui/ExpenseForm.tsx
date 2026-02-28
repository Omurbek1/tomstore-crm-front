import { Button, Form, Input, InputNumber, Select } from "antd";

type Manager = {
  id: string;
  name: string;
};

type ExpenseFormValues = {
  amount: number;
  category: string;
  comment?: string;
  managerId?: string;
};

type Props = {
  managers: Manager[];
  categories: string[];
  onFinish: (values: ExpenseFormValues) => void;
};

const { Option } = Select;

export const ExpenseForm = ({ managers, categories, onFinish }: Props) => {
  const [form] = Form.useForm<ExpenseFormValues>();
  const category = Form.useWatch("category", form);
  const isPersonnelExpense = category === "Аванс" || category === "Штраф";

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Form.Item name="amount" label="Сумма" rules={[{ required: true }]}>
        <InputNumber style={{ width: "100%" }} />
      </Form.Item>

      <Form.Item name="category" label="Категория" rules={[{ required: true }]}>
        <Select>
          {categories.map((c) => (
            <Option key={c} value={c}>
              {c}
            </Option>
          ))}
        </Select>
      </Form.Item>

      {isPersonnelExpense && (
        <div className="p-3 rounded mb-4 animate-fade-in bg-blue-50 dark:bg-blue-900">
          <Form.Item
            name="managerId"
            label="Сотрудник"
            rules={[{ required: true }]}
            help="Расход будет привязан к этому сотруднику"
          >
            <Select placeholder="Выберите сотрудника">
              {managers.map((m) => (
                <Option key={m.id} value={m.id}>
                  {m.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>
      )}

      <Form.Item name="comment" label="Комментарий">
        <Input />
      </Form.Item>

      <Button type="primary" htmlType="submit" block>
        Сохранить
      </Button>
    </Form>
  );
};
