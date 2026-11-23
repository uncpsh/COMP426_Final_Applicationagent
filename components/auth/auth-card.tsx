import { Brand } from "@/components/brand";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

type AuthCardProps = {
  title: string;
  description: string;
  /** The form. */
  children: React.ReactNode;
  /** The link to the other auth page, shown under the form. */
  footer: React.ReactNode;
};

/** The centered card shared by the login and sign-up pages. */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <Brand />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-xl leading-none font-semibold tracking-tight">
            {title}
          </h1>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
        <CardFooter className="text-muted-foreground justify-center gap-1 text-sm">
          {footer}
        </CardFooter>
      </Card>
    </main>
  );
}
