import { TrendingUp, Calendar, DollarSign, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DivulgacaoCard } from "@/components/admin/DivulgacaoCard";
import {
        Bar,
        BarChart,
        ResponsiveContainer,
        XAxis,
        YAxis,
        Tooltip,
        CartesianGrid,
} from "recharts";

const revenueData = [
        { day: "Seg", value: 780 },
        { day: "Ter", value: 920 },
        { day: "Qua", value: 650 },
        { day: "Qui", value: 1100 },
        { day: "Sex", value: 1450 },
        { day: "Sáb", value: 1850 },
        { day: "Dom", value: 450 },
];

export default function Dashboard() {
        return (
                <div className="space-y-4 md:space-y-6">
                        <DivulgacaoCard />
                        {/* KPIs */}
                        <div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-3">
                                <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
                                        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-2 gap-2">
                                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                                        Faturamento Hoje
                                                </CardTitle>
                                                <DollarSign className="h-5 w-5 text-primary" />
                                        </CardHeader>
                                        <CardContent>
                                                <div className="text-3xl font-black text-primary">R$ 1.450,00</div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                        <span className="text-primary font-semibold">+23%</span> vs ontem
                                                </p>
                                        </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/20">
                                        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-2 gap-2">
                                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                                        Jogos Agendados
                                                </CardTitle>
                                                <Calendar className="h-5 w-5 text-blue-500" />
                                        </CardHeader>
                                        <CardContent>
                                                <div className="text-3xl font-black text-blue-500">8</div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                        Confirmados para hoje
                                                </p>
                                        </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-warning/20 to-warning/5 border-warning/20">
                                        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-2 gap-2">
                                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                                        A Receber na Quadra
                                                </CardTitle>
                                                <Clock className="h-5 w-5 text-warning" />
                                        </CardHeader>
                                        <CardContent>
                                                <div className="text-3xl font-black text-warning">R$ 300,00</div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                        3 pagamentos pendentes
                                                </p>
                                        </CardContent>
                                </Card>
                        </div>

                        {/* Revenue Chart */}
                        <Card>
                                <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                                <TrendingUp className="h-5 w-5 text-primary" />
                                                Receita dos Últimos 7 Dias
                                        </CardTitle>
                                </CardHeader>
                                <CardContent>
                                        <ResponsiveContainer width="100%" height={200} minHeight={200}>
                                                <BarChart data={revenueData}>
                                                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                                        <XAxis
                                                                dataKey="day"
                                                                className="text-xs"
                                                                stroke="hsl(var(--muted-foreground))"
                                                        />
                                                        <YAxis
                                                                className="text-xs"
                                                                stroke="hsl(var(--muted-foreground))"
                                                        />
                                                        <Tooltip
                                                                contentStyle={{
                                                                        backgroundColor: "hsl(var(--card))",
                                                                        border: "1px solid hsl(var(--border))",
                                                                        borderRadius: "8px",
                                                                }}
                                                                formatter={(value) => [`R$ ${value}`, "Receita"]}
                                                        />
                                                        <Bar
                                                                dataKey="value"
                                                                fill="hsl(var(--primary))"
                                                                radius={[8, 8, 0, 0]}
                                                        />
                                                </BarChart>
                                        </ResponsiveContainer>
                                </CardContent>
                        </Card>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-2">
                                <Card>
                                        <CardHeader>
                                                <CardTitle className="text-base">Campo Principal</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                                <div className="flex justify-between">
                                                        <span className="text-sm text-muted-foreground">
                                                                Taxa de ocupação hoje
                                                        </span>
                                                        <span className="font-bold">87%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                        <span className="text-sm text-muted-foreground">
                                                                Próximo horário livre
                                                        </span>
                                                        <span className="font-bold text-primary">21:00</span>
                                                </div>
                                        </CardContent>
                                </Card>

                                <Card>
                                        <CardHeader>
                                                <CardTitle className="text-base">Campo Médio</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                                <div className="flex justify-between">
                                                        <span className="text-sm text-muted-foreground">
                                                                Taxa de ocupação hoje
                                                        </span>
                                                        <span className="font-bold">64%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                        <span className="text-sm text-muted-foreground">
                                                                Próximo horário livre
                                                        </span>
                                                        <span className="font-bold text-primary">19:00</span>
                                                </div>
                                        </CardContent>
                                </Card>
                        </div>
                </div>
        );
}
