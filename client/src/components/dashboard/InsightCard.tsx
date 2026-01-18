import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

interface InsightCardProps {
    title: string;
    value: string | number;
    description?: string;
    trend?: {
        value: number;
        label: string;
        positive?: boolean;
    };
    icon?: React.ElementType;
    children?: React.ReactNode;
    className?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export const InsightCard: React.FC<InsightCardProps> = ({
    title,
    value,
    description,
    trend,
    icon: Icon,
    children,
    className,
    action,
}) => {
    return (
        <Card className={cn("bg-[#121212]/50 border-white/10 backdrop-blur-sm hover:border-blue-500/30 transition-colors", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                    {title}
                </CardTitle>
                {Icon && <Icon className="h-4 w-4 text-gray-400" />}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-white mb-1 font-sans">{value}</div>
                {description && (
                    <p className="text-xs text-gray-500">
                        {description}
                    </p>
                )}
                {trend && (
                    <div className="flex items-center gap-1 mt-2 text-xs">
                        <span className={cn(
                            "font-medium",
                            trend.positive ? "text-emerald-500" : "text-rose-500"
                        )}>
                            {trend.positive ? "+" : ""}{trend.value}%
                        </span>
                        <span className="text-gray-500">{trend.label}</span>
                    </div>
                )}
                {children && <div className="mt-4">{children}</div>}
            </CardContent>
            {action && (
                <CardFooter className="pt-0">
                    <button
                        onClick={action.onClick}
                        className="w-full flex items-center justify-between text-xs text-blue-400 hover:text-blue-300 transition-colors group px-3 py-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20"
                    >
                        <span>{action.label}</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </button>
                </CardFooter>
            )}
        </Card>
    );
};
