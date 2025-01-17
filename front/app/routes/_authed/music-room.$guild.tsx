import { createFileRoute } from "@tanstack/react-router";
import MediaControls from "~/components/media-controls";
import MusicPlayer from "~/components/music-player";
import Playlist from "~/components/play-list";
import ServerSidebar from "~/components/server-sidebar";

export const Route = createFileRoute("/_authed/music-room/$guild")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="min-h-screen bg-gray-800 text-gray-100 flex flex-col">
			<div className="flex-1 flex">
				<ServerSidebar />
				<div className="flex-1 overflow-auto">
					<main className="container mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8 mb-20">
						<div className="lg:w-2/3">
							<MusicPlayer />
						</div>
						<div className="lg:w-1/3">
							<Playlist />
						</div>
					</main>
				</div>
			</div>
			<MediaControls />
		</div>
	);
}
