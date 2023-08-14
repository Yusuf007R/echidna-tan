import { echidnaClient as client } from "..";
import EchidnaClient from "./echidna-client";

export default class Base{
  echidna: EchidnaClient;

  constructor() {
    this.echidna = client;
  }
}