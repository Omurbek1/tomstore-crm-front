import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
} from "antd";
import { PlusOutlined, SendOutlined } from "@ant-design/icons";
import {
  useCreateRepairEvent,
  useCreateRepairTicket,
  useRepairs,
  useUpdateRepairStatus,
  type RepairStatus,
  type RepairTicket,
} from "../../../hooks/api";
import { useBarcodeScanner } from "../../../shared/lib/useBarcodeScanner";

const STATUS_META: Record<RepairStatus, { label: string; color: string }> = {
  received: { label: "Принят", color: "blue" },
  to_service: { label: "Передан в сервис", color: "gold" },
  diagnostic: { label: "Диагностика", color: "purple" },
  ready: { label: "Готов", color: "green" },
  returned: { label: "Выдан клиенту", color: "cyan" },
  canceled: { label: "Отменен", color: "red" },
};

const quickEvents: { text: string; nextStatus: RepairStatus }[] = [
  { text: "Получил товар от клиента", nextStatus: "received" },
  { text: "Передал товар в техсервис", nextStatus: "to_service" },
  { text: "Начата диагностика", nextStatus: "diagnostic" },
  { text: "Ремонт завершен, товар готов к выдаче", nextStatus: "ready" },
  { text: "Товар выдан клиенту", nextStatus: "returned" },
];

type BranchOption = { id: string; name: string };
type ProductOption = { id: string; name: string; barcode?: string };

type Props = {
  currentUserName: string;
  branches: BranchOption[];
  products: ProductOption[];
  formatDate: (value?: string | null, withTime?: boolean) => string;
};

export const RepairsSection = ({
  currentUserName,
  branches,
  products,
  formatDate,
}: Props) => {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [createForm] = Form.useForm();

  const repairsQuery = useRepairs({ q: search, limit: 200, offset: 0 });
  const createTicket = useCreateRepairTicket();
  const createEvent = useCreateRepairEvent();
  const updateStatus = useUpdateRepairStatus();

  const tickets = repairsQuery.data?.items || [];

  const selectedTicket = useMemo<RepairTicket | null>(() => {
    if (tickets.length === 0) return null;
    const byId = tickets.find((t) => t.id === selectedId);
    return byId || tickets[0] || null;
  }, [tickets, selectedId]);

  const addMessage = (ticketId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    createEvent.mutate({
      id: ticketId,
      payload: {
        text: trimmed,
        author: currentUserName,
      },
    });
    setMessage("");
  };

  const onCreateTicket = (v: {
    clientName: string;
    clientPhone?: string;
    itemName: string;
    serialNumber?: string;
    issue: string;
    branchName?: string;
  }) => {
    createTicket.mutate(
      {
        ...v,
        author: currentUserName,
      },
      {
        onSuccess: (created) => {
          setSelectedId(created.id);
          createForm.resetFields();
        },
      },
    );
  };

  const applyRepairBarcode = (raw: string) => {
    const code = String(raw || "")
      .trim()
      .replace(/\s+/g, "");
    if (!code) return;
    const product = products.find((p) => String(p.barcode || "") === code);
    if (!product) {
      return;
    }
    createForm.setFieldValue("itemName", product.name);
  };

  useBarcodeScanner({
    enabled: true,
    minLength: 5,
    onScan: applyRepairBarcode,
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <Card size="small" title="Прием товара на ремонт" loading={createTicket.isPending}>
        <Form form={createForm} layout="vertical" onFinish={onCreateTicket}>
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item
                name="clientName"
                label="Клиент"
                rules={[{ required: true, message: "Введите имя клиента" }]}
              >
                <Input placeholder="ФИО клиента" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="clientPhone" label="Телефон">
                <Input placeholder="+996 ..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="branchName" label="Филиал">
                <Select
                  allowClear
                  options={branches.map((b) => ({ label: b.name, value: b.name }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item
                name="itemName"
                label="Товар / устройство"
                rules={[{ required: true, message: "Введите товар" }]}
              >
                <Input placeholder="Например: MacBook Pro 14" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="serialNumber" label="Серийный номер">
                <Input placeholder="S/N" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="issue"
                label="Проблема"
                rules={[{ required: true, message: "Опишите проблему" }]}
              >
                <Input placeholder="Не включается / шумит / полосы на экране" />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
            Создать заявку
          </Button>
        </Form>
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={10}>
          <Card
            size="small"
            loading={repairsQuery.isLoading}
            title="Заявки на ремонт"
            extra={
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по клиенту/товару"
                style={{ width: 220 }}
              />
            }
          >
            <Table
              size="small"
              rowKey="id"
              dataSource={tickets}
              pagination={{ pageSize: 8 }}
              rowClassName={(r) =>
                r.id === selectedTicket?.id
                  ? "repair-row repair-row--active"
                  : "repair-row"
              }
              onRow={(record) => ({
                onClick: () => setSelectedId(record.id),
                style: { cursor: "pointer" },
              })}
              columns={[
                {
                  title: "Клиент / Товар",
                  render: (_v, r) => (
                    <div>
                      <div className="font-semibold">{r.clientName}</div>
                      <div className="text-xs text-gray-500">
                        {r.itemName}
                        {r.branchName ? ` · ${r.branchName}` : ""}
                      </div>
                    </div>
                  ),
                },
                {
                  title: "Статус",
                  width: 160,
                  render: (_v, r) => (
                    <Tag color={STATUS_META[r.status].color}>
                      {STATUS_META[r.status].label}
                    </Tag>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card
            size="small"
            loading={repairsQuery.isLoading}
            title={selectedTicket ? `Чат по заявке: ${selectedTicket.itemName}` : "Чат"}
          >
            {!selectedTicket ? (
              <Typography.Text type="secondary">
                Выберите заявку слева или создайте новую.
              </Typography.Text>
            ) : (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <div className="flex flex-wrap gap-2">
                  <Tag color={STATUS_META[selectedTicket.status].color}>
                    {STATUS_META[selectedTicket.status].label}
                  </Tag>
                  <Tag>Клиент: {selectedTicket.clientName}</Tag>
                  {selectedTicket.clientPhone ? (
                    <Tag>Тел: {selectedTicket.clientPhone}</Tag>
                  ) : null}
                  {selectedTicket.serialNumber ? (
                    <Tag>S/N: {selectedTicket.serialNumber}</Tag>
                  ) : null}
                  <Tag>Создано: {formatDate(selectedTicket.createdAt, true)}</Tag>
                  <Tag>Обновлено: {formatDate(selectedTicket.updatedAt, true)}</Tag>
                </div>

                <Card size="small">
                  <Typography.Text type="secondary">Описание проблемы:</Typography.Text>
                  <div className="mt-1">{selectedTicket.issue}</div>
                </Card>

                <div className="flex flex-wrap gap-2">
                  {quickEvents.map((item) => (
                    <Button
                      key={item.text}
                      size="small"
                      loading={updateStatus.isPending}
                      onClick={() =>
                        updateStatus.mutate({
                          id: selectedTicket.id,
                          payload: {
                            status: item.nextStatus,
                            author: currentUserName,
                            text: item.text,
                          },
                        })
                      }
                    >
                      {item.text}
                    </Button>
                  ))}
                </div>

                <div className="repair-chat-timeline max-h-[360px] overflow-y-auto rounded border p-3">
                  <Timeline
                    items={(selectedTicket.messages || []).map((m) => ({
                      children: (
                        <div>
                          <div className="text-xs text-gray-500">
                            {m.author} · {formatDate(m.createdAt, true)}
                          </div>
                          <div>{m.text}</div>
                        </div>
                      ),
                    }))}
                  />
                </div>

                <div className="flex gap-2">
                  <Input.TextArea
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Например: созвонились с клиентом, ожидаем запчасть..."
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={createEvent.isPending}
                    onClick={() => addMessage(selectedTicket.id, message)}
                  >
                    Отправить
                  </Button>
                </div>
              </Space>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};
