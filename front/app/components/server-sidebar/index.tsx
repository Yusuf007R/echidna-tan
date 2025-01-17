import * as React from "react";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

const servers = [
	{ id: "re-zero", name: "Re:Zero Fan Server", icon: "🐰" },
	{ id: "anime-club", name: "Anime Club", icon: "🍥" },
	{ id: "gaming", name: "Gaming Community", icon: "🎮" },
	{ id: "music-lovers", name: "Music Lovers", icon: "🎵" },
	{ id: "study-group", name: "Study Group", icon: "📚" },
];

export default function ServerSidebar() {
	const [activeServer, setActiveServer] = React.useState(servers[0].id);

	return (
		<div className="w-[72px] bg-gray-900 flex-shrink-0 border-r border-gray-800 pb-20">
			<TooltipProvider>
				<ScrollArea className="h-full">
					<div className="flex flex-col items-center py-4 space-y-4">
						{servers.map((server) => (
							<Tooltip key={server.id} delayDuration={0}>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										className={cn(
											"w-12 h-12 rounded-full flex items-center justify-center text-2xl",
											activeServer === server.id
												? "bg-purple-600 text-white"
												: "bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white",
										)}
										onClick={() => setActiveServer(server.id)}
									>
										{server.icon}
									</Button>
								</TooltipTrigger>
								<TooltipContent side="right">
									<p>{server.name}</p>
								</TooltipContent>
							</Tooltip>
						))}
					</div>
				</ScrollArea>
			</TooltipProvider>
		</div>
	);
}
