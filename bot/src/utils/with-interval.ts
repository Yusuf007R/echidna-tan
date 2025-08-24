/**
 * @param cb The callback to run
 * @param interval The interval to run the callback at
 * @returns A function to clear the interval
 */
export default function withInterval(cb: () => void, interval = 5000) {
	cb();

	const intervalId = setInterval(() => {
		cb();
	}, interval);

	return () => clearInterval(intervalId);
}
