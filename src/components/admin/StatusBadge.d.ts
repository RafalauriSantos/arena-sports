declare module "@/components/admin/StatusBadge" {
    import * as React from "react";

    export type StatusType = "success" | "warning" | "error" | "neutral";

    export interface StatusBadgeProps {
        status: StatusType;
        children: React.ReactNode;
        className?: string;
    }

    export function StatusBadge(props: StatusBadgeProps): JSX.Element;
}
