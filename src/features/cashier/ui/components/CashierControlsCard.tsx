import { Card, Col, Input, InputNumber, Row, Select, Tag, Typography } from "antd";
import type { RefObject } from "react";
import type { InputRef } from "antd";
import type { BranchLike } from "../../model/types";

type Props = {
  loading: boolean;
  currentShift: { id?: string } | null;
  isAdmin?: boolean;
  branches: BranchLike[];
  barcodeInput: string;
  search: string;
  clientName: string;
  paymentType: "cash" | "manual" | "hybrid";
  paymentLabel: string;
  branch: string;
  hybridCash: number;
  hybridCard: number;
  hybridTransfer: number;
  manualPaymentOptions: string[];
  searchInputRef: RefObject<InputRef | null>;
  clientInputRef: RefObject<InputRef | null>;
  onBarcodeInputChange: (v: string) => void;
  onBarcodeEnter: () => void;
  onSearchChange: (v: string) => void;
  onClientNameChange: (v: string) => void;
  onPaymentTypeChange: (v: "cash" | "manual" | "hybrid") => void;
  onPaymentLabelChange: (v: string) => void;
  onBranchChange: (v: string) => void;
  onHybridCashChange: (v: number) => void;
  onHybridCardChange: (v: number) => void;
  onHybridTransferChange: (v: number) => void;
};

export const CashierControlsCard = ({
  loading,
  currentShift,
  isAdmin,
  branches,
  barcodeInput,
  search,
  clientName,
  paymentType,
  paymentLabel,
  branch,
  hybridCash,
  hybridCard,
  hybridTransfer,
  manualPaymentOptions,
  searchInputRef,
  clientInputRef,
  onBarcodeInputChange,
  onBarcodeEnter,
  onSearchChange,
  onClientNameChange,
  onPaymentTypeChange,
  onPaymentLabelChange,
  onBranchChange,
  onHybridCashChange,
  onHybridCardChange,
  onHybridTransferChange,
}: Props) => {
  return (
    <Card size="small" title="Кассовый режим" loading={loading}>
      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Input
            value={barcodeInput}
            onChange={(e) => onBarcodeInputChange(e.target.value)}
            onPressEnter={onBarcodeEnter}
            placeholder="Сканируйте штрихкод"
            disabled={!currentShift}
          />
        </Col>
        <Col xs={24} md={8}>
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск: название / штрихкод / описание"
            disabled={!currentShift}
          />
        </Col>
        <Col xs={24} md={8}>
          <Input
            ref={clientInputRef}
            value={clientName}
            onChange={(e) => onClientNameChange(e.target.value)}
            placeholder="Клиент"
            disabled={!currentShift}
          />
        </Col>
        <Col xs={24} md={8}>
          <Select
            value={paymentType}
            onChange={onPaymentTypeChange}
            style={{ width: "100%" }}
            disabled={!currentShift}
            options={[
              { value: "cash", label: "Наличные" },
              { value: "manual", label: "Безнал / терминал" },
              { value: "hybrid", label: "Гибрид" },
            ]}
          />
        </Col>
        <Col xs={24} md={8}>
          <Input
            value={paymentLabel}
            onChange={(e) => onPaymentLabelChange(e.target.value)}
            placeholder="Канал безнала (терминал / перевод и т.д.)"
            disabled={!currentShift || paymentType === "cash"}
          />
        </Col>
        <Col xs={24} md={8}>
          <Select
            value={branch}
            onChange={onBranchChange}
            style={{ width: "100%" }}
            disabled={!isAdmin || !currentShift}
            options={branches.map((b) => ({ value: b.name, label: b.name }))}
          />
        </Col>

        {paymentType === "hybrid" && (
          <>
            <Col xs={24} md={8}>
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                value={hybridCash}
                onChange={(v) => onHybridCashChange(Number(v || 0))}
                placeholder="Наличные"
                disabled={!currentShift}
              />
            </Col>
            <Col xs={24} md={8}>
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                value={hybridCard}
                onChange={(v) => onHybridCardChange(Number(v || 0))}
                placeholder="Карта"
                disabled={!currentShift}
              />
            </Col>
            <Col xs={24} md={8}>
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                value={hybridTransfer}
                onChange={(v) => onHybridTransferChange(Number(v || 0))}
                placeholder="Перевод"
                disabled={!currentShift}
              />
            </Col>
          </>
        )}
      </Row>
      {paymentType !== "cash" ? (
        <div className="mt-2">
          <Typography.Text type="secondary" className="text-xs">
            Быстрый выбор канала оплаты:
          </Typography.Text>
          <div className="mt-1 flex flex-wrap gap-2">
            {manualPaymentOptions.map((item) => (
              <Tag
                key={item}
                color={paymentLabel === item ? "blue" : "default"}
                className="cursor-pointer"
                onClick={() => onPaymentLabelChange(item)}
              >
                {item}
              </Tag>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-2 text-xs text-gray-500">
        Горячие клавиши: F2 поиск, F3 клиент, F8 оформить чек, Esc очистить поиск.
      </div>
    </Card>
  );
};
