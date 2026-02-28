export type DeliveryStatusCode =
  | "reserved"
  | "ready"
  | "on_way"
  | "picked_up"
  | "delivered"
  | "canceled";

export const DELIVERY_STATUSES: Record<
  DeliveryStatusCode,
  {
    text: string;
    status: "success" | "processing" | "error" | "default" | "warning";
    color: string;
  }
> = {
  reserved: { text: "Забронь", status: "warning", color: "gold" },
  ready: { text: "К отправке", status: "processing", color: "blue" },
  on_way: { text: "В пути", status: "processing", color: "geekblue" },
  picked_up: { text: "Самовывоз", status: "success", color: "purple" },
  delivered: { text: "Доставлено", status: "success", color: "green" },
  canceled: { text: "Отказ", status: "error", color: "red" },
};
