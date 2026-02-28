import { DownloadOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Row,
  Select,
  Statistic,
  Table,
} from "antd";
import type { Dayjs } from "dayjs";

const { RangePicker } = DatePicker;

type OwnerStats = {
  revenue: number;
  expensesTotal: number;
  bonusesTotal: number;
  netProfit: number;
};

type OwnerBranchRow = {
  key: string;
  branch: string;
  orders: number;
  revenue: number;
  expenses: number;
  net: number;
};

type OwnerManagerRow = {
  key: string;
  manager: string;
  branch: string;
  role: string;
  orders: number;
  revenue: number;
  payout: number;
};

type Props = {
  ownerAvailableBranches: string[];
  ownerSelectedBranches: string[];
  ownerRange: [Dayjs, Dayjs];
  ownerStats: OwnerStats;
  ownerBranchRows: OwnerBranchRow[];
  ownerManagerRows: OwnerManagerRow[];
  onOwnerBranchesChange: (values: string[]) => void;
  onOwnerRangeChange: (value: [Dayjs, Dayjs]) => void;
  onExportCsv: () => void;
};

export const OwnerReportSection = ({
  ownerAvailableBranches,
  ownerSelectedBranches,
  ownerRange,
  ownerStats,
  ownerBranchRows,
  ownerManagerRows,
  onOwnerBranchesChange,
  onOwnerRangeChange,
  onExportCsv,
}: Props) => {
  return (
    <div className="animate-fade-in space-y-4">
      <Card
        style={{
          marginBottom: 10,
        }}
        size="small"
        title="Owner Report"
        extra={
          <Button icon={<DownloadOutlined />} onClick={onExportCsv}>
            Экспорт CSV
          </Button>
        }
      >
        <div className="flex flex-wrap gap-3">
          <Select
            mode="multiple"
            allowClear
            placeholder="Филиалы (все)"
            style={{ minWidth: 300 }}
            value={ownerSelectedBranches}
            onChange={onOwnerBranchesChange}
            maxTagCount="responsive"
            options={ownerAvailableBranches.map((name) => ({
              value: name,
              label: name,
            }))}
          />
          <RangePicker
            value={ownerRange}
            onChange={(v) => {
              if (v?.[0] && v?.[1]) onOwnerRangeChange([v[0], v[1]]);
            }}
            allowClear={false}
          />
        </div>
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={12} sm={8} lg={6}>
          <Card size="small">
            <Statistic title="Выручка" value={ownerStats.revenue} suffix="c" />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card size="small">
            <Statistic
              title="Расходы"
              value={ownerStats.expensesTotal}
              suffix="c"
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card size="small">
            <Statistic
              title="Бонусы"
              value={ownerStats.bonusesTotal}
              suffix="c"
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card size="small">
            <Statistic
              title="Чистая прибыль"
              value={ownerStats.netProfit}
              suffix="c"
              styles={{
                content: {
                  color: ownerStats.netProfit >= 0 ? "#3f8600" : "#cf1322",
                },
              }}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" title="Отчет по филиалам">
        <Table
          size="small"
          rowKey="key"
          scroll={{ x: 900 }}
          dataSource={ownerBranchRows}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: "Филиал", dataIndex: "branch" },
            { title: "Заказы", dataIndex: "orders", width: 90 },
            {
              title: "Выручка",
              dataIndex: "revenue",
              render: (v: number) => `${v.toLocaleString()} c`,
            },
            {
              title: "Расходы",
              dataIndex: "expenses",
              render: (v: number) => `${v.toLocaleString()} c`,
            },
            {
              title: "Чистая прибыль",
              dataIndex: "net",
              render: (v: number) => (
                <span className={v >= 0 ? "text-green-600" : "text-red-500"}>
                  {v.toLocaleString()} c
                </span>
              ),
            },
          ]}
        />
      </Card>

      <Card
        size="small"
        title="Отчет по сотрудникам"
        style={{
          marginTop: 10,
        }}
      >
        <Table
          size="small"
          rowKey="key"
          dataSource={ownerManagerRows}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 900 }}
          columns={[
            { title: "Сотрудник", dataIndex: "manager" },
            { title: "Филиал", dataIndex: "branch" },
            { title: "Роль", dataIndex: "role" },
            { title: "Заказы", dataIndex: "orders", width: 90 },
            {
              title: "Выручка",
              dataIndex: "revenue",
              render: (v: number) => `${v.toLocaleString()} c`,
            },
            {
              title: "К выплате",
              dataIndex: "payout",
              render: (v: number) => (
                <span className={v >= 0 ? "text-green-600" : "text-red-500"}>
                  {v.toLocaleString()} c
                </span>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};
