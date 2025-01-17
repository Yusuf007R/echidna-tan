import { createFileRoute } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { env } from "~/env";

export const Route = createFileRoute("/")({
	component: Home,
	loader: async () => {},
});

function Home() {
	const ctx = Route.useRouteContext();

	return (
		<div className="p-2">
			<h3>Welcome Home!!!</h3>
			{JSON.stringify(ctx ?? "no ctx")}

			<Button
				onClick={() => {
					window.location.href = `${env.VITE_API_URL}/auth/login`;
				}}
			>
				Login
			</Button>
		</div>
	);
}
