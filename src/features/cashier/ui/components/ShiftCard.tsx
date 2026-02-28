import { PrinterOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Input,
  InputNumber,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Switch,
} from "antd";

type ShiftTotals = {
  totalOrders: number;
  totalRevenue: number;
  cashRevenue: number;
  manualRevenue: number;
  hybridRevenue: number;
};

type CurrentShift = {
  id: string;
  status: string;
  openedAt: string;
  openingCash?: number;
} | null;

type Props = {
  currentShift: CurrentShift;
  shiftTotals?: ShiftTotals;
  expectedCash: number;
  openingCash: number;
  openingNote: string;
  closingCash: number;
  closingNote: string;
  stockFilter: "all" | "in_stock";
  paperWidthMm: 58 | 80;
  printerCopies: number;
  autoPrint: boolean;
  receiptFooter: string;
  openShiftPending: boolean;
  closeShiftPending: boolean;
  onOpeningCashChange: (v: number) => void;
  onOpeningNoteChange: (v: string) => void;
  onClosingCashChange: (v: number) => void;
  onClosingNoteChange: (v: string) => void;
  onOpenShift: () => void;
  onCloseShift: () => void;
  onStockFilterChange: (v: "all" | "in_stock") => void;
  onPaperWidthChange: (v: 58 | 80) => void;
  onDownloadZReport: () => void;
  onPrintZReport: () => void;
  onAutoPrintChange: (v: boolean) => void;
  onPrinterCopiesChange: (v: number) => void;
  onReceiptFooterChange: (v: string) => void;
};

export const ShiftCard = ({
  currentShift,
  shiftTotals,
  expectedCash,
  openingCash,
  openingNote,
  closingCash,
  closingNote,
  stockFilter,
  paperWidthMm,
  printerCopies,
  autoPrint,
  receiptFooter,
  openShiftPending,
  closeShiftPending,
  onOpeningCashChange,
  onOpeningNoteChange,
  onClosingCashChange,
  onClosingNoteChange,
  onOpenShift,
  onCloseShift,
  onStockFilterChange,
  onPaperWidthChange,
  onDownloadZReport,
  onPrintZReport,
  onAutoPrintChange,
  onPrinterCopiesChange,
  onReceiptFooterChange,
}: Props) => {
  return (
    <Card size="small" title="Смена кассира">
      {!currentShift ? (
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <InputNumber
              min={0}
              value={openingCash}
              onChange={(v) => onOpeningCashChange(Number(v || 0))}
              style={{ width: "100%" }}
              placeholder="Старт в кассе"
            />
          </Col>
          <Col xs={24} md={10}>
            <Input
              value={openingNote}
              onChange={(e) => onOpeningNoteChange(e.target.value)}
              placeholder="Комментарий открытия"
            />
          </Col>
          <Col xs={24} md={6}>
            <Button type="primary" block loading={openShiftPending} onClick={onOpenShift}>
              Открыть смену
            </Button>
          </Col>
        </Row>
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <Row gutter={[12, 12]}>
            <Col xs={12} md={6}>
              <Statistic title="Статус" value={currentShift.status === "open" ? "Открыта" : "Закрыта"} />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title="Открыта" value={new Date(currentShift.openedAt).toLocaleString()} />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title="Старт" value={Number(currentShift.openingCash || 0)} suffix="c" />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title="Ожид. касса" value={expectedCash} suffix="c" />
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={8}>
              <InputNumber
                min={0}
                value={closingCash}
                onChange={(v) => onClosingCashChange(Number(v || 0))}
                style={{ width: "100%" }}
                placeholder="Факт в кассе"
              />
            </Col>
            <Col xs={24} md={10}>
              <Input
                value={closingNote}
                onChange={(e) => onClosingNoteChange(e.target.value)}
                placeholder="Комментарий закрытия"
              />
            </Col>
            <Col xs={24} md={6}>
              <Button danger block loading={closeShiftPending} onClick={onCloseShift}>
                Закрыть смену
              </Button>
            </Col>
          </Row>

          {shiftTotals ? (
            <div className="text-xs text-gray-500">
              Смена: заказов {shiftTotals.totalOrders}, выручка {shiftTotals.totalRevenue.toLocaleString()} c,
              наличные {shiftTotals.cashRevenue.toLocaleString()} c, безнал {shiftTotals.manualRevenue.toLocaleString()} c,
              гибрид {shiftTotals.hybridRevenue.toLocaleString()} c.
            </div>
          ) : null}
          <Space wrap>
            <Segmented
              value={stockFilter}
              onChange={(v) => onStockFilterChange(v as "all" | "in_stock")}
              options={[
                { label: "В наличии", value: "in_stock" },
                { label: "Все", value: "all" },
              ]}
            />
            <Select
              value={paperWidthMm}
              onChange={(v) => onPaperWidthChange(v as 58 | 80)}
              style={{ width: 180 }}
              options={[
                { value: 58, label: "Термолента 58 мм" },
                { value: 80, label: "Термолента 80 мм" },
              ]}
            />
            <Button onClick={onDownloadZReport}>Скачать Z-отчет CSV</Button>
            <Button icon={<PrinterOutlined />} onClick={onPrintZReport}>
              Печать / PDF Z-отчета
            </Button>
          </Space>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={6}>
              <div className="text-xs text-gray-500 mb-1">Автопечать чека</div>
              <Switch checked={autoPrint} onChange={onAutoPrintChange} />
            </Col>
            <Col xs={24} md={6}>
              <div className="text-xs text-gray-500 mb-1">Копий</div>
              <InputNumber
                min={1}
                max={3}
                style={{ width: "100%" }}
                value={printerCopies}
                onChange={(v) => onPrinterCopiesChange(Math.max(1, Math.min(3, Number(v || 1))))}
              />
            </Col>
            <Col xs={24} md={12}>
              <div className="text-xs text-gray-500 mb-1">Подпись в чеке</div>
              <Input
                value={receiptFooter}
                onChange={(e) => onReceiptFooterChange(e.target.value)}
                placeholder="Текст внизу чека"
              />
            </Col>
          </Row>
        </Space>
      )}
    </Card>
  );
};
