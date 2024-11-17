
export default function keepTyping(cb: () => void) {
  const interval = setInterval(() => {
    cb();
  }, 5000);

  return () => clearInterval(interval);
}
