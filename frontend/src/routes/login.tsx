import { createForm } from "@tanstack/solid-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/solid-router";
import { createEffect, createSignal, Show } from "solid-js";
import { AuthCard, AuthLayout, StaggerItem } from "~/components/layout";
import { Button } from "~/components/ui/button";
import { CardDescription, CardTitle } from "~/components/ui/card";
import {
  TextFieldErrorMessage,
  TextFieldInput,
  TextFieldLabel,
  TextFieldRoot,
} from "~/components/ui/text-field";
import { useAuth } from "~/contexts/auth";
import { ApiClientError } from "~/lib/api";
import { loginSchema } from "~/lib/schemas";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = createSignal("");

  createEffect(() => {
    if (auth.state.isAuthenticated) {
      navigate({ to: "/chat", replace: true });
    }
  });

  const form = createForm(() => ({
    defaultValues: { email: "", password: "" },
    validators: {
      onChange: loginSchema,
    },
    onSubmit: async ({ value }) => {
      setServerError("");
      try {
        await auth.login(value);
        navigate({ to: "/chat" });
      } catch (err) {
        if (err instanceof ApiClientError) {
          setServerError(err.detail);
        } else {
          setServerError("An unexpected error occurred");
        }
      }
    },
  }));

  return (
    <AuthLayout>
      <AuthCard
        header={
          <StaggerItem index={0}>
            <CardTitle class="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </StaggerItem>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          class="space-y-4"
        >
          <Show when={serverError()}>
            <div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {serverError()}
            </div>
          </Show>

          <StaggerItem index={2}>
            <form.Field name="email">
              {(field) => (
                <TextFieldRoot>
                  <TextFieldLabel>Email</TextFieldLabel>
                  <TextFieldInput
                    type="email"
                    placeholder="you@example.com"
                    value={field().state.value}
                    onInput={(e) => field().handleChange(e.currentTarget.value)}
                    onBlur={() => field().handleBlur()}
                  />
                  <Show when={field().state.meta.errors.length > 0}>
                    <TextFieldErrorMessage>
                      {field().state.meta.errors[0]?.message}
                    </TextFieldErrorMessage>
                  </Show>
                </TextFieldRoot>
              )}
            </form.Field>
          </StaggerItem>

          <StaggerItem index={3}>
            <form.Field name="password">
              {(field) => (
                <TextFieldRoot>
                  <TextFieldLabel>Password</TextFieldLabel>
                  <TextFieldInput
                    type="password"
                    placeholder="Enter your password"
                    value={field().state.value}
                    onInput={(e) => field().handleChange(e.currentTarget.value)}
                    onBlur={() => field().handleBlur()}
                  />
                  <Show when={field().state.meta.errors.length > 0}>
                    <TextFieldErrorMessage>
                      {field().state.meta.errors[0]?.message}
                    </TextFieldErrorMessage>
                  </Show>
                </TextFieldRoot>
              )}
            </form.Field>
          </StaggerItem>

          <StaggerItem index={4}>
            <form.Subscribe selector={(s) => [s.isSubmitting, s.canSubmit]}>
              {(state) => (
                <Button type="submit" class="w-full" disabled={state()[0] || !state()[1]}>
                  {state()[0] ? "Signing in..." : "Sign In"}
                </Button>
              )}
            </form.Subscribe>
          </StaggerItem>

          <StaggerItem index={5}>
            <p class="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/register" class="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </StaggerItem>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
