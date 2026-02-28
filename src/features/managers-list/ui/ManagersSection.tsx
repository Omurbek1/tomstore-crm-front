import { Avatar, Button, Card, Col, Popconfirm, Row, Table, Tooltip } from "antd";
import { DashboardOutlined, DeleteOutlined, EditOutlined, UserOutlined } from "@ant-design/icons";
import { toSafeMediaUrl } from "../../../security/url";

type ManagerLike = {
  id: string;
  name: string;
  login?: string;
  phone?: string;
  branchName?: string;
  birthDate?: string;
  birthYear?: number;
  role: "superadmin" | "admin" | "manager" | "storekeeper" | "cashier";
  roles?: Array<
    "superadmin" | "admin" | "manager" | "storekeeper" | "cashier"
  >;
  salaryType?: "commission" | "fixed";
  fixedMonthlySalary?: number;
  canManageProducts?: boolean;
  photoUrl?: string;
  updatedAt: string;
};

type Props = {
  managers: ManagerLike[];
  deletedManagers: ManagerLike[];
  onShowDetails: (manager: ManagerLike) => void;
  onEdit: (manager: ManagerLike) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onRestore: (id: string) => void;
  canManagePrivileged?: boolean;
  formatPhone: (value?: string | null) => string;
  formatBirthDate: (manager?: Partial<ManagerLike> | null) => string;
  formatDate: (value?: string | null, withTime?: boolean) => string;
};

export const ManagersSection = ({
  managers,
  deletedManagers,
  onShowDetails,
  onEdit,
  onDelete,
  onAdd,
  onRestore,
  canManagePrivileged,
  formatPhone,
  formatBirthDate,
  formatDate,
}: Props) => {
  const isPrivileged = (m: ManagerLike) =>
    m.role === "admin" ||
    m.role === "superadmin" ||
    m.roles?.includes("admin") ||
    m.roles?.includes("superadmin");

  return (
    <div className="animate-fade-in">
      <Row gutter={[16, 16]}>
        {managers.map((m) => (
          <Col xs={24} sm={12} lg={8} key={m.id}>
            <Card
              actions={[
                <Tooltip title="Детали">
                  <DashboardOutlined key="details" onClick={() => onShowDetails(m)} />
                </Tooltip>,
                isPrivileged(m) && !canManagePrivileged ? (
                  <Tooltip key="edit-disabled" title="Только superadmin может редактировать admin/superadmin">
                    <EditOutlined key="edit" className="text-gray-400 cursor-not-allowed" />
                  </Tooltip>
                ) : (
                  <EditOutlined key="edit" onClick={() => onEdit(m)} />
                ),
                isPrivileged(m) ? (
                  <Tooltip key="del-disabled" title="Admin/Superadmin удалить нельзя">
                    <DeleteOutlined
                      key="del-icon-disabled"
                      className="text-gray-400 cursor-not-allowed"
                    />
                  </Tooltip>
                ) : (
                  <Popconfirm
                    key="del"
                    title="Удалить сотрудника?"
                    description="Сотрудник будет помечен как deleted=true. Связанные данные останутся."
                    okText="Да"
                    cancelText="Нет"
                    onConfirm={() => onDelete(m.id)}
                  >
                    <DeleteOutlined key="del-icon" className="text-red-500" />
                  </Popconfirm>
                ),
              ]}
            >
              <Card.Meta
                avatar={
                  <Avatar
                    src={toSafeMediaUrl(m.photoUrl)}
                    icon={!m.photoUrl ? <UserOutlined /> : undefined}
                  />
                }
                title={m.name}
                description={
                  <div className="text-xs">
                    <div>Логин: {m.login || "—"}</div>
                    <div>Телефон: {formatPhone(m.phone)}</div>
                    <div>Филиал: {m.branchName || "—"}</div>
                    <div>Дата рожд.: {formatBirthDate(m)}</div>
                    <div>Роль: {m.role}</div>
                    {m.roles?.length ? <div>Мульти-роли: {m.roles.join(", ")}</div> : null}
                    <div>
                      Тип оплаты: {m.salaryType === "fixed" ? "Фикс. оклад" : "% с продаж"}
                    </div>
                    {m.salaryType === "fixed" ? (
                      <div>Оклад: {Number(m.fixedMonthlySalary || 0).toLocaleString()} c</div>
                    ) : null}
                    {m.role === "storekeeper" || m.roles?.includes("storekeeper") ? (
                      <div>
                        Управление товарами:{" "}
                        {m.canManageProducts ? "Разрешено" : "Запрещено"}
                      </div>
                    ) : null}
                  </div>
                }
              />
            </Card>
          </Col>
        ))}
        <Col xs={24} sm={12} lg={8}>
          <Button type="dashed" block className="h-full" onClick={onAdd}>
            Добавить
          </Button>
        </Col>
      </Row>

      <Card className="mt-4" title={`Удаленные сотрудники (${deletedManagers.length})`}>
        <Table
          rowKey="id"
          size="small"
          dataSource={deletedManagers}
          pagination={false}
          locale={{ emptyText: "Удаленных сотрудников нет" }}
          columns={[
            {
              title: "Сотрудник",
              render: (_v, m) => (
                <div className="flex items-center gap-2">
                  <Avatar
                    src={toSafeMediaUrl(m.photoUrl)}
                    icon={!m.photoUrl ? <UserOutlined /> : undefined}
                  />
                  <span>{m.name}</span>
                </div>
              ),
            },
            {
              title: "Данные",
              render: (_v, m) =>
                `Логин: ${m.login || "—"} · Филиал: ${m.branchName || "—"} · Телефон: ${formatPhone(m.phone)} · Дата рожд.: ${formatBirthDate(m)} · Роль: ${m.role} · Удален: ${formatDate(m.updatedAt, true)}`,
            },
            {
              title: "Действие",
              width: 140,
              render: (_v, m) => (
                <Button type="primary" size="small" onClick={() => onRestore(m.id)}>
                  Восстановить
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};
