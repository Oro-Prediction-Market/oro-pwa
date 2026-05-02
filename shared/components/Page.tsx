import { type PropsWithChildren } from "react";

export function Page({ children }: PropsWithChildren<{ back?: boolean }>) {
  return <>{children}</>;
}
