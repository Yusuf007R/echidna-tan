import type { Track } from "discord-player";

export const mapTrack = (track: Track) => ({
	id: track.id,
	title: track.title,
	author: track.author,
	duration: track.duration,
	thumbnail: track.thumbnail,
	url: track.url,
});
