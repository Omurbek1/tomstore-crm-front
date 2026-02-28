import { useAppStore } from "../../../store/appStore";

export const AnalyticsChart = ({
  data,
}: {
  data: { label: string; value: number }[];
  period: string;
}) => {
  const { appTheme } = useAppStore();
  const isDark = appTheme === "dark";

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-gray-400 dark:text-gray-500 py-10">
        Нет данных за этот период
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value));
  const chartHeight = 200;

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end space-x-4 min-w-[600px] h-[250px] pt-8 pb-2 px-4">
        {data.map((d, i) => {
          const height = maxVal > 0 ? (d.value / maxVal) * chartHeight : 0;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center group relative"
            >
              <div
                className={`absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-xs px-2 py-1 rounded pointer-events-none z-10 ${
                  isDark ? "text-blue-400" : "text-blue-600"
                }`}
              >
                {d.value.toLocaleString()}
              </div>
              <div
                className={`w-full rounded-t-md relative transition-all ${
                  isDark
                    ? "bg-blue-900 group-hover:bg-blue-800"
                    : "bg-blue-100 group-hover:bg-blue-200"
                }`}
                style={{ height: `${height}px`, minHeight: "4px" }}
              >
                <div
                  className={`absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-500 ${
                    isDark ? "bg-blue-600" : "bg-blue-500"
                  }`}
                  style={{ height: `${height}px` }}
                />
              </div>
              <div
                className={`text-xs mt-2 truncate w-full text-center ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
