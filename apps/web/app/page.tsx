"use client";
import { useState } from "react";
import { Button, Header } from "ui";
import { trpc } from "../lib/trpc/trpc";

export default function Page() {
  const [counter, setCounter] = useState(0);
  trpc.data.useSubscription(undefined, {
    onData(data) {
      console.log("data", data);
    },
    onStarted() {
      console.log("started");
    },
  });
  console.log("render");
  return (
    <>
      <Header text={counter.toString()} />
      <button onClick={() => setCounter((c) => c + 1)}></button>
      <Button />
    </>
  );
}
