import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed")({
	beforeLoad: ({ context }) => {
		// if (!context.user) {
		// 	throw redirect({ to: "/" });
		// }
	},
});
