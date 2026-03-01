import { useMemo } from "react";
import {
  Button,
  Card,
  Input,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  Tabs,
  InputNumber,
  DatePicker,
  Form,
  message,
  QRCode,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, QrcodeOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type {
  Client,
  ClientHistory,
  ClientPromotion,
  Sale,
  ClientLoyaltyTransaction,
} from "../../../hooks/api/types";
import dayjs from "dayjs";

const { Text } = Typography;

type Props = {
  clients: Client[];
  selectedClientId?: string;
  history?: ClientHistory;
  promotions: ClientPromotion[];
  historyLoading?: boolean;
  formatDate: (value?: string | null, withTime?: boolean) => string;
  formatPhone: (value?: string | null) => string;
  onCreate: () => void;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  onSelectClient: (client: Client) => void;
  onCreatePromotion: (payload: Partial<ClientPromotion>) => Promise<unknown>;
  onDeletePromotion: (id: string) => Promise<unknown>;
};

export const ClientsSection = ({
  clients,
  selectedClientId,
  history,
  promotions,
  historyLoading,
  formatDate,
  formatPhone,
  onCreate,
  onEdit,
  onDelete,
  onSelectClient,
  onCreatePromotion,
  onDeletePromotion,
}: Props) => {
  const [promotionForm] = Form.useForm();
  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId],
  );
  const referralLink = useMemo(() => {
    if (!selectedClient?.referralCode) return "";
    if (typeof window === "undefined") return `ref:${selectedClient.referralCode}`;
    return `${window.location.origin}?ref=${encodeURIComponent(selectedClient.referralCode)}`;
  }, [selectedClient]);

  const columns: ColumnsType<Client> = [
    {
      title: "Клиент",
      dataIndex: "fullName",
      render: (v, r) => (
        <div>
          <div className="font-semibold">{v}</div>
          <div className="text-xs text-gray-500">{formatPhone(r.phone)}</div>
        </div>
      ),
    },
    {
      title: "Уровень",
      dataIndex: "level",
      render: (v: Client["level"]) => {
        const level = v || "silver";
        const map = {
          silver: { label: "Silver", color: "default" },
          gold: { label: "Gold", color: "gold" },
          vip: { label: "VIP", color: "purple" },
        } as const;
        return <Tag color={map[level].color}>{map[level].label}</Tag>;
      },
    },
    {
      title: "Скидки/кэшбек",
      render: (_v, r) => (
        <Space size={4} wrap>
          <Tag color="blue">Скидка {Number(r.discountPercent || 0)}%</Tag>
          <Tag color="cyan">ДР +{Number(r.birthdayDiscountPercent || 0)}%</Tag>
          <Tag color="green">Кэшбек {Number(r.cashbackRatePercent || 0)}%</Tag>
        </Space>
      ),
    },
    {
      title: "Баланс",
      render: (_v, r) => (
        <div>
          <div>{Number(r.cashbackBalance || 0).toLocaleString()} c</div>
          <Text type="secondary" className="text-xs">
            до {formatDate(r.cashbackExpiresAt)}
          </Text>
        </div>
      ),
    },
    {
      title: "Реферал",
      dataIndex: "referralCode",
      render: (v) => (v ? <Tag icon={<QrcodeOutlined />}>{v}</Tag> : "—"),
    },
    {
      title: "Статус",
      render: (_v, r) => (
        <Space size={4}>
          {r.isActive ? <Tag color="green">Активен</Tag> : <Tag>Неактивен</Tag>}
          {r.bonusesBlocked ? <Tag color="red">Бонусы блок</Tag> : null}
        </Space>
      ),
    },
    {
      title: "Действия",
      render: (_v, r) => (
        <Space>
          <Button size="small" onClick={() => onSelectClient(r)}>
            История
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(r)} />
          <Popconfirm title="Снять клиента с активности?" onConfirm={() => onDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const saleColumns: ColumnsType<Sale> = [
    { title: "Дата", dataIndex: "createdAt", render: (v) => formatDate(v, true), width: 170 },
    { title: "Товар", dataIndex: "productName" },
    { title: "Сумма", dataIndex: "total", render: (v) => `${Number(v || 0).toLocaleString()} c` },
    { title: "Скидка", dataIndex: "discount", render: (v) => `${Number(v || 0).toLocaleString()} c` },
    { title: "Кэшбек использ.", dataIndex: "cashbackUsed", render: (v) => `${Number(v || 0).toLocaleString()} c` },
    { title: "Кэшбек начисл.", dataIndex: "cashbackAccrued", render: (v) => `${Number(v || 0).toLocaleString()} c` },
  ];

  const loyaltyColumns: ColumnsType<ClientLoyaltyTransaction> = [
    { title: "Дата", dataIndex: "createdAt", render: (v) => formatDate(v, true), width: 170 },
    { title: "Тип", dataIndex: "type" },
    { title: "Сумма", dataIndex: "amount", render: (v) => `${Number(v || 0).toLocaleString()} c` },
    { title: "Комментарий", dataIndex: "note", render: (v) => v || "—" },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Клиенты и лояльность</div>
          <Text type="secondary">
            Уровни Silver/Gold/VIP, персональные скидки, кэшбек, рефералка, акции.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          Добавить клиента
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={clients}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1300 }}
        rowClassName={(row) => (row.id === selectedClientId ? "ant-table-row-selected" : "")}
        onRow={(record) => ({
          onClick: () => onSelectClient(record),
        })}
      />

      {selectedClient ? (
        <Card
          size="small"
          title={`История клиента: ${selectedClient.fullName}`}
          extra={
            <Space>
              <Tag color="blue">
                Реф-код: {selectedClient.referralCode || `CL-${selectedClient.id.slice(0, 8).toUpperCase()}`}
              </Tag>
              <Button
                size="small"
                onClick={async () => {
                  if (!referralLink) return;
                  try {
                    await navigator.clipboard.writeText(referralLink);
                    message.success("Реферальная ссылка скопирована");
                  } catch {
                    message.warning("Не удалось скопировать ссылку");
                  }
                }}
              >
                Копировать ссылку
              </Button>
            </Space>
          }
          loading={historyLoading}
        >
          {referralLink ? (
            <Card size="small" className="mb-3">
              <Space align="center" size={16} wrap>
                <QRCode value={referralLink} size={92} />
                <div>
                  <div className="font-medium">QR-реферальная карта клиента</div>
                  <Text type="secondary">
                    Сканируйте QR, чтобы зарегистрировать нового клиента с привязкой по рефералу.
                  </Text>
                  <div className="text-xs mt-1 break-all">{referralLink}</div>
                </div>
              </Space>
            </Card>
          ) : null}
          <Tabs
            items={[
              {
                key: "history-sales",
                label: "История покупок",
                children: (
                  <Table
                    size="small"
                    rowKey="id"
                    columns={saleColumns}
                    dataSource={history?.sales || []}
                    pagination={{ pageSize: 8 }}
                    scroll={{ x: 900 }}
                  />
                ),
              },
              {
                key: "history-loyalty",
                label: "Кэшбек и операции",
                children: (
                  <Table
                    size="small"
                    rowKey="id"
                    columns={loyaltyColumns}
                    dataSource={history?.loyalty || []}
                    pagination={{ pageSize: 8 }}
                    scroll={{ x: 900 }}
                  />
                ),
              },
              {
                key: "history-promotions",
                label: "Персональные акции",
                children: (
                  <Space direction="vertical" className="w-full" size={12}>
                    <Form
                      form={promotionForm}
                      layout="inline"
                      onFinish={async (values) => {
                        await onCreatePromotion({
                          clientId: selectedClient.id,
                          title: values.title,
                          discountPercent: Number(values.discountPercent || 0),
                          startsAt: values.startsAt ? dayjs(values.startsAt).toISOString() : null,
                          endsAt: values.endsAt ? dayjs(values.endsAt).toISOString() : null,
                          description: values.description,
                          isActive: true,
                        });
                        promotionForm.resetFields();
                        message.success("Акция добавлена");
                      }}
                    >
                      <Form.Item name="title" rules={[{ required: true, message: "Название" }]}>
                        <Input placeholder="Название акции" />
                      </Form.Item>
                      <Form.Item
                        name="discountPercent"
                        rules={[{ required: true, message: "Скидка" }]}
                      >
                        <InputNumber min={0} max={100} placeholder="Скидка %" />
                      </Form.Item>
                      <Form.Item name="startsAt">
                        <DatePicker placeholder="Начало" />
                      </Form.Item>
                      <Form.Item name="endsAt">
                        <DatePicker placeholder="Конец" />
                      </Form.Item>
                      <Form.Item name="description">
                        <Input placeholder="Комментарий" />
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" htmlType="submit">
                          Добавить
                        </Button>
                      </Form.Item>
                    </Form>
                    <Table
                      size="small"
                      rowKey="id"
                      dataSource={promotions.filter((p) => !p.clientId || p.clientId === selectedClient.id)}
                      pagination={{ pageSize: 8 }}
                      columns={[
                        { title: "Название", dataIndex: "title" },
                        { title: "Скидка", dataIndex: "discountPercent", render: (v) => `${Number(v || 0)}%` },
                        { title: "С", dataIndex: "startsAt", render: (v) => formatDate(v) },
                        { title: "До", dataIndex: "endsAt", render: (v) => formatDate(v) },
                        {
                          title: "Статус",
                          dataIndex: "isActive",
                          render: (v) => (v ? <Tag color="green">Активна</Tag> : <Tag>Отключена</Tag>),
                        },
                        {
                          title: "Действие",
                          render: (_v, row: ClientPromotion) => (
                            <Popconfirm title="Удалить акцию?" onConfirm={() => onDeletePromotion(row.id)}>
                              <Button danger size="small" icon={<DeleteOutlined />} />
                            </Popconfirm>
                          ),
                        },
                      ]}
                    />
                  </Space>
                ),
              }
            ]}
          />
        </Card>
      ) : null}
    </div>
  );
};
