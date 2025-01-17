import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";

const playlistData = [
	{
		id: 1,
		title: "Redo",
		artist: "Konomi Suzuki",
		cover: "https://i.scdn.co/image/ab67616d00001e02e0f905e849255cbcdd7e5efb",
	},
	{
		id: 2,
		title: "Styx Helix",
		artist: "MYTH & ROID",
		cover: "https://i1.sndcdn.com/artworks-000164315777-qicohg-t500x500.jpg",
	},
	{
		id: 3,
		title: "Paradisus-Paradoxum",
		artist: "MYTH & ROID",
		cover: "https://i1.sndcdn.com/artworks-000269717960-0obn23-t500x500.jpg",
	},
	{
		id: 4,
		title: "Stay Alive",
		artist: "Rie Takahashi",
		cover: "https://i1.sndcdn.com/artworks-000573071771-o5ej4x-t500x500.jpg",
	},
	{
		id: 5,
		title: "Realize",
		artist: "Konomi Suzuki",
		cover:
			"https://ik.imagekit.io/uxbg5z0iq/image/upload/v1592752062/assets/songs/artwork/2020/realize-konomi.jpg",
	},
];

export default function Playlist() {
	const handleRemoveSong = (id: number) => {
		console.log(`Removing song with id: ${id}`);
		// Here you would typically update your state or call an API to remove the song
	};

	return (
		<Card className="bg-gray-800 text-gray-100 h-[calc(100vh-7rem)]">
			<CardHeader>
				<CardTitle>Playlist</CardTitle>
			</CardHeader>
			<CardContent>
				<ScrollArea className="h-[calc(100vh-12rem)] pr-4">
					{playlistData.map((song) => (
						<div
							key={song.id}
							className="mb-4 last:mb-0 p-3 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors flex items-center space-x-3"
						>
							<img
								src={song.cover}
								alt={`${song.title} cover`}
								className="w-12 h-12 rounded-md object-cover"
							/>
							<div className="flex-grow">
								<h3 className="text-lg font-semibold">{song.title}</h3>
								<p className="text-sm text-gray-400">{song.artist}</p>
							</div>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => handleRemoveSong(song.id)}
								aria-label={`Remove ${song.title} from playlist`}
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
					))}
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
