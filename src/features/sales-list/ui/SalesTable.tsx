import { Badge, Button, DatePicker, Popconfirm, Radio, Select, Space, Switch, Table, Tag } from "antd";
import { DeleteOutlined, EditOutlined, RocketOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo } from "react";

type DeliveryStatusCode =
  | "reserved"
  | "ready"
  | "on_way"
  | "picked_up"
  | "delivered"
  | "canceled";

type SaleLike = {
  id: string;
  createdAt: string;
  manualDate?: string | null;
  managerId?: string;
  managerName: string;
  productName: string;
  saleType: "office" | "delivery";
  quantity: number;
  total: number;
  deliveryCost?: number;
  discount?: number;
  paymentType: "cash" | "installment" | "hybrid" | "booking" | "manual";
  paymentLabel?: string;
  hybridCash?: number;
  hybridCard?: number;
  hybridTransfer?: number;
  installmentMonths?: number;
  bookingDeposit?: number | null;
  bookingBuyout?: number | null;
  deliveryStatus: DeliveryStatusCode;
  costPriceSnapshot: number;
  managerEarnings: number;
  branch: string;
};

type ManagerLike = {
  id: string;
  name: string;
};

type CurrentUserLike = {
  id?: string;
  branchName?: string;
} | null;

type DeliveryStatusMeta = {
  text: string;
  status: "success" | "processing" | "error" | "default" | "warning";
  color: string;
};

type Props = {
  data: SaleLike[];
  managers: ManagerLike[];
  currentUser: CurrentUserLike;
  isAdmin: boolean;
  onlyMine: boolean;
  filterType: "day" | "week" | "month" | "all";
  filterDate: Dayjs;
  onOnlyMineChange: (value: boolean) => void;
  onFilterTypeChange: (value: "day" | "week" | "month" | "all") => void;
  onFilterDateChange: (value: Dayjs) => void;
  onEdit: (s: SaleLike) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: DeliveryStatusCode) => void;
  formatDate: (value?: string | null, withTime?: boolean) => string;
  deliveryStatuses: Record<DeliveryStatusCode, DeliveryStatusMeta>;
};

export const SalesTable = ({
  data,
  managers,
  currentUser,
  isAdmin,
  onlyMine,
  filterType,
  filterDate,
  onOnlyMineChange,
  onFilterTypeChange,
  onFilterDateChange,
  onEdit,
  onDelete,
  onStatusChange,
  formatDate,
  deliveryStatuses,
}: Props) => {
  const filteredSales = useMemo(() => {
    let filtered = [...(data || [])].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    if (!isAdmin && currentUser?.branchName) {
      filtered = filtered.filter((s) => s.branch === currentUser.branchName);
    }
    if (onlyMine && currentUser?.id) {
      filtered = filtered.filter((s) => s.managerId === currentUser.id);
    }
    if (filterType !== "all") {
      filtered = filtered.filter((s) => {
        const date = dayjs(s.manualDate || s.createdAt);
        if (filterType === "day") return date.isSame(filterDate, "day");
        if (filterType === "week") return date.isSame(filterDate, "week");
        if (filterType === "month") return date.isSame(filterDate, "month");
        return true;
      });
    }
    return filtered;
  }, [data, filterType, filterDate, onlyMine, currentUser, isAdmin]);

  const columns: ColumnsType<SaleLike> = [
    {
      title: "Дата",
      dataIndex: "manualDate",
      render: (d, r) => formatDate(d || r.createdAt, true),
    },
    {
      title: "Менеджер",
      dataIndex: "managerId",
      render: (id, r) => {
        const m = (managers || []).find((mgr) => mgr.id === id);
        return m ? m.name : r.managerName;
      },
    },
    {
      title: "Товар",
      render: (_, r) => (
        <div>
          <div>{r.productName}</div>
          <div className="text-xs text-gray-400">
            {r.saleType === "delivery" ? (
              <span className="text-blue-500">
                <RocketOutlined /> Дост.
              </span>
            ) : (
              "Офис"
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Кол-во",
      dataIndex: "quantity",
      align: "right",
      render: (v) => `${v} шт`,
    },
    {
      title: "Оплата",
      render: (_, r) => {
        if (r.paymentType === "hybrid") {
          return (
            <div className="text-xs">
              <div>Гибрид</div>
              <div className="text-gray-500">
                Нал: {Number(r.hybridCash || 0).toLocaleString()} · Карта:{" "}
                {Number(r.hybridCard || 0).toLocaleString()} · Перевод:{" "}
                {Number(r.hybridTransfer || 0).toLocaleString()}
              </div>
            </div>
          );
        }
        if (r.paymentType === "manual") return r.paymentLabel || "Ручной";
        if (r.paymentType === "installment") {
          if (r.paymentLabel && r.installmentMonths) {
            return `${r.paymentLabel} · ${r.installmentMonths} мес`;
          }
          if (r.paymentLabel) return r.paymentLabel;
          return `Рассрочка ${r.installmentMonths || 0} мес`;
        }
        if (r.paymentType === "booking") {
          return (
            <div className="text-xs">
              <div>{r.paymentLabel || "Бронь"}</div>
              <div className="text-gray-500">
                Предоплата: {Number(r.bookingDeposit || 0).toLocaleString()} ·
                Выкуп: {Number(r.bookingBuyout || 0).toLocaleString()}
              </div>
            </div>
          );
        }
        return "Наличные";
      },
    },
    {
      title: "Статус",
      dataIndex: "deliveryStatus",
      render: (s, r) =>
        isAdmin ? (
          <Select
            size="small"
            value={s}
            onChange={(val) => onStatusChange(r.id, val as DeliveryStatusCode)}
            style={{ width: 120 }}
          >
            {Object.entries(deliveryStatuses).map(([k, v]) => (
              <Select.Option key={k} value={k}>
                <Badge status={v.status} text={v.text} />
              </Select.Option>
            ))}
          </Select>
        ) : (
          <Tag color={deliveryStatuses[s as DeliveryStatusCode]?.color}>
            {deliveryStatuses[s as DeliveryStatusCode]?.text}
          </Tag>
        ),
    },
  ];

  if (isAdmin) {
    columns.splice(
      3,
      0,
      {
        title: "Сумма",
        dataIndex: "total",
        render: (v, r) => (
          <div>
            <b>{v.toLocaleString()}</b>
            {r.deliveryCost ? (
              <div className="text-xs text-gray-400">+{r.deliveryCost} дост.</div>
            ) : null}
          </div>
        ),
      },
      {
        title: "Скидка",
        dataIndex: "discount",
        render: (v) =>
          Number(v || 0) > 0 ? (
            <span className="text-orange-500">-{Number(v).toLocaleString()}</span>
          ) : (
            "—"
          ),
      },
      {
        title: "Прибыль",
        render: (_, r) => {
          const p =
            r.total -
            r.costPriceSnapshot * r.quantity -
            r.managerEarnings -
            (r.deliveryCost || 0);
          return (
            <span className={p >= 0 ? "text-green-600" : "text-red-500"}>
              {p.toLocaleString()}
            </span>
          );
        },
      },
    );

    columns.push({
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(r)}
          />
          <Popconfirm title="Удалить?" onConfirm={() => onDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    });
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row justify-between items-center mb-4 gap-4">
        <Space>
          {isAdmin && (
            <Switch
              checked={onlyMine}
              onChange={onOnlyMineChange}
              checkedChildren="Только мои"
              unCheckedChildren="Все заказы"
            />
          )}
          <Radio.Group
            value={filterType}
            onChange={(e) =>
              onFilterTypeChange(e.target.value as "day" | "week" | "month" | "all")
            }
            buttonStyle="solid"
          >
            <Radio.Button value="day">День</Radio.Button>
            <Radio.Button value="week">Неделя</Radio.Button>
            <Radio.Button value="month">Месяц</Radio.Button>
            <Radio.Button value="all">Все</Radio.Button>
          </Radio.Group>
        </Space>
        {filterType !== "all" && (
          <DatePicker
            value={filterDate}
            onChange={(val) => onFilterDateChange(val || dayjs())}
            picker={filterType === "day" ? "date" : filterType}
            allowClear={false}
          />
        )}
      </div>
      <Table
        dataSource={filteredSales}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 8 }}
        size="middle"
        scroll={{ x: 800 }}
      />
    </div>
  );
};

