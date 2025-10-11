import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"

type PollCardProps = {
  title: string
  description: string
  endsAt: Date | string
  className?: string
}

function formatEndTime(endsAt: Date | string) {
  const date = endsAt instanceof Date ? endsAt : new Date(endsAt)
  const isValid = !isNaN(date.getTime())
  const iso = isValid ? date.toISOString() : ""
  const label = isValid
    ? date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Invalid date"
  return { iso, label }
}

export default function PollCard({ title, description, endsAt, className }: PollCardProps) {
  const { iso, label } = formatEndTime(endsAt)

  return (
    <Card className={className} aria-label="Poll card">
      <CardHeader>
        <CardTitle className="text-balance">{title}</CardTitle>
        <CardDescription className="text-pretty">{description}</CardDescription>
      </CardHeader>
      <CardFooter className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">Poll ends</span>
        <time dateTime={iso} className="font-medium">
          {label}
        </time>
      </CardFooter>
    </Card>
  )
}
