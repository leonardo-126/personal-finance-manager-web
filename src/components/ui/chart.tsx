import * as React from "react";
import { Legend, ResponsiveContainer, Tooltip } from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  }
>;

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof ResponsiveContainer
  >["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorEntries = Object.entries(config).filter(
    ([, value]) => value.color
  );

  if (!colorEntries.length) {
    return null;
  }

  const css = `[data-chart=${id}] {\n${colorEntries
    .map(([key, value]) => `  --color-${key}: ${value.color};`)
    .join("\n")}\n}`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

const ChartTooltip = Tooltip;

type TooltipPayloadItem = {
  name?: string | number;
  value?: number | string;
  dataKey?: string | number;
  color?: string;
  payload?: Record<string, unknown>;
};

function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  hideLabel = false,
  hideIndicator = false,
  formatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: React.ReactNode;
  className?: string;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  formatter?: (value: number | string) => React.ReactNode;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-popover px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
    >
      {!hideLabel && label != null && (
        <div className="font-medium text-popover-foreground">{label}</div>
      )}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? item.name ?? index);
          const itemConfig = config[key];
          const color = item.color ?? `var(--color-${key})`;

          return (
            <div
              key={key}
              className="flex w-full items-center justify-between gap-2"
            >
              <div className="flex items-center gap-1.5">
                {!hideIndicator && (
                  <span
                    className="size-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: color }}
                  />
                )}
                <span className="text-muted-foreground">
                  {itemConfig?.label ?? item.name}
                </span>
              </div>
              {item.value != null && (
                <span className="font-medium tabular-nums text-popover-foreground">
                  {formatter ? formatter(item.value) : item.value}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = Legend;

type LegendItem = {
  value?: string | number;
  dataKey?: string | number;
  color?: string;
};

function ChartLegendContent({
  payload,
  className,
}: {
  payload?: LegendItem[];
  className?: string;
}) {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      className={cn("flex flex-wrap items-center justify-center gap-4", className)}
    >
      {payload.map((item) => {
        const key = String(item.dataKey ?? item.value ?? "");
        const itemConfig = config[key];

        return (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.color }}
            />
            {itemConfig?.label ?? item.value}
          </div>
        );
      })}
    </div>
  );
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};
