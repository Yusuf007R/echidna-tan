import { useEffect, useState } from "react";
import { Card, CardContent } from "~/components/ui/card";

export default function MusicPlayer() {
	const [isPlaying, setIsPlaying] = useState(false);
	const [rotation, setRotation] = useState(0);

	useEffect(() => {
		let animationFrame: number;

		const rotateAlbum = () => {
			if (isPlaying) {
				setRotation((prev) => (prev + 0.5) % 360);
				animationFrame = requestAnimationFrame(rotateAlbum);
			}
		};

		if (isPlaying) {
			animationFrame = requestAnimationFrame(rotateAlbum);
		}

		return () => cancelAnimationFrame(animationFrame);
	}, [isPlaying]);

	// This effect simulates starting the music after component mount
	useEffect(() => {
		setIsPlaying(true);
	}, []);

	return (
		<Card className="bg-gray-800 text-gray-100">
			<CardContent className="p-6 space-y-6">
				<div className="flex justify-center">
					<div className="w-64 h-64 rounded-full overflow-hidden animate-spin duration-3000">
						<img
							src="https://i.scdn.co/image/ab67616d00001e02e0f905e849255cbcdd7e5efb"
							alt="Album cover"
							className="w-full h-full object-cover"
						/>
					</div>
				</div>
				<div className="text-center">
					<h2 className="text-2xl font-bold">Redo</h2>
					<p className="text-gray-400">Konomi Suzuki</p>
				</div>
			</CardContent>
		</Card>
	);
}
