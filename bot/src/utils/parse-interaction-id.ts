export default function parseInteractionId(id: string) {
	const [type, action, value] = id.split("-");
	return { type, action, value };
}
