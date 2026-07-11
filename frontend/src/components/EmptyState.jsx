import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
  action,
  className,
}) {
  return (
    <div className={cn("rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center", className)}>
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-5 font-serif text-2xl text-primary">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {actionLabel ? (
        actionTo ? (
          <Link to={actionTo} className="mt-5 inline-block">
            <Button className="rounded-full px-5">{actionLabel}</Button>
          </Link>
        ) : (
          <Button className="mt-5 rounded-full px-5" onClick={action}>
            {actionLabel}
          </Button>
        )
      ) : null}
    </div>
  );
}
