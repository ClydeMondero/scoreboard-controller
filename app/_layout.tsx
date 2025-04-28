import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "./global.css";
import * as ScreenOrientation from "expo-screen-orientation";

export default function RootLayout() {
  useEffect(() => {
    const unlockScreenOerientation = async () => {
      await ScreenOrientation.unlockAsync();
    };
    unlockScreenOerientation();
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor="#000000" translucent={false} />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
