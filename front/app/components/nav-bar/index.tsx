import { Link } from "@tanstack/react-router";
import { Music2Icon } from "lucide-react";

export default function NavBar() {
	return (
		<nav className="bg-gray-800 shadow-md">
			<div className="container px-4">
				<div className="flex items-center justify-between h-16">
					<Link
						href="/"
						className="flex items-center space-x-2 text-xl font-semibold text-purple-400"
					>
						<Music2Icon className="h-6 w-6" />
						<span>Echidna-tan</span>
					</Link>
				</div>
			</div>
		</nav>
	);
}
