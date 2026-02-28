import { useState } from "react";
import dayjs, { type Dayjs } from "dayjs";

export type SalesFilterType = "day" | "week" | "month" | "all";

export const useSalesFilters = () => {
  const [onlyMine, setOnlyMine] = useState(false);
  const [filterType, setFilterType] = useState<SalesFilterType>("month");
  const [filterDate, setFilterDate] = useState<Dayjs>(dayjs());

  return {
    onlyMine,
    setOnlyMine,
    filterType,
    setFilterType,
    filterDate,
    setFilterDate,
  };
};

