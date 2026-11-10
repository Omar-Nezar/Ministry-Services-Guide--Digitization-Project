import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { useLanguage } from "@/components/settings/language-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { divisionTitle, type TreeDivision } from "@/lib/guide-api";

interface StatisticsChartsProps {
  divisions: readonly TreeDivision[] | undefined;
  error?: boolean;
}

const palette = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function StatisticsCharts({ divisions, error = false }: StatisticsChartsProps) {
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const numberFormat = new Intl.NumberFormat(isArabic ? "ar" : "en");

  const statistics = useMemo(() => {
    const translate = (ar: string, en: string) => (isArabic ? ar : en);
    if (!divisions) return undefined;

    const sorted = divisions
      .filter((division) => division.services.length > 0)
      .map((division, index) => ({
        key: `division-${division.id}`,
        name: divisionTitle(division, isArabic),
        count: division.services.length,
        color: division.color ?? palette[index % palette.length],
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const topDivisions = sorted.slice(0, 6);
    const remaining = sorted.slice(6);
    const pieData = [
      ...topDivisions.map((division) => ({ ...division, divisionKey: division.key })),
      ...(remaining.length
        ? [
            {
              key: "other-divisions",
              divisionKey: "other-divisions",
              name: translate("مجالات أخرى", "Other divisions"),
              count: remaining.reduce((total, division) => total + division.count, 0),
              color: "var(--chart-5)",
            },
          ]
        : []),
    ];

    const pieConfig: ChartConfig = {
      count: { label: translate("الخدمات", "Services"), color: "var(--chart-1)" },
      ...Object.fromEntries(
        pieData.map((division) => [division.key, { label: division.name, color: division.color }]),
      ),
    };

    const barConfig: ChartConfig = {
      count: { label: translate("الخدمات", "Services"), color: "var(--chart-1)" },
      ...Object.fromEntries(
        sorted.map((division) => [division.key, { label: division.name, color: division.color }]),
      ),
    };

    const buckets = [
      { key: "bucket-1-5", label: "1-5", matches: (count: number) => count <= 5 },
      { key: "bucket-6-10", label: "6-10", matches: (count: number) => count >= 6 && count <= 10 },
      { key: "bucket-11-20", label: "11-20", matches: (count: number) => count >= 11 && count <= 20 },
      { key: "bucket-21-plus", label: "21+", matches: (count: number) => count >= 21 },
    ];
    const volumeData = buckets.map(({ key, label, matches }) => ({
      bucketKey: key,
      label,
      divisions: sorted.filter((division) => matches(division.count)).length,
    }));
    const volumeConfig: ChartConfig = {
      divisions: { label: translate("المجالات", "Divisions"), color: "var(--chart-2)" },
      ...Object.fromEntries(volumeData.map((bucket) => [bucket.bucketKey, { label: bucket.label }])),
    };

    const totalServices = sorted.reduce((total, division) => total + division.count, 0);
    let cumulativeServices = 0;
    const coverageData = sorted.map((division, index) => {
      cumulativeServices += division.count;
      return {
        divisionKey: division.key,
        rank: index + 1,
        coverage: Math.round((cumulativeServices / totalServices) * 100),
      };
    });
    const coverageConfig: ChartConfig = {
      coverage: { label: translate("الحصة التراكمية", "Cumulative share"), color: "var(--chart-3)" },
      ...Object.fromEntries(sorted.map((division) => [division.key, { label: division.name }])),
    };

    return { sorted, pieData, pieConfig, barConfig, volumeData, volumeConfig, coverageData, coverageConfig };
  }, [divisions, isArabic]);

  return (
    <section className="space-y-4" aria-label={t("إحصاءات دليل الخدمات", "Service catalogue statistics")}>
      <header className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{t("نظرة عامة على الخدمات", "Service catalogue overview")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("توزيع الخدمات وأحجام المجالات في الدليل.", "Service distribution and division sizes across the catalogue.")}
        </p>
      </header>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {t("تعذر تحميل إحصاءات الخدمات.", "Unable to load service statistics.")}
        </p>
      ) : !statistics ? (
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton h-80 rounded-2xl" />
          ))}
        </div>
      ) : statistics.sorted.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("لا توجد خدمات لعرض الإحصاءات.", "No services are available to chart.")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("توزيع الخدمات حسب المجال", "Services by division")}</CardTitle>
              <CardDescription>
                {t("حصة كل مجال من إجمالي الخدمات.", "Each division's share of all services.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={statistics.pieConfig} className="h-[280px] w-full aspect-auto">
                <PieChart accessibilityLayer>
                  <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="divisionKey" />} />
                  <Pie data={statistics.pieData} dataKey="count" nameKey="name" innerRadius={48} outerRadius={84}>
                    {statistics.pieData.map((division) => (
                      <Cell key={division.key} fill={`var(--color-${division.key})`} />
                    ))}
                  </Pie>
                  <ChartLegend
                    content={<ChartLegendContent nameKey="divisionKey" className="flex-wrap gap-x-3 gap-y-2" />}
                  />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("أعلى المجالات في عدد الخدمات", "Top divisions by service count")}</CardTitle>
              <CardDescription>
                {t("أكثر 8 مجالات خدمةً.", "The eight divisions with the most services.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={statistics.barConfig} className="h-[280px] w-full aspect-auto">
                <BarChart
                  accessibilityLayer
                  data={statistics.sorted.slice(0, 8).map((division) => ({
                    ...division,
                    divisionKey: division.key,
                  }))}
                  layout="vertical"
                  margin={{ left: 4, right: 12 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis
                    type="number"
                    dataKey="count"
                    allowDecimals={false}
                    tickFormatter={(value: number) => numberFormat.format(value)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={104}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: string) => (value.length > 16 ? `${value.slice(0, 15)}…` : value)}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent labelKey="divisionKey" nameKey="count" />}
                  />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("حجم المجالات", "Division size profile")}</CardTitle>
              <CardDescription>
                {t("عدد المجالات ضمن كل نطاق من الخدمات.", "How many divisions fall into each service-count range.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={statistics.volumeConfig} className="h-[280px] w-full aspect-auto">
                <BarChart accessibilityLayer data={statistics.volumeData} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => numberFormat.format(value)}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent labelKey="bucketKey" nameKey="divisions" />}
                  />
                  <Bar dataKey="divisions" fill="var(--color-divisions)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("تغطية الخدمات التراكمية", "Cumulative service coverage")}</CardTitle>
              <CardDescription>
                {t(
                  "الحصة التراكمية للخدمات عند ترتيب المجالات من الأكبر إلى الأصغر.",
                  "Cumulative share of services as divisions are added from largest to smallest.",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={statistics.coverageConfig} className="h-[280px] w-full aspect-auto">
                <AreaChart accessibilityLayer data={statistics.coverageData} margin={{ left: 0, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="rank"
                    type="number"
                    domain={[1, statistics.sorted.length]}
                    allowDecimals={false}
                    tickFormatter={(value: number) => numberFormat.format(value)}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => `${numberFormat.format(value)}%`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelKey="divisionKey"
                        nameKey="coverage"
                        formatter={(value) => `${value}%`}
                      />
                    }
                  />
                  <Area
                    dataKey="coverage"
                    type="monotone"
                    stroke="var(--color-coverage)"
                    fill="var(--color-coverage)"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
