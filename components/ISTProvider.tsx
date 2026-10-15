"use client";

import { useEffect } from "react";
import "@/lib/forceIST";
import { forceIST } from "@/lib/forceIST";

// Runs immediately on bundle load
forceIST();

export default function ISTProvider() {
  useEffect(() => {
    // Re-verify on client mount
    forceIST();
  }, []);

  return null;
}