import type { ReceiptSnapshot } from "../../model/types";

type Props = {
  receipt: ReceiptSnapshot | null;
  receiptNo: string;
  paymentMethod: string;
};

const lineTotal = (price: number, qty: number, discount: number) =>
  Math.max(0, price * qty - Number(discount || 0));

export const PrintReceipt = ({ receipt, receiptNo, paymentMethod }: Props) => {
  if (!receipt) return null;

  return (
    <div style={{ width: 320, fontFamily: "Arial, sans-serif", padding: 8 }}>
      <h3 style={{ margin: 0 }}>TOMSTORE</h3>
      <div style={{ fontSize: 12, marginBottom: 8 }}>Кассовый чек</div>
      <div style={{ fontSize: 12 }}>№: {receiptNo}</div>
      <div style={{ fontSize: 12 }}>Дата: {receipt.createdAt}</div>
      <div style={{ fontSize: 12 }}>Кассир: {receipt.cashierName}</div>
      <div style={{ fontSize: 12, marginBottom: 6 }}>Филиал: {receipt.branchName}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Наим.</th>
            <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Сумма</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((x) => (
            <tr key={x.key}>
              <td style={{ padding: "4px 0" }}>
                <div>{x.productName}</div>
                <div style={{ color: "#666", fontSize: 11 }}>
                  {x.price.toLocaleString()} x {x.quantity}
                  {x.discount ? ` · скидка ${x.discount.toLocaleString()}` : ""}
                </div>
              </td>
              <td style={{ textAlign: "right" }}>{lineTotal(x.price, x.quantity, x.discount).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ borderTop: "1px dashed #999", marginTop: 8, paddingTop: 8 }}>
        <div style={{ fontSize: 12 }}>Оплата: {paymentMethod}</div>
        <div style={{ fontWeight: 700 }}>Итого: {receipt.total.toLocaleString()} c</div>
      </div>
    </div>
  );
};
