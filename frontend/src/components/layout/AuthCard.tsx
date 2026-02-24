import type { JSXElement } from "solid-js";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

interface AuthCardProps {
  header: JSXElement;
  children: JSXElement;
}

export function AuthCard(props: AuthCardProps) {
  return (
    <div class="auth-card-enter w-full max-w-md">
      <Card class="auth-glass-card">
        <CardHeader class="text-center">{props.header}</CardHeader>
        <CardContent>{props.children}</CardContent>
      </Card>
    </div>
  );
}

interface StaggerItemProps {
  index: number;
  children: JSXElement;
}

export function StaggerItem(props: StaggerItemProps) {
  const delay = `${0.15 + props.index * 0.08}s`;

  return (
    <div class="auth-stagger-enter" style={{ "animation-delay": delay }}>
      {props.children}
    </div>
  );
}
