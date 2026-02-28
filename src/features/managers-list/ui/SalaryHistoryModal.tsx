import { Card, Col, DatePicker, Modal, Row, Statistic, Table, Tag } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useMemo, useState } from "react";

type SalaryHistoryItem = {
  key: string;
  date: string;
  type: "sale" | "bonus" | "advance";
  title: string;
  amount: number;
};

type SalaryHistoryData = {
  managerName: string;
  items: SalaryHistoryItem[];
  salaryType?: "commission" | "fixed";
  fixedMonthlySalary?: number;
  baseSalary: number;
  bonusesTotal: number;
  advancesTotal: number;
  total: number;
};

type Props = {
  open: boolean;
  data: SalaryHistoryData | null;
  onCancel: () => void;
  formatDate: (value?: string | null, withTime?: boolean) => string;
};

export const SalaryHistoryModal = ({ open, data, onCancel, formatDate }: Props) => {
  const [month, setMonth] = useState<Dayjs>(dayjs());

  const filteredItems = useMemo(() => {
    if (!data) return [];
    return data.items.filter((item) => dayjs(item.date).isSame(month, "month"));
  }, [data, month]);

  const totals = useMemo(() => {
    const salesTotal = filteredItems
      .filter((item) => item.type === "sale")
      .reduce((sum, item) => sum + item.amount, 0);
    const bonusesTotal = filteredItems
      .filter((item) => item.type === "bonus")
      .reduce((sum, item) => sum + item.amount, 0);
    const advancesTotal = filteredItems
      .filter((item) => item.type === "advance")
      .reduce((sum, item) => sum + item.amount, 0);
    const salaryBase =
      data?.salaryType === "fixed"
        ? Number(data.fixedMonthlySalary || 0)
        : salesTotal;
    return {
      salesTotal,
      bonusesTotal,
      advancesTotal,
      salaryBase,
      payout: salaryBase - bonusesTotal - advancesTotal,
    };
  }, [data, filteredItems]);

  return (
    <Modal
      open={open}
      title={`История заработка: ${data?.managerName ?? ""}`}
      footer={null}
      onCancel={onCancel}
    >
      {data && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <DatePicker
              picker="month"
              value={month}
              onChange={(v) => setMonth(v || dayjs())}
              allowClear={false}
            />
            <Tag color={data.salaryType === "fixed" ? "gold" : "blue"}>
              {data.salaryType === "fixed" ? "Фикс. оклад" : "% с продаж"}
            </Tag>
          </div>
          <Row gutter={8}>
            <Col span={8}>
              <Statistic
                title={data.salaryType === "fixed" ? "Оклад за месяц" : "ЗП с продаж"}
                value={totals.salaryBase}
                suffix="c"
              />
            </Col>
            <Col span={8}>
              <Statistic title="Выплачено ЗП/Бонус" value={totals.bonusesTotal} suffix="c" />
            </Col>
            <Col span={8}>
              <Statistic title="Авансы/Штрафы" value={totals.advancesTotal} suffix="c" />
            </Col>
          </Row>
          <Card size="small">
            <div className="font-semibold">
              Итого к выплате за {month.format("MM.YYYY")}: {totals.payout.toLocaleString()} c
            </div>
          </Card>
          <Table
            size="small"
            rowKey="key"
            dataSource={filteredItems}
            locale={{ emptyText: "Записей пока нет" }}
            pagination={false}
            columns={[
              { title: "Описание", dataIndex: "title" },
              {
                title: "Дата",
                dataIndex: "date",
                render: (v) => formatDate(v, true),
              },
              {
                title: "Сумма",
                align: "right",
                render: (_v, item) => (
                  <div
                    className={`font-bold ${item.type === "sale" ? "text-green-600" : "text-orange-500"}`}
                  >
                    {item.type === "sale" ? "+" : "-"}
                    {item.amount.toLocaleString()} c
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}
    </Modal>
  );
};
