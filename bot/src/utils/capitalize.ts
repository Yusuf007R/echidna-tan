export default function capitalize<G extends string>(value: G): Capitalize<G> {
  return (value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()) as any;
}
