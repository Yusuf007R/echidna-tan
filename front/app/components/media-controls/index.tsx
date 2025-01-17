import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Slider } from "~/components/ui/slider";

export default function MediaControls() {
	const [isPlaying, setIsPlaying] = useState(true);

	return (
		<div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 py-4 z-10">
			<div className="container mx-auto px-4">
				<div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
					<div className="flex items-center space-x-4 w-full md:w-1/4 justify-center md:justify-start">
						<Button variant="outline" size="icon">
							<SkipBack className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() => setIsPlaying(!isPlaying)}
						>
							{isPlaying ? (
								<Pause className="h-4 w-4" />
							) : (
								<Play className="h-4 w-4" />
							)}
						</Button>
						<Button variant="outline" size="icon">
							<SkipForward className="h-4 w-4" />
						</Button>
					</div>
					<div className="w-full md:w-1/2 space-y-2">
						<Slider defaultValue={[33]} max={100} step={1} />
						<div className="flex justify-between text-xs text-gray-400">
							<span>1:23</span>
							<span>3:45</span>
						</div>
					</div>
					<div className="flex items-center space-x-2 w-full md:w-1/4 justify-center md:justify-end">
						<Volume2 className="h-4 w-4" />
						<Slider defaultValue={[50]} max={100} step={1} className="w-24" />
					</div>
				</div>
			</div>
		</div>
	);
}
